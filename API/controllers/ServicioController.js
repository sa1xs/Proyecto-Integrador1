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

module.exports = { crearServicio, obtenerServicios };