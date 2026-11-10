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
let esAdministrador = false;

function mostrarMensaje(texto, tipo = "danger") {
    mensaje.textContent = texto;
    mensaje.className = texto ? `alert alert-${tipo}` : "d-none";
}

function actualizarEdades(campoCantidad = cantidad, contenedor = edades, prefijo = "edadViajero") {
    const numero = Number(campoCantidad.value);
    if (!Number.isSafeInteger(numero) || numero < 1) return;
    // Agrega o retira únicamente los campos necesarios y conserva las edades existentes.
    while (contenedor.children.length > numero) contenedor.lastElementChild.remove();
    while (contenedor.children.length < numero) {
        const indice = contenedor.children.length + 1;
        const grupo = document.createElement("div");
        grupo.className = "col-sm-6 col-md-3";
        const etiqueta = document.createElement("label");
        etiqueta.className = "form-label";
        etiqueta.htmlFor = `${prefijo}${indice}`;
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
        contenedor.appendChild(grupo);
    }
}

function validarFechas() {
    regreso.setCustomValidity(salida.value && regreso.value && regreso.value < salida.value
        ? "El regreso no puede ser anterior a la salida." : "");
}

cantidad.addEventListener("input", () => actualizarEdades());
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
        await cargarSolicitudes();
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
        esAdministrador = resultado.datos?.rol === "administrador";
        boton.disabled = !esCliente;
        await cargarSolicitudes();
    } catch {
        mostrarMensaje("No se pudo verificar la sesión. Recargá la página.");
    }
}

const buscar = document.getElementById("buscarSolicitud");
const filtroEstado = document.getElementById("filtroEstadoSolicitud");
const formularioEditar = document.getElementById("formularioEditarSolicitud");
const guardarSolicitud = document.getElementById("btnGuardarSolicitud");
const editarCantidad = document.getElementById("editarCantidadViajeros");
const editarEdades = document.getElementById("editarEdadesViajeros");
const editarSalida = document.getElementById("editarSalida");
const editarRegreso = document.getElementById("editarRegreso");
const modalDetalle = document.getElementById("modalDetalleSolicitud");
const modalEditar = document.getElementById("modalEditarSolicitud");
const modalGestion = document.getElementById("modalGestionSolicitud");
const modalConfirmar = document.getElementById("modalConfirmarCotizacion");
const prepararCotizacion = document.getElementById("btnPrepararCotizacion");
const guardarEstado = document.getElementById("btnGuardarEstadoSolicitud");
const estadoSolicitud = document.getElementById("estadoSolicitud");
let solicitudes = [];
let numeroListado = 0;
let solicitudEditar = null;
let solicitudGestion = null;
let guardandoSolicitud = false;
let guardandoEstado = false;
const versionesModal = new Map();

function mensajeEn(id, texto, tipo = "danger") {
    const elemento = document.getElementById(id);
    elemento.textContent = texto;
    elemento.className = texto ? `alert alert-${tipo}` : "d-none";
    elemento.hidden = !texto;
}

function mostrarDato(id, valor) {
    document.getElementById(id).textContent = valor ?? "No registrado";
}

async function consultarAPI(url, metodo = "GET", datos) {
    const opciones = { method: metodo, credentials: "include" };
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
        const error = new Error(
            (Array.isArray(resultado.errores) && resultado.errores.join(" ")) ||
            resultado.message || resultado.mensaje || "No se pudo completar la operación."
        );
        error.status = respuesta.status;
        throw error;
    }
    return resultado;
}

function pintarListado() {
    const tabla = document.getElementById(esAdministrador ? "filasSolicitudes" : "filasMisSolicitudes");
    const plantilla = document.getElementById(esAdministrador ? "filaSolicitudAdministrativa" : "filaMiSolicitud");
    const texto = buscar.value.trim().toLocaleLowerCase();
    const visibles = solicitudes.filter(solicitud => !esAdministrador || (
        (!filtroEstado.value || solicitud.estado === filtroEstado.value) &&
        [solicitud._id, solicitud.destino, solicitud.cliente?.nombre, solicitud.cliente?.correo]
            .some(valor => String(valor ?? "").toLocaleLowerCase().includes(texto))
    ));
    tabla.replaceChildren();
    for (const solicitud of visibles) {
        const fila = plantilla.content.firstElementChild.cloneNode(true);
        const datos = { ...solicitud, codigo: solicitud._id, cliente: solicitud.cliente?.nombre || "No registrado" };
        fila.querySelectorAll("[data-campo]").forEach(campo => {
            campo.textContent = datos[campo.dataset.campo] ?? "No registrado";
        });
        fila.querySelectorAll("[data-accion]").forEach(accion => {
            accion.dataset.solicitudId = solicitud._id;
            if (["editar", "preparar"].includes(accion.dataset.accion)) {
                accion.hidden = solicitud.estado !== "Nueva";
            }
            // El módulo de contactos se conecta en SCRUM-169.
            if (accion.dataset.accion === "seguimiento") accion.hidden = true;
        });
        tabla.appendChild(fila);
    }
    document.getElementById(esAdministrador ? "sinSolicitudes" : "sinMisSolicitudes").hidden = solicitudes.length > 0;
    document.getElementById("sinCoincidenciasSolicitudes").hidden =
        !esAdministrador || solicitudes.length === 0 || visibles.length > 0;
}

async function cargarSolicitudes() {
    const numero = ++numeroListado;
    const cargando = document.getElementById(esAdministrador ? "cargandoGestion" : "cargandoMisSolicitudes");
    const errorId = esAdministrador ? "errorGestion" : "errorMisSolicitudes";
    cargando.hidden = false;
    mensajeEn(errorId, "");
    document.getElementById(esAdministrador ? "sinSolicitudes" : "sinMisSolicitudes").hidden = true;
    document.getElementById("sinCoincidenciasSolicitudes").hidden = true;
    try {
        const datos = await consultarAPI(API.SOLICITUDES);
        if (numero !== numeroListado) return;
        solicitudes = datos;
        pintarListado();
    } catch (error) {
        if (numero !== numeroListado) return;
        solicitudes = [];
        document.getElementById(esAdministrador ? "filasSolicitudes" : "filasMisSolicitudes").replaceChildren();
        mensajeEn(errorId, error.message);
    } finally {
        if (numero === numeroListado) cargando.hidden = true;
    }
}

buscar.addEventListener("input", pintarListado);
filtroEstado.addEventListener("change", pintarListado);
document.getElementById("tab-mis-solicitudes").addEventListener("shown.bs.tab", cargarSolicitudes);
document.getElementById("tab-gestion").addEventListener("shown.bs.tab", cargarSolicitudes);

function completarDetalle(solicitud) {
    mostrarDato("detalleCodigo", solicitud._id);
    mostrarDato("detalleDestino", solicitud.destino);
    mostrarDato("detalleSalida", solicitud.fechaSalida);
    mostrarDato("detalleRegreso", solicitud.fechaRegreso);
    mostrarDato("detalleViajeros", solicitud.cantidadViajeros);
    mostrarDato("detalleEdades", solicitud.edades.join(", "));
    mostrarDato("detalleEstado", solicitud.estado);
}

function completarEdicion(solicitud) {
    solicitudEditar = solicitud;
    document.getElementById("idSolicitudEditar").value = solicitud._id;
    document.getElementById("editarDestino").value = solicitud.destino;
    editarSalida.value = solicitud.fechaSalida;
    editarRegreso.value = solicitud.fechaRegreso;
    editarCantidad.value = solicitud.cantidadViajeros;
    editarEdades.replaceChildren();
    actualizarEdades(editarCantidad, editarEdades, "editarEdad");
    editarEdades.querySelectorAll("input").forEach((campo, indice) => {
        campo.value = solicitud.edades[indice];
    });
    const editable = esCliente && solicitud.estado === "Nueva";
    formularioEditar.querySelectorAll("input").forEach(campo => { campo.disabled = !editable; });
    guardarSolicitud.disabled = !editable;
    document.getElementById("solicitudSoloConsulta").hidden = editable;
}

function completarGestion(solicitud) {
    solicitudGestion = solicitud;
    mostrarDato("gestionCodigo", solicitud._id);
    mostrarDato("gestionCliente", solicitud.cliente?.nombre);
    mostrarDato("gestionContacto", [solicitud.cliente?.correo, solicitud.cliente?.telefono].filter(Boolean).join(" · ") || "No registrado");
    mostrarDato("gestionDestino", solicitud.destino);
    mostrarDato("gestionFechas", `${solicitud.fechaSalida} — ${solicitud.fechaRegreso}`);
    mostrarDato("gestionViajeros", `${solicitud.cantidadViajeros} · Edades: ${solicitud.edades.join(", ")}`);
    mostrarDato("gestionEstadoActual", solicitud.estado);
    estadoSolicitud.value = solicitud.estado === "Nueva" ? "En cotización" : "";
    estadoSolicitud.disabled = solicitud.estado !== "Nueva";
    prepararCotizacion.disabled = solicitud.estado !== "Nueva";
}

for (const [elemento, mensajeId, completar] of [
    [modalDetalle, "mensajeDetalleSolicitud", completarDetalle],
    [modalEditar, "mensajeEditarSolicitud", completarEdicion],
    [modalGestion, "mensajeGestionSolicitud", completarGestion]
]) {
    elemento.addEventListener("show.bs.modal", async evento => {
        const id = evento.relatedTarget?.dataset.solicitudId;
        if (!id) return;
        const version = (versionesModal.get(elemento) || 0) + 1;
        versionesModal.set(elemento, version);
        elemento.querySelectorAll("dd").forEach(campo => { campo.textContent = ""; });
        if (elemento === modalEditar) {
            solicitudEditar = null;
            formularioEditar.reset();
            formularioEditar.querySelectorAll("input").forEach(campo => { campo.disabled = true; });
            guardarSolicitud.disabled = true;
            document.getElementById("solicitudSoloConsulta").hidden = true;
        }
        if (elemento === modalGestion) {
            solicitudGestion = null;
            prepararCotizacion.disabled = true;
            estadoSolicitud.value = "";
            estadoSolicitud.disabled = true;
        }
        document.getElementById("sinSolicitudSeleccionada").hidden = true;
        mensajeEn(mensajeId, "Cargando solicitud…", "info");
        try {
            const solicitud = await consultarAPI(`${API.SOLICITUDES}/${encodeURIComponent(id)}`);
            if (versionesModal.get(elemento) !== version) return;
            completar(solicitud);
            mensajeEn(mensajeId, "");
        } catch (error) {
            if (versionesModal.get(elemento) === version) mensajeEn(mensajeId, error.message);
        }
    });
    elemento.addEventListener("hidden.bs.modal", () => {
        versionesModal.set(elemento, (versionesModal.get(elemento) || 0) + 1);
    });
}

// Estas secciones se habilitan al conectar sus tareas de integración.
document.getElementById("viajerosSolicitud").hidden = true;
document.getElementById("seguimientoComercial").hidden = true;
document.getElementById("formularioViajero").addEventListener("submit", evento => evento.preventDefault());
document.getElementById("formularioContacto").addEventListener("submit", evento => evento.preventDefault());

editarCantidad.addEventListener("input", () => actualizarEdades(editarCantidad, editarEdades, "editarEdad"));
function validarFechasEdicion() {
    editarRegreso.setCustomValidity(editarSalida.value && editarRegreso.value && editarRegreso.value < editarSalida.value
        ? "El regreso no puede ser anterior a la salida." : "");
}
editarSalida.addEventListener("input", validarFechasEdicion);
editarRegreso.addEventListener("input", validarFechasEdicion);
modalEditar.addEventListener("hidden.bs.modal", () => {
    solicitudEditar = null;
    formularioEditar.reset();
    editarRegreso.setCustomValidity("");
});
modalEditar.addEventListener("hide.bs.modal", evento => {
    if (guardandoSolicitud) evento.preventDefault();
});
formularioEditar.addEventListener("submit", async evento => {
    evento.preventDefault();
    if (!solicitudEditar || !esCliente || guardarSolicitud.disabled || guardandoSolicitud) return;
    actualizarEdades(editarCantidad, editarEdades, "editarEdad");
    validarFechasEdicion();
    if (!formularioEditar.reportValidity()) return;
    const destinoEditado = document.getElementById("editarDestino").value.trim();
    if (!destinoEditado) {
        mensajeEn("mensajeEditarSolicitud", "Indicá un destino válido.");
        return;
    }
    const datos = {
        destino: destinoEditado, fechaSalida: editarSalida.value, fechaRegreso: editarRegreso.value,
        cantidadViajeros: Number(editarCantidad.value),
        edades: [...editarEdades.querySelectorAll("input")].map(campo => Number(campo.value))
    };
    const id = solicitudEditar._id;
    guardandoSolicitud = true;
    guardarSolicitud.disabled = true;
    mensajeEn("mensajeEditarSolicitud", "");
    try {
        await consultarAPI(`${API.SOLICITUDES}/${encodeURIComponent(id)}`, "PUT", datos);
        guardandoSolicitud = false;
        bootstrap.Modal.getOrCreateInstance(modalEditar).hide();
        mensajeEn("mensajePagina", "Solicitud actualizada correctamente.", "success");
        await cargarSolicitudes();
    } catch (error) {
        mensajeEn("mensajeEditarSolicitud", error.message);
        if ([403, 404, 409].includes(error.status)) {
            solicitudEditar = null;
            await cargarSolicitudes();
        }
    } finally {
        guardandoSolicitud = false;
        guardarSolicitud.disabled = !solicitudEditar || solicitudEditar.estado !== "Nueva";
    }
});

modalConfirmar.addEventListener("show.bs.modal", evento => {
    if (!esAdministrador || solicitudGestion?.estado !== "Nueva" || estadoSolicitud.value !== "En cotización") {
        evento.preventDefault();
        mensajeEn("mensajeGestionSolicitud", "Seleccioná una solicitud Nueva y el estado En cotización.");
        return;
    }
    mensajeEn("errorConfirmarCotizacion", "");
    guardarEstado.disabled = guardandoEstado;
});
modalConfirmar.addEventListener("hide.bs.modal", evento => {
    if (guardandoEstado) evento.preventDefault();
});
guardarEstado.addEventListener("click", async () => {
    if (!esAdministrador || solicitudGestion?.estado !== "Nueva" || guardandoEstado) return;
    guardandoEstado = true;
    guardarEstado.disabled = true;
    try {
        await consultarAPI(`${API.SOLICITUDES}/${encodeURIComponent(solicitudGestion._id)}/estado`,
            "PATCH", { estado: "En cotización" });
        solicitudGestion = null;
        guardandoEstado = false;
        bootstrap.Modal.getOrCreateInstance(modalConfirmar).hide();
        mensajeEn("mensajePagina", "La solicitud pasó a En cotización.", "success");
        await cargarSolicitudes();
    } catch (error) {
        mensajeEn("errorConfirmarCotizacion", error.message);
        if ([403, 404, 409].includes(error.status)) {
            solicitudGestion = null;
            prepararCotizacion.disabled = true;
            await cargarSolicitudes();
        }
    } finally {
        guardandoEstado = false;
        guardarEstado.disabled = solicitudGestion?.estado !== "Nueva";
    }
});

iniciar();
