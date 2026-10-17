const mongoose = require('mongoose');

const UsuarioSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: [true, 'El nombre es obligatorio'],
        trim: true
    },
    correo: {
        type: String,
        required: [true, 'El correo es obligatorio'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            'El formato del correo no es válido'
        ]
    },
    clave: {
        type: String,
        required: [true, 'La contraseña es obligatoria'],
        select: false
    },
    telefono: {
        type: String,
        trim: true
    },
    direccion: {
        type: String,
        trim: true
    },
    rol: {
        type: String,
        enum: ['cliente', 'administrador'],
        default: 'cliente',
        required: true
    },
    activo: {
        type: Boolean,
        default: true,
        required: true
    }
}, {
    // Agrega automáticamente createdAt y updatedAt.
    timestamps: true
});

module.exports = mongoose.model('Usuario', UsuarioSchema);