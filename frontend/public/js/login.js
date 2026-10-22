import { API } from "./config.js";

const formulario = document.getElementById("formularioLogin");
const mensaje = document.getElementById("mensajeLogin");
const boton = document.getElementById("btnIniciarSesion");
const correo = document.getElementById("correoAcceso");
const clave = document.getElementById("claveAcceso");

function mostrarMensaje(texto) {
    mensaje.textContent = texto;
    mensaje.className = "alert alert-danger";
}

formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    if (boton.disabled) return;

    mensaje.textContent = "";
    mensaje.className = "d-none";

    if (!correo.value.trim() || !clave.value.trim()) {
        mostrarMensaje("Completá el correo y la contraseña.");
        return;
    }

    boton.disabled = true;
    boton.textContent = "Ingresando...";

    try {
        let respuesta;

        try {
            respuesta = await fetch(`${API.AUTH}/login`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    correo: correo.value.trim().toLowerCase(),
                    clave: clave.value
                })
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
                "No se pudo iniciar sesión."
            );
        }

        const rol = resultado.datos?.rol;

        if (rol === "administrador") {
            window.location.replace("/views/cuentas.html");
        } else if (rol === "cliente") {
            window.location.replace("/views/clientes.html");
        } else {
            throw new Error("La API devolvió un rol no reconocido.");
        }
    } catch (error) {
        mostrarMensaje(error.message);
    } finally {
        boton.disabled = false;
        boton.textContent = "Iniciar sesión";
    }
});