const router = require("express").Router();
const { requiereSesion, requiereAdministrador } = require("../middleware/auth");
const { crearSolicitud, obtenerSolicitudes, obtenerSolicitud, actualizarSolicitud, cambiarEstadoSolicitud } = require("../controllers/SolicitudController");
const { obtenerViajeros, crearViajero, actualizarViajero, retirarViajero } = require("../controllers/ViajeroController");
const { registrarContacto, obtenerContactos } = require("../controllers/SeguimientoController");

const requiereCliente = (req, res, next) => {
    if (req.usuario.rol !== "cliente") {
        return res.status(403).json({ message: "Esta operación requiere una cuenta de cliente" });
    }
    return next();
};

router.use(requiereSesion);
router.get("/:id/contactos", requiereAdministrador, obtenerContactos);
router.post("/:id/contactos", requiereAdministrador, registrarContacto);
router.get("/:id/viajeros", requiereCliente, obtenerViajeros);
router.post("/:id/viajeros", requiereCliente, crearViajero);
router.put("/:id/viajeros/:viajeroId", requiereCliente, actualizarViajero);
router.delete("/:id/viajeros/:viajeroId", requiereCliente, retirarViajero);
router.get("/", obtenerSolicitudes);
router.get("/:id", obtenerSolicitud);
router.post("/", requiereCliente, crearSolicitud);
router.put("/:id", requiereCliente, actualizarSolicitud);
router.patch("/:id/estado", requiereAdministrador, cambiarEstadoSolicitud);

module.exports = router;
