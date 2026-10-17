require('dotenv').config();

const express = require('express');
const cors = require('cors');
const conectarDB = require('./config/db');

const app = express()
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.json ({message: 'Welcome to API'})
});

app.use('/usuarios', require('./routes/UsuarioRoutes'));
app.use('/proveedores', require('./routes/ProveedorRoutes'));

const iniciarServidor = async () => {
    try {
        await conectarDB();

        app.listen(PORT, () => {
            console.log(`Servidor disponible en http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('No se pudo iniciar la aplicación:', error.message);
    }
};

iniciarServidor();