const Destino = require("../models/Destino");

const campos = ["nombre", "pais", "descripcion"];
const idValido = id => typeof id === "string" && /^[a-fA-F0-9]{24}$/.test(id);

function datosValidos(body, parcial = false) {
    return body && typeof body === "object" && !Array.isArray(body) && Object.keys(body).length > 0 &&
        Object.keys(body).every(campo => campos.includes(campo)) &&
        (parcial ? Object.keys(body) : campos).every(campo => typeof body[campo] === "string" && body[campo].trim());
}

const obtenerDestinosPublicos = async (req, res, next) => {
    try {
        const destinos = await Destino.find({ activo: true })
            .select("nombre pais descripcion").sort({ nombre: 1, _id: 1 });
        return res.json(destinos);
    } catch (error) { return next(error); }
};

const obtenerDestinoPublico = async (req, res, next) => {
    try {
        if (!idValido(req.params.id)) return res.status(400).json({ message: "El identificador del destino no es válido" });
        const destino = await Destino.findOne({ _id: req.params.id, activo: true }).select("nombre pais descripcion");
        if (!destino) return res.status(404).json({ message: "Destino no disponible" });
        return res.json(destino);
    } catch (error) { return next(error); }
};

const obtenerDestinos = async (req, res, next) => {
    try {
        return res.json(await Destino.find().sort({ nombre: 1, _id: 1 }));
    } catch (error) { return next(error); }
};

const obtenerDestino = async (req, res, next) => {
    try {
        if (!idValido(req.params.id)) return res.status(400).json({ message: "El identificador del destino no es válido" });
        const destino = await Destino.findById(req.params.id);
        if (!destino) return res.status(404).json({ message: "Destino no encontrado" });
        return res.json(destino);
    } catch (error) { return next(error); }
};

const crearDestino = async (req, res, next) => {
    try {
        if (!datosValidos(req.body)) {
            return res.status(400).json({ message: "Enviá únicamente nombre, pais y descripcion de texto no vacíos" });
        }
        const { nombre, pais, descripcion } = req.body;
        const destino = await Destino.create({ nombre, pais, descripcion, activo: true });
        return res.status(201).json({ mensaje: "Destino registrado", datos: destino });
    } catch (error) { return next(error); }
};

const actualizarDestino = async (req, res, next) => {
    try {
        if (!idValido(req.params.id)) return res.status(400).json({ message: "El identificador del destino no es válido" });
        if (!datosValidos(req.body, true)) {
            return res.status(400).json({ message: "Enviá al menos un campo: nombre, pais o descripcion de texto no vacío" });
        }
        const destino = await Destino.findById(req.params.id);
        if (!destino) return res.status(404).json({ message: "Destino no encontrado" });
        for (const campo of Object.keys(req.body)) destino[campo] = req.body[campo];
        await destino.save();
        return res.json({ mensaje: "Destino actualizado", datos: destino });
    } catch (error) { return next(error); }
};

const cambiarEstadoDestino = async (req, res, next) => {
    try {
        if (!idValido(req.params.id)) return res.status(400).json({ message: "El identificador del destino no es válido" });
        const body = req.body;
        if (!body || Array.isArray(body) || typeof body !== "object" ||
            Object.keys(body).length !== 1 || typeof body.activo !== "boolean") {
            return res.status(400).json({ message: "Enviá únicamente activo como true o false" });
        }
        const destino = await Destino.findById(req.params.id);
        if (!destino) return res.status(404).json({ message: "Destino no encontrado" });
        destino.activo = body.activo;
        await destino.save();
        return res.json({ mensaje: body.activo ? "Destino reactivado" : "Destino desactivado", datos: destino });
    } catch (error) { return next(error); }
};

module.exports = { obtenerDestinosPublicos, obtenerDestinoPublico, obtenerDestinos,
    obtenerDestino, crearDestino, actualizarDestino, cambiarEstadoDestino };
