const router = require("express").Router();
const { requiereSesion } = require("../middleware/auth");
const { obtenerFavoritos, agregarFavorito, retirarFavorito } = require("../controllers/FavoritoController");

router.use(requiereSesion);
router.use((req, res, next) => {
    if (req.usuario.rol !== "cliente") {
        return res.status(403).json({ message: "Favoritos está disponible únicamente para clientes" });
    }
    next();
});
router.get("/", obtenerFavoritos);
router.post("/", agregarFavorito);
router.delete("/:servicioId", retirarFavorito);

module.exports = router;
