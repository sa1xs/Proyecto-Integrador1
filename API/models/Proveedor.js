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
        trim: true,
        validate: {
            validator: valor => !valor || (/^\+?[0-9 ()-]+$/.test(valor) &&
                valor.replace(/[^0-9]/g, '').length >= 7 && valor.replace(/[^0-9]/g, '').length <= 15),
            message: 'El teléfono debe tener entre 7 y 15 dígitos; puede incluir + inicial, espacios, guiones y paréntesis'
        }
    },
    activo: {
        type: Boolean,
        default: true,
        required: true
    }
}, {
    timestamps: true
});

for (const campo of ['nombre', 'tipoServicio', 'correo', 'telefono']) {
    ProveedorSchema.path(campo).set(function (valor) {
        if (valor !== undefined && typeof valor !== 'string') {
            throw new mongoose.Error.CastError('String', valor, campo);
        }
        return valor;
    });
}

ProveedorSchema.pre('validate', function () {
    if (!this.correo && !this.telefono) {
        this.invalidate(
            'correo',
            'Debe indicar al menos un correo o teléfono de contacto'
        );
    }
});

module.exports = mongoose.model('Proveedor', ProveedorSchema);
