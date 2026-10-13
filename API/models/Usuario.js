const mongoose = require('mongoose');

const UsuarioSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        trim: true  
    },
    correo: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true 
    },
    clave: {
        type: String,
        required: true,
        trim: true 
    }
});

module.exports = mongoose.model('Usuario', UsuarioSchema)