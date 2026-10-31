const router = require("express").Router();
const { requiereSesion, requiereAdministrador } = require("../middleware/auth");
const { obtenerDestinosPublicos, obtenerDestinoPublico, obtenerDestinos,
    obtenerDestino, crearDestino, actualizarDestino, cambiarEstadoDestino } = require("../controllers/DestinoController");

router.get("/publicos", obtenerDestinosPublicos);
router.get("/publicos/:id", obtenerDestinoPublico);

router.use(requiereSesion, requiereAdministrador);
router.get("/", obtenerDestinos);
router.get("/:id", obtenerDestino);
router.post("/", crearDestino);
router.put("/:id", actualizarDestino);
router.patch("/:id/estado", cambiarEstadoDestino);

module.exports = router;
