const Usuario = require('../models/Usuario');

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
                message: 'Usuario no encontrado'
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
        const usuario = new Usuario(req.body);
        const usuarioGuardado = await usuario.save();

        res.status(201).json({
            mensaje: 'Usuario creado',
            datos: usuarioGuardado
        });
    } catch (error) {
        // Conservamos el manejo actual mientras separamos las responsabilidades.
        res.status(500).json({ message: error.message });
    }
};

//PUT por ID.
const actualizarUsuario = async (req, res) => {
    try {
        const usuario = await Usuario.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true, // Devuelve el documento actualizado.
                runValidators: true // Aplica las validaciones del modelo.
            }
        );

        // Si no existe un usuario con ese ID, termina con un 404.
        if (!usuario) {
            return res.status(404).json({
                message: 'Usuario no encontrado'
            });
        }

        res.json({
            mensaje: 'Usuario actualizado',
            datos: usuario
        });
    } catch (error) {
        // Conservamos el manejo actual durante la reorganización.
        res.status(500).json({ message: error.message });
    }
};

// Elimina el usuario identificado por el ID de la URL.
const eliminarUsuario = async (req, res) => {
    try {
        const usuario = await Usuario.findByIdAndDelete(req.params.id);

        if (!usuario) {
            return res.status(404).json({
                message: 'Usuario no encontrado'
            });
        }

        res.json({
            mensaje: 'Usuario eliminado',
            datos: req.params.id
        });
    } catch (error) {
        // Conservamos el manejo actual durante la reorganización.
        res.status(500).json({ message: error.message });
    }
};

// Permite utilizar esta función desde el archivo de rutas.
module.exports = {
    obtenerUsuarios, obtenerUsuarioPorId, crearUsuario, actualizarUsuario, eliminarUsuario};