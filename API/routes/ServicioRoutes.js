const express = require("express");
const router = express.Router();

const { crearServicio } = require("../controllers/ServicioController");
const {
    requiereSesion,
    requiereAdministrador
} = require("../middleware/auth");

// El registro de servicios requiere una sesión de administrador.
router.post("/", requiereSesion, requiereAdministrador, crearServicio);

module.exports = router;