const express = require("express");
const router = express.Router();

const {
    crearServicio,
    obtenerServicios,
    actualizarServicio,
    cambiarVisibilidadServicio
} = require("../controllers/ServicioController");

const {
    requiereSesion,
    requiereAdministrador
} = require("../middleware/auth");

router.use(requiereSesion, requiereAdministrador);

router.get("/", obtenerServicios);
router.post("/", crearServicio);
router.put("/:id", actualizarServicio);
router.patch("/:id/visibilidad", cambiarVisibilidadServicio);

module.exports = router;
