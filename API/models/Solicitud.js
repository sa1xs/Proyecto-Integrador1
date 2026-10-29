const mongoose = require("mongoose");
const { createHash } = require("node:crypto");

const ViajeroSchema = new mongoose.Schema({
    nombre: { type: String, trim: true },
    edad: { type: Number, required: true, min: 0, validate: Number.isSafeInteger }
});

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
    viajeros: { type: [ViajeroSchema], default: undefined, validate: viajeros => viajeros.length > 0 },
    estado: { type: String, enum: ["Nueva", "En cotización", "Cotizada"], default: "Nueva", required: true },
    cotizacion: { type: mongoose.Schema.Types.ObjectId, ref: "Cotizacion" }
}, { timestamps: true, optimisticConcurrency: true });

// Los registros anteriores obtienen IDs estables sin escribir durante una consulta.
SolicitudSchema.post("init", function (documento) {
    if (documento.viajeros === undefined && Array.isArray(documento.edades)) {
        documento.viajeros = documento.edades.map((edad, indice) => ({
            _id: new mongoose.Types.ObjectId(createHash("sha256")
                .update(`${documento._id}:viajero:${indice}`).digest("hex").slice(0, 24)),
            edad
        }));
    }
});

// Compatibilidad con POST/PUT anteriores: mantiene IDs y nombres por posición.
SolicitudSchema.methods.actualizarComposicion = function (edades) {
    const anteriores = this.viajeros ?? [];
    this.viajeros = edades.map((edad, indice) => anteriores[indice]
        ? { _id: anteriores[indice]._id, nombre: anteriores[indice].nombre, edad }
        : { edad });
};

SolicitudSchema.pre("validate", function () {
    if (this.viajeros === undefined && Array.isArray(this.edades)) {
        this.actualizarComposicion(this.edades);
    }
    if (Array.isArray(this.viajeros)) {
        this.cantidadViajeros = this.viajeros.length;
        this.edades = this.viajeros.map(viajero => viajero.edad);
    }
});

module.exports = mongoose.model("Solicitud", SolicitudSchema);
module.exports.fechaValida = fechaValida;
