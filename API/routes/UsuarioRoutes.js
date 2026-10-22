const express = require("express");
const router = express.Router();

const {
    obtenerUsuarios,
    obtenerUsuarioPorId,
    crearUsuario,
    actualizarUsuario,
    eliminarUsuario
} = require("../controllers/UsuarioController");

const {
    requiereSesion,
    requiereAdministrador
} = require("../middleware/auth");

router.post("/", crearUsuario);

router.use(requiereSesion, requiereAdministrador);

router.get("/", obtenerUsuarios);
router.get("/:id", obtenerUsuarioPorId);
router.put("/:id", actualizarUsuario);
router.delete("/:id", eliminarUsuario);

module.exports = router;