const Cotizacion = require("../models/Cotizacion");
const Solicitud = require("../models/Solicitud");
const Servicio = require("../models/Servicio");
const Usuario = require("../models/Usuario");

const idValido = id => typeof id === "string" && /^[a-fA-F0-9]{24}$/.test(id);
const estados = ["Borrador", "Publicada", "Aceptada", "Rechazada"];
const estadosCliente = estados.slice(1);
const camposComerciales = "solicitud cliente partidas total moneda estado fechaPublicacion clienteRespuesta fechaRespuesta createdAt updatedAt";
function rechazar(estado, mensaje) {
    const error = new Error(mensaje);
    error.estadoHTTP = estado;
    throw error;
}
function cuerpoValido(body, campos, obligatorios = []) {
    return body && typeof body === "object" && !Array.isArray(body) && Object.keys(body).length &&
        Object.keys(body).every(campo => campos.includes(campo)) &&
        obligatorios.every(campo => Object.hasOwn(body, campo));
}
function validarId(id) {
    if (!idValido(id)) rechazar(400, "El identificador no es válido");
}
async function validarSolicitud(solicitud) {
    if (!solicitud) rechazar(404, "Solicitud no encontrada");
    if (solicitud.estado !== "En cotización") rechazar(409, "La solicitud debe estar En cotización");
    try { await solicitud.validate(); }
    catch { rechazar(400, "La solicitud debe tener destino, fechas y viajeros completos"); }
    if (!solicitud.destino?.trim() || !solicitud.viajeros?.length) {
        rechazar(400, "La solicitud debe tener destino, fechas y viajeros completos");
    }
}

async function prepararPartidas(partidas) {
    if (!Array.isArray(partidas)) rechazar(400, "Partidas debe ser una lista");
    for (const partida of partidas) {
        if (!cuerpoValido(partida, ["servicio", "cantidad", "precio"], ["servicio", "cantidad", "precio"])) {
            rechazar(400, "Cada partida admite únicamente servicio, cantidad y precio");
        }
        validarId(partida.servicio);
    }
    try { Cotizacion.calcularPartidas(partidas); }
    catch (error) { rechazar(400, error.message); }
    if (new Set(partidas.map(partida => partida.servicio.toLowerCase())).size !== partidas.length) {
        rechazar(400, "No se permiten servicios duplicados");
    }
    const resultado = [];
    for (const partida of partidas) {
        const servicio = await Servicio.findById(partida.servicio)
            .populate("proveedor", "activo");
        if (!servicio) rechazar(404, "Servicio no encontrado");
        // Un servicio oculto puede cotizarse internamente si sigue activo.
        if (!servicio.activo || !servicio.proveedor?.activo) {
            rechazar(409, "Todos los servicios y sus proveedores deben estar activos");
        }
        resultado.push({ servicio: servicio._id, nombre: servicio.nombre, tipo: servicio.tipo,
            descripcion: servicio.descripcion, cantidad: partida.cantidad, precio: partida.precio });
    }
    return resultado;
}

function operacion(accion) {
    return async (req, res, next) => {
        try { await accion(req, res); }
        catch (error) {
            if (error.estadoHTTP) return res.status(error.estadoHTTP).json({ message: error.message });
            return next(error);
        }
    };
}

const crearCotizacion = operacion(async (req, res) => {
    if (!cuerpoValido(req.body, ["solicitud", "partidas"], ["solicitud"])) {
        rechazar(400, "Enviá solicitud y, opcionalmente, partidas");
    }
    validarId(req.body.solicitud);
    // Asegura el índice único antes de aceptar creaciones concurrentes.
    await Cotizacion.init();
    const solicitud = await Solicitud.findById(req.body.solicitud);
    await validarSolicitud(solicitud);
    if (solicitud.cotizacion) rechazar(409, "La solicitud ya tiene una cotización");
    const cliente = await Usuario.findById(solicitud.cliente);
    if (!cliente || !cliente.activo || cliente.rol !== "cliente") rechazar(409, "El cliente no está disponible");
    const partidas = await prepararPartidas(req.body.partidas === undefined ? [] : req.body.partidas);
    const cotizacion = new Cotizacion({ solicitud: solicitud._id, cliente: solicitud.cliente, partidas });
    await cotizacion.save();
    try {
        solicitud.cotizacion = cotizacion._id;
        await solicitud.save();
    } catch (error) {
        // Si falla la asociación, retira solo el borrador recién creado.
        const actual = await Solicitud.findById(solicitud._id);
        if (String(actual?.cotizacion) !== String(cotizacion._id)) {
            await Cotizacion.deleteOne({ _id: cotizacion._id, estado: "Borrador", __v: cotizacion.__v });
        }
        throw error;
    }
    res.status(201).json({ mensaje: "Borrador de cotización creado", datos: cotizacion });
});

const obtenerCotizaciones = operacion(async (req, res) => {
    const filtros = {};
    if (Object.keys(req.query).some(campo => !["cliente", "solicitud", "estado"].includes(campo))) {
        rechazar(400, "Los filtros permitidos son cliente, solicitud y estado");
    }
    if (req.usuario.rol === "cliente") {
        if (req.query.cliente !== undefined) rechazar(400, "El cliente se obtiene de la sesión");
        filtros.cliente = req.usuario._id;
        filtros.estado = { $in: estadosCliente };
    } else if (req.query.cliente !== undefined) {
        validarId(req.query.cliente);
        filtros.cliente = req.query.cliente;
    }
    if (req.query.solicitud !== undefined) {
        validarId(req.query.solicitud);
        filtros.solicitud = req.query.solicitud;
    }
    if (req.query.estado !== undefined) {
        const permitidos = req.usuario.rol === "cliente" ? estadosCliente : estados;
        if (!permitidos.includes(req.query.estado)) rechazar(400, "El estado no es válido para esta consulta");
        filtros.estado = req.query.estado;
    }
    const consulta = Cotizacion.find(filtros).sort({ createdAt: -1, _id: -1 });
    if (req.usuario.rol === "cliente") consulta.select(camposComerciales);
    res.json(await consulta);
});

const obtenerCotizacion = operacion(async (req, res) => {
    validarId(req.params.id);
    const filtros = { _id: req.params.id };
    if (req.usuario.rol === "cliente") {
        filtros.cliente = req.usuario._id;
        filtros.estado = { $in: estadosCliente };
    }
    const consulta = Cotizacion.findOne(filtros);
    if (req.usuario.rol === "cliente") consulta.select(camposComerciales);
    const cotizacion = await consulta;
    if (!cotizacion) rechazar(404, "Cotización no encontrada");
    res.json(cotizacion);
});

const actualizarCotizacion = operacion(async (req, res) => {
    validarId(req.params.id);
    if (!cuerpoValido(req.body, ["partidas"], ["partidas"])) rechazar(400, "Enviá únicamente partidas");
    const cotizacion = await Cotizacion.findById(req.params.id);
    if (!cotizacion) rechazar(404, "Cotización no encontrada");
    if (cotizacion.estado !== "Borrador") rechazar(409, "Solo podés editar una cotización Borrador");
    const solicitud = await Solicitud.findById(cotizacion.solicitud);
    await validarSolicitud(solicitud);
    if (String(solicitud.cotizacion) !== String(cotizacion._id) ||
        String(solicitud.cliente) !== String(cotizacion.cliente)) rechazar(409, "Las referencias de la cotización no coinciden");
    cotizacion.partidas = await prepararPartidas(req.body.partidas);
    await cotizacion.save();
    res.json({ mensaje: "Borrador actualizado", datos: cotizacion });
});

const publicarCotizacion = operacion(async (req, res) => {
    validarId(req.params.id);
    if (req.body !== undefined && (!req.body || Array.isArray(req.body) ||
        typeof req.body !== "object" || Object.keys(req.body).length)) rechazar(400, "Publicar no admite campos en el cuerpo");
    const cotizacion = await Cotizacion.findById(req.params.id);
    if (!cotizacion) rechazar(404, "Cotización no encontrada");
    if (cotizacion.estado !== "Borrador") rechazar(409, "Solo podés publicar un Borrador");
    const solicitud = await Solicitud.findById(cotizacion.solicitud);
    await validarSolicitud(solicitud);
    if (String(solicitud.cotizacion) !== String(cotizacion._id) ||
        String(solicitud.cliente) !== String(cotizacion.cliente)) rechazar(409, "Las referencias de la cotización no coinciden");
    if (!cotizacion.partidas.length) rechazar(400, "Agregá al menos una partida antes de publicar");
    const cliente = await Usuario.findById(cotizacion.cliente);
    if (!cliente || !cliente.activo || cliente.rol !== "cliente") rechazar(409, "El cliente no está disponible");
    await prepararPartidas(cotizacion.partidas.map(p => ({ servicio: String(p.servicio), cantidad: p.cantidad, precio: p.precio })));
    cotizacion.estado = "Publicada";
    cotizacion.fechaPublicacion = new Date();
    await cotizacion.validate();
    // Primero actualiza la solicitud; la oferta se hace visible al guardar después.
    solicitud.estado = "Cotizada";
    await solicitud.save();
    try {
        await cotizacion.save();
    } catch (error) {
        const actual = await Cotizacion.findById(cotizacion._id);
        if (actual?.estado === "Borrador") {
            // Revierte únicamente el cambio de esta operación, sin pisar otro guardado.
            await Solicitud.updateOne({ _id: solicitud._id, cotizacion: cotizacion._id,
                estado: "Cotizada", __v: solicitud.__v },
            { $set: { estado: "En cotización" }, $inc: { __v: 1 } });
        }
        throw error;
    }
    res.json({ mensaje: "Cotización publicada", datos: cotizacion });
});

const responderCotizacion = operacion(async (req, res) => {
    validarId(req.params.id);
    if (!cuerpoValido(req.body, ["estado"], ["estado"]) || !["Aceptada", "Rechazada"].includes(req.body.estado)) {
        rechazar(400, "Enviá únicamente estado Aceptada o Rechazada");
    }
    // Filtro y actualización atómicos: dos respuestas concurrentes no pueden ganar.
    const cotizacion = await Cotizacion.findOneAndUpdate({ _id: req.params.id,
        cliente: req.usuario._id, estado: "Publicada" },
    { $set: { estado: req.body.estado, clienteRespuesta: req.usuario._id, fechaRespuesta: new Date() },
        $inc: { __v: 1 } }, { returnDocument: "after", runValidators: true }).select(camposComerciales);
    if (!cotizacion) {
        const propia = await Cotizacion.findOne({ _id: req.params.id, cliente: req.usuario._id,
            estado: { $in: estadosCliente } }).select("_id");
        rechazar(propia ? 409 : 404, propia ? "La cotización ya fue respondida" : "Cotización no encontrada");
    }
    res.json({ mensaje: "Respuesta de cotización registrada", datos: cotizacion });
});

module.exports = { crearCotizacion, obtenerCotizaciones, obtenerCotizacion,
    actualizarCotizacion, publicarCotizacion, responderCotizacion };
