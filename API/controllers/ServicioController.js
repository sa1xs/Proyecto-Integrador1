const Servicio = require("../models/Servicio");
const Proveedor = require("../models/Proveedor");

const crearServicio = async (req, res, next) => {
    try {
        const { nombre, tipo, descripcion, proveedor } = req.body ?? {};

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

        const servicio = await Servicio.create({
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
        const servicios = await Servicio.find()
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
        if (!Object.keys(cambios).length) {
            return res.status(400).json({ message: "No se enviaron datos del servicio para actualizar" });
        }
        if (cambios.proveedor && !/^[a-fA-F0-9]{24}$/.test(cambios.proveedor)) {
            return res.status(400).json({ message: "El identificador del proveedor no es válido" });
        }

        const servicio = await Servicio.findById(id);
        if (!servicio) return res.status(404).json({ message: "Servicio no encontrado" });

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

module.exports = { crearServicio, obtenerServicios, actualizarServicio, cambiarVisibilidadServicio };
