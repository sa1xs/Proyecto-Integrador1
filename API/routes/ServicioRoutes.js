const express = require("express");
const router = express.Router();

const {
    crearServicio,
    obtenerServicios
} = require("../controllers/ServicioController");

const {
    requiereSesion,
    requiereAdministrador
} = require("../middleware/auth");

router.use(requiereSesion, requiereAdministrador);

router.get("/", obtenerServicios);
router.post("/", crearServicio);

module.exports = router;