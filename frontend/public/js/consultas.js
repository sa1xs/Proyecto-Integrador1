import { API } from "./config.js";

const elemento = id => document.getElementById(id);
const detalle = elemento("detalleConsulta");
const editor = elemento("responderConsulta");
const confirmacion = elemento("confirmarRespuestaConsulta");
const formularioRespuesta = elemento("formularioRespuesta");
const campoRespuesta = elemento("respuestaConsulta");
const revisarRespuesta = elemento("btnRevisarRespuesta");
const guardarRespuesta = elemento("btnGuardarRespuesta");
const volverRespuesta = elemento("btnVolverRespuesta");
const formularioPregunta = elemento("formularioConsulta");
const campoPregunta = elemento("preguntaConsulta");
const enviarPregunta = elemento("btnEnviarConsulta");
const formatoFecha = new Intl.DateTimeFormat("es-CR", { dateStyle: "medium", timeStyle: "short" });

let vista;
let esAdministrador = false;
let consultas = [];
let consultaParaResponder = null;
let respuestaPendiente = "";
let enviandoRespuesta = false;
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
        const error = new Error(resultado?.message || "No se pudo completar la operación.");
        error.estado = respuesta.status;
        throw error;
    }
    return resultado;
}

function rutaConsulta(id) {
    return `${API.CONSULTAS}/${encodeURIComponent(id)}`;
}

function fechaVisible(valor) {
    return valor ? formatoFecha.format(new Date(valor)) : "—";
}

function mostrarListado() {
    const estado = elemento(vista.filtro).value;
    const filas = elemento(vista.filas);
    filas.replaceChildren();
    const visibles = consultas.filter(consulta => !estado || consulta.estado === estado);
    for (const consulta of visibles) {
        const fila = elemento(vista.plantilla).content.firstElementChild.cloneNode(true);
        const datos = { ...consulta, createdAt: fechaVisible(consulta.createdAt) };
        fila.querySelectorAll("[data-campo]").forEach(campo => {
            campo.textContent = datos[campo.dataset.campo];
        });
        if (consulta.estado === "Respondida") {
            const insignia = fila.querySelector('[data-campo="estado"]');
            insignia.classList.replace("text-bg-secondary", "text-bg-success");
        }
        fila.querySelectorAll("[data-accion]").forEach(boton => {
            boton.dataset.consultaId = consulta._id;
            if (boton.dataset.accion === "responder") boton.hidden = consulta.estado !== "Pendiente";
        });
        filas.appendChild(fila);
    }
    elemento(vista.vacio).hidden = consultas.length > 0;
    elemento(vista.sinCoincidencias).hidden = consultas.length === 0 || visibles.length > 0;
}

async function cargarConsultas() {
    elemento(vista.filtro).disabled = true;
    elemento(vista.filas).replaceChildren();
    elemento(vista.carga).hidden = false;
    elemento(vista.vacio).hidden = true;
    elemento(vista.sinCoincidencias).hidden = true;
    mensaje(vista.error, "");
    try {
        const resultado = await consultar(API.CONSULTAS);
        if (!Array.isArray(resultado)) throw new Error("No se recibió un listado válido de consultas.");
        consultas = resultado;
        mostrarListado();
        elemento(vista.filtro).disabled = false;
    } catch (error) {
        consultas = [];
        mensaje(vista.error, error.message);
    } finally {
        elemento(vista.carga).hidden = true;
    }
}

formularioPregunta.addEventListener("submit", async evento => {
    evento.preventDefault();
    if (!vista || esAdministrador || enviarPregunta.disabled) return;
    const pregunta = campoPregunta.value.trim();
    if (!pregunta) {
        mensaje("errorPregunta", "Escribí una pregunta.");
        return;
    }

    enviarPregunta.disabled = true;
    campoPregunta.readOnly = true;
    elemento("enviandoPregunta").hidden = false;
    mensaje("errorPregunta", "");
    mensaje("mensajePagina", "");
    try {
        await consultar(API.CONSULTAS, "POST", { pregunta });
        formularioPregunta.reset();
        elemento(vista.filtro).value = "";
        mensaje("mensajePagina", "Consulta enviada.");
        await cargarConsultas();
    } catch (error) {
        mensaje("errorPregunta", error.message);
    } finally {
        enviarPregunta.disabled = false;
        campoPregunta.readOnly = false;
        elemento("enviandoPregunta").hidden = true;
    }
});

detalle.addEventListener("show.bs.modal", async evento => {
    const id = evento.relatedTarget?.dataset.consultaId;
    if (!id) {
        evento.preventDefault();
        return;
    }
    const version = ++versionDetalle;
    elemento("datosDetalleConsulta").hidden = true;
    elemento("cargandoDetalleConsulta").hidden = false;
    mensaje("errorDetalleConsulta", "");
    try {
        const consulta = await consultar(rutaConsulta(id));
        if (version !== versionDetalle) return;
        elemento("consultaCodigo").textContent = consulta._id;
        elemento("consultaFecha").textContent = fechaVisible(consulta.createdAt);
        elemento("consultaEstado").textContent = consulta.estado;
        elemento("consultaPregunta").textContent = consulta.pregunta;
        elemento("consultaPendiente").hidden = consulta.estado !== "Pendiente";
        elemento("consultaRespuesta").textContent = consulta.respuesta || "";
        elemento("consultaFechaRespuesta").textContent = consulta.fechaRespuesta
            ? `Respondida el ${fechaVisible(consulta.fechaRespuesta)}` : "";
        elemento("datosDetalleConsulta").hidden = false;
    } catch (error) {
        if (version === versionDetalle) mensaje("errorDetalleConsulta", error.message);
    } finally {
        if (version === versionDetalle) elemento("cargandoDetalleConsulta").hidden = true;
    }
});

detalle.addEventListener("hidden.bs.modal", () => { versionDetalle++; });

editor.addEventListener("show.bs.modal", async evento => {
    if (!esAdministrador) {
        evento.preventDefault();
        return;
    }
    const id = evento.relatedTarget?.dataset.consultaId;
    if (!id) {
        if (!consultaParaResponder) evento.preventDefault();
        return;
    }

    const version = ++versionEditor;
    consultaParaResponder = null;
    formularioRespuesta.reset();
    formularioRespuesta.hidden = true;
    revisarRespuesta.disabled = true;
    elemento("cargandoConsultaRespuesta").hidden = false;
    mensaje("errorRespuesta", "");
    try {
        const consulta = await consultar(rutaConsulta(id));
        if (version !== versionEditor) return;
        if (consulta.estado !== "Pendiente") {
            mensaje("errorRespuesta", "Esta consulta ya fue respondida.");
            await cargarConsultas();
            return;
        }
        consultaParaResponder = consulta;
        elemento("preguntaAResponder").textContent = consulta.pregunta;
        formularioRespuesta.hidden = false;
        revisarRespuesta.disabled = false;
    } catch (error) {
        if (version === versionEditor) mensaje("errorRespuesta", error.message);
    } finally {
        if (version === versionEditor) elemento("cargandoConsultaRespuesta").hidden = true;
    }
});

editor.addEventListener("hidden.bs.modal", () => { versionEditor++; });

function cambiarModal(origen, destino) {
    origen.addEventListener("hidden.bs.modal", () => {
        bootstrap.Modal.getOrCreateInstance(destino).show();
    }, { once: true });
    bootstrap.Modal.getOrCreateInstance(origen).hide();
}

formularioRespuesta.addEventListener("submit", evento => {
    evento.preventDefault();
    if (!esAdministrador || !consultaParaResponder || revisarRespuesta.disabled) return;

    respuestaPendiente = campoRespuesta.value.trim();
    if (!respuestaPendiente) {
        mensaje("errorRespuesta", "Escribí una respuesta.");
        return;
    }
    mensaje("errorRespuesta", "");
    mensaje("errorConfirmarRespuesta", "");
    elemento("resumenRespuestaConsulta").textContent = respuestaPendiente;
    guardarRespuesta.disabled = false;
    volverRespuesta.disabled = false;
    cambiarModal(editor, confirmacion);
});

volverRespuesta.addEventListener("click", () => cambiarModal(confirmacion, editor));
confirmacion.addEventListener("hide.bs.modal", evento => {
    if (enviandoRespuesta) evento.preventDefault();
});

guardarRespuesta.addEventListener("click", async () => {
    if (!esAdministrador || !consultaParaResponder || guardarRespuesta.disabled) return;

    enviandoRespuesta = true;
    guardarRespuesta.disabled = true;
    volverRespuesta.disabled = true;
    elemento("guardandoRespuesta").hidden = false;
    mensaje("errorConfirmarRespuesta", "");
    mensaje("mensajePagina", "");
    try {
        await consultar(`${rutaConsulta(consultaParaResponder._id)}/respuesta`, "PATCH", { respuesta: respuestaPendiente });
    } catch (error) {
        mensaje("errorConfirmarRespuesta", error.message);
        if ([404, 409].includes(error.estado)) {
            consultaParaResponder = null;
            await cargarConsultas();
        } else {
            guardarRespuesta.disabled = false;
            volverRespuesta.disabled = false;
        }
        return;
    } finally {
        enviandoRespuesta = false;
        elemento("guardandoRespuesta").hidden = true;
    }

    consultaParaResponder = null;
    bootstrap.Modal.getOrCreateInstance(confirmacion).hide();
    mensaje("mensajePagina", "Respuesta enviada.");
    await cargarConsultas();
});

export async function iniciarConsultas(rol) {
    esAdministrador = rol === "administrador";
    vista = esAdministrador ? {
        filas: "filasConsultasAdmin", plantilla: "filaConsultaAdmin", filtro: "estadoConsultasAdmin",
        carga: "cargandoConsultasAdmin", error: "errorConsultasAdmin", vacio: "sinConsultasAdmin",
        sinCoincidencias: "sinCoincidenciasConsultasAdmin"
    } : {
        filas: "filasMisConsultas", plantilla: "filaMiConsulta", filtro: "estadoMisConsultas",
        carga: "cargandoMisConsultas", error: "errorMisConsultas", vacio: "sinMisConsultas",
        sinCoincidencias: "sinCoincidenciasMisConsultas"
    };
    enviarPregunta.disabled = esAdministrador;
    elemento(vista.filtro).addEventListener("change", mostrarListado);
    await cargarConsultas();
}
