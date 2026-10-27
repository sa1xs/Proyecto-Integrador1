const express = require("express");
const router = express.Router();

const {
    crearServicio,
    obtenerServicios,
    actualizarServicio,
    cambiarVisibilidadServicio,
    obtenerCatalogo,
    obtenerDetallePublico
} = require("../controllers/ServicioController");

const {
    requiereSesion,
    requiereAdministrador
} = require("../middleware/auth");

router.get("/publicos", obtenerCatalogo);
router.get("/publicos/:id", obtenerDetallePublico);

router.use(requiereSesion, requiereAdministrador);

router.get("/", obtenerServicios);
router.post("/", crearServicio);
router.put("/:id", actualizarServicio);
router.patch("/:id/visibilidad", cambiarVisibilidadServicio);

module.exports = router;
