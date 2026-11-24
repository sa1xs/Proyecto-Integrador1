const Servicio = require("../models/Servicio");
const Proveedor = require("../models/Proveedor");
const Destino = require("../models/Destino");
const { idValido } = require("./seleccionSolicitud");

async function destinosValidos(destinos) {
    if (!Array.isArray(destinos) || !destinos.length || !destinos.every(idValido)) return false;
    const unicos = new Set(destinos.map(id => id.toLowerCase()));
    return unicos.size === destinos.length &&
        await Destino.countDocuments({ _id: { $in: destinos } }) === destinos.length;
}

const crearServicio = async (req, res, next) => {
    try {
        const { nombre, tipo, descripcion, proveedor, destinos } = req.body ?? {};

        // Comprueba que los campos obligatorios sean texto y no estén vacíos.
        if (
            [nombre, tipo, descripcion, proveedor].some(
                (valor) => typeof valor !== "string" || !valor.trim()
            )
        ) {
            return res.status(400).json({
                message: "Nombre, tipo, descripción y proveedor son obligatorios"
            });
        }

        const proveedorId = proveedor.trim();

        if (!/^[a-fA-F0-9]{24}$/.test(proveedorId)) {
            return res.status(400).json({
                message: "El identificador del proveedor no es válido"
            });
        }

        const proveedorEncontrado = await Proveedor.findById(proveedorId);

        if (!proveedorEncontrado) {
            return res.status(404).json({
                message: "Proveedor no encontrado"
            });
        }

        if (!proveedorEncontrado.activo) {
            return res.status(400).json({
                message: "Debés seleccionar un proveedor activo"
            });
        }

        if (!await destinosValidos(destinos)) {
            return res.status(400).json({ message: "Seleccioná al menos un destino válido y sin duplicados" });
        }
        const servicio = await Servicio.create({
            destinos,
            nombre,
            tipo,
            descripcion,
            proveedor: proveedorEncontrado._id,
            activo: true,
            publicado: false
        });

        return res.status(201).json({
            mensaje: "Servicio registrado",
            datos: servicio
        });
    } catch (error) {
        return next(error);
    }
};

const obtenerServicios = async (req, res, next) => {
    try {
        const filtro = {};
        if (req.query.destino !== undefined) {
            if (!idValido(req.query.destino)) {
                return res.status(400).json({ message: "El identificador del destino no es válido" });
            }
            filtro.destinos = req.query.destino;
        }
        const servicios = await Servicio.find(filtro)
            // Obtiene el nombre del proveedor asociado.
            .populate("proveedor", "nombre")
            .sort({ createdAt: -1 });

        return res.json(servicios);
    } catch (error) {
        return next(error);
    }
};

const actualizarServicio = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!/^[a-fA-F0-9]{24}$/.test(id)) {
            return res.status(400).json({ message: "El identificador del servicio no es válido" });
        }

        const cambios = {};
        for (const campo of ["nombre", "tipo", "descripcion", "proveedor"]) {
            const valor = req.body?.[campo];
            if (valor === undefined) continue;
            if (typeof valor !== "string" || !valor.trim()) {
                return res.status(400).json({ message: `El campo ${campo} debe ser texto y no estar vacío` });
            }
            cambios[campo] = valor.trim();
        }
        if (req.body?.destinos !== undefined) {
            if (!await destinosValidos(req.body.destinos)) {
                return res.status(400).json({ message: "Seleccioná al menos un destino válido y sin duplicados" });
            }
            cambios.destinos = req.body.destinos;
        }
        if (!Object.keys(cambios).length) {
            return res.status(400).json({ message: "No se enviaron datos del servicio para actualizar" });
        }
        if (cambios.proveedor && !/^[a-fA-F0-9]{24}$/.test(cambios.proveedor)) {
            return res.status(400).json({ message: "El identificador del proveedor no es válido" });
        }

        const servicio = await Servicio.findById(id);
        if (!servicio) return res.status(404).json({ message: "Servicio no encontrado" });

        if (!(cambios.destinos ?? servicio.destinos).length) {
            return res.status(400).json({ message: "Seleccioná al menos un destino para el servicio" });
        }

        // Conserva la asociación histórica; exige proveedor activo al cambiarla.
        if (cambios.proveedor && cambios.proveedor.toLowerCase() !== servicio.proveedor.toString()) {
            const proveedor = await Proveedor.findById(cambios.proveedor);
            if (!proveedor) return res.status(404).json({ message: "Proveedor no encontrado" });
            if (!proveedor.activo) {
                return res.status(400).json({ message: "Debés seleccionar un proveedor activo" });
            }
        }

        Object.assign(servicio, cambios);
        await servicio.save();
        return res.json({ mensaje: "Servicio actualizado", datos: servicio });
    } catch (error) {
        return next(error);
    }
};

const cambiarVisibilidadServicio = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!/^[a-fA-F0-9]{24}$/.test(id)) {
            return res.status(400).json({ message: "El identificador del servicio no es válido" });
        }
        const { publicado } = req.body ?? {};
        if (typeof publicado !== "boolean") {
            return res.status(400).json({ message: "El campo publicado debe ser true o false" });
        }
        const servicio = await Servicio.findById(id);
        if (!servicio) return res.status(404).json({ message: "Servicio no encontrado" });
        if (publicado && !servicio.activo) {
            return res.status(400).json({ message: "No se puede publicar un servicio inactivo" });
        }
        servicio.publicado = publicado;
        await servicio.save();
        return res.json({
            mensaje: publicado ? "Servicio publicado" : "Servicio oculto al público",
            datos: servicio
        });
    } catch (error) {
        return next(error);
    }
};

const cambiarEstadoServicio = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!/^[a-fA-F0-9]{24}$/.test(id)) {
            return res.status(400).json({ message: "El identificador del servicio no es válido" });
        }
        const body = req.body;
        if (!body || Array.isArray(body) || typeof body !== "object" ||
            Object.keys(body).length !== 1 || typeof body.activo !== "boolean") {
            return res.status(400).json({ message: "Enviá únicamente activo como true o false" });
        }
        const servicio = await Servicio.findById(id);
        if (!servicio) return res.status(404).json({ message: "Servicio no encontrado" });
        servicio.activo = body.activo;
        await servicio.save();
        return res.json({ mensaje: body.activo ? "Servicio reactivado" : "Servicio desactivado", datos: servicio });
    } catch (error) { return next(error); }
};

// La consulta pública no expone información del proveedor ni campos internos.
const obtenerCatalogo = async (req, res, next) => {
    try {
        const filtro = { activo: true, publicado: true };
        if (req.query.destino !== undefined) {
            if (!idValido(req.query.destino)) {
                return res.status(400).json({ message: "El identificador del destino no es válido" });
            }
            if (!await Destino.exists({ _id: req.query.destino, ...Destino.filtroPublico })) return res.json([]);
            filtro.destinos = req.query.destino;
            filtro.proveedor = { $in: await Proveedor.distinct("_id", { activo: true }) };
        }
        const servicios = await Servicio.find(filtro)
            .select("_id nombre tipo descripcion").sort({ createdAt: -1 });
        return res.json(servicios);
    } catch (error) { return next(error); }
};

const obtenerDetallePublico = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!/^[a-fA-F0-9]{24}$/.test(id)) {
            return res.status(400).json({ message: "El identificador del servicio no es válido" });
        }
        const servicio = await Servicio.findOne({ _id: id, activo: true, publicado: true })
            .select("_id nombre tipo descripcion destinos proveedor").lean();
        if (!servicio) return res.status(404).json({ message: "Servicio no disponible" });
        const { destinos, proveedor, ...datos } = servicio;
        const destinosPublicos = await Destino.find({ _id: { $in: destinos ?? [] }, ...Destino.filtroPublico })
            .select("nombre pais").sort({ nombre: 1, _id: 1 }).lean();
        const disponibleParaSolicitar = destinosPublicos.length > 0 &&
            Boolean(await Proveedor.exists({ _id: proveedor, activo: true }));
        return res.json({ ...datos, destinos: destinosPublicos.map(destino => destino._id),
            destinosPublicos, disponibleParaSolicitar });
    } catch (error) { return next(error); }
};

module.exports = { crearServicio, obtenerServicios, actualizarServicio, cambiarVisibilidadServicio,
    cambiarEstadoServicio, obtenerCatalogo, obtenerDetallePublico };
