const Usuario = require("../models/Usuario");
const Servicio = require("../models/Servicio");
const Destino = require("../models/Destino");

const idValido = id => typeof id === "string" && /^[a-fA-F0-9]{24}$/.test(id);

function crearControladorFavoritos({ modelo, lista, campo, entidad, publicos, camposPublicos }) {
    const obtenerFavoritos = async (req, res, next) => {
        try {
            if (Object.keys(req.query).length) {
                return res.status(400).json({ message: "Los favoritos se consultan únicamente para el cliente de la sesión" });
            }
            const usuario = await Usuario.findById(req.usuario._id).select(lista);
            if (!usuario) return res.status(401).json({ message: "La sesión ya no es válida" });
            const favoritos = await modelo.find({ _id: { $in: usuario[lista] ?? [] }, ...publicos })
                .select(camposPublicos).sort({ nombre: 1, _id: 1 });
            return res.json(favoritos);
        } catch (error) { return next(error); }
    };

    const agregarFavorito = async (req, res, next) => {
        try {
            const body = req.body;
            if (!body || typeof body !== "object" || Array.isArray(body) ||
                Object.keys(body).length !== 1 || !idValido(body[campo]) || Object.keys(req.query).length) {
                return res.status(400).json({ message: `Enviá únicamente ${campo} con un identificador válido` });
            }
            const registro = await modelo.findOne({ _id: body[campo], ...publicos }).select("_id");
            if (!registro) return res.status(404).json({ message: `${entidad} no disponible` });
            // Agrega solo si no existe y conserva otros favoritos registrados al mismo tiempo.
            const usuario = await Usuario.findOneAndUpdate({ _id: req.usuario._id, rol: "cliente", activo: true },
                { $addToSet: { [lista]: registro._id } },
                { returnDocument: "after", runValidators: true }).select("_id");
            if (!usuario) return res.status(401).json({ message: "La sesión ya no es válida" });
            return res.json({ mensaje: `${entidad} guardado en favoritos`, datos: { [campo]: registro._id } });
        } catch (error) { return next(error); }
    };

    const retirarFavorito = async (req, res, next) => {
        try {
            const id = req.params[`${campo}Id`];
            if (!idValido(id)) {
                return res.status(400).json({ message: `El identificador del ${campo} no es válido` });
            }
            if (Object.keys(req.query).length || (req.body !== undefined &&
                (!req.body || typeof req.body !== "object" || Array.isArray(req.body) || Object.keys(req.body).length))) {
                return res.status(400).json({ message: "Retirar un favorito no admite campos ni filtros" });
            }
            // Retira la referencia aunque el registro ya no esté disponible.
            const usuario = await Usuario.findOneAndUpdate({ _id: req.usuario._id, rol: "cliente", activo: true },
                { $pull: { [lista]: id } },
                { returnDocument: "after", runValidators: true }).select("_id");
            if (!usuario) return res.status(401).json({ message: "La sesión ya no es válida" });
            return res.json({ mensaje: `${entidad} retirado de favoritos` });
        } catch (error) { return next(error); }
    };

    return { obtenerFavoritos, agregarFavorito, retirarFavorito };
}

module.exports = {
    ...crearControladorFavoritos({
        modelo: Servicio, lista: "favoritos", campo: "servicio", entidad: "Servicio",
        publicos: { activo: true, publicado: true }, camposPublicos: "nombre tipo descripcion"
    }),
    destinos: crearControladorFavoritos({
        modelo: Destino, lista: "destinosFavoritos", campo: "destino", entidad: "Destino",
        publicos: Destino.filtroPublico, camposPublicos: "nombre pais descripcion"
    })
};
