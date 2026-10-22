const Usuario = require("../models/Usuario");

const requiereSesion = async (req, res, next) => {
    try {
        if (!req.session?.usuarioId) {
            return res.status(401).json({
                message: "Debés iniciar sesión"
            });
        }

        const usuario = await Usuario.findById(req.session.usuarioId)
            .select("_id nombre correo rol activo");

        if (!usuario || !usuario.activo) {
            return res.status(401).json({
                message: "La sesión ya no es válida"
            });
        }

        req.usuario = usuario;
        next();
    } catch (error) {
        return res.status(500).json({
            message: "No se pudo verificar la sesión"
        });
    }
};

const requiereAdministrador = (req, res, next) => {
    if (!req.usuario) {
        return res.status(401).json({
            message: "Debés iniciar sesión"
        });
    }

    if (req.usuario.rol !== "administrador") {
        return res.status(403).json({
            message: "No tenés permisos para realizar esta operación"
        });
    }

    next();
};

module.exports = {
    requiereSesion,
    requiereAdministrador
};