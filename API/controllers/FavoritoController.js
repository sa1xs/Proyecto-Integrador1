const Usuario = require("../models/Usuario");
const Servicio = require("../models/Servicio");

const idValido = id => typeof id === "string" && /^[a-fA-F0-9]{24}$/.test(id);

const obtenerFavoritos = async (req, res, next) => {
    try {
        if (Object.keys(req.query).length) {
            return res.status(400).json({ message: "Los favoritos se consultan únicamente para el cliente de la sesión" });
        }
        const usuario = await Usuario.findById(req.usuario._id).select("favoritos");
        if (!usuario) return res.status(401).json({ message: "La sesión ya no es válida" });
        const favoritos = await Servicio.find({ _id: { $in: usuario.favoritos ?? [] }, activo: true, publicado: true })
            .select("nombre tipo descripcion").sort({ nombre: 1, _id: 1 });
        return res.json(favoritos);
    } catch (error) { return next(error); }
};

const agregarFavorito = async (req, res, next) => {
    try {
        const body = req.body;
        if (!body || typeof body !== "object" || Array.isArray(body) ||
            Object.keys(body).length !== 1 || !idValido(body.servicio) || Object.keys(req.query).length) {
            return res.status(400).json({ message: "Enviá únicamente servicio con un identificador válido" });
        }
        const servicio = await Servicio.findOne({ _id: body.servicio, activo: true, publicado: true }).select("_id");
        if (!servicio) return res.status(404).json({ message: "Servicio no disponible" });
        // Agrega solo si no existe y conserva otros favoritos registrados al mismo tiempo.
        const usuario = await Usuario.findOneAndUpdate({ _id: req.usuario._id, rol: "cliente", activo: true },
            { $addToSet: { favoritos: servicio._id } },
            { returnDocument: "after", runValidators: true }).select("_id");
        if (!usuario) return res.status(401).json({ message: "La sesión ya no es válida" });
        return res.json({ mensaje: "Servicio guardado en favoritos", datos: { servicio: servicio._id } });
    } catch (error) { return next(error); }
};

const retirarFavorito = async (req, res, next) => {
    try {
        if (!idValido(req.params.servicioId)) {
            return res.status(400).json({ message: "El identificador del servicio no es válido" });
        }
        if (Object.keys(req.query).length || (req.body !== undefined &&
            (!req.body || typeof req.body !== "object" || Array.isArray(req.body) || Object.keys(req.body).length))) {
            return res.status(400).json({ message: "Retirar un favorito no admite campos ni filtros" });
        }
        // No exige que el servicio siga publicado o exista: retira únicamente su referencia.
        const usuario = await Usuario.findOneAndUpdate({ _id: req.usuario._id, rol: "cliente", activo: true },
            { $pull: { favoritos: req.params.servicioId } },
            { returnDocument: "after", runValidators: true }).select("_id");
        if (!usuario) return res.status(401).json({ message: "La sesión ya no es válida" });
        return res.json({ mensaje: "Servicio retirado de favoritos" });
    } catch (error) { return next(error); }
};

module.exports = { obtenerFavoritos, agregarFavorito, retirarFavorito };
