import { API } from "./config.js";

const elemento = id => document.getElementById(id);
const dinero = new Intl.NumberFormat("es-CR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const editor = elemento("editorCotizacion");
const detalle = elemento("detalleCotizacion");
const formulario = elemento("formularioCotizacion");
const solicitud = elemento("solicitudCotizacion");
const servicio = elemento("servicioPartida");
const guardar = elemento("btnGuardarCotizacion");
const agregar = elemento("btnAgregarPartida");
const buscar = elemento("buscarCotizacion");
let esAdministrador = false;
let clienteFiltro = null;
let cotizaciones = null;
let solicitudesPorId = new Map();
let servicios = [];
let destinosActivos = [];
let solicitudesEditor = new Map();
const destinoVincular = elemento("vincularDestinoCotizacion");
const servicioVincular = elemento("vincularServicioCotizacion");
const vincular = elemento("btnVincularSolicitudCotizacion");
let partidas = [];
let borradorId = "";
let detalleId = "";
let guardando = false;
let versionEditor = 0;
let versionDetalle = 0;
let vista;

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

function rutaCotizacion(id) {
    return `${API.COTIZACIONES}/${encodeURIComponent(id)}`;
}

function pintarFila(plantilla, datos) {
    const fila = elemento(plantilla).content.firstElementChild.cloneNode(true);
    fila.querySelectorAll("[data-campo]").forEach(celda => {
        celda.textContent = datos[celda.dataset.campo] ?? "";
    });
    return fila;
}

function opcionSolicitud(id, registro) {
    const cliente = registro?.cliente?.nombre || "Cliente no disponible";
    const salida = registro?.fechaSalida?.split("-").reverse().join("/") || "No disponible";
    const opcion = new Option(`${cliente} · Salida: ${salida}`, id);
    opcion.dataset.viajeros = registro?.cantidadViajeros ?? "";
    return opcion;
}

function rutaFichaCliente(id) {
    return `/views/clientes.html?${new URLSearchParams({ cliente: id })}`;
}

function mostrarListado() {
    if (!cotizaciones) return;
    const estado = elemento(vista.filtro).value;
    const texto = esAdministrador ? buscar.value.trim().toLocaleLowerCase() : "";
    const filas = elemento(vista.filas);
    filas.replaceChildren();
    const visibles = cotizaciones.filter(cotizacion => {
        if (estado && cotizacion.estado !== estado) return false;
        if (!texto) return true;
        const registro = solicitudesPorId.get(cotizacion.solicitud);
        return [cotizacion._id, cotizacion.solicitud, registro?.cliente?.nombre,
            registro?.cliente?.correo, cotizacion.cliente, registro?.destino]
            .some(valor => String(valor ?? "").toLocaleLowerCase().includes(texto));
    });
    for (const cotizacion of visibles) {
        const registro = solicitudesPorId.get(cotizacion.solicitud);
        const fila = pintarFila(vista.plantilla, {
            destino: registro?.destino || "No disponible",
            cliente: registro?.cliente?.nombre || "No disponible",
            total: dinero.format(cotizacion.total), estado: cotizacion.estado
        });
        if (esAdministrador && registro?.cliente?._id) {
            fila.querySelector('[data-campo="cliente"]').href = rutaFichaCliente(registro.cliente._id);
        }
        fila.querySelectorAll("[data-accion]").forEach(boton => {
            boton.dataset.cotizacionId = cotizacion._id;
            boton.hidden = boton.dataset.accion !== "detalle" && cotizacion.estado !== "Borrador";
        });
        filas.appendChild(fila);
    }
    elemento(vista.vacio).hidden = cotizaciones.length > 0;
    elemento(vista.sinCoincidencias).hidden = !cotizaciones.length || visibles.length > 0;
}

async function cargarListado() {
    elemento(vista.carga).hidden = false;
    elemento(vista.filtro).disabled = true;
    buscar.disabled = true;
    elemento(vista.vacio).hidden = true;
    elemento(vista.sinCoincidencias).hidden = true;
    elemento(vista.filas).replaceChildren();
    mensaje(vista.error, "");
    mensaje("cotizacionesEnPreparacion", "");
    try {
        const filtro = clienteFiltro ? `?${new URLSearchParams({ cliente: clienteFiltro })}` : "";
        const [ofertas, solicitudes] = await Promise.all([
            consultar(`${API.COTIZACIONES}${filtro}`),
            consultar(`${API.SOLICITUDES}${filtro}`).catch(() => [])
        ]);
        cotizaciones = ofertas;
        solicitudesPorId = new Map(solicitudes.map(registro => [registro._id, registro]));
        if (!esAdministrador) {
            const pendientes = solicitudes.filter(registro => registro.estado === "En cotización" &&
                !ofertas.some(oferta => oferta.solicitud === registro._id)).length;
            mensaje("cotizacionesEnPreparacion", pendientes
                ? (pendientes === 1
                    ? "Tenés una solicitud en preparación. La oferta con sus precios se mostrará aquí cuando se publique."
                    : `Tenés ${pendientes} solicitudes en preparación. Las ofertas con sus precios se mostrarán aquí cuando se publiquen.`)
                : "");
        }
        mostrarListado();
    } catch (error) {
        cotizaciones = null;
        elemento(vista.filas).replaceChildren();
        mensaje(vista.error, error.message);
    } finally {
        elemento(vista.carga).hidden = true;
        elemento(vista.filtro).disabled = false;
        buscar.disabled = false;
    }
}

function importePartida(partida) {
    if (!Number.isSafeInteger(partida.cantidad) || partida.cantidad < 1 ||
        !Number.isFinite(partida.precio) || !/^\d+(\.\d{1,2})?$/.test(String(partida.precio))) return NaN;
    return partida.cantidad * Math.round(partida.precio * 100);
}

function pintarTotal() {
    let total = 0;
    elemento("filasPartidasEditor").querySelectorAll("tr").forEach((fila, indice) => {
        const subtotal = importePartida(partidas[indice]);
        fila.querySelector('[data-campo="subtotal"]').textContent = Number.isSafeInteger(subtotal)
            ? dinero.format(subtotal / 100) : "—";
        total += subtotal;
    });
    elemento("totalCotizacionEditor").textContent = Number.isSafeInteger(total) ? dinero.format(total / 100) : "—";
    return total;
}

function pintarPartidasEditor() {
    const filas = elemento("filasPartidasEditor");
    filas.replaceChildren();
    const principalId = solicitudesEditor.get(solicitud.value)?.servicioId;
    partidas.forEach((partida, indice) => {
        const fila = pintarFila("filaPartidaEditor", partida);
        fila.querySelector("[data-principal]").hidden = partida.servicio !== principalId;
        const cantidad = fila.querySelector('[name="cantidades[]"]');
        const precio = fila.querySelector('[name="precios[]"]');
        cantidad.value = partida.cantidad;
        precio.value = partida.precio;
        for (const [campo, clave] of [[cantidad, "cantidad"], [precio, "precio"]]) {
            campo.addEventListener("input", () => {
                partida[clave] = campo.valueAsNumber;
                pintarTotal();
            });
        }
        fila.querySelector("button").addEventListener("click", () => {
            partidas.splice(indice, 1);
            if (partida.servicio === principalId) {
                elemento("precioPartida").value = "";
                sugerirCantidadViajeros();
            }
            pintarPartidasEditor();
        });
        filas.appendChild(fila);
    });
    elemento("tablaPartidasEditor").hidden = partidas.length === 0;
    pintarTotal();
    verificarPartidasEditor();
}

function sugerirCantidadViajeros() {
    const viajeros = solicitud.selectedOptions[0]?.dataset.viajeros;
    elemento("cantidadPartida").value = viajeros || "";
}

function serviciosDelDestino(destinoId) {
    return servicios.filter(registro => registro.destinos?.includes(destinoId));
}

function llenarServicios(selector, opciones) {
    selector.replaceChildren(new Option(opciones.length ? "Seleccioná un servicio" : "No hay servicios disponibles", ""));
    for (const registro of opciones) {
        selector.add(new Option(registro.nombre + " · " + registro.proveedor.nombre, registro._id));
    }
}

function verificarPartidasEditor() {
    const registro = solicitudesEditor.get(solicitud.value);
    const opciones = serviciosDelDestino(registro?.destinoId);
    const disponibles = destinosActivos.some(destino => destino._id === registro?.destinoId) &&
        opciones.some(item => item._id === registro?.servicioId);
    const principalId = registro?.servicioId;
    const principalNoDisponible = principalId && !disponibles;
    mensaje("principalNoDisponible", principalNoDisponible
        ? "El servicio principal «" + (registro.servicioSolicitado || "sin nombre") + "» no está disponible para cotizar." : "");
    const principalIncluido = partidas.some(partida => partida.servicio === principalId);
    elemento("avisoPrincipalPendiente").hidden = !disponibles || principalIncluido;
    const incompatibles = disponibles && partidas.some(partida => !opciones.some(item => item._id === partida.servicio));
    mensaje("serviciosIncompatiblesCotizacion", incompatibles
        ? "Quitá los servicios que ya no corresponden al destino o que están inactivos antes de guardar." : "");
    guardar.disabled = !disponibles || incompatibles || guardando;
    const adicionales = opciones.filter(item => item._id !== principalId &&
        !partidas.some(partida => partida.servicio === item._id));
    const mostrarAdicionales = disponibles && principalIncluido && adicionales.length > 0;
    const seleccionado = servicio.value;
    llenarServicios(servicio, adicionales);
    servicio.value = mostrarAdicionales && adicionales.some(item => item._id === seleccionado) ? seleccionado : "";
    servicio.disabled = !mostrarAdicionales;
    elemento("servicioAdicionalCotizacion").hidden = !mostrarAdicionales;

    const puedeAgregar = disponibles && (!principalIncluido || mostrarAdicionales);
    elemento("camposPartida").hidden = !puedeAgregar;
    agregar.disabled = !puedeAgregar;
    mostrarDescripcionServicio();
}

function actualizarSolicitudEditor() {
    const registro = solicitudesEditor.get(solicitud.value);
    const requiereVinculo = Boolean(registro && (!registro.destinoId || !registro.servicioId));
    elemento("vinculosSolicitudCotizacion").hidden = !requiereVinculo;
    mensaje("destinoOriginalCotizacion", requiereVinculo
        ? "Registro anterior: " + registro.destino + ". Elegí a qué destino y servicio principal corresponde." : "");
    if (requiereVinculo) {
        destinoVincular.value = "";
        actualizarServicioVincular();
    }
    elemento("datosSolicitudCotizacion").hidden = !registro || requiereVinculo;
    elemento("destinoSolicitudCotizacion").value = registro?.destino ?? "";
    elemento("servicioSolicitudCotizacion").value = registro?.servicioSolicitado ?? "";
    servicio.value = "";
    elemento("precioPartida").value = "";
    sugerirCantidadViajeros();
    pintarPartidasEditor();
}

function actualizarServicioVincular() {
    llenarServicios(servicioVincular, serviciosDelDestino(destinoVincular.value));
    servicioVincular.disabled = servicioVincular.options.length === 1;
    vincular.disabled = true;
}

destinoVincular.addEventListener("change", actualizarServicioVincular);
servicioVincular.addEventListener("change", () => { vincular.disabled = !servicioVincular.value; });

vincular.addEventListener("click", async () => {
    if (guardando || !solicitud.value || !destinoVincular.value || !servicioVincular.value) return;
    const id = solicitud.value;
    guardando = true;
    formulario.inert = true;
    vincular.disabled = true;
    mensaje("errorEditorCotizacion", "");
    try {
        const resultado = await consultar(API.SOLICITUDES + "/" + encodeURIComponent(id) + "/vinculos", "PATCH", {
            destinoId: destinoVincular.value, servicioId: servicioVincular.value
        });
        const registro = { ...solicitudesEditor.get(id), ...resultado.datos,
            cliente: solicitudesEditor.get(id).cliente };
        solicitudesEditor.set(id, registro);
        solicitudesPorId.set(id, registro);
        solicitud.selectedOptions[0].replaceWith(opcionSolicitud(id, registro));
        solicitud.value = id;
        mostrarListado();
    } catch (error) {
        mensaje("errorEditorCotizacion", error.message);
    } finally {
        guardando = false;
        formulario.inert = false;
        if (solicitudesEditor.get(id)?.servicioId) actualizarSolicitudEditor();
        else vincular.disabled = !servicioVincular.value;
    }
});

solicitud.addEventListener("change", () => {
    mensaje("errorEditorCotizacion", "");
    actualizarSolicitudEditor();
});

function servicioParaAgregar() {
    const solicitudActual = solicitudesEditor.get(solicitud.value);
    const id = servicio.disabled ? solicitudActual?.servicioId : servicio.value;
    return serviciosDelDestino(solicitudActual?.destinoId).find(item => item._id === id);
}

function mostrarDescripcionServicio() {
    const descripcion = servicioParaAgregar()?.descripcion;
    mensaje("descripcionServicioCotizacion", descripcion || "");
}

servicio.addEventListener("change", mostrarDescripcionServicio);

editor.addEventListener("show.bs.modal", async evento => {
    if (!esAdministrador || guardando) {
        evento.preventDefault();
        return;
    }
    const version = ++versionEditor;
    borradorId = evento.relatedTarget?.dataset.cotizacionId || "";
    const id = borradorId;
    formulario.reset();
    elemento("formularioPartida").reset();
    formulario.hidden = true;
    guardar.disabled = true;
    agregar.disabled = true;
    mensaje("errorEditorCotizacion", "");
    elemento("editorCotizacionCarga").hidden = false;
    try {
        const filtro = new URLSearchParams({ estado: "En cotización" });
        if (clienteFiltro) filtro.set("cliente", clienteFiltro);
        const [solicitudes, catalogo, proveedores, destinos, borrador] = await Promise.all([
            consultar(`${API.SOLICITUDES}?${filtro}`),
            consultar(API.SERVICIOS), consultar(API.PROVEEDORES), consultar(API.DESTINOS),
            id ? consultar(rutaCotizacion(id)) : null
        ]);
        if (version !== versionEditor) return;
        if (borrador && borrador.estado !== "Borrador") throw new Error("Solo podés editar cotizaciones en Borrador.");
        const proveedoresActivos = new Set(proveedores.filter(p => p.activo).map(p => p._id));
        servicios = catalogo.filter(s => s.activo && proveedoresActivos.has(s.proveedor?._id));
        destinosActivos = destinos.filter(destino => destino.activo);
        solicitudesEditor = new Map(solicitudes.map(registro => [registro._id, registro]));
        destinoVincular.replaceChildren(new Option("Seleccioná un destino", ""));
        for (const destino of destinosActivos) destinoVincular.add(new Option(destino.nombre, destino._id));
        const disponibles = solicitudes.filter(registro => !registro.cotizacion);
        solicitud.replaceChildren(new Option("Seleccioná una solicitud", ""));
        if (borrador) {
            const registro = solicitudes.find(item => item._id === borrador.solicitud) || solicitudesPorId.get(borrador.solicitud);
            if (registro) solicitudesEditor.set(registro._id, registro);
            solicitud.add(opcionSolicitud(borrador.solicitud, registro));
            solicitud.value = borrador.solicitud;
        } else {
            for (const registro of disponibles) {
                solicitud.add(opcionSolicitud(registro._id, registro));
            }
        }
        solicitud.disabled = Boolean(borrador);
        elemento("sinSolicitudesCotizables").hidden = Boolean(borrador) || disponibles.length > 0;
        partidas = borrador?.partidas ?? [];
        actualizarSolicitudEditor();
        formulario.hidden = false;
    } catch (error) {
        if (version === versionEditor) mensaje("errorEditorCotizacion", error.message);
    } finally {
        if (version === versionEditor) elemento("editorCotizacionCarga").hidden = true;
    }
});
editor.addEventListener("hidden.bs.modal", () => { versionEditor++; });
editor.addEventListener("hide.bs.modal", evento => {
    if (guardando) evento.preventDefault();
});

elemento("formularioPartida").addEventListener("submit", evento => {
    evento.preventDefault();
    if (!esAdministrador || guardando || formulario.hidden || agregar.disabled) return;
    const registro = servicioParaAgregar();
    if (!registro) return;
    if (partidas.some(partida => partida.servicio === registro._id)) {
        mensaje("errorEditorCotizacion", "Ese servicio ya está en la cotización. Podés ajustar su cantidad en la tabla.");
        return;
    }
    const partida = {
        servicio: registro._id, nombre: registro.nombre,
        cantidad: elemento("cantidadPartida").valueAsNumber, precio: elemento("precioPartida").valueAsNumber
    };
    if (!Number.isSafeInteger(importePartida(partida))) {
        mensaje("errorEditorCotizacion", "Revisá la cantidad y el precio del servicio.");
        return;
    }
    partidas.push(partida);
    actualizarSolicitudEditor();
    mensaje("errorEditorCotizacion", "");
});

formulario.addEventListener("submit", async evento => {
    evento.preventDefault();
    if (!esAdministrador || guardando || guardar.disabled) return;
    if (!Number.isSafeInteger(pintarTotal())) {
        mensaje("errorEditorCotizacion", "Revisá los servicios. El total supera el máximo o hay un importe inválido.");
        return;
    }
    const datos = { partidas: partidas.map(({ servicio, cantidad, precio }) => ({ servicio, cantidad, precio })) };
    if (!borradorId) datos.solicitud = solicitud.value;
    guardando = true;
    guardar.disabled = true;
    formulario.inert = true;
    elemento("guardandoCotizacion").hidden = false;
    mensaje("errorEditorCotizacion", "");
    try {
        await consultar(borradorId ? rutaCotizacion(borradorId) : API.COTIZACIONES, borradorId ? "PUT" : "POST", datos);
    } catch (error) {
        mensaje("errorEditorCotizacion", error.message);
        return;
    } finally {
        guardando = false;
        guardar.disabled = false;
        formulario.inert = false;
        elemento("guardandoCotizacion").hidden = true;
    }
    bootstrap.Modal.getOrCreateInstance(editor).hide();
    mensaje("mensajePagina", "Borrador guardado.");
    await cargarListado();
});

function fechaVisible(fecha) {
    return new Date(fecha).toLocaleDateString("es-CR");
}

detalle.addEventListener("show.bs.modal", async evento => {
    const id = evento.relatedTarget?.dataset.cotizacionId;
    if (!id) {
        evento.preventDefault();
        return;
    }
    const version = ++versionDetalle;
    detalleId = "";
    elemento("contenidoDetalleCotizacion").hidden = true;
    elemento("detalleCotizacionCarga").hidden = false;
    mensaje("detalleCotizacionError", "");
    try {
        const cotizacion = await consultar(rutaCotizacion(id));
        if (version !== versionDetalle) return;
        detalleId = cotizacion._id;
        const solicitud = solicitudesPorId.get(cotizacion.solicitud);
        elemento("cotizacionCodigo").textContent = cotizacion._id;
        elemento("cotizacionDestino").textContent = solicitud?.destino || "No disponible";
        elemento("cotizacionServicioPrincipal").textContent = solicitud?.servicioSolicitado || "No especificado";
        elemento("etiquetaClienteCotizacion").hidden = !esAdministrador;
        elemento("clienteDetalleCotizacion").hidden = !esAdministrador;
        const enlace = elemento("enlaceClienteCotizacion");
        enlace.textContent = solicitud?.cliente?.nombre || "No disponible";
        enlace.removeAttribute("href");
        if (esAdministrador && solicitud?.cliente?._id) {
            enlace.href = rutaFichaCliente(solicitud.cliente._id);
        }
        elemento("cotizacionEstado").textContent = cotizacion.estado;
        elemento("cotizacionPublicacion").textContent = cotizacion.fechaPublicacion ? fechaVisible(cotizacion.fechaPublicacion) : "Pendiente";
        const filas = elemento("partidasDetalle");
        filas.replaceChildren();
        for (const partida of cotizacion.partidas) {
            filas.appendChild(pintarFila("filaPartidaDetalle", {
                ...partida, precio: dinero.format(partida.precio), subtotal: dinero.format(partida.subtotal)
            }));
        }
        elemento("cotizacionTotal").textContent = dinero.format(cotizacion.total);
        elemento("accionesRespuestaCotizacion").hidden = esAdministrador || cotizacion.estado !== "Publicada";
        elemento("respuestaYaRegistrada").hidden = !cotizacion.fechaRespuesta;
        mensaje("fechaRespuestaCotizacion", cotizacion.fechaRespuesta ? `Respuesta registrada el ${fechaVisible(cotizacion.fechaRespuesta)}.` : "");
        elemento("contenidoDetalleCotizacion").hidden = false;
    } catch (error) {
        if (version === versionDetalle) mensaje("detalleCotizacionError", error.message);
    } finally {
        if (version === versionDetalle) elemento("detalleCotizacionCarga").hidden = true;
    }
});
detalle.addEventListener("hidden.bs.modal", () => { versionDetalle++; });

for (const [accion, estado, texto, volver] of [
    ["Publicar", "", "Cotización publicada.", null],
    ["Eliminar", "", "Borrador eliminado.", null],
    ["Aceptar", "Aceptada", "Cotización aceptada.", "volverDesdeAceptar"],
    ["Rechazar", "Rechazada", "Cotización rechazada.", "volverDesdeRechazar"]
]) {
    const modal = elemento(`${accion.toLowerCase()}Cotizacion`);
    const boton = elemento(`btn${accion}Cotizacion`);
    const errorId = `error${accion}Cotizacion`;
    let seleccion = "";
    let version = 0;
    let enviando = false;
    modal.addEventListener("show.bs.modal", async evento => {
        seleccion = "";
        const actual = ++version;
        const id = estado ? detalleId : evento.relatedTarget?.dataset.cotizacionId;
        const rolPermitido = estado ? !esAdministrador : esAdministrador;
        if (!id || !rolPermitido) {
            evento.preventDefault();
            return;
        }
        boton.disabled = true;
        mensaje(errorId, "");
        mensaje(`resumen${accion}Cotizacion`, "Cargando cotización…");
        if (volver) elemento(volver).dataset.cotizacionId = id;
        try {
            const cotizacion = await consultar(rutaCotizacion(id));
            if (version !== actual) return;
            const destino = solicitudesPorId.get(cotizacion.solicitud)?.destino || "Destino no disponible";
            mensaje(`resumen${accion}Cotizacion`, `${destino} · Total CRC ${dinero.format(cotizacion.total)}`);
            if (cotizacion.estado !== (estado ? "Publicada" : "Borrador")) {
                throw new Error("La cotización cambió de estado. Actualizá el listado antes de continuar.");
            }
            if (accion === "Publicar" && !cotizacion.partidas.length) throw new Error("Agregá al menos un servicio antes de publicar.");
            seleccion = id;
            boton.disabled = false;
        } catch (error) {
            if (version === actual) mensaje(errorId, error.message);
        }
    });
    modal.addEventListener("hide.bs.modal", evento => {
        if (enviando) evento.preventDefault();
    });
    modal.addEventListener("hidden.bs.modal", () => { version++; });
    boton.addEventListener("click", async () => {
        if (!seleccion || enviando) return;
        enviando = true;
        boton.disabled = true;
        mensaje(errorId, "");
        try {
            const ruta = rutaCotizacion(seleccion);
            if (accion === "Eliminar") {
                await consultar(ruta, "DELETE");
            } else {
                await consultar(`${ruta}/${estado ? "respuesta" : "publicar"}`, "PATCH",
                    estado ? { estado } : undefined);
            }
        } catch (error) {
            mensaje(errorId, error.message);
            return;
        } finally {
            enviando = false;
            boton.disabled = false;
        }
        bootstrap.Modal.getOrCreateInstance(modal).hide();
        mensaje("mensajePagina", texto);
        await cargarListado();
    });
}

export async function iniciarCotizaciones(rol) {
    esAdministrador = rol === "administrador";
    elemento("btnNuevaCotizacion").disabled = !esAdministrador;
    clienteFiltro = esAdministrador ? new URLSearchParams(location.search).get("cliente") : null;
    elemento("filtroClienteCotizaciones").hidden = !clienteFiltro;
    vista = esAdministrador ? {
        filas: "filasCotizacionesAdmin", plantilla: "filaCotizacionAdmin", filtro: "filtroCotizacionesAdmin",
        carga: "cotizacionesAdminCarga", error: "cotizacionesAdminError", vacio: "sinCotizacionesAdmin",
        sinCoincidencias: "sinCoincidenciasCotizacionesAdmin"
    } : {
        filas: "filasMisCotizaciones", plantilla: "filaMiCotizacion", filtro: "filtroMisCotizaciones",
        carga: "misCotizacionesCarga", error: "misCotizacionesError", vacio: "sinMisCotizaciones",
        sinCoincidencias: "sinCoincidenciasCotizacionesCliente"
    };
    elemento(vista.filtro).addEventListener("change", mostrarListado);
    if (esAdministrador) buscar.addEventListener("input", mostrarListado);
    await cargarListado();
}
