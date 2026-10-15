const mongoose = require('mongoose');

const conectarDB = async () => {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Conexión con MongoDB establecida');
};

module.exports = conectarDB;