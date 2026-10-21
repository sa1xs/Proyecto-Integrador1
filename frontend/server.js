const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5002;

// Abre la vista inicial al visitar la raíz del frontend.
app.get("/", (req, res) => {
    res.redirect("/views/login.html");
});

// Publica únicamente HTML, CSS y JavaScript de la carpeta public.
app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
    console.log(`Frontend disponible en http://localhost:${PORT}`);
});
