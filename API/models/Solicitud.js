const mongoose = require("mongoose");

// Conserva fechas de calendario exactas, sin desplazamientos de zona horaria.
function fechaValida(valor) {
    if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
    const fecha = new Date(`${valor}T00:00:00.000Z`);
    return Number.isFinite(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}

const SolicitudSchema = new mongoose.Schema({
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true },
    destino: { type: String, required: true, trim: true },
    fechaSalida: { type: String, required: true, validate: fechaValida },
    fechaRegreso: {
        type: String, required: true,
        validate: function (valor) { return fechaValida(valor) && valor >= this.fechaSalida; }
    },
    cantidadViajeros: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
    edades: {
        type: [Number], required: true, default: undefined,
        validate: function (valores) {
            return Array.isArray(valores) && valores.length === this.cantidadViajeros &&
                valores.every((edad) => Number.isSafeInteger(edad) && edad >= 0);
        }
    },
    estado: { type: String, enum: ["Nueva"], default: "Nueva", required: true }
}, { timestamps: true });

module.exports = mongoose.model("Solicitud", SolicitudSchema);
module.exports.fechaValida = fechaValida;
