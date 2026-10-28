const Solicitud = require("../models/Solicitud");
const { fechaValida } = Solicitud;

const camposEditables = ["destino", "fechaSalida", "fechaRegreso", "cantidadViajeros", "edades"];
const estados = ["Nueva", "En cotización", "Cotizada"];
const camposCliente = "cliente destino fechaSalida fechaRegreso cantidadViajeros edades estado cotizacion viajeros createdAt updatedAt";
const idValido = (id) => typeof id === "string" && /^[a-fA-F0-9]{24}$/.test(id);

function validarDatos({ destino, fechaSalida, fechaRegreso, cantidadViajeros, edades }) {
    if (typeof destino !== "string" || !destino.trim()) return "El destino es obligatorio";
    if (!fechaValida(fechaSalida) || !fechaValida(fechaRegreso) || fechaRegreso < fechaSalida) {
        return "Indicá fechas válidas; el regreso no puede ser anterior a la salida";
    }
    if (!Number.isSafeInteger(cantidadViajeros) || cantidadViajeros < 1 ||
        !Array.isArray(edades) || edades.length !== cantidadViajeros ||
        !edades.every((edad) => Number.isSafeInteger(edad) && edad >= 0)) {
        return "La cantidad de viajeros debe coincidir con sus edades, expresadas en enteros no negativos";
    }
    return null;
}

const crearSolicitud = async (req, res, next) => {
    try {
        const { destino, fechaSalida, fechaRegreso, cantidadViajeros, edades } = req.body ?? {};
        const error = validarDatos({ destino, fechaSalida, fechaRegreso, cantidadViajeros, edades });
        if (error) return res.status(400).json({ message: error });
        const solicitud = await Solicitud.create({
            cliente: req.usuario._id, destino: destino.trim(), fechaSalida,
            fechaRegreso, cantidadViajeros, edades, estado: "Nueva"
        });
        return res.status(201).json({ mensaje: "Solicitud registrada", datos: solicitud });
    } catch (error) { return next(error); }
};

const obtenerSolicitudes = async (req, res, next) => {
    try {
        const filtros = {};
        if (Object.keys(req.query).some((campo) => !["estado", "cliente"].includes(campo))) {
            return res.status(400).json({ message: "Los filtros permitidos son estado y cliente" });
        }
        if (req.query.estado !== undefined) {
            if (!estados.includes(req.query.estado)) {
                return res.status(400).json({ message: "El estado de la solicitud no es válido" });
            }
            filtros.estado = req.query.estado;
        }
        if (req.usuario.rol === "cliente") {
            filtros.cliente = req.usuario._id;
            if (req.query.cliente !== undefined) {
                return res.status(400).json({ message: "El cliente de la consulta se obtiene de la sesión" });
            }
        } else if (req.query.cliente !== undefined) {
            if (!idValido(req.query.cliente)) {
                return res.status(400).json({ message: "El identificador del cliente no es válido" });
            }
            filtros.cliente = req.query.cliente;
        }
        let consulta = Solicitud.find(filtros).sort({ createdAt: -1, _id: -1 });
        if (req.usuario.rol === "administrador") {
            consulta = consulta.populate("cliente", "nombre correo telefono");
        } else {
            consulta = consulta.select(camposCliente);
        }
        return res.json(await consulta);
    } catch (error) { return next(error); }
};

const obtenerSolicitud = async (req, res, next) => {
    try {
        if (!idValido(req.params.id)) {
            return res.status(400).json({ message: "El identificador de la solicitud no es válido" });
        }
        const filtros = { _id: req.params.id };
        if (req.usuario.rol === "cliente") filtros.cliente = req.usuario._id;
        let consulta = Solicitud.findOne(filtros);
        if (req.usuario.rol === "administrador") {
            consulta = consulta.populate("cliente", "nombre correo telefono");
        } else {
            consulta = consulta.select(camposCliente);
        }
        const solicitud = await consulta;
        if (!solicitud) return res.status(404).json({ message: "Solicitud no encontrada" });
        return res.json(solicitud);
    } catch (error) { return next(error); }
};

const actualizarSolicitud = async (req, res, next) => {
    try {
        if (!idValido(req.params.id)) {
            return res.status(400).json({ message: "El identificador de la solicitud no es válido" });
        }
        const body = req.body;
        if (!body || Array.isArray(body) || typeof body !== "object" || !Object.keys(body).length ||
            Object.keys(body).some((campo) => !camposEditables.includes(campo))) {
            return res.status(400).json({ message: "Enviá únicamente destino, fechas, cantidad de viajeros o edades para editar" });
        }
        const solicitud = await Solicitud.findOne({ _id: req.params.id, cliente: req.usuario._id })
            .select(`${camposCliente} __v`);
        if (!solicitud) return res.status(404).json({ message: "Solicitud no encontrada" });
        if (solicitud.estado !== "Nueva") {
            return res.status(409).json({ message: "Solo podés editar una solicitud Nueva; solicitá el cambio a administración" });
        }
        const datos = Object.fromEntries(camposEditables.map((campo) => [campo, solicitud[campo]]));
        Object.assign(datos, body);
        const error = validarDatos(datos);
        if (error) return res.status(400).json({ message: error });
        datos.destino = datos.destino.trim();
        Object.assign(solicitud, datos);
        await solicitud.save();
        return res.json({ mensaje: "Solicitud actualizada", datos: solicitud });
    } catch (error) { return next(error); }
};

const cambiarEstadoSolicitud = async (req, res, next) => {
    try {
        if (!idValido(req.params.id)) {
            return res.status(400).json({ message: "El identificador de la solicitud no es válido" });
        }
        const body = req.body;
        if (!body || Array.isArray(body) || Object.keys(body).length !== 1 || !estados.includes(body.estado)) {
            return res.status(400).json({ message: "Enviá únicamente un estado válido" });
        }
        const solicitud = await Solicitud.findById(req.params.id);
        if (!solicitud) return res.status(404).json({ message: "Solicitud no encontrada" });
        // Cotizada se establece al publicar una oferta, nunca desde un cambio manual.
        if (solicitud.estado !== "Nueva" || body.estado !== "En cotización") {
            return res.status(409).json({ message: "Solo se permite iniciar la atención: Nueva a En cotización. Cotizada se establece al publicar la cotización" });
        }
        solicitud.estado = body.estado;
        await solicitud.save();
        return res.json({ mensaje: "Estado de solicitud actualizado", datos: solicitud });
    } catch (error) { return next(error); }
};

module.exports = { crearSolicitud, obtenerSolicitudes, obtenerSolicitud, actualizarSolicitud, cambiarEstadoSolicitud };
