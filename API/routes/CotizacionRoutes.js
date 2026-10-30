const router = require("express").Router();
const { requiereSesion, requiereAdministrador } = require("../middleware/auth");
const { crearCotizacion, obtenerCotizaciones, obtenerCotizacion, actualizarCotizacion,
    publicarCotizacion, responderCotizacion } = require("../controllers/CotizacionController");

router.use(requiereSesion);
router.get("/", obtenerCotizaciones);
router.get("/:id", obtenerCotizacion);
router.post("/", requiereAdministrador, crearCotizacion);
router.put("/:id", requiereAdministrador, actualizarCotizacion);
router.patch("/:id/publicar", requiereAdministrador, publicarCotizacion);
router.patch("/:id/respuesta", (req, res, next) => {
    if (req.usuario.rol !== "cliente") return res.status(403).json({ message: "Solo los clientes pueden responder cotizaciones" });
    next();
}, responderCotizacion);

module.exports = router;
