const router = require("express").Router();
const { requiereSesion } = require("../middleware/auth");
const { obtenerFavoritos, agregarFavorito, retirarFavorito, destinos } = require("../controllers/FavoritoController");

router.use(requiereSesion);
router.use((req, res, next) => {
    if (req.usuario.rol !== "cliente") {
        return res.status(403).json({ message: "Favoritos está disponible únicamente para clientes" });
    }
    next();
});
router.get("/", obtenerFavoritos);
router.post("/", agregarFavorito);
router.get("/destinos", destinos.obtenerFavoritos);
router.post("/destinos", destinos.agregarFavorito);
router.delete("/destinos/:destinoId", destinos.retirarFavorito);
router.delete("/:servicioId", retirarFavorito);

module.exports = router;
