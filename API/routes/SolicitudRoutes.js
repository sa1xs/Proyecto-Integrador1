const router = require("express").Router();
const { requiereSesion } = require("../middleware/auth");
const { crearSolicitud } = require("../controllers/SolicitudController");

router.post("/", requiereSesion, (req, res, next) => {
    if (req.usuario.rol !== "cliente") {
        return res.status(403).json({ message: "Solo los clientes pueden crear solicitudes de cotización" });
    }
    return next();
}, crearSolicitud);

module.exports = router;
