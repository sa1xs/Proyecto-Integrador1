import { API } from "./config.js";

const formulario = document.getElementById("formularioSolicitud");
const cantidad = document.getElementById("cantidadViajeros");
const edades = document.getElementById("edadesViajeros");
const salida = document.getElementById("fechaSalida");
const regreso = document.getElementById("fechaRegreso");
const destino = document.getElementById("destinoSolicitud");
const boton = document.getElementById("btnEnviarSolicitud");
const mensaje = document.getElementById("mensajeFormularioSolicitud");
let esCliente = false;
let enviando = false;

function mostrarMensaje(texto, tipo = "danger") {
    mensaje.textContent = texto;
    mensaje.className = texto ? `alert alert-${tipo}` : "d-none";
}

function actualizarEdades() {
    const numero = Number(cantidad.value);
    if (!Number.isSafeInteger(numero) || numero < 1) return;
    // Agrega o retira únicamente los campos necesarios y conserva las edades existentes.
    while (edades.children.length > numero) edades.lastElementChild.remove();
    while (edades.children.length < numero) {
        const indice = edades.children.length + 1;
        const grupo = document.createElement("div");
        grupo.className = "col-sm-6 col-md-3";
        const etiqueta = document.createElement("label");
        etiqueta.className = "form-label";
        etiqueta.htmlFor = `edadViajero${indice}`;
        etiqueta.textContent = `Edad del viajero ${indice}`;
        const campo = document.createElement("input");
        campo.id = etiqueta.htmlFor;
        campo.name = "edades[]";
        campo.type = "number";
        campo.min = "0";
        campo.step = "1";
        campo.required = true;
        campo.className = "form-control";
        grupo.append(etiqueta, campo);
        edades.appendChild(grupo);
    }
}

function validarFechas() {
    regreso.setCustomValidity(salida.value && regreso.value && regreso.value < salida.value
        ? "El regreso no puede ser anterior a la salida." : "");
}

cantidad.addEventListener("change", actualizarEdades);
salida.addEventListener("input", validarFechas);
regreso.addEventListener("input", validarFechas);

formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    if (!esCliente || enviando) return;
    actualizarEdades();
    validarFechas();
    if (!formulario.reportValidity()) return;
    if (!destino.value.trim()) {
        mostrarMensaje("Indicá un destino válido.");
        return;
    }
    const datos = {
        destino: destino.value.trim(), fechaSalida: salida.value,
        fechaRegreso: regreso.value, cantidadViajeros: Number(cantidad.value),
        edades: [...edades.querySelectorAll("input")].map((campo) => Number(campo.value))
    };
    enviando = true;
    boton.disabled = true;
    boton.textContent = "Enviando...";
    mostrarMensaje("");
    try {
        let respuesta;
        try {
            respuesta = await fetch(API.SOLICITUDES, {
                method: "POST", credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(datos)
            });
        } catch {
            throw new Error("No se pudo conectar con la API. Tus datos se conservaron.");
        }
        if (respuesta.status === 401) {
            window.location.replace("/views/login.html");
            return;
        }
        const resultado = await respuesta.json();
        if (!respuesta.ok) {
            throw new Error(resultado.errores?.join(" ") || resultado.message || "No se pudo registrar la solicitud.");
        }
        formulario.reset();
        edades.replaceChildren();
        cantidad.value = "1";
        actualizarEdades();
        mostrarMensaje(`Solicitud registrada correctamente. Código: ${resultado.datos._id}. Estado: ${resultado.datos.estado}.`, "success");
    } catch (error) {
        mostrarMensaje(error.message);
    } finally {
        enviando = false;
        boton.disabled = !esCliente;
        boton.textContent = "Enviar solicitud";
    }
});

async function iniciar() {
    try {
        const respuesta = await fetch(`${API.AUTH}/sesion`, { credentials: "include" });
        if (respuesta.status === 401) {
            window.location.replace("/views/login.html");
            return;
        }
        if (!respuesta.ok) throw new Error("No se pudo verificar la sesión.");
        const resultado = await respuesta.json();
        esCliente = resultado.datos?.rol === "cliente";
        boton.disabled = !esCliente;
    } catch {
        mostrarMensaje("No se pudo verificar la sesión. Recargá la página.");
    }
    // Las consultas y gestión se implementan en el sprint 2.
    for (const id of ["tab-mis-solicitudes", "tab-gestion"]) {
        const tab = document.getElementById(id);
        tab.disabled = true;
        tab.title = "Disponible en una próxima entrega";
    }
}

iniciar();
