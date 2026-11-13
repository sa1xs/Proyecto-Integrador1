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
let esAdministrador = false;
let clienteFiltro = null;
let cotizaciones = [];
let solicitudesPorId = new Map();
let servicios = [];
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

function nombreSolicitud(id) {
    const registro = solicitudesPorId.get(id);
    return registro ? `${registro.destino} (${id})` : id;
}

function mostrarListado() {
    const estado = elemento(vista.filtro).value;
    const filas = elemento(vista.filas);
    filas.replaceChildren();
    const visibles = cotizaciones.filter(cotizacion => !estado || cotizacion.estado === estado);
    for (const cotizacion of visibles) {
        const registro = solicitudesPorId.get(cotizacion.solicitud);
        const fila = pintarFila(vista.plantilla, {
            codigo: cotizacion._id, solicitud: nombreSolicitud(cotizacion.solicitud),
            cliente: registro?.cliente?.nombre || cotizacion.cliente,
            total: dinero.format(cotizacion.total), estado: cotizacion.estado
        });
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
    elemento(vista.vacio).hidden = true;
    elemento(vista.sinCoincidencias).hidden = true;
    elemento(vista.filas).replaceChildren();
    mensaje(vista.error, "");
    try {
        const filtro = clienteFiltro ? `?${new URLSearchParams({ cliente: clienteFiltro })}` : "";
        const [ofertas, solicitudes] = await Promise.all([
            consultar(`${API.COTIZACIONES}${filtro}`),
            consultar(`${API.SOLICITUDES}${filtro}`).catch(() => [])
        ]);
        cotizaciones = ofertas;
        solicitudesPorId = new Map(solicitudes.map(registro => [registro._id, registro]));
        mostrarListado();
    } catch (error) {
        cotizaciones = [];
        elemento(vista.filas).replaceChildren();
        mensaje(vista.error, error.message);
    } finally {
        elemento(vista.carga).hidden = true;
        elemento(vista.filtro).disabled = false;
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
    partidas.forEach((partida, indice) => {
        const fila = pintarFila("filaPartidaEditor", partida);
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
            pintarPartidasEditor();
        });
        filas.appendChild(fila);
    });
    elemento("sinPartidas").hidden = partidas.length > 0;
    pintarTotal();
}

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
        const [solicitudes, catalogo, proveedores, borrador] = await Promise.all([
            consultar(`${API.SOLICITUDES}?${filtro}`),
            consultar(API.SERVICIOS), consultar(API.PROVEEDORES),
            id ? consultar(rutaCotizacion(id)) : null
        ]);
        if (version !== versionEditor) return;
        if (borrador && borrador.estado !== "Borrador") throw new Error("Solo podés editar cotizaciones en Borrador.");
        const proveedoresActivos = new Set(proveedores.filter(p => p.activo).map(p => p._id));
        servicios = catalogo.filter(s => s.activo && proveedoresActivos.has(s.proveedor?._id));
        servicio.replaceChildren(new Option("Seleccioná un servicio", ""));
        for (const registro of servicios) {
            servicio.add(new Option(`${registro.nombre} · ${registro.proveedor.nombre}`, registro._id));
        }
        const disponibles = solicitudes.filter(registro => !registro.cotizacion);
        solicitud.replaceChildren(new Option("Seleccioná una solicitud", ""));
        if (borrador) {
            solicitud.add(new Option(nombreSolicitud(borrador.solicitud), borrador.solicitud));
            solicitud.value = borrador.solicitud;
        } else {
            for (const registro of disponibles) {
                solicitud.add(new Option(`${registro.destino} · ${registro.cliente?.nombre || registro._id}`, registro._id));
            }
        }
        solicitud.disabled = Boolean(borrador);
        elemento("sinSolicitudesCotizables").hidden = Boolean(borrador) || disponibles.length > 0;
        elemento("sinServiciosCotizacion").hidden = servicios.length > 0;
        elemento("camposPartida").disabled = servicios.length === 0;
        agregar.disabled = servicios.length === 0;
        partidas = borrador?.partidas ?? [];
        pintarPartidasEditor();
        formulario.hidden = false;
        guardar.disabled = !borrador && disponibles.length === 0;
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
    if (!esAdministrador || guardando || formulario.hidden) return;
    const registro = servicios.find(s => s._id === servicio.value);
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
        mensaje("errorEditorCotizacion", "Revisá la cantidad y el precio de la partida.");
        return;
    }
    partidas.push(partida);
    evento.currentTarget.reset();
    mensaje("errorEditorCotizacion", "");
    pintarPartidasEditor();
});

formulario.addEventListener("submit", async evento => {
    evento.preventDefault();
    if (!esAdministrador || guardando || guardar.disabled) return;
    if (!Number.isSafeInteger(pintarTotal())) {
        mensaje("errorEditorCotizacion", "Revisá las partidas. El total supera el máximo o hay un importe inválido.");
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
        elemento("cotizacionCodigo").textContent = cotizacion._id;
        elemento("cotizacionSolicitud").textContent = nombreSolicitud(cotizacion.solicitud);
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
            mensaje(`resumen${accion}Cotizacion`, `${nombreSolicitud(cotizacion.solicitud)} · Total CRC ${dinero.format(cotizacion.total)}`);
            if (cotizacion.estado !== (estado ? "Publicada" : "Borrador")) {
                throw new Error("La cotización cambió de estado. Actualizá el listado antes de continuar.");
            }
            if (!estado && !cotizacion.partidas.length) throw new Error("Agregá al menos una partida antes de publicar.");
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
            await consultar(`${rutaCotizacion(seleccion)}/${estado ? "respuesta" : "publicar"}`, "PATCH",
                estado ? { estado } : undefined);
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
    await cargarListado();
}
