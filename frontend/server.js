const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5002;

app.get("/", (req, res) => {
    res.redirect("/views/login.html");
});

app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, (error) => {
    if (error) {
        console.error(error.code === "EADDRINUSE"
            ? `El puerto ${PORT} ya está ocupado. Cerrá la otra instancia del frontend o usá otro puerto.`
            : `No se pudo iniciar el frontend: ${error.message}`);
        process.exitCode = 1;
        return;
    }
    console.log(`Frontend disponible en http://localhost:${PORT}`);
});
