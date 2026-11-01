const Consulta = require("../models/Consulta");

const idValido = id => typeof id === "string" && /^[a-fA-F0-9]{24}$/.test(id);
const textoValido = (body, campo) => body && typeof body === "object" && !Array.isArray(body) &&
    Object.keys(body).length === 1 && typeof body[campo] === "string" && body[campo].trim();

const crearConsulta = async (req, res, next) => {
    try {
        if (!textoValido(req.body, "pregunta")) {
            return res.status(400).json({ message: "Enviá únicamente pregunta de texto no vacío" });
        }
        const consulta = await Consulta.create({ cliente: req.usuario._id,
            pregunta: req.body.pregunta.trim(), estado: "Pendiente" });
        return res.status(201).json({ mensaje: "Consulta registrada", datos: consulta });
    } catch (error) { return next(error); }
};

const obtenerConsultas = async (req, res, next) => {
    try {
        const filtros = {};
        if (Object.keys(req.query).some(campo => campo !== "estado") ||
            (req.query.estado !== undefined && !["Pendiente", "Respondida"].includes(req.query.estado))) {
            return res.status(400).json({ message: "El único filtro permitido es estado: Pendiente o Respondida" });
        }
        if (req.usuario.rol === "cliente") filtros.cliente = req.usuario._id;
        if (req.query.estado !== undefined) filtros.estado = req.query.estado;
        return res.json(await Consulta.find(filtros).sort({ createdAt: -1, _id: -1 }));
    } catch (error) { return next(error); }
};

const obtenerConsulta = async (req, res, next) => {
    try {
        if (!idValido(req.params.id)) return res.status(400).json({ message: "El identificador de la consulta no es válido" });
        const filtros = { _id: req.params.id };
        if (req.usuario.rol === "cliente") filtros.cliente = req.usuario._id;
        const consulta = await Consulta.findOne(filtros);
        if (!consulta) return res.status(404).json({ message: "Consulta no encontrada" });
        return res.json(consulta);
    } catch (error) { return next(error); }
};

const responderConsulta = async (req, res, next) => {
    try {
        if (!idValido(req.params.id)) return res.status(400).json({ message: "El identificador de la consulta no es válido" });
        if (!textoValido(req.body, "respuesta")) {
            return res.status(400).json({ message: "Enviá únicamente respuesta de texto no vacío" });
        }
        // Guarda respuesta, fecha y estado juntos; dos respuestas no pueden sobrescribirse.
        const consulta = await Consulta.findOneAndUpdate({ _id: req.params.id, estado: "Pendiente" },
            { $set: { respuesta: req.body.respuesta.trim(), fechaRespuesta: new Date(), estado: "Respondida" },
                $inc: { __v: 1 } },
            { returnDocument: "after", runValidators: true });
        if (!consulta) {
            const existente = await Consulta.exists({ _id: req.params.id });
            return res.status(existente ? 409 : 404).json({
                message: existente ? "La consulta ya fue respondida" : "Consulta no encontrada"
            });
        }
        return res.json({ mensaje: "Respuesta registrada", datos: consulta });
    } catch (error) { return next(error); }
};

module.exports = { crearConsulta, obtenerConsultas, obtenerConsulta, responderConsulta };
