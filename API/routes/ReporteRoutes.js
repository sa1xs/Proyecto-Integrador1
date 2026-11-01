const router = require("express").Router();
const { requiereSesion, requiereAdministrador } = require("../middleware/auth");
const { obtenerCantidadesPorEstado } = require("../controllers/ReporteController");

router.use(requiereSesion, requiereAdministrador);
router.get("/estados", obtenerCantidadesPorEstado);

module.exports = router;
