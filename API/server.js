require("dotenv").config();

const express = require("express");
const cors = require("cors");
const session = require("express-session");
const conectarDB = require("./config/db");

const { rutaNoEncontrada, manejarErrores } = require("./middleware/errores");

const app = express();
const PORT = process.env.PORT || 5001;

if (!process.env.SESSION_SECRET) {
    throw new Error("Falta configurar SESSION_SECRET en .env");
}

app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5002",
    credentials: true
}));

app.use(express.json());

app.use(session({
    name: "lsct.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 1000 * 60 * 60
    }
}));

app.get("/", (req, res) => {
    res.json({ message: "Welcome to API" });
});

app.use("/auth", require("./routes/AuthRoutes"));
app.use("/usuarios", require("./routes/UsuarioRoutes"));
app.use("/proveedores", require("./routes/ProveedorRoutes"));
app.use("/servicios", require("./routes/ServicioRoutes"));
app.use("/solicitudes", require("./routes/SolicitudRoutes"));
app.use("/cotizaciones", require("./routes/CotizacionRoutes"));
app.use("/destinos", require("./routes/DestinoRoutes"));
app.use("/favoritos", require("./routes/FavoritoRoutes"));

app.use(rutaNoEncontrada);
app.use(manejarErrores);

const iniciarServidor = async () => {
    try {
        await conectarDB();

        app.listen(PORT, () => {
            console.log(`Servidor disponible en http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("No se pudo iniciar la aplicación. Revisá la configuración y MongoDB.");
    }
};

iniciarServidor();
