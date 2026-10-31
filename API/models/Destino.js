const mongoose = require("mongoose");

function textoObligatorio(campo) {
    return {
        type: String,
        required: true,
        trim: true,
        set(valor) {
            if (valor !== undefined && valor !== null && typeof valor !== "string") {
                throw new mongoose.Error.CastError("String", valor, campo);
            }
            return valor;
        }
    };
}

const DestinoSchema = new mongoose.Schema({
    nombre: textoObligatorio("nombre"),
    pais: textoObligatorio("pais"),
    descripcion: textoObligatorio("descripcion"),
    activo: { type: Boolean, default: true, required: true }
}, { timestamps: true, optimisticConcurrency: true });

module.exports = mongoose.model("Destino", DestinoSchema);
