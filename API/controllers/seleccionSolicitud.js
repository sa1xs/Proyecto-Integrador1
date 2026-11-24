const Destino = require("../models/Destino");
const Servicio = require("../models/Servicio");

const idValido = id => typeof id === "string" && /^[a-fA-F0-9]{24}$/.test(id);

async function validarSeleccion(destinoId, servicioId, publico = true) {
    if (!idValido(destinoId) || !idValido(servicioId)) {
        return { error: "Seleccioná un destino y un servicio principal válidos" };
    }

    const [destino, servicio] = await Promise.all([
        Destino.findOne({ _id: destinoId, ...(publico ? Destino.filtroPublico : { activo: true }) }),
        Servicio.findOne({ _id: servicioId, activo: true, ...(publico ? { publicado: true } : {}) })
            .populate("proveedor", "activo")
    ]);
    if (!destino) return { error: "El destino no está disponible" };
    if (!servicio?.proveedor?.activo || !servicio.destinos.some(id => id.equals(destino._id))) {
        return { error: "El servicio principal no está disponible para ese destino" };
    }

    return { datos: { destinoId: destino._id, servicioId: servicio._id,
        destino: destino.nombre, servicioSolicitado: servicio.nombre } };
}

module.exports = { idValido, validarSeleccion };
