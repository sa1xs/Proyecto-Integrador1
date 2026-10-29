const Solicitud = require("../models/Solicitud");

const idValido = id => typeof id === "string" && /^[a-fA-F0-9]{24}$/.test(id);

async function buscarSolicitud(req, res, editar = false) {
    if (!idValido(req.params.id) ||
        (req.params.viajeroId !== undefined && !idValido(req.params.viajeroId))) {
        res.status(400).json({ message: "El identificador de solicitud o viajero no es válido" });
        return null;
    }
    const solicitud = await Solicitud.findOne({ _id: req.params.id, cliente: req.usuario._id });
    if (!solicitud) {
        res.status(404).json({ message: "Solicitud no encontrada" });
        return null;
    }
    if (editar && solicitud.estado !== "Nueva") {
        res.status(409).json({ message: "Solo podés modificar viajeros de una solicitud Nueva" });
        return null;
    }
    return solicitud;
}

function validarDatos(body, parcial = false) {
    if (!body || typeof body !== "object" || Array.isArray(body) || !Object.keys(body).length ||
        Object.keys(body).some(campo => !["nombre", "edad"].includes(campo))) {
        return "Enviá únicamente nombre opcional y edad del viajero";
    }
    if ((!parcial || body.edad !== undefined) && (!Number.isSafeInteger(body.edad) || body.edad < 0)) {
        return "La edad debe ser un entero no negativo";
    }
    if (body.nombre !== undefined && typeof body.nombre !== "string") return "El nombre debe ser texto";
    return null;
}

const obtenerViajeros = async (req, res, next) => {
    try {
        const solicitud = await buscarSolicitud(req, res);
        if (!solicitud) return;
        return res.json(solicitud.viajeros ?? []);
    } catch (error) { return next(error); }
};

const crearViajero = async (req, res, next) => {
    try {
        const error = validarDatos(req.body);
        if (error) return res.status(400).json({ message: error });
        const solicitud = await buscarSolicitud(req, res, true);
        if (!solicitud) return;
        solicitud.viajeros.push({ edad: req.body.edad,
            ...(req.body.nombre !== undefined ? { nombre: req.body.nombre.trim() } : {}) });
        await solicitud.save();
        return res.status(201).json({ mensaje: "Viajero registrado", datos: solicitud.viajeros.at(-1) });
    } catch (error) { return next(error); }
};

const actualizarViajero = async (req, res, next) => {
    try {
        const error = validarDatos(req.body, true);
        if (error) return res.status(400).json({ message: error });
        const solicitud = await buscarSolicitud(req, res, true);
        if (!solicitud) return;
        const viajero = solicitud.viajeros.id(req.params.viajeroId);
        if (!viajero) return res.status(404).json({ message: "Viajero no encontrado en esta solicitud" });
        if (req.body.nombre !== undefined) viajero.nombre = req.body.nombre.trim();
        if (req.body.edad !== undefined) viajero.edad = req.body.edad;
        await solicitud.save();
        return res.json({ mensaje: "Viajero actualizado", datos: viajero });
    } catch (error) { return next(error); }
};

const retirarViajero = async (req, res, next) => {
    try {
        const solicitud = await buscarSolicitud(req, res, true);
        if (!solicitud) return;
        const viajero = solicitud.viajeros.id(req.params.viajeroId);
        if (!viajero) return res.status(404).json({ message: "Viajero no encontrado en esta solicitud" });
        if (solicitud.viajeros.length <= 1) {
            return res.status(409).json({ message: "La solicitud debe conservar al menos un viajero" });
        }
        viajero.deleteOne();
        await solicitud.save();
        return res.json({ mensaje: "Viajero retirado", datos: solicitud.viajeros });
    } catch (error) { return next(error); }
};

module.exports = { obtenerViajeros, crearViajero, actualizarViajero, retirarViajero };
