import { API } from "./config.js";
import { rutaConReferenciaSolicitud } from "./referenciaSolicitud.js";

const elemento = id => document.getElementById(id);
const detalle = elemento("detalleDestino");
const solicitarCotizacion = elemento("solicitarCotizacionDestino");
const editor = elemento("formularioDestinoModal");
const formulario = elemento("formularioDestino");
const guardar = elemento("btnGuardarDestino");
const rutaFavoritos = `${API.FAVORITOS}/destinos`;
const botonFavoritoDetalle = elemento("btnFavoritoDestinoDetalle");
const modalQuitar = elemento("quitarDestinoFavorito");
const botonQuitar = elemento("btnQuitarDestinoFavorito");
const buscarDestino = elemento("buscarDestino");
let esAdministrador = false;
let esCliente = false;
let favoritos = null;
let cargandoFavoritos = false;
let cambiandoFavorito = false;
let destinoDetalle = null;
let destinoPorQuitar = null;
let destinosAdmin = null;
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

function actualizarBotonFavorito(boton, id) {
    boton.disabled = !favoritos || cargandoFavoritos || cambiandoFavorito;
    if (boton.closest("#destinosFavoritos")) return;
    const guardado = favoritos?.some(destino => destino._id === id) ?? false;
    boton.textContent = guardado ? "✓ Guardado" : "Guardar";
    boton.setAttribute("aria-pressed", String(guardado));
    boton.title = guardado ? "Quitar de favoritos" : "Guardar en favoritos";
    boton.classList.toggle("btn-turquesa", guardado);
    boton.classList.toggle("btn-outline-primary", !guardado);
}

function actualizarBotonesFavoritos() {
    document.querySelectorAll('[data-accion="favorito"]:not([hidden])').forEach(boton => {
        actualizarBotonFavorito(boton, boton.dataset.destinoId);
    });
    if (destinoDetalle) actualizarBotonFavorito(botonFavoritoDetalle, destinoDetalle._id);
}

function crearFilaDestino(destino, plantilla) {
    const fila = elemento(plantilla).content.firstElementChild.cloneNode(true);
    const datos = {
        ...destino,
        estado: destino.activo ? "Activo" : "Inactivo",
        visibilidad: destino.publicado === false ? "Oculto" : (destino.activo ? "Publicado" : "Publicación en pausa")
    };
    fila.querySelectorAll("[data-campo]").forEach(campo => {
        campo.textContent = datos[campo.dataset.campo];
    });
    fila.querySelectorAll("[data-accion]").forEach(boton => {
        boton.dataset.destinoId = destino._id;
        boton.dataset.destinoNombre = destino.nombre;
    });
    return fila;
}

function crearTarjetaDestino(destino, enFavoritos = false) {
    const tarjeta = crearFilaDestino(destino, "tarjetaDestino");
    if (esCliente) {
        const boton = tarjeta.querySelector('[data-accion="favorito"]');
        boton.hidden = false;
        if (enFavoritos) {
            boton.textContent = "Quitar de favoritos";
            boton.classList.replace("btn-outline-primary", "btn-outline-danger");
            boton.addEventListener("click", () => abrirQuitarFavorito(destino));
        } else {
            boton.addEventListener("click", () => seleccionarFavorito(destino, "errorFavoritoDestinoCatalogo"));
        }
    }
    return tarjeta;
}

function mostrarDestinosFavoritos() {
    const lista = elemento("tarjetasDestinosFavoritos");
    lista.replaceChildren();
    for (const destino of favoritos ?? []) lista.appendChild(crearTarjetaDestino(destino, true));
    elemento("sinDestinosFavoritos").hidden = !favoritos || favoritos.length > 0;
    actualizarBotonesFavoritos();
}

async function cargarDestinosFavoritos() {
    if (!esCliente || cargandoFavoritos || cambiandoFavorito) return;
    cargandoFavoritos = true;
    elemento("cargandoDestinosFavoritos").hidden = false;
    mensaje("errorDestinosFavoritos", "");
    mensaje("errorFavoritoDestinoCatalogo", "");
    actualizarBotonesFavoritos();
    try {
        const resultado = await consultar(rutaFavoritos);
        if (!Array.isArray(resultado)) throw new Error("No se recibió un listado válido de favoritos.");
        favoritos = resultado;
    } catch (error) {
        mensaje("errorDestinosFavoritos", error.message);
        if (!favoritos) mensaje("errorFavoritoDestinoCatalogo", "No se pudieron cargar tus favoritos. Intentá desde Mis favoritos.");
    } finally {
        cargandoFavoritos = false;
        elemento("cargandoDestinosFavoritos").hidden = true;
        mostrarDestinosFavoritos();
    }
}

async function seleccionarFavorito(destino, errorId) {
    if (!esCliente || !favoritos || cargandoFavoritos || cambiandoFavorito) return;
    if (favoritos.some(item => item._id === destino._id)) {
        abrirQuitarFavorito(destino);
        return;
    }
    await cambiarDestinoFavorito(destino, errorId);
}

function abrirQuitarFavorito(destino) {
    if (!esCliente || cargandoFavoritos || cambiandoFavorito) return;
    destinoPorQuitar = destino;
    elemento("nombreDestinoFavorito").textContent = destino.nombre;
    mensaje("errorQuitarDestinoFavorito", "");
    const confirmacion = bootstrap.Modal.getOrCreateInstance(modalQuitar);
    if (detalle.classList.contains("show")) {
        detalle.addEventListener("hidden.bs.modal", () => confirmacion.show(), { once: true });
        bootstrap.Modal.getOrCreateInstance(detalle).hide();
    } else {
        confirmacion.show();
    }
}

async function cambiarDestinoFavorito(destino, errorId, quitar = false) {
    cambiandoFavorito = true;
    botonQuitar.disabled = true;
    actualizarBotonesFavoritos();
    mensaje(errorId, "");
    elemento("estadoDestinoFavorito").textContent = "";
    try {
        if (quitar) {
            await consultar(`${rutaFavoritos}/${encodeURIComponent(destino._id)}`, "DELETE");
            favoritos = favoritos.filter(item => item._id !== destino._id);
        } else {
            await consultar(rutaFavoritos, "POST", { destino: destino._id });
            favoritos.push(destino);
            favoritos.sort((primero, segundo) => primero.nombre.localeCompare(segundo.nombre, "es-CR"));
        }
        mostrarDestinosFavoritos();
        elemento("estadoDestinoFavorito").textContent = quitar ? "Destino quitado de tus favoritos." : "Destino guardado en tus favoritos.";
        return true;
    } catch (error) {
        mensaje(errorId, error.message);
        return false;
    } finally {
        cambiandoFavorito = false;
        botonQuitar.disabled = false;
        actualizarBotonesFavoritos();
    }
}

botonFavoritoDetalle.addEventListener("click", () => {
    if (destinoDetalle) seleccionarFavorito(destinoDetalle, "errorFavoritoDestinoDetalle");
});
botonQuitar.addEventListener("click", async () => {
    if (!esCliente || !favoritos || !destinoPorQuitar || cambiandoFavorito) return;
    if (await cambiarDestinoFavorito(destinoPorQuitar, "errorQuitarDestinoFavorito", true)) {
        bootstrap.Modal.getOrCreateInstance(modalQuitar).hide();
    }
});
modalQuitar.addEventListener("hide.bs.modal", evento => {
    if (cambiandoFavorito) evento.preventDefault();
});
modalQuitar.addEventListener("hidden.bs.modal", () => { destinoPorQuitar = null; });
elemento("tabDestinosFavoritos").addEventListener("shown.bs.tab", cargarDestinosFavoritos);

function mostrarDestinosAdmin() {
    if (!destinosAdmin) return;
    const texto = buscarDestino.value.trim().toLocaleLowerCase();
    const resultados = destinosAdmin.filter(destino => [destino.nombre, destino.pais]
        .some(valor => String(valor ?? "").toLocaleLowerCase().includes(texto)));
    const tabla = elemento("filasDestinos");
    tabla.replaceChildren();
    for (const destino of resultados) {
        const fila = crearFilaDestino(destino, "filaDestino");
        const visibilidad = fila.querySelector('[data-accion="visibilidad"]');
        const publicado = destino.publicado !== false;
        visibilidad.textContent = publicado ? "Ocultar" : "Publicar";
        visibilidad.dataset.publicado = String(publicado);
        visibilidad.disabled = !destino.activo && !publicado;
        fila.querySelector('[data-accion="desactivar"]').hidden = !destino.activo;
        fila.querySelector('[data-accion="reactivar"]').hidden = destino.activo;
        tabla.appendChild(fila);
    }
    elemento("sinDestinosAdmin").hidden = destinosAdmin.length > 0;
    elemento("sinCoincidenciasDestinos").hidden = destinosAdmin.length === 0 || resultados.length > 0;
}

buscarDestino.addEventListener("input", mostrarDestinosAdmin);

async function cargarDestinos(publico) {
    const contenedor = elemento(publico ? "tarjetasDestinos" : "filasDestinos");
    const carga = elemento(publico ? "catalogoDestinosCarga" : "adminDestinosCarga");
    const errorId = publico ? "catalogoDestinosError" : "adminDestinosError";
    const vacio = elemento(publico ? "sinDestinosPublicos" : "sinDestinosAdmin");

    carga.hidden = false;
    vacio.hidden = true;
    if (!publico) {
        destinosAdmin = null;
        elemento("sinCoincidenciasDestinos").hidden = true;
    }
    mensaje(errorId, "");
    contenedor.replaceChildren();

    try {
        const destinos = await consultar(publico ? `${API.DESTINOS}/publicos` : API.DESTINOS);
        if (!Array.isArray(destinos)) throw new Error("No se recibió un listado válido de destinos.");
        if (!publico) {
            destinosAdmin = destinos;
            mostrarDestinosAdmin();
            return;
        }
        for (const destino of destinos) contenedor.appendChild(crearTarjetaDestino(destino));
        if (esCliente) actualizarBotonesFavoritos();
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

async function cargarServiciosDelDestino(destinoId, publico, version) {
    const lista = elemento("listaServiciosDetalleDestino");
    mensaje("estadoServiciosDetalleDestino", "Cargando servicios…");
    elemento("serviciosDetalleDestino").hidden = false;
    try {
        const filtro = new URLSearchParams({ destino: destinoId });
        const ruta = publico ? API.SERVICIOS + "/publicos" : API.SERVICIOS;
        const servicios = await consultar(ruta + "?" + filtro);
        if (version !== versionDetalle) return;
        for (const servicio of servicios) {
            const fila = document.createElement("li");
            fila.className = "list-group-item px-0";
            const enlacePublico = publico || (servicio.activo && servicio.publicado);
            const nombre = document.createElement(enlacePublico ? "a" : "span");
            nombre.textContent = servicio.nombre;
            if (enlacePublico) {
                nombre.href = "/views/servicios.html?" + new URLSearchParams({ servicio: servicio._id });
            }
            const tipo = document.createElement("div");
            tipo.className = "small text-secondary";
            const estado = servicio.activo ? "Uso interno" : "Inactivo";
            tipo.textContent = enlacePublico ? servicio.tipo : servicio.tipo + " · " + estado;
            fila.append(nombre, tipo);
            lista.append(fila);
        }
        mensaje("estadoServiciosDetalleDestino", servicios.length ? "" : "Todavía no hay servicios disponibles para este destino.");
        return servicios.length;
    } catch (error) {
        if (version === versionDetalle) mensaje("estadoServiciosDetalleDestino", error.message);
    }
}

detalle.addEventListener("show.bs.modal", async evento => {
    const boton = evento.relatedTarget;
    if (!boton?.dataset.destinoId) {
        evento.preventDefault();
        return;
    }
    const version = ++versionDetalle;
    destinoDetalle = null;
    solicitarCotizacion.hidden = true;
    solicitarCotizacion.removeAttribute("href");
    elemento("accionesFavoritoDestino").hidden = true;
    mensaje("errorFavoritoDestinoDetalle", "");
    elemento("serviciosDetalleDestino").hidden = true;
    elemento("listaServiciosDetalleDestino").replaceChildren();
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
        if (!esAdministrador) {
            const pagina = esCliente ? "solicitudes" : "login";
            solicitarCotizacion.href = rutaConReferenciaSolicitud(pagina, { tipo: "destino", id: destino._id });
        }
        if (esCliente) {
            destinoDetalle = destino;
            actualizarBotonFavorito(botonFavoritoDetalle, destino._id);
            elemento("accionesFavoritoDestino").hidden = false;
        }
        elemento("detalleDestinoCarga").hidden = true;
        const cantidad = await cargarServiciosDelDestino(destino._id, publico, version);
        if (version === versionDetalle && !esAdministrador) solicitarCotizacion.hidden = !cantidad;
    } catch (error) {
        if (version === versionDetalle) mensaje("detalleDestinoError", error.message);
    } finally {
        if (version === versionDetalle) elemento("detalleDestinoCarga").hidden = true;
    }
});

detalle.addEventListener("hidden.bs.modal", () => {
    versionDetalle++;
    destinoDetalle = null;
});

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

for (const [accion, activo] of [["Desactivar", false], ["Reactivar", true], ["Visibilidad"]]) {
    const modal = elemento(`${accion.toLowerCase()}Destino`);
    const boton = elemento(`btn${accion}Destino`);
    const errorId = `error${accion}Destino`;
    let id = "";
    let publicado;
    let actualizando = false;

    modal.addEventListener("show.bs.modal", evento => {
        const destino = evento.relatedTarget?.dataset;
        if (!esAdministrador || !destino?.destinoId) {
            evento.preventDefault();
            return;
        }
        id = destino.destinoId;
        const nombre = elemento(`nombre${accion}Destino`);
        if (accion === "Visibilidad") {
            publicado = destino.publicado === "false";
            const verbo = publicado ? "Publicar" : "Ocultar";
            elemento("visibilidadDestinoTitulo").textContent = `${verbo} destino`;
            nombre.textContent = `¿Querés ${verbo.toLowerCase()} «${destino.destinoNombre}» en el catálogo público?`;
        } else {
            nombre.textContent = destino.destinoNombre;
        }
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
            resultado = accion === "Visibilidad"
                ? await consultar(`${rutaDestino(id)}/visibilidad`, "PATCH", { publicado })
                : await consultar(`${rutaDestino(id)}/estado`, "PATCH", { activo });
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
    esCliente = rol === "cliente";
    await Promise.all([recargarListados(), cargarDestinosFavoritos()]);
    const id = new URLSearchParams(location.search).get("destino");
    if (!id) return;
    const botones = elemento("tarjetasDestinos").querySelectorAll('[data-accion="detalle"]');
    const boton = [...botones].find(item => item.dataset.destinoId === id);
    if (boton) bootstrap.Modal.getOrCreateInstance(detalle).show(boton);
}
