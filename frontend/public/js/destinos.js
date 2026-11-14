import { API } from "./config.js";

const elemento = id => document.getElementById(id);
const detalle = elemento("detalleDestino");
const editor = elemento("formularioDestinoModal");
const formulario = elemento("formularioDestino");
const guardar = elemento("btnGuardarDestino");
let esAdministrador = false;
let destinoEditado = "";
let guardando = false;
let versionDetalle = 0;
let versionEditor = 0;

function mensaje(id, texto) {
    const aviso = elemento(id);
    aviso.textContent = texto;
    aviso.hidden = !texto;
}

async function consultar(url, method = "GET", datos) {
    const opciones = { method, credentials: "include" };
    if (datos !== undefined) {
        opciones.headers = { "Content-Type": "application/json" };
        opciones.body = JSON.stringify(datos);
    }

    let respuesta;
    try {
        respuesta = await fetch(url, opciones);
    } catch {
        throw new Error("No se pudo conectar con la API. Intentá nuevamente.");
    }
    if (respuesta.status === 401) {
        location.replace("/views/login.html");
        throw new Error("Debés iniciar sesión.");
    }
    const resultado = await respuesta.json().catch(() => null);
    if (!respuesta.ok || resultado === null) {
        throw new Error(resultado?.message || resultado?.mensaje || "No se pudo completar la operación.");
    }
    return resultado;
}

function rutaDestino(id, publico = false) {
    return `${API.DESTINOS}${publico ? "/publicos" : ""}/${encodeURIComponent(id)}`;
}

async function cargarDestinos(publico) {
    const contenedor = elemento(publico ? "tarjetasDestinos" : "filasDestinos");
    const plantilla = elemento(publico ? "tarjetaDestino" : "filaDestino");
    const carga = elemento(publico ? "catalogoDestinosCarga" : "adminDestinosCarga");
    const errorId = publico ? "catalogoDestinosError" : "adminDestinosError";
    const vacio = elemento(publico ? "sinDestinosPublicos" : "sinDestinosAdmin");

    carga.hidden = false;
    vacio.hidden = true;
    mensaje(errorId, "");
    contenedor.replaceChildren();

    try {
        const destinos = await consultar(publico ? `${API.DESTINOS}/publicos` : API.DESTINOS);
        for (const destino of destinos) {
            const fila = plantilla.content.firstElementChild.cloneNode(true);
            const datos = { ...destino, estado: destino.activo ? "Activo" : "Inactivo" };
            fila.querySelectorAll("[data-campo]").forEach(campo => {
                campo.textContent = datos[campo.dataset.campo];
            });
            fila.querySelectorAll("[data-accion]").forEach(boton => {
                boton.dataset.destinoId = destino._id;
                boton.dataset.destinoNombre = destino.nombre;
            });
            if (!publico) {
                fila.querySelector('[data-accion="desactivar"]').hidden = !destino.activo;
                fila.querySelector('[data-accion="reactivar"]').hidden = destino.activo;
            }
            contenedor.appendChild(fila);
        }
        vacio.hidden = destinos.length > 0;
    } catch (error) {
        mensaje(errorId, error.message);
    } finally {
        carga.hidden = true;
    }
}

async function recargarListados() {
    const catalogo = cargarDestinos(true);
    if (esAdministrador) await cargarDestinos(false);
    await catalogo;
}

detalle.addEventListener("show.bs.modal", async evento => {
    const boton = evento.relatedTarget;
    if (!boton?.dataset.destinoId) {
        evento.preventDefault();
        return;
    }
    const version = ++versionDetalle;
    const datos = elemento("datosDetalleDestino");
    datos.hidden = true;
    elemento("detalleDestinoCarga").hidden = false;
    mensaje("detalleDestinoError", "");
    try {
        const publico = !esAdministrador || Boolean(boton.closest("#catalogoDestinos"));
        const destino = await consultar(rutaDestino(boton.dataset.destinoId, publico));
        if (version !== versionDetalle) return;
        elemento("detalleDestinoNombre").textContent = destino.nombre;
        elemento("detalleDestinoPais").textContent = destino.pais;
        elemento("detalleDestinoDescripcion").textContent = destino.descripcion;
        datos.hidden = false;
    } catch (error) {
        if (version === versionDetalle) mensaje("detalleDestinoError", error.message);
    } finally {
        if (version === versionDetalle) elemento("detalleDestinoCarga").hidden = true;
    }
});

detalle.addEventListener("hidden.bs.modal", () => { versionDetalle++; });

editor.addEventListener("show.bs.modal", async evento => {
    if (!esAdministrador) {
        evento.preventDefault();
        return;
    }
    const version = ++versionEditor;
    destinoEditado = evento.relatedTarget?.dataset.destinoId || "";
    formulario.reset();
    mensaje("errorFormularioDestino", "");
    formulario.hidden = Boolean(destinoEditado);
    guardar.disabled = Boolean(destinoEditado);
    elemento("formularioDestinoModalTitulo").textContent = destinoEditado ? "Editar destino" : "Nuevo destino";
    elemento("cargandoFormularioDestino").hidden = !destinoEditado;
    if (!destinoEditado) return;

    try {
        const destino = await consultar(rutaDestino(destinoEditado));
        if (version !== versionEditor) return;
        formulario.elements.nombre.value = destino.nombre;
        formulario.elements.pais.value = destino.pais;
        formulario.elements.descripcion.value = destino.descripcion;
        formulario.hidden = false;
        guardar.disabled = false;
    } catch (error) {
        if (version === versionEditor) mensaje("errorFormularioDestino", error.message);
    } finally {
        if (version === versionEditor) elemento("cargandoFormularioDestino").hidden = true;
    }
});

editor.addEventListener("hidden.bs.modal", () => { versionEditor++; });
editor.addEventListener("hide.bs.modal", evento => {
    if (guardando) evento.preventDefault();
});

formulario.addEventListener("submit", async evento => {
    evento.preventDefault();
    if (!esAdministrador || guardar.disabled) return;
    const datos = {
        nombre: formulario.elements.nombre.value.trim(),
        pais: formulario.elements.pais.value.trim(),
        descripcion: formulario.elements.descripcion.value.trim()
    };
    if (!datos.nombre || !datos.pais || !datos.descripcion) {
        mensaje("errorFormularioDestino", "Completá el nombre, el país y la descripción.");
        return;
    }

    guardando = true;
    guardar.disabled = true;
    formulario.inert = true;
    elemento("guardandoDestino").hidden = false;
    mensaje("errorFormularioDestino", "");
    let resultado;
    try {
        resultado = await consultar(
            destinoEditado ? rutaDestino(destinoEditado) : API.DESTINOS,
            destinoEditado ? "PUT" : "POST", datos
        );
    } catch (error) {
        mensaje("errorFormularioDestino", error.message);
        return;
    } finally {
        guardando = false;
        guardar.disabled = false;
        formulario.inert = false;
        elemento("guardandoDestino").hidden = true;
    }
    bootstrap.Modal.getOrCreateInstance(editor).hide();
    mensaje("mensajePagina", resultado.mensaje);
    await recargarListados();
});

for (const [accion, activo] of [["Desactivar", false], ["Reactivar", true]]) {
    const modal = elemento(`${accion.toLowerCase()}Destino`);
    const boton = elemento(`btn${accion}Destino`);
    const errorId = `error${accion}Destino`;
    let id = "";
    let actualizando = false;

    modal.addEventListener("show.bs.modal", evento => {
        const destino = evento.relatedTarget?.dataset;
        if (!esAdministrador || !destino?.destinoId) {
            evento.preventDefault();
            return;
        }
        id = destino.destinoId;
        elemento(`nombre${accion}Destino`).textContent = destino.destinoNombre;
        mensaje(errorId, "");
        boton.disabled = false;
    });
    modal.addEventListener("hide.bs.modal", evento => {
        if (actualizando) evento.preventDefault();
    });
    boton.addEventListener("click", async () => {
        if (!esAdministrador || !id || actualizando) return;
        actualizando = true;
        boton.disabled = true;
        mensaje(errorId, "");
        let resultado;
        try {
            resultado = await consultar(`${rutaDestino(id)}/estado`, "PATCH", { activo });
        } catch (error) {
            mensaje(errorId, error.message);
            return;
        } finally {
            actualizando = false;
            boton.disabled = false;
        }
        bootstrap.Modal.getOrCreateInstance(modal).hide();
        mensaje("mensajePagina", resultado.mensaje);
        await recargarListados();
    });
}

export async function iniciarDestinos(rol) {
    esAdministrador = rol === "administrador";
    await recargarListados();
}
