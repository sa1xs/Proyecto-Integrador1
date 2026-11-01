const router = require("express").Router();
const { requiereSesion, requiereAdministrador } = require("../middleware/auth");
const { crearConsulta, obtenerConsultas, obtenerConsulta, responderConsulta } = require("../controllers/ConsultaController");

router.use(requiereSesion);
router.get("/", obtenerConsultas);
router.get("/:id", obtenerConsulta);
router.post("/", (req, res, next) => {
    if (req.usuario.rol !== "cliente") return res.status(403).json({ message: "Solo los clientes pueden crear consultas" });
    next();
}, crearConsulta);
router.patch("/:id/respuesta", requiereAdministrador, responderConsulta);

module.exports = router;
