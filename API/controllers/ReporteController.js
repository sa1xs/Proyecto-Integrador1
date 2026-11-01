const Solicitud = require("../models/Solicitud");
const Cotizacion = require("../models/Cotizacion");

async function contarPorEstado(modelo) {
    const cantidades = {};
    // Incluye los estados del modelo, aunque no tengan registros.
    for (const estado of modelo.schema.path("estado").enumValues) cantidades[estado] = 0;
    const grupos = await modelo.aggregate([
        { $group: { _id: "$estado", cantidad: { $sum: 1 } } }
    ]);
    for (const grupo of grupos) {
        if (Object.hasOwn(cantidades, grupo._id)) cantidades[grupo._id] = grupo.cantidad;
    }
    return cantidades;
}

const obtenerCantidadesPorEstado = async (req, res, next) => {
    try {
        if (Object.keys(req.query).length) {
            return res.status(400).json({ message: "Este reporte no admite filtros" });
        }
        const [solicitudes, cotizaciones] = await Promise.all([
            contarPorEstado(Solicitud), contarPorEstado(Cotizacion)
        ]);
        return res.json({ solicitudes, cotizaciones });
    } catch (error) { return next(error); }
};

module.exports = { obtenerCantidadesPorEstado };
