const mongoose = require('mongoose');

const ProveedorSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: [true, 'El nombre del proveedor es obligatorio'],
        trim: true
    },
    tipoServicio: {
        type: String,
        required: [true, 'El tipo de servicio es obligatorio'],
        trim: true
    },
    correo: {
        type: String,
        lowercase: true,
        trim: true,
        validate: {
            validator: (valor) =>
                !valor || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor),
            message: 'El formato del correo no es válido'
        }
    },
    telefono: {
        type: String,
        trim: true
    },
    activo: {
        type: Boolean,
        default: true,
        required: true
    }
}, {
    timestamps: true
});

ProveedorSchema.pre('validate', function () {
    if (!this.correo && !this.telefono) {
        this.invalidate(
            'correo',
            'Debe indicar al menos un correo o teléfono de contacto'
        );
    }
});

module.exports = mongoose.model('Proveedor', ProveedorSchema);