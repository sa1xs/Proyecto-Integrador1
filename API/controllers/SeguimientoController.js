const Solicitud = require("../models/Solicitud");
const { fechaValida } = Solicitud;

const idValido = id => typeof id === "string" && /^[a-fA-F0-9]{24}$/.test(id);

const registrarContacto = async (req, res, next) => {
    try {
        if (!idValido(req.params.id)) {
            return res.status(400).json({ message: "El identificador de la solicitud no es válido" });
        }
        const body = req.body;
        if (!body || typeof body !== "object" || Array.isArray(body) ||
            Object.keys(body).some(campo => !["fecha", "canal", "nota"].includes(campo)) ||
            !fechaValida(body.fecha) ||
            [body.canal, body.nota].some(valor => typeof valor !== "string" || !valor.trim())) {
            return res.status(400).json({ message: "Enviá fecha válida (YYYY-MM-DD), canal y nota de texto obligatorios" });
        }
        // Agrega sin reemplazar contactos previos, incluso con registros simultáneos.
        const solicitud = await Solicitud.findOneAndUpdate({ _id: req.params.id },
            { $push: { contactos: { fecha: body.fecha, canal: body.canal.trim(), nota: body.nota.trim() } },
                $inc: { __v: 1 } },
            { returnDocument: "after", runValidators: true }).select("+contactos");
        if (!solicitud) return res.status(404).json({ message: "Solicitud no encontrada" });
        return res.status(201).json({ mensaje: "Contacto registrado", datos: solicitud.contactos.at(-1) });
    } catch (error) { return next(error); }
};

const obtenerContactos = async (req, res, next) => {
    try {
        if (!idValido(req.params.id)) {
            return res.status(400).json({ message: "El identificador de la solicitud no es válido" });
        }
        const solicitud = await Solicitud.findById(req.params.id).select("+contactos");
        if (!solicitud) return res.status(404).json({ message: "Solicitud no encontrada" });
        const contactos = [...solicitud.contactos].sort((a, b) =>
            b.fecha.localeCompare(a.fecha) || String(b._id).localeCompare(String(a._id)));
        return res.json(contactos);
    } catch (error) { return next(error); }
};

module.exports = { registrarContacto, obtenerContactos };
