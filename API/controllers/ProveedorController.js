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

//PUT por ID.
const actualizarProveedor = async (req, res) => {
    try {
        const { nombre, tipoServicio, correo, telefono } = req.body ?? {};

        if (nombre === undefined && tipoServicio === undefined && correo === undefined && telefono === undefined) {
            return res.status(400).json({
                message: 'No se enviaron campos para actualizar'
            });
        }

        const proveedor = await Proveedor.findById(req.params.id);

        if (!proveedor) {
            return res.status(404).json({
                message: 'Proveedor no encontrado'
            });
        }

        if (nombre !== undefined) proveedor.nombre = nombre;
        if (tipoServicio !== undefined) proveedor.tipoServicio = tipoServicio;
        if (correo !== undefined) proveedor.correo = correo;
        if (telefono !== undefined) proveedor.telefono = telefono;

        const proveedorActualizado = await proveedor.save();

        res.status(200).json({
            mensaje: 'Proveedor actualizado',
            datos: proveedorActualizado
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                message: 'Los datos del proveedor no son válidos',
                errores: Object.values(error.errors).map(
                    (detalle) => detalle.message
                )
            });
        }

        if (error.name === 'CastError' && error.path === '_id') {
            return res.status(400).json({
                message: 'El ID del proveedor no es válido'
            });
        }

        res.status(500).json({
            message: 'No se pudo actualizar el proveedor'
        });
    }
};

//PATCH por ID.
const cambiarEstadoProveedor = async (req, res) => {
    try {
        const { activo } = req.body ?? {};

        if (typeof activo !== 'boolean') {
            return res.status(400).json({
                message: 'El estado activo debe ser true o false'
            });
        }

        const proveedor = await Proveedor.findById(req.params.id);

        if (!proveedor) {
            return res.status(404).json({
                message: 'Proveedor no encontrado'
            });
        }

        proveedor.activo = activo;
        const proveedorActualizado = await proveedor.save();

        res.status(200).json({
            mensaje: activo
                ? 'Proveedor reactivado'
                : 'Proveedor desactivado',
            datos: proveedorActualizado
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                message: 'Los datos del proveedor no son válidos',
                errores: Object.values(error.errors).map(
                    (detalle) => detalle.message
                )
            });
        }

        if (error.name === 'CastError' && error.path === '_id') {
            return res.status(400).json({
                message: 'El ID del proveedor no es válido'
            });
        }

        res.status(500).json({
            message: 'No se pudo cambiar el estado del proveedor'
        });
    }
};

module.exports = {
  obtenerProveedores,
  obtenerProveedorPorId,
  crearProveedor, actualizarProveedor, cambiarEstadoProveedor
};
