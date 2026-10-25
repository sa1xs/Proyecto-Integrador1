const Solicitud = require("../models/Solicitud");
const { fechaValida } = Solicitud;

const crearSolicitud = async (req, res, next) => {
    try {
        const { destino, fechaSalida, fechaRegreso, cantidadViajeros, edades } = req.body ?? {};
        if (typeof destino !== "string" || !destino.trim()) {
            return res.status(400).json({ message: "El destino es obligatorio" });
        }
        if (!fechaValida(fechaSalida) || !fechaValida(fechaRegreso) || fechaRegreso < fechaSalida) {
            return res.status(400).json({ message: "Indicá fechas válidas; el regreso no puede ser anterior a la salida" });
        }
        if (!Number.isSafeInteger(cantidadViajeros) || cantidadViajeros < 1 ||
            !Array.isArray(edades) || edades.length !== cantidadViajeros ||
            !edades.every((edad) => Number.isSafeInteger(edad) && edad >= 0)) {
            return res.status(400).json({ message: "La cantidad de viajeros debe coincidir con sus edades, expresadas en enteros no negativos" });
        }
        const solicitud = await Solicitud.create({
            cliente: req.usuario._id, destino: destino.trim(), fechaSalida,
            fechaRegreso, cantidadViajeros, edades, estado: "Nueva"
        });
        return res.status(201).json({ mensaje: "Solicitud registrada", datos: solicitud });
    } catch (error) {
        return next(error);
    }
};

module.exports = { crearSolicitud };
