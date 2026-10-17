const Proveedor = require("../models/Proveedor");

//GET.
const obtenerProveedores = async (req, res) => {
  try {
    const proveedores = await Proveedor.find();
    res.status(200).json(proveedores);
  } catch (error) {
    res.status(500).json({
      message: "No se pudieron consultar los proveedores",
    });
  }
};

//GET por ID.
const obtenerProveedorPorId = async (req, res) => {
  try {
    const proveedor = await Proveedor.findById(req.params.id);

    if (!proveedor) {
      return res.status(404).json({
        message: "Proveedor no encontrado",
      });
    }

    res.status(200).json(proveedor);
  } catch (error) {
    // Distingue un ID mal formado de un fallo interno.
    if (error.name === "CastError" && error.path === "_id") {
      return res.status(400).json({
        message: "El ID del proveedor no es válido",
      });
    }

    res.status(500).json({
      message: "No se pudo consultar el proveedor",
    });
  }
};

//POST.
const crearProveedor = async (req, res) => {
  try {
    const { nombre, tipoServicio, correo, telefono } = req.body ?? {};

    const proveedor = new Proveedor({
      nombre,
      tipoServicio,
      correo,
      telefono,
      activo: true,
    });

    await proveedor.validate();

    // Compara nombres sin distinguir mayúsculas y minúsculas.
    const coincidencia = await Proveedor.findOne({
      nombre: proveedor.nombre,
    }).collation({
      locale: "es",
      strength: 2,
    });

    const proveedorGuardado = await proveedor.save();

    res.status(201).json({
      mensaje: "Proveedor creado",
      datos: proveedorGuardado,
      advertencia: coincidencia
        ? "Ya existe un proveedor con el mismo nombre. Revisá si es un duplicado."
        : null,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Los datos del proveedor no son válidos",
        errores: Object.values(error.errors).map((detalle) => detalle.message)
      });
    }

    res.status(500).json({
      message: "No se pudo registrar el proveedor",
    });
  }
};

module.exports = {
  obtenerProveedores,
  obtenerProveedorPorId,
  crearProveedor,
};
