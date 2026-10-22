import { API } from "./config.js";

const formulario = document.getElementById("formularioRegistro");
const mensaje = document.getElementById("mensajeRegistro");
const boton = document.getElementById("btnRegistrar");

const nombre = document.getElementById("nombreRegistro");
const correo = document.getElementById("correoRegistro");
const telefono = document.getElementById("telefonoRegistro");
const direccion = document.getElementById("direccionRegistro");
const clave = document.getElementById("claveRegistro");
const confirmacion = document.getElementById("confirmacionRegistro");

function mostrarMensaje(texto, tipo = "danger") {
    mensaje.textContent = texto;
    mensaje.className = `alert alert-${tipo}`;
}

formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    if (boton.disabled) return;

    mensaje.textContent = "";
    mensaje.className = "d-none";

    if (!nombre.value.trim() || !clave.value.trim()) {
        mostrarMensaje("El nombre y la contraseña no pueden estar vacíos.");
        return;
    }

    if (clave.value !== confirmacion.value) {
        mostrarMensaje("Las contraseñas no coinciden.");
        return;
    }

    const datos = {
        nombre: nombre.value.trim(),
        correo: correo.value.trim().toLowerCase(),
        telefono: telefono.value.trim(),
        direccion: direccion.value.trim(),
        clave: clave.value
    };

    boton.disabled = true;
    boton.textContent = "Creando cuenta...";

    try {
        let respuesta;

        try {
            respuesta = await fetch(API.USUARIOS, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(datos)
            });
        } catch {
            throw new Error("No se pudo conectar con la API.");
        }

        let resultado;

        try {
            resultado = await respuesta.json();
        } catch {
            throw new Error("La API devolvió una respuesta inesperada.");
        }

        if (!respuesta.ok) {
            throw new Error(
                resultado.message ||
                resultado.mensaje ||
                "No se pudo crear la cuenta."
            );
        }

        formulario.reset();
        mostrarMensaje(
            "Cuenta creada correctamente. Ya podés iniciar sesión.",
            "success"
        );
    } catch (error) {
        mostrarMensaje(error.message);
    } finally {
        boton.disabled = false;
        boton.textContent = "Crear cuenta";
    }
});