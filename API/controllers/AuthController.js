const Usuario = require("../models/Usuario");
const bcrypt = require("bcrypt");

const iniciarSesion = async (req, res) => {
    try {
        const { correo, clave } = req.body ?? {};

        if (
            typeof correo !== "string" ||
            correo.trim() === "" ||
            typeof clave !== "string" ||
            clave.trim() === ""
        ) {
            return res.status(400).json({
                message: "El correo y la contraseña son obligatorios"
            });
        }

        const usuario = await Usuario.findOne({
            correo: correo.trim().toLowerCase()
        }).select("+clave");

        const claveValida = usuario
            ? await bcrypt.compare(clave, usuario.clave)
            : false;

        if (!usuario || !claveValida || !usuario.activo) {
            return res.status(401).json({
                message: "No se pudo iniciar sesión con esas credenciales"
            });
        }

        req.session.regenerate((error) => {
            if (error) {
                return res.status(500).json({
                    message: "No se pudo iniciar la sesión"
                });
            }

            req.session.usuarioId = usuario._id.toString();

            req.session.save((error) => {
                if (error) {
                    return res.status(500).json({
                        message: "No se pudo guardar la sesión"
                    });
                }

                return res.json({
                    mensaje: "Sesión iniciada",
                    datos: {
                        _id: usuario._id,
                        nombre: usuario.nombre,
                        correo: usuario.correo,
                        rol: usuario.rol
                    }
                });
            });
        });
    } catch (error) {
        return res.status(500).json({
            message: "No se pudo iniciar sesión"
        });
    }
};

const obtenerSesion = async (req, res) => {
    try {
        if (!req.session.usuarioId) {
            return res.status(401).json({
                message: "Debés iniciar sesión"
            });
        }

        const usuario = await Usuario.findById(req.session.usuarioId)
            .select("nombre correo rol activo");

        if (!usuario || !usuario.activo) {
            return req.session.destroy((error) => {
                res.clearCookie("lsct.sid", {
                    path: "/",
                    httpOnly: true,
                    secure: false,
                    sameSite: "lax"
                });

                if (error) {
                    return res.status(500).json({
                        message: "No se pudo invalidar la sesión"
                    });
                }

                return res.status(401).json({
                    message: "La sesión ya no es válida"
                });
            });
        }

        return res.json({
            datos: {
                _id: usuario._id,
                nombre: usuario.nombre,
                correo: usuario.correo,
                rol: usuario.rol
            }
        });
    } catch (error) {
        return res.status(500).json({
            message: "No se pudo consultar la sesión"
        });
    }
};

const cerrarSesion = (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            return res.status(500).json({
                message: "No se pudo cerrar la sesión"
            });
        }

        res.clearCookie("lsct.sid", {
            path: "/",
            httpOnly: true,
            secure: false,
            sameSite: "lax"
        });

        return res.json({
            mensaje: "Sesión cerrada"
        });
    });
};

module.exports = {
    iniciarSesion,
    obtenerSesion,
    cerrarSesion
};