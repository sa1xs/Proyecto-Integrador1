const mongoose = require("mongoose");

function campoTexto(campo, obligatorio = false) {
    return {
        type: String,
        required: obligatorio,
        trim: true,
        set(valor) {
            if (valor !== undefined && valor !== null && typeof valor !== "string") {
                throw new mongoose.Error.CastError("String", valor, campo);
            }
            return valor;
        }
    };
}

const ConsultaSchema = new mongoose.Schema({
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true },
    pregunta: campoTexto("pregunta", true),
    respuesta: campoTexto("respuesta"),
    estado: { type: String, enum: ["Pendiente", "Respondida"], default: "Pendiente", required: true },
    fechaRespuesta: Date
}, { timestamps: true, optimisticConcurrency: true });

ConsultaSchema.pre("validate", function () {
    if (this.estado === "Pendiente" && (this.respuesta !== undefined || this.fechaRespuesta !== undefined)) {
        this.invalidate("estado", "Una consulta Pendiente no puede tener respuesta ni fecha de respuesta");
    }
    if (this.estado === "Respondida" && (!this.respuesta?.trim() || !this.fechaRespuesta)) {
        this.invalidate("respuesta", "Una consulta Respondida requiere respuesta y fecha");
    }
});

module.exports = mongoose.model("Consulta", ConsultaSchema);
