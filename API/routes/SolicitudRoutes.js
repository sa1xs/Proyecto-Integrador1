const router = require("express").Router();
const { requiereSesion, requiereAdministrador } = require("../middleware/auth");
const { crearSolicitud, obtenerSolicitudes, obtenerSolicitud, actualizarSolicitud, cambiarEstadoSolicitud } = require("../controllers/SolicitudController");

const requiereCliente = (req, res, next) => {
    if (req.usuario.rol !== "cliente") {
        return res.status(403).json({ message: "Esta operación requiere una cuenta de cliente" });
    }
    return next();
};

router.use(requiereSesion);
router.get("/", obtenerSolicitudes);
router.get("/:id", obtenerSolicitud);
router.post("/", requiereCliente, crearSolicitud);
router.put("/:id", requiereCliente, actualizarSolicitud);
router.patch("/:id/estado", requiereAdministrador, cambiarEstadoSolicitud);

module.exports = router;
