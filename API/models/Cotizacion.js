const mongoose = require("mongoose");

// Calcula en centavos enteros para evitar errores como 0.1 + 0.2.
function calcularPartidas(partidas) {
    let totalCentavos = 0n;
    const subtotales = partidas.map(partida => {
        if (!Number.isSafeInteger(partida.cantidad) || partida.cantidad < 1 ||
            typeof partida.precio !== "number" || !Number.isFinite(partida.precio) || partida.precio < 0 ||
            !/^\d+(\.\d{1,2})?$/.test(String(partida.precio))) {
            throw new Error("Cada partida requiere cantidad entera positiva y precio no negativo con máximo dos decimales");
        }
        const [entero, decimal = ""] = String(partida.precio).split(".");
        const precioCentavos = BigInt(entero) * 100n + BigInt(decimal.padEnd(2, "0"));
        const subtotal = precioCentavos * BigInt(partida.cantidad);
        totalCentavos += subtotal;
        if (precioCentavos > BigInt(Number.MAX_SAFE_INTEGER) || totalCentavos > BigInt(Number.MAX_SAFE_INTEGER)) {
            throw new Error("El importe supera el máximo permitido");
        }
        return Number(subtotal) / 100;
    });
    return { subtotales, total: Number(totalCentavos) / 100 };
}

const PartidaSchema = new mongoose.Schema({
    servicio: { type: mongoose.Schema.Types.ObjectId, ref: "Servicio", required: true },
    // Copia comercial para conservar lo ofrecido aunque el servicio cambie después.
    nombre: { type: String, required: true },
    tipo: { type: String, required: true },
    descripcion: { type: String, required: true },
    cantidad: { type: Number, required: true },
    precio: { type: Number, required: true },
    subtotal: { type: Number, required: true }
});

const CotizacionSchema = new mongoose.Schema({
    solicitud: { type: mongoose.Schema.Types.ObjectId, ref: "Solicitud", required: true, unique: true },
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true },
    partidas: { type: [PartidaSchema], default: [], required: true },
    total: { type: Number, required: true, default: 0 },
    moneda: { type: String, enum: ["CRC"], default: "CRC", required: true },
    estado: { type: String, enum: ["Borrador", "Publicada", "Aceptada", "Rechazada"], default: "Borrador", required: true },
    fechaPublicacion: Date,
    clienteRespuesta: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario" },
    fechaRespuesta: Date
}, { timestamps: true, optimisticConcurrency: true });

CotizacionSchema.pre("validate", function () {
    if (!Array.isArray(this.partidas)) {
        this.invalidate("partidas", "Partidas debe ser una lista");
        return;
    }
    try {
        const calculo = calcularPartidas(this.partidas);
        this.partidas.forEach((partida, indice) => { partida.subtotal = calculo.subtotales[indice]; });
        this.total = calculo.total;
    } catch (error) { this.invalidate("partidas", error.message); }
    const ids = this.partidas.map(partida => String(partida.servicio));
    if (new Set(ids).size !== ids.length) this.invalidate("partidas", "No se permiten servicios duplicados");
    if (this.estado !== "Borrador" && (!this.partidas.length || !this.fechaPublicacion)) {
        this.invalidate("estado", "La publicación requiere partidas y fecha");
    }
    if (["Aceptada", "Rechazada"].includes(this.estado) &&
        (!this.fechaRespuesta || String(this.clienteRespuesta) !== String(this.cliente))) {
        this.invalidate("clienteRespuesta", "La respuesta requiere el cliente propietario y fecha");
    }
});

module.exports = mongoose.model("Cotizacion", CotizacionSchema);
module.exports.calcularPartidas = calcularPartidas;
