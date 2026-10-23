import { API } from "./config.js";

const mensajePagina = document.getElementById("mensajePagina");
const formularioPerfil = document.getElementById("formularioPerfil");
const mensajePerfil = document.getElementById("mensajePerfil");
const botonGuardarPerfil = document.getElementById("btnGuardarPerfil");
const botonEditarPerfil = document.getElementById("btnEditarPerfil");

const nombrePerfil = document.getElementById("nombrePerfil");
const correoPerfil = document.getElementById("correoPerfil");
const telefonoPerfil = document.getElementById("telefonoPerfil");
const direccionPerfil = document.getElementById("direccionPerfil");

const elementoModalPerfil = document.getElementById("modalPerfil");
const modalPerfil = new bootstrap.Modal(elementoModalPerfil);

const buscador = document.getElementById("buscarCliente");
const tabla = document.getElementById("filasClientes");
const sinClientes = document.getElementById("sinClientes");

const elementoModalCliente = document.getElementById("modalCliente");
const modalCliente = new bootstrap.Modal(elementoModalCliente);
const mensajeDetalle = document.getElementById("mensajeDetalleCliente");
const mensajeHistorial = document.getElementById("mensajeHistorialCliente");

let perfil = null;
let esAdministrador = false;
let guardandoPerfil = false;
let temporizadorBusqueda;
let numeroBusqueda = 0;
let numeroDetalle = 0;

function mostrarMensaje(elemento, texto, tipo = "danger") {
    elemento.textContent = texto;
    elemento.className = texto ? `alert alert-${tipo}` : "d-none";
}

function mostrarDato(id, valor) {
    document.getElementById(id).textContent = valor || "No registrado";
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
        const errores = Array.isArray(resultado.errores)
            ? resultado.errores.join(" ")
            : "";

        throw new Error(
            errores ||
            resultado.message ||
            resultado.mensaje ||
            "No se pudo completar la operación."
        );
    }

    return resultado;
}

function mostrarPerfil() {
    mostrarDato("perfilNombre", perfil.nombre);
    mostrarDato("perfilCorreo", perfil.correo);
    mostrarDato("perfilTelefono", perfil.telefono);
    mostrarDato("perfilDireccion", perfil.direccion);
}

async function cargarPerfil() {
    const resultado = await consultarAPI(`${API.USUARIOS}/perfil`);

    if (!resultado.datos?._id) {
        throw new Error("No se recibió un perfil válido.");
    }

    perfil = resultado.datos;
    mostrarPerfil();
    botonEditarPerfil.disabled = false;
}

function prepararEdicion(evento) {
    if (!perfil) {
        evento.preventDefault();
        return;
    }

    formularioPerfil.reset();
    mostrarMensaje(mensajePerfil, "");

    nombrePerfil.value = perfil.nombre || "";
    correoPerfil.value = perfil.correo || "";
    telefonoPerfil.value = perfil.telefono || "";
    direccionPerfil.value = perfil.direccion || "";
}

async function guardarPerfil(evento) {
    evento.preventDefault();

    if (guardandoPerfil || !perfil) return;
    if (!formularioPerfil.reportValidity()) return;

    mostrarMensaje(mensajePerfil, "");
    mostrarMensaje(mensajePagina, "");

    const datos = {
        nombre: nombrePerfil.value.trim(),
        correo: correoPerfil.value.trim().toLowerCase(),
        telefono: telefonoPerfil.value.trim(),
        direccion: direccionPerfil.value.trim()
    };

    if (!datos.nombre || !datos.correo) {
        mostrarMensaje(
            mensajePerfil,
            "El nombre y el correo son obligatorios."
        );
        return;
    }

    guardandoPerfil = true;
    botonGuardarPerfil.disabled = true;
    botonGuardarPerfil.textContent = "Guardando...";

    try {
        const resultado = await consultarAPI(
            `${API.USUARIOS}/perfil`,
            "PUT",
            datos
        );

        if (!resultado.datos?._id) {
            throw new Error(
                "No se recibió el perfil actualizado. Recargá la página para verificar los datos."
            );
        }

        perfil = resultado.datos;
        mostrarPerfil();
    } catch (error) {
        mostrarMensaje(mensajePerfil, error.message);
        return;
    } finally {
        guardandoPerfil = false;
        botonGuardarPerfil.disabled = false;
        botonGuardarPerfil.textContent = "Guardar cambios";
    }

    modalPerfil.hide();

    mostrarMensaje(
        mensajePagina,
        "Perfil actualizado correctamente.",
        "success"
    );
}

function mostrarClientes(clientes) {
    tabla.replaceChildren();
    sinClientes.hidden = clientes.length !== 0;

    for (const cliente of clientes) {
        const fila = document.createElement("tr");

        for (const valor of [
            cliente.nombre,
            cliente.correo,
            cliente.telefono
        ]) {
            const celda = document.createElement("td");
            celda.textContent = valor || "No registrado";
            fila.appendChild(celda);
        }

        const acciones = document.createElement("td");
        const botonDetalle = document.createElement("button");

        botonDetalle.type = "button";
        botonDetalle.className = "btn btn-turquesa btn-sm";
        botonDetalle.textContent = "Ver detalle";

        botonDetalle.addEventListener("click", () => {
            abrirDetalle(cliente._id);
        });

        acciones.appendChild(botonDetalle);
        fila.appendChild(acciones);
        tabla.appendChild(fila);
    }
}

async function cargarClientes(numero) {
    const parametros = new URLSearchParams({
        rol: "cliente",
        buscar: buscador.value.trim()
    });

    try {
        const resultado = await consultarAPI(
            `${API.USUARIOS}?${parametros}`
        );

        if (numero !== numeroBusqueda) return;

        if (!Array.isArray(resultado)) {
            throw new Error("No se recibió un listado válido de clientes.");
        }

        mostrarClientes(resultado);
        mostrarMensaje(mensajePagina, "");
    } catch (error) {
        if (numero !== numeroBusqueda) return;

        tabla.replaceChildren();
        sinClientes.hidden = true;
        mostrarMensaje(mensajePagina, error.message);
    }
}

function buscarClientes() {
    if (!esAdministrador) return;

    clearTimeout(temporizadorBusqueda);

    const numero = ++numeroBusqueda;

    tabla.replaceChildren();
    sinClientes.hidden = true;
    mostrarMensaje(mensajePagina, "Buscando clientes...", "info");

    temporizadorBusqueda = setTimeout(() => {
        cargarClientes(numero);
    }, 300);
}

async function abrirDetalle(id) {
    if (!esAdministrador) return;

    const numero = ++numeroDetalle;

    for (const campo of [
        "detalleClienteNombre",
        "detalleClienteCorreo",
        "detalleClienteTelefono",
        "detalleClienteDireccion"
    ]) {
        document.getElementById(campo).textContent = "";
    }

    for (const tipo of ["Solicitudes", "Cotizaciones", "Reservas"]) {
        document.getElementById(`historial${tipo}`).replaceChildren();
        document.getElementById(`sinHistorial${tipo}`).hidden = true;
    }

    mostrarMensaje(mensajeDetalle, "Cargando cliente...", "info");
    mostrarMensaje(mensajeHistorial, "");
    modalCliente.show();

    try {
        const cliente = await consultarAPI(`${API.USUARIOS}/${id}`);

        if (numero !== numeroDetalle) return;

        if (!cliente._id || cliente.rol !== "cliente") {
            throw new Error("La cuenta seleccionada no corresponde a un cliente.");
        }

        mostrarDato("detalleClienteNombre", cliente.nombre);
        mostrarDato("detalleClienteCorreo", cliente.correo);
        mostrarDato("detalleClienteTelefono", cliente.telefono);
        mostrarDato("detalleClienteDireccion", cliente.direccion);

        mostrarMensaje(mensajeDetalle, "");
        mostrarMensaje(
            mensajeHistorial,
            "El historial todavía no está disponible.",
            "info"
        );
    } catch (error) {
        if (numero !== numeroDetalle) return;

        mostrarMensaje(mensajeDetalle, error.message);
    }
}

async function iniciarPagina() {
    botonEditarPerfil.disabled = true;
    buscador.disabled = true;

    for (const id of ["tab-clientes", "clientes"]) {
        document.getElementById(id).hidden = true;
    }

    try {
        const resultado = await consultarAPI(`${API.AUTH}/sesion`);
        const usuario = resultado.datos;

        if (!usuario || !["cliente", "administrador"].includes(usuario.rol)) {
            throw new Error("No se recibió una sesión válida.");
        }

        esAdministrador = usuario.rol === "administrador";

        for (const id of ["tab-clientes", "clientes"]) {
            document.getElementById(id).hidden = !esAdministrador;
        }
    } catch (error) {
        mostrarMensaje(mensajePagina, error.message);
        return;
    }

    if (esAdministrador) {
        buscador.disabled = false;
        await cargarClientes(++numeroBusqueda);
    }

    try {
        await cargarPerfil();
    } catch (error) {
        mostrarMensaje(mensajePagina, error.message);
    }
}

elementoModalPerfil.addEventListener("show.bs.modal", prepararEdicion);

elementoModalPerfil.addEventListener("hide.bs.modal", (evento) => {
    if (guardandoPerfil) evento.preventDefault();
});

elementoModalCliente.addEventListener("hide.bs.modal", () => {
    numeroDetalle++;
});

formularioPerfil.addEventListener("submit", guardarPerfil);
botonGuardarPerfil.addEventListener("click", guardarPerfil);
buscador.addEventListener("input", buscarClientes);

iniciarPagina();