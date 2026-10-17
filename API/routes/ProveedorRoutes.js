const express = require('express');
const router = express.Router();

const {
    obtenerProveedores, obtenerProveedorPorId, crearProveedor
} = require('../controllers/ProveedorController');

router.get('/', obtenerProveedores);
router.get('/:id', obtenerProveedorPorId);
router.post('/', crearProveedor);

module.exports = router;