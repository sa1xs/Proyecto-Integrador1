const Proveedor = require("../models/Proveedor");

//GET.
const obtenerProveedores = async (req, res, next) => {
  try {
    const filtros = {};
    for (const campo of ["nombre", "tipoServicio"]) {
      const valor = req.query[campo];
      if (valor === undefined) continue;
      if (typeof valor !== "string") {
        return res.status(400).json({ message: `${campo} debe ser texto` });
      }
      if (valor.trim()) {
        // Trata símbolos como puntos y paréntesis como texto literal.
        const texto = valor.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        filtros[campo] = { $regex: texto, $options: "i" };
      }
    }
    const proveedores = await Proveedor.find(filtros).sort({ nombre: 1 });
    res.status(200).json(proveedores);
  } catch (error) {
        return next(error);
    }
};

//GET por ID.
const obtenerProveedorPorId = async (req, res, next) => {
  try {
    const proveedor = await Proveedor.findById(req.params.id);

    if (!proveedor) {
      return res.status(404).json({
        message: "Proveedor no encontrado",
      });
    }

    res.status(200).json(proveedor);
  } catch (error) {
        return next(error);
    }
};

//POST.
const crearProveedor = async (req, res, next) => {
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
        return next(error);
    }
};

//PUT por ID.
const actualizarProveedor = async (req, res, next) => {
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
        return next(error);
    }
};

//PATCH por ID.
const cambiarEstadoProveedor = async (req, res, next) => {
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
        return next(error);
    }
};

module.exports = {
  obtenerProveedores,
  obtenerProveedorPorId,
  crearProveedor, actualizarProveedor, cambiarEstadoProveedor
};
