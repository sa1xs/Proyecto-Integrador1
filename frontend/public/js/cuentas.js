import { API } from "./config.js";

const tabla = document.getElementById("filasCuentas");
const buscador = document.getElementById("buscarCuenta");
const sinCuentas = document.getElementById("sinCuentas");
const mensajePagina = document.getElementById("mensajePagina");

const elementoModal = document.getElementById("modalEstadoCuenta");
const modal = new bootstrap.Modal(elementoModal);
const tituloModal = document.getElementById("tituloEstadoCuenta");
const textoModal = document.getElementById("textoEstadoCuenta");
const mensajeModal = document.getElementById("mensajeEstadoCuenta");
const botonConfirmar = document.getElementById("btnConfirmarEstadoCuenta");

let cuentas = [];
let cuentaSeleccionada = null;

function mostrarMensaje(elemento, texto, tipo = "danger") {
    elemento.textContent = texto;
    elemento.className = texto ? `alert alert-${tipo}` : "d-none";
}

async function consultarAPI(url, metodo = "GET", datos = null) {
    const opciones = {
        method: metodo,
        credentials: "include"
    };

    if (datos !== null) {
        opciones.headers = { "Content-Type": "application/json" };
        opciones.body = JSON.stringify(datos);
    }

    let respuesta;

    try {
        respuesta = await fetch(url, opciones);
    } catch {
        throw new Error("No se pudo conectar con la API.");
    }

    if (respuesta.status === 401) {
        window.location.replace("/views/login.html");
        throw new Error("Debés iniciar sesión.");
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
            "No se pudo completar la operación."
        );
    }

    return resultado;
}

function mostrarCuentas() {
    const busqueda = buscador.value.trim().toLowerCase();

    const filtradas = cuentas.filter((cuenta) =>
        [cuenta.nombre, cuenta.correo, cuenta.rol].some((valor) =>
            String(valor ?? "").toLowerCase().includes(busqueda)
        )
    );

    tabla.replaceChildren();
    sinCuentas.hidden = filtradas.length !== 0;

    for (const cuenta of filtradas) {
        const fila = document.createElement("tr");

        for (const valor of [
            cuenta.nombre,
            cuenta.correo,
            cuenta.rol,
            cuenta.activo ? "Activa" : "Inactiva"
        ]) {
            const celda = document.createElement("td");
            celda.textContent = valor;
            fila.appendChild(celda);
        }

        const acciones = document.createElement("td");
        const boton = document.createElement("button");

        boton.type = "button";
        boton.className = "btn btn-naranja btn-sm";
        boton.textContent = cuenta.activo ? "Desactivar" : "Activar";
        boton.addEventListener("click", () => abrirConfirmacion(cuenta));

        acciones.appendChild(boton);
        fila.appendChild(acciones);
        tabla.appendChild(fila);
    }
}

async function cargarCuentas() {
    const resultado = await consultarAPI(API.USUARIOS);

    if (!Array.isArray(resultado)) {
        throw new Error("No se recibió un listado válido de cuentas.");
    }

    cuentas = resultado;
    mostrarCuentas();
}

function abrirConfirmacion(cuenta) {
    cuentaSeleccionada = cuenta;

    const accion = cuenta.activo ? "Desactivar" : "Activar";

    tituloModal.textContent = `${accion} cuenta`;
    textoModal.textContent =
        `¿Querés ${accion.toLowerCase()} la cuenta de ${cuenta.nombre}?`;
    botonConfirmar.textContent = accion;

    mostrarMensaje(mensajeModal, "");
    modal.show();
}

async function cambiarEstado() {
    if (!cuentaSeleccionada || botonConfirmar.disabled) return;

    const cuenta = cuentaSeleccionada;
    const nuevoEstado = !cuenta.activo;

    mostrarMensaje(mensajeModal, "");
    mostrarMensaje(mensajePagina, "");
    botonConfirmar.disabled = true;

    try {
        await consultarAPI(
            `${API.USUARIOS}/${cuenta._id}/estado`,
            "PATCH",
            { activo: nuevoEstado }
        );
    } catch (error) {
        mostrarMensaje(mensajeModal, error.message);
        return;
    } finally {
        botonConfirmar.disabled = false;
    }

    modal.hide();
    cuentaSeleccionada = null;

    cuenta.activo = nuevoEstado;
    mostrarCuentas();

    const confirmacion = nuevoEstado
        ? "Cuenta activada correctamente."
        : "Cuenta desactivada correctamente.";

    mostrarMensaje(mensajePagina, confirmacion, "success");

    try {
        await cargarCuentas();
    } catch (error) {
        mostrarMensaje(
            mensajePagina,
            `${confirmacion} No se pudo actualizar el listado. ${error.message}`,
            "warning"
        );
    }
}

buscador.addEventListener("input", mostrarCuentas);
botonConfirmar.addEventListener("click", cambiarEstado);

elementoModal.addEventListener("hide.bs.modal", (evento) => {
    if (botonConfirmar.disabled) evento.preventDefault();
});

cargarCuentas().catch((error) => {
    mostrarMensaje(mensajePagina, error.message);
});