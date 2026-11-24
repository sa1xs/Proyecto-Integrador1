import { API } from "./config.js";
import { leerReferenciaSolicitud } from "./referenciaSolicitud.js";

const formulario = document.getElementById("formularioSolicitud");
const cantidad = document.getElementById("cantidadViajeros");
const edades = document.getElementById("edadesViajeros");
const salida = document.getElementById("fechaSalida");
const regreso = document.getElementById("fechaRegreso");
const destino = document.getElementById("destinoSolicitud");
const servicio = document.getElementById("servicioSolicitud");
let servicioCatalogo;
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
    if (!destino.value || !servicio.value || servicio.disabled) {
        mostrarMensaje("Seleccioná un destino y un servicio principal.");
        return;
    }
    const datos = {
        destinoId: destino.value, servicioId: servicio.value, fechaSalida: salida.value,
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
        servicioCatalogo = null;
        seleccionNueva.limpiarServicio();
        await seleccionNueva.cargar().catch(error => mostrarMensaje(error.message));
        edades.replaceChildren();
        cantidad.value = "1";
        actualizarEdades();
        mostrarMensaje(`Solicitud registrada correctamente. Estado: ${resultado.datos.estado}.`, "success");
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
        clienteFiltro = esAdministrador ? new URLSearchParams(location.search).get("cliente") : null;
        document.getElementById("filtroClienteSolicitudes").hidden = !clienteFiltro;
        boton.disabled = !esCliente;
        if (esCliente) {
            try {
                const referencia = leerReferenciaSolicitud(location.search);
                if (referencia?.tipo === "servicio") {
                    const registro = await consultarAPI(API.SERVICIOS + "/publicos/" + referencia.id);
                    if (registro.disponibleParaSolicitar) servicioCatalogo = registro;
                    else mostrarMensaje("El servicio seleccionado no está disponible para solicitar. Podés elegir otro.");
                }
                await seleccionNueva.cargar(referencia?.tipo === "destino" ? referencia.id : "",
                    servicioCatalogo?.destinos);
                if (servicioCatalogo && destino.disabled) {
                    servicioCatalogo = null;
                    await seleccionNueva.cargar();
                    mostrarMensaje("El servicio seleccionado todavía no tiene destinos disponibles.");
                }
            } catch (error) {
                mostrarMensaje(error.message);
                await seleccionNueva.cargar().catch(() => {});
            }
        }
        await cargarSolicitudes();
    } catch {
        mostrarMensaje("No se pudo verificar la sesión. Recargá la página.");
    }
}

const buscar = document.getElementById("buscarSolicitud");
const filtroEstado = document.getElementById("filtroEstadoSolicitud");
const formularioEditar = document.getElementById("formularioEditarSolicitud");
const guardarSolicitud = document.getElementById("btnGuardarSolicitud");
const destinoEditar = document.getElementById("editarDestino");
const servicioEditar = document.getElementById("editarServicio");
const editarSalida = document.getElementById("editarSalida");
const editarRegreso = document.getElementById("editarRegreso");
const modalDetalle = document.getElementById("modalDetalleSolicitud");
const enlaceFicha = document.getElementById("enlaceFichaDesdeSolicitud");
const seccionViajeros = document.getElementById("viajerosSolicitud");
const viajerosEdicion = document.getElementById("viajerosEdicion");
const filasViajeros = document.getElementById("filasViajeros");
const formularioViajero = document.getElementById("formularioViajero");
const editorViajero = document.getElementById("editorViajero");
const guardarViajero = document.getElementById("btnGuardarViajero");
const agregarViajero = document.getElementById("btnAgregarViajero");
const panelRetiro = document.getElementById("confirmarRetiroViajero");
const confirmarRetiro = document.getElementById("btnConfirmarRetiro");
const modalEditar = document.getElementById("modalEditarSolicitud");
const modalGestion = document.getElementById("modalGestionSolicitud");
const seguimiento = document.getElementById("seguimientoComercial");
const formularioContacto = document.getElementById("formularioContacto");
const registrarContacto = document.getElementById("btnRegistrarContacto");
const confirmarContacto = document.getElementById("confirmarContacto");
const guardarContacto = document.getElementById("btnGuardarContacto");
const modalConfirmar = document.getElementById("modalConfirmarCotizacion");
const guardarEstado = document.getElementById("btnGuardarEstadoSolicitud");
let solicitudes = null;
let clienteFiltro = null;
let numeroListado = 0;
let solicitudEditar = null;
let viajeroRetiro = null;
let guardandoViajero = false;
let solicitudGestion = null;
let solicitudPorCotizar = null;
let guardandoSolicitud = false;
let guardandoEstado = false;
let guardandoContacto = false;
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

function rutaFichaCliente(id) {
    return `/views/clientes.html?${new URLSearchParams({ cliente: id })}`;
}

function pintarListado() {
    if (!solicitudes) return;
    const tabla = document.getElementById(esAdministrador ? "filasSolicitudes" : "filasMisSolicitudes");
    const plantilla = document.getElementById(esAdministrador ? "filaSolicitudAdministrativa" : "filaMiSolicitud");
    const texto = buscar.value.trim().toLocaleLowerCase();
    const visibles = solicitudes.filter(solicitud => !esAdministrador || (
        (!filtroEstado.value || solicitud.estado === filtroEstado.value) &&
        [solicitud._id, solicitud.cotizacion, solicitud.destino, solicitud.cliente?.nombre, solicitud.cliente?.correo]
            .some(valor => String(valor ?? "").toLocaleLowerCase().includes(texto))
    ));
    tabla.replaceChildren();
    for (const solicitud of visibles) {
        const fila = plantilla.content.firstElementChild.cloneNode(true);
        const datos = { ...solicitud, cliente: solicitud.cliente?.nombre || "No disponible" };
        fila.querySelectorAll("[data-campo]").forEach(campo => {
            campo.textContent = datos[campo.dataset.campo] ?? "No registrado";
        });
        if (esAdministrador && solicitud.cliente?._id) {
            fila.querySelector('[data-campo="cliente"]').href = rutaFichaCliente(solicitud.cliente._id);
        }
        fila.querySelectorAll("[data-accion]").forEach(accion => {
            accion.dataset.solicitudId = solicitud._id;
            if (["editar", "preparar"].includes(accion.dataset.accion)) {
                accion.hidden = solicitud.estado !== "Nueva";
            }
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
        const filtro = clienteFiltro ? `?${new URLSearchParams({ cliente: clienteFiltro })}` : "";
        const datos = await consultarAPI(`${API.SOLICITUDES}${filtro}`);
        if (numero !== numeroListado) return;
        if (!Array.isArray(datos)) throw new Error("No se recibió un listado válido de solicitudes.");
        solicitudes = datos;
        pintarListado();
    } catch (error) {
        if (numero !== numeroListado) return;
        solicitudes = null;
        document.getElementById(esAdministrador ? "sinSolicitudes" : "sinMisSolicitudes").hidden = true;
        document.getElementById("sinCoincidenciasSolicitudes").hidden = true;
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
    mostrarDato("detalleServicio", solicitud.servicioSolicitado || "No especificado");
    mostrarDato("detalleSalida", solicitud.fechaSalida);
    mostrarDato("detalleRegreso", solicitud.fechaRegreso);
    mostrarDato("detalleViajeros", solicitud.cantidadViajeros);
    mostrarDato("detalleEdades", solicitud.edades.join(", "));
    mostrarDato("detalleEstado", solicitud.estado);
    if (esAdministrador) {
        mostrarDato("detalleClienteSolicitud", solicitud.cliente?.nombre);
        document.getElementById("etiquetaDetalleCliente").hidden = false;
        document.getElementById("detalleClienteSolicitud").hidden = false;
    }
    if (esAdministrador && solicitud.cliente?._id) {
        enlaceFicha.href = rutaFichaCliente(solicitud.cliente._id);
        enlaceFicha.hidden = false;
    }
    const viajeros = solicitud.viajeros ?? [];
    const filas = document.getElementById("filasViajerosDetalle");
    filas.replaceChildren();
    for (const viajero of viajeros) {
        const fila = document.createElement("tr");
        fila.insertCell().textContent = viajero.nombre || "Sin nombre";
        fila.insertCell().textContent = viajero.edad;
        filas.appendChild(fila);
    }
    document.getElementById("detalleListaViajeros").hidden = viajeros.length === 0;
    document.getElementById("sinViajeros").hidden = viajeros.length > 0;
    seccionViajeros.hidden = false;
}

function puedeEditarViajeros() {
    return esCliente && solicitudEditar?.estado === "Nueva" && !guardandoViajero && !guardandoSolicitud;
}

function pintarViajerosEdicion(solicitud) {
    const viajeros = solicitud.viajeros ?? [];
    const plantilla = document.getElementById("filaViajero");
    filasViajeros.replaceChildren();
    for (const viajero of viajeros) {
        const fila = plantilla.content.firstElementChild.cloneNode(true);
        fila.querySelector('[data-campo="nombre"]').textContent = viajero.nombre || "Sin nombre";
        fila.querySelector('[data-campo="edad"]').textContent = viajero.edad;
        fila.querySelector('[data-accion="editar-viajero"]').addEventListener("click", () => abrirEditorViajero(viajero));
        const retirar = fila.querySelector('[data-accion="retirar-viajero"]');
        retirar.disabled = viajeros.length <= 1;
        retirar.addEventListener("click", () => prepararRetiro(viajero));
        filasViajeros.appendChild(fila);
    }
    document.getElementById("listaViajerosEdicion").hidden = viajeros.length === 0;
    document.getElementById("sinViajerosEdicion").hidden = viajeros.length > 0;
    document.getElementById("avisoUltimoViajero").hidden = viajeros.length !== 1;
    viajerosEdicion.hidden = !(esCliente && solicitud.estado === "Nueva");
}

function abrirEditorViajero(viajero) {
    if (!puedeEditarViajeros()) return;
    panelRetiro.hidden = true;
    viajeroRetiro = null;
    formularioViajero.reset();
    document.getElementById("tituloEditorViajero").textContent = viajero ? "Editar viajero" : "Agregar viajero";
    document.getElementById("idViajeroEditar").value = viajero?._id ?? "";
    document.getElementById("nombreViajero").value = viajero?.nombre ?? "";
    document.getElementById("edadViajero").value = viajero?.edad ?? "";
    mensajeEn("errorFormularioViajero", "");
    guardarViajero.disabled = false;
    bootstrap.Collapse.getOrCreateInstance(editorViajero, { toggle: false }).show();
}

function prepararRetiro(viajero) {
    if (!puedeEditarViajeros() || solicitudEditar.viajeros.length <= 1) return;
    bootstrap.Collapse.getOrCreateInstance(editorViajero, { toggle: false }).hide();
    viajeroRetiro = viajero;
    mostrarDato("nombreViajeroRetirar", viajero.nombre || `viajero de ${viajero.edad} años`);
    mensajeEn("errorRetirarViajero", "");
    panelRetiro.hidden = false;
    confirmarRetiro.focus();
}

async function guardarCambioViajero(metodo, viajeroId, datos, errorId, confirmacion) {
    const ruta = `${API.SOLICITUDES}/${encodeURIComponent(solicitudEditar._id)}`;
    const url = viajeroId ? `${ruta}/viajeros/${encodeURIComponent(viajeroId)}` : `${ruta}/viajeros`;
    guardandoViajero = true;
    guardarSolicitud.disabled = true;
    viajerosEdicion.inert = true;
    mensajeEn(errorId, "");
    try {
        await consultarAPI(url, metodo, datos);
        bootstrap.Collapse.getOrCreateInstance(editorViajero, { toggle: false }).hide();
        panelRetiro.hidden = true;
        viajeroRetiro = null;
        try {
            const solicitud = await consultarAPI(ruta);
            solicitudEditar = solicitud;
            aplicarPermisoEdicion(solicitud);
            pintarViajerosEdicion(solicitud);
            mensajeEn("mensajeEditarSolicitud", confirmacion, "success");
        } catch (error) {
            viajerosEdicion.hidden = true;
            mensajeEn("mensajeEditarSolicitud", `${confirmacion} Volvé a abrir la solicitud para actualizar la lista.`);
        }
        await cargarSolicitudes();
    } catch (error) {
        mensajeEn(errorId, error.message);
    } finally {
        guardandoViajero = false;
        viajerosEdicion.inert = false;
        guardarSolicitud.disabled = !esCliente || solicitudEditar?.estado !== "Nueva";
    }
}

agregarViajero.addEventListener("click", () => abrirEditorViajero());
document.getElementById("btnCancelarRetiro").addEventListener("click", () => {
    panelRetiro.hidden = true;
    viajeroRetiro = null;
    agregarViajero.focus();
});
confirmarRetiro.addEventListener("click", () => {
    if (!puedeEditarViajeros() || !viajeroRetiro || solicitudEditar.viajeros.length <= 1) return;
    return guardarCambioViajero("DELETE", viajeroRetiro._id, undefined, "errorRetirarViajero", "Viajero retirado.");
});
formularioViajero.addEventListener("submit", evento => {
    evento.preventDefault();
    if (!puedeEditarViajeros() || !formularioViajero.reportValidity()) return;
    const viajeroId = document.getElementById("idViajeroEditar").value;
    const datos = {
        nombre: document.getElementById("nombreViajero").value.trim(),
        edad: document.getElementById("edadViajero").valueAsNumber
    };
    return guardarCambioViajero(viajeroId ? "PUT" : "POST", viajeroId, datos,
        "errorFormularioViajero", viajeroId ? "Viajero actualizado." : "Viajero registrado.");
});

async function completarEdicion(solicitud) {
    solicitudEditar = solicitud;
    editarSalida.value = solicitud.fechaSalida;
    editarRegreso.value = solicitud.fechaRegreso;
    aplicarPermisoEdicion(solicitud);
    pintarViajerosEdicion(solicitud);
    if (solicitud.estado === "Nueva") {
        await seleccionEditar.cargar(solicitud.destinoId, undefined, solicitud.servicioId);
        if (solicitudEditar === solicitud && !solicitud.destinoId) {
            const aviso = document.getElementById("editarServicioAviso");
            aviso.textContent = "Registro anterior: " + solicitud.destino + ". Seleccioná el destino y el servicio principal para guardar.";
            aviso.hidden = false;
        }
    }
}

function aplicarPermisoEdicion(solicitud) {
    const editable = esCliente && solicitud.estado === "Nueva";
    formularioEditar.querySelectorAll("input").forEach(campo => { campo.disabled = !editable; });
    guardarSolicitud.disabled = !editable;
    document.getElementById("solicitudSoloConsulta").hidden = editable;
}

function completarGestion(solicitud) {
    solicitudGestion = solicitud;
    mostrarDato("gestionCliente", solicitud.cliente?.nombre);
    mostrarDato("gestionContacto", [solicitud.cliente?.correo, solicitud.cliente?.telefono].filter(Boolean).join(" · ") || "No registrado");
    mostrarDato("gestionDestino", solicitud.destino);
    mostrarDato("gestionServicio", solicitud.servicioSolicitado || "No especificado");
    if (esAdministrador) {
        seguimiento.hidden = false;
        cargarContactos(solicitud._id);
    }
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
        if (elemento === modalDetalle) {
            enlaceFicha.hidden = true;
            enlaceFicha.removeAttribute("href");
            document.getElementById("etiquetaDetalleCliente").hidden = true;
            document.getElementById("detalleClienteSolicitud").hidden = true;
            seccionViajeros.hidden = true;
        }
        if (elemento === modalEditar) {
            solicitudEditar = null;
            formularioEditar.reset();
            seleccionEditar.limpiar();
            formularioEditar.querySelectorAll("input").forEach(campo => { campo.disabled = true; });
            guardarSolicitud.disabled = true;
            document.getElementById("solicitudSoloConsulta").hidden = true;
            viajerosEdicion.hidden = true;
            formularioViajero.reset();
            guardarViajero.disabled = true;
            editorViajero.classList.remove("show");
            panelRetiro.hidden = true;
            viajeroRetiro = null;
        }
        if (elemento === modalGestion) {
            solicitudGestion = null;
            seguimiento.hidden = true;
            cerrarFormularioContacto();
            document.getElementById("contactoGuardado").hidden = true;
        }
        document.getElementById("sinSolicitudSeleccionada").hidden = true;
        mensajeEn(mensajeId, "Cargando solicitud…", "info");
        try {
            const solicitud = await consultarAPI(`${API.SOLICITUDES}/${encodeURIComponent(id)}`);
            if (versionesModal.get(elemento) !== version) return;
            await completar(solicitud);
            if (versionesModal.get(elemento) === version) mensajeEn(mensajeId, "");
        } catch (error) {
            if (versionesModal.get(elemento) === version) mensajeEn(mensajeId, error.message);
        }
    });
    elemento.addEventListener("hidden.bs.modal", () => {
        versionesModal.set(elemento, (versionesModal.get(elemento) || 0) + 1);
    });
}

function rutaContactos(id) {
    return `${API.SOLICITUDES}/${encodeURIComponent(id)}/contactos`;
}

async function cargarContactos(id) {
    const version = versionesModal.get(modalGestion);
    const cargando = document.getElementById("cargandoContactos");
    const tabla = document.getElementById("tablaContactos");
    const filas = document.getElementById("filasContactos");
    const vacio = document.getElementById("sinContactos");
    cargando.hidden = false;
    tabla.hidden = true;
    vacio.hidden = true;
    registrarContacto.disabled = true;
    filas.replaceChildren();
    mensajeEn("errorContactos", "");
    try {
        const contactos = await consultarAPI(rutaContactos(id));
        if (version !== versionesModal.get(modalGestion)) return;
        const plantilla = document.getElementById("filaContacto");
        for (const contacto of contactos) {
            const fila = plantilla.content.cloneNode(true);
            fila.querySelectorAll("[data-campo]").forEach(celda => {
                celda.textContent = contacto[celda.dataset.campo];
            });
            filas.appendChild(fila);
        }
        tabla.hidden = contactos.length === 0;
        vacio.hidden = contactos.length > 0;
    } catch (error) {
        if (version === versionesModal.get(modalGestion)) mensajeEn("errorContactos", error.message);
    } finally {
        if (version === versionesModal.get(modalGestion)) {
            cargando.hidden = true;
            registrarContacto.disabled = false;
        }
    }
}

function cerrarConfirmacionContacto() {
    confirmarContacto.hidden = true;
    guardarContacto.disabled = true;
}

function cerrarFormularioContacto() {
    formularioContacto.reset();
    formularioContacto.hidden = true;
    registrarContacto.hidden = false;
    cerrarConfirmacionContacto();
    mensajeEn("errorFormularioContacto", "");
}

function datosContacto() {
    return {
        fecha: formularioContacto.elements.fecha.value,
        canal: formularioContacto.elements.canal.value.trim(),
        nota: formularioContacto.elements.nota.value.trim()
    };
}

registrarContacto.addEventListener("click", () => {
    if (!esAdministrador || !solicitudGestion) return;
    document.getElementById("contactoGuardado").hidden = true;
    registrarContacto.hidden = true;
    formularioContacto.hidden = false;
    formularioContacto.elements.fecha.focus();
});

document.getElementById("btnCancelarContacto").addEventListener("click", () => {
    if (guardandoContacto) return;
    cerrarFormularioContacto();
    registrarContacto.focus();
});
document.getElementById("btnVolverContacto").addEventListener("click", cerrarConfirmacionContacto);
formularioContacto.addEventListener("input", cerrarConfirmacionContacto);
document.getElementById("btnRevisarContacto").addEventListener("click", () => {
    if (guardandoContacto || !formularioContacto.reportValidity()) return;
    const { canal, nota } = datosContacto();
    if (!canal || !nota) {
        mensajeEn("errorFormularioContacto", "Completá el canal y la nota.");
        return;
    }
    mensajeEn("errorFormularioContacto", "");
    confirmarContacto.hidden = false;
    guardarContacto.disabled = false;
    guardarContacto.focus();
});

modalGestion.addEventListener("hide.bs.modal", evento => {
    if (guardandoContacto) evento.preventDefault();
});

formularioContacto.addEventListener("submit", async evento => {
    evento.preventDefault();
    if (!esAdministrador || !solicitudGestion || guardandoContacto ||
        confirmarContacto.hidden || evento.submitter !== guardarContacto) return;
    const id = solicitudGestion._id;
    guardandoContacto = true;
    guardarContacto.disabled = true;
    mensajeEn("errorFormularioContacto", "");
    try {
        await consultarAPI(rutaContactos(id), "POST", datosContacto());
        cerrarFormularioContacto();
        document.getElementById("contactoGuardado").hidden = false;
        await cargarContactos(id);
        registrarContacto.focus();
    } catch (error) {
        mensajeEn("errorFormularioContacto", error.message);
    } finally {
        guardandoContacto = false;
        guardarContacto.disabled = confirmarContacto.hidden;
    }
});

function validarFechasEdicion() {
    editarRegreso.setCustomValidity(editarSalida.value && editarRegreso.value && editarRegreso.value < editarSalida.value
        ? "El regreso no puede ser anterior a la salida." : "");
}
editarSalida.addEventListener("input", validarFechasEdicion);
editarRegreso.addEventListener("input", validarFechasEdicion);
modalEditar.addEventListener("hidden.bs.modal", () => {
    solicitudEditar = null;
    seleccionEditar.limpiar();
    formularioEditar.reset();
    editarRegreso.setCustomValidity("");
});
modalEditar.addEventListener("hide.bs.modal", evento => {
    if (guardandoSolicitud || guardandoViajero) evento.preventDefault();
});
formularioEditar.addEventListener("submit", async evento => {
    evento.preventDefault();
    if (!puedeEditarViajeros() || guardarSolicitud.disabled) return;
    validarFechasEdicion();
    if (!formularioEditar.reportValidity()) return;
    if (!destinoEditar.value || !servicioEditar.value || servicioEditar.disabled) {
        mensajeEn("mensajeEditarSolicitud", "Seleccioná un destino y un servicio principal.");
        return;
    }
    const datos = {
        destinoId: destinoEditar.value, servicioId: servicioEditar.value,
        fechaSalida: editarSalida.value, fechaRegreso: editarRegreso.value
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
            viajerosEdicion.hidden = true;
            await cargarSolicitudes();
        }
    } finally {
        guardandoSolicitud = false;
        guardarSolicitud.disabled = !solicitudEditar || solicitudEditar.estado !== "Nueva";
    }
});

modalConfirmar.addEventListener("show.bs.modal", evento => {
    const id = evento.relatedTarget?.dataset.solicitudId;
    const solicitud = solicitudes?.find(registro => registro._id === id);
    if (!esAdministrador || solicitud?.estado !== "Nueva") {
        evento.preventDefault();
        return;
    }
    solicitudPorCotizar = solicitud._id;
    mostrarDato("destinoConfirmarCotizacion", solicitud.destino);
    mensajeEn("errorConfirmarCotizacion", "");
    guardarEstado.disabled = guardandoEstado;
});
modalConfirmar.addEventListener("hide.bs.modal", evento => {
    if (guardandoEstado) evento.preventDefault();
});
modalConfirmar.addEventListener("hidden.bs.modal", () => {
    solicitudPorCotizar = null;
    guardarEstado.disabled = true;
});
guardarEstado.addEventListener("click", async () => {
    if (!esAdministrador || !solicitudPorCotizar || guardandoEstado) return;
    guardandoEstado = true;
    guardarEstado.disabled = true;
    try {
        await consultarAPI(`${API.SOLICITUDES}/${encodeURIComponent(solicitudPorCotizar)}/estado`,
            "PATCH", { estado: "En cotización" });
        solicitudPorCotizar = null;
        guardandoEstado = false;
        bootstrap.Modal.getOrCreateInstance(modalConfirmar).hide();
        mensajeEn("mensajePagina", "La solicitud pasó a En cotización.", "success");
        await cargarSolicitudes();
    } catch (error) {
        mensajeEn("errorConfirmarCotizacion", error.message);
        if ([403, 404, 409].includes(error.status)) {
            solicitudPorCotizar = null;
            await cargarSolicitudes();
        }
    } finally {
        guardandoEstado = false;
        guardarEstado.disabled = !solicitudPorCotizar;
    }
});

function configurarSeleccion(destino, servicio, preferido = () => "") {
    const aviso = document.getElementById(servicio.id + "Aviso");
    let version = 0;
    function avisar(texto) {
        aviso.textContent = texto;
        aviso.hidden = !texto;
    }
    function limpiarServicio() {
        version++;
        servicio.replaceChildren(new Option("Primero seleccioná un destino", ""));
        servicio.disabled = true;
        avisar("");
    }
    async function cargarServicios(servicioId) {
        limpiarServicio();
        if (!destino.value) return;
        const turno = version;
        avisar("Cargando servicios…");
        try {
            const parametros = new URLSearchParams({ destino: destino.value });
            const servicios = await consultarAPI(API.SERVICIOS + "/publicos?" + parametros);
            if (turno !== version) return;
            servicio.replaceChildren(new Option("Seleccioná un servicio", ""));
            for (const item of servicios) servicio.add(new Option(item.nombre, item._id));
            servicio.value = servicios.some(item => item._id === servicioId) ? servicioId : "";
            servicio.disabled = !servicios.length;
            avisar(servicios.length ? "" : "Este destino todavía no tiene servicios disponibles.");
        } catch (error) {
            if (turno === version) avisar(error.message);
        }
    }
    function limpiar() {
        limpiarServicio();
        destino.replaceChildren(new Option("Seleccioná un destino", ""));
        destino.disabled = true;
    }
    destino.addEventListener("change", () => cargarServicios(preferido()));
    return {
        limpiar, limpiarServicio,
        async cargar(destinoId, permitidos, servicioId) {
            limpiar();
            const turno = version;
            const destinos = await consultarAPI(API.DESTINOS + "/publicos");
            if (turno !== version) return;
            const opciones = permitidos ? destinos.filter(item => permitidos.includes(item._id)) : destinos;
            for (const item of opciones) destino.add(new Option(item.nombre, item._id));
            destino.disabled = !opciones.length;
            if (!opciones.length) avisar("No hay destinos disponibles para seleccionar.");
            if (opciones.some(item => item._id === destinoId)) {
                destino.value = destinoId;
                await cargarServicios(servicioId);
            }
        }
    };
}

const seleccionNueva = configurarSeleccion(destino, servicio, () => servicioCatalogo?._id);
const seleccionEditar = configurarSeleccion(destinoEditar, servicioEditar);

iniciar();
