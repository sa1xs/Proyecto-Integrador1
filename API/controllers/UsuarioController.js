const Usuario = require("../models/Usuario");
const bcrypt = require("bcrypt");

//GET.
const obtenerUsuarios = async (req, res) => {
  try {
    const usuarios = await Usuario.find();
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//GET por ID.
const obtenerUsuarioPorId = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id);

    if (!usuario) {
      return res.status(404).json({
        message: "Usuario no encontrado",
      });
    }

    res.json(usuario);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//POST.
const crearUsuario = async (req, res) => {
  try {
    const { nombre, correo, clave, telefono, direccion } = req.body ?? {};

    if (typeof clave !== "string" || clave.trim().length === 0) {
      return res.status(400).json({
        message: "La contraseña es obligatoria y debe ser texto",
      });
    }

    if (Buffer.byteLength(clave, "utf8") > 72) {
      return res.status(400).json({
        message: "La contraseña supera el límite de 72 bytes",
      });
    }

    const usuario = new Usuario({
      nombre,
      correo,
      clave,
      telefono,
      direccion,
      rol: "cliente",
      activo: true,
    });

    await usuario.validate();

    usuario.clave = await bcrypt.hash(clave, 12);

    const usuarioGuardado = await usuario.save();

    res.status(201).json({
      mensaje: "Usuario creado",
      datos: {
        _id: usuarioGuardado._id,
        nombre: usuarioGuardado.nombre,
        correo: usuarioGuardado.correo,
        telefono: usuarioGuardado.telefono,
        direccion: usuarioGuardado.direccion,
        rol: usuarioGuardado.rol,
        activo: usuarioGuardado.activo,
        createdAt: usuarioGuardado.createdAt,
        updatedAt: usuarioGuardado.updatedAt,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "El correo ya está registrado",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Revisá los campos obligatorios y el formato del correo",
      });
    }

    res.status(500).json({
      message: "No se pudo registrar el usuario",
    });
  }
};

//PUT por ID.
const actualizarUsuario = async (req, res) => {
  try {
    const { nombre, correo, telefono, direccion } = req.body ?? {};
    const cambios = {};

    if (nombre !== undefined) cambios.nombre = nombre;
    if (correo !== undefined) cambios.correo = correo;
    if (telefono !== undefined) cambios.telefono = telefono;
    if (direccion !== undefined) cambios.direccion = direccion;

    if (Object.keys(cambios).length === 0) {
      return res.status(400).json({
        message: "No se enviaron campos de perfil para actualizar",
      });
    }

    const usuario = await Usuario.findByIdAndUpdate(req.params.id, cambios, {
      new: true,
      runValidators: true,
    }).select("-clave"); // Excluye la clave de la respuesta.

    if (!usuario) {
      return res.status(404).json({
        message: "Usuario no encontrado",
      });
    }

    res.json({
      mensaje: "Usuario actualizado",
      datos: usuario,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const cambiarEstadoUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { activo } = req.body ?? {};

    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res.status(400).json({
        message: "El identificador del usuario no es válido",
      });
    }

    if (typeof activo !== "boolean") {
      return res.status(400).json({
        message: "El estado activo debe ser true o false",
      });
    }

    const usuario = await Usuario.findById(id);

    if (!usuario) {
      return res.status(404).json({
        message: "Usuario no encontrado",
      });
    }

    if (usuario.rol === "administrador" && usuario.activo && !activo) {
      const administradoresActivos = await Usuario.countDocuments({
        rol: "administrador",
        activo: true,
      });

      if (administradoresActivos <= 1) {
        return res.status(409).json({
          message: "No se puede desactivar al último administrador activo",
        });
      }

      if (usuario._id.toString() === req.usuario._id.toString()) {
        return res.status(409).json({
          message: "No podés desactivar tu propia cuenta de administrador",
        });
      }
    }

    usuario.activo = activo;
    await usuario.save();

    return res.json({
      mensaje: activo ? "Cuenta activada" : "Cuenta desactivada",
      datos: {
        _id: usuario._id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol,
        activo: usuario.activo,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "No se pudo cambiar el estado de la cuenta",
    });
  }
};

const obtenerMiPerfil = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuario._id).select(
      "nombre correo telefono direccion",
    );

    if (!usuario) {
      return res.status(404).json({
        message: "Usuario no encontrado",
      });
    }

    return res.json({
      datos: usuario,
    });
  } catch (error) {
    return res.status(500).json({
      message: "No se pudo consultar el perfil",
    });
  }
};

const actualizarMiPerfil = async (req, res) => {
  try {
    const { nombre, correo, telefono, direccion } = req.body ?? {};
    const cambios = {};

    if (nombre !== undefined) cambios.nombre = nombre;
    if (correo !== undefined) cambios.correo = correo;
    if (telefono !== undefined) cambios.telefono = telefono;
    if (direccion !== undefined) cambios.direccion = direccion;

    if (Object.keys(cambios).length === 0) {
      return res.status(400).json({
        message: "No se enviaron datos del perfil para actualizar",
      });
    }

    if (Object.values(cambios).some((valor) => typeof valor !== "string")) {
      return res.status(400).json({
        message: "Los datos del perfil deben ser texto",
      });
    }

    const usuario = await Usuario.findByIdAndUpdate(
      req.usuario._id,
      { $set: cambios },
      {
        new: true,
        runValidators: true,
      },
    ).select("nombre correo telefono direccion");

    if (!usuario) {
      return res.status(404).json({
        message: "Usuario no encontrado",
      });
    }

    return res.json({
      mensaje: "Perfil actualizado",
      datos: usuario,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "El correo ya está registrado",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Revisá los datos del perfil",
        errores: Object.values(error.errors).map((detalle) => detalle.message),
      });
    }

    return res.status(500).json({
      message: "No se pudo actualizar el perfil",
    });
  }
};

module.exports = {
  obtenerUsuarios,
  obtenerUsuarioPorId,
  crearUsuario,
  actualizarUsuario,
  cambiarEstadoUsuario,
  obtenerMiPerfil,
  actualizarMiPerfil,
};
