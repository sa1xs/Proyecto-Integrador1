const express = require("express");
const router = express.Router();

const {
    obtenerProveedores,
    obtenerProveedorPorId,
    crearProveedor,
    actualizarProveedor,
    cambiarEstadoProveedor
} = require("../controllers/ProveedorController");

const {
    requiereSesion,
    requiereAdministrador
} = require("../middleware/auth");

router.use(requiereSesion, requiereAdministrador);

router.get("/", obtenerProveedores);
router.get("/:id", obtenerProveedorPorId);
router.post("/", crearProveedor);
router.put("/:id", actualizarProveedor);
router.patch("/:id", cambiarEstadoProveedor);

module.exports = router;