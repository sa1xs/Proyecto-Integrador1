
const express = require('express');
const router = express.Router();
const Usuario = require('../models/Usuario');
const { obtenerUsuarios, obtenerUsuarioPorId, crearUsuario, actualizarUsuario, eliminarUsuario } = require('../controllers/UsuarioController');

//GET.
router.get('/', obtenerUsuarios);

//GET por ID
router.get('/:id', obtenerUsuarioPorId);
       
//POST
router.post('/', crearUsuario);

//PUT por ID
router.put('/:id', actualizarUsuario);

//DELETE por ID
router.delete('/:id', eliminarUsuario);

module.exports = router;