const express = require("express");
const router = express.Router();

const {
    iniciarSesion,
    obtenerSesion,
    cerrarSesion
} = require("../controllers/AuthController");

router.post("/login", iniciarSesion);
router.get("/sesion", obtenerSesion);
router.post("/logout", cerrarSesion);

module.exports = router;