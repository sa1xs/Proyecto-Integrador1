const Usuario = require("../models/Usuario");
const bcrypt = require("bcrypt");

//GET.
const obtenerUsuarios = async (req, res, next) => {
  try {
    const { rol, buscar } = req.query;
    const filtros = {};

    if (rol !== undefined) {
      if (!["cliente", "administrador"].includes(rol)) {
        return res.status(400).json({
          message: "El rol debe ser cliente o administrador",
        });
      }

      filtros.rol = rol;
    }

    if (buscar !== undefined) {
      if (typeof buscar !== "string") {
        return res.status(400).json({
          message: "La búsqueda debe ser texto",
        });
      }

      const texto = buscar.trim();

      if (texto) {
        const textoEscapado = texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        const coincidencia = {
          $regex: textoEscapado,
          $options: "i",
        };

        filtros.$or = [
          { nombre: coincidencia },
          { correo: coincidencia },
          { telefono: coincidencia },
        ];
      }
    }

    const usuarios = await Usuario.find(filtros)
      .select("-clave")
      .sort({ nombre: 1 });

    return res.json(usuarios);
  } catch (error) {
        return next(error);
    }
};

//GET por ID.
const obtenerUsuarioPorId = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      return res.status(400).json({
        message: "El identificador del usuario no es válido",
      });
    }

    const usuario = await Usuario.findById(id).select("-clave");

    if (!usuario) {
      return res.status(404).json({
        message: "Usuario no encontrado",
      });
    }

    return res.json(usuario);
  } catch (error) {
        return next(error);
    }
};

//POST.
const crearUsuario = async (req, res, next) => {
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
        return next(error);
    }
};

//PUT por ID.
const actualizarUsuario = async (req, res, next) => {
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
        return next(error);
    }
};

const cambiarEstadoUsuario = async (req, res, next) => {
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
        return next(error);
    }
};

const obtenerMiPerfil = async (req, res, next) => {
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
        return next(error);
    }
};

const actualizarMiPerfil = async (req, res, next) => {
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
        return next(error);
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
