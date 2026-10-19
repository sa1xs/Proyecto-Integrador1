const express = require('express');
const router = express.Router();

const {
    obtenerProveedores, obtenerProveedorPorId, crearProveedor, actualizarProveedor, cambiarEstadoProveedor
} = require('../controllers/ProveedorController');

router.get('/', obtenerProveedores);
router.get('/:id', obtenerProveedorPorId);
router.post('/', crearProveedor);
router.put('/:id', actualizarProveedor);
router.patch('/:id', cambiarEstadoProveedor);

module.exports = router;