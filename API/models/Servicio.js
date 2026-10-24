const mongoose = require("mongoose");

const ServicioSchema = new mongoose.Schema(
    {
        nombre: {
            type: String,
            required: [true, "El nombre del servicio es obligatorio"],
            trim: true
        },
        tipo: {
            type: String,
            required: [true, "El tipo de servicio es obligatorio"],
            trim: true
        },
        descripcion: {
            type: String,
            required: [true, "La descripción del servicio es obligatoria"],
            trim: true
        },
        proveedor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Proveedor",
            required: [true, "El proveedor es obligatorio"]
        },
        activo: {
            type: Boolean,
            default: true,
            required: true
        },
        publicado: {
            type: Boolean,
            default: false,
            required: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Servicio", ServicioSchema);