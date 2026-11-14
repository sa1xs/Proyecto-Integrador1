import { API } from "./config.js";

const formulario = document.getElementById("formularioServicio");
const nombre = document.getElementById("nombreServicio");
const tipo = document.getElementById("tipoServicio");
const descripcion = document.getElementById("descripcionServicio");
const proveedor = document.getElementById("proveedorServicio");

const mensajePagina = document.getElementById("mensajePagina");
const mensajeFormulario = document.getElementById("mensajeFormularioServicio");

const botonNuevo = document.getElementById("btnNuevoServicio");
const botonGuardar = document.getElementById("btnGuardarServicio");

const tablaServicios = document.getElementById("filasServicios");
const buscarServicio = document.getElementById("buscarServicio");
const sinServicios = document.getElementById("sinServicios");

const elementoModal = document.getElementById("modalServicio");
const modal = bootstrap.Modal.getOrCreateInstance(elementoModal);

let esAdministrador = false;
let cargando = false;
let guardando = false;
let servicios = [];
let servicioEditar = null;
let servicioVisibilidad = null;
let cambiandoVisibilidad = false;
let catalogo = [];
let consultaDetalle = 0;
let esCliente = false;
let favoritos = [];
let favoritosListos = false;
let cargandoFavoritos = false;
let cambiandoFavorito = false;
let servicioDetalle = null;
let favoritoRetirar = null;
const buscarCatalogo = document.getElementById("buscarCatalogo");
const tarjetas = document.getElementById("tarjetasServicios");
const sinCatalogo = document.getElementById("sinCatalogo");
const mensajeCatalogo = document.getElementById("mensajeCatalogo");
const elementoDetalle = document.getElementById("modalDetalleServicio");
const elementoVisibilidad = document.getElementById("modalVisibilidad");
const botonConfirmar = document.getElementById("btnConfirmarVisibilidad");
const tarjetasFavoritos = document.getElementById("tarjetasFavoritos");
const botonFavoritoDetalle = document.getElementById("btnFavoritoDetalle");
const modalRetirar = document.getElementById("modalRetirarFavorito");
const botonRetirar = document.getElementById("btnConfirmarRetirarFavorito");

function crearBoton(texto, accion) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "btn btn-outline-primary btn-sm me-2";
    boton.textContent = texto;
    boton.addEventListener("click", accion);
    return boton;
}

function crearTarjeta(plantilla, servicio) {
    const tarjeta = document.getElementById(plantilla).content.firstElementChild.cloneNode(true);
    tarjeta.querySelectorAll("[data-campo]").forEach(campo => {
        campo.textContent = servicio[campo.dataset.campo];
    });
    tarjeta.querySelector('[data-accion="detalle"]').addEventListener("click", () => abrirDetalle(servicio._id));
    return tarjeta;
}

function actualizarBotonFavorito(boton, id) {
    const guardado = favoritos.some(servicio => servicio._id === id);
    boton.textContent = guardado ? "Guardado · Retirar" : "Guardar en favoritos";
    boton.classList.toggle("btn-turquesa", guardado);
    boton.classList.toggle("btn-outline-primary", !guardado);
    boton.disabled = !favoritosListos || cargandoFavoritos || cambiandoFavorito;
}

function actualizarBotonesFavoritos() {
    tarjetas.querySelectorAll('[data-accion="favorito"]').forEach(boton => {
        actualizarBotonFavorito(boton, boton.dataset.servicioId);
    });
    if (servicioDetalle) actualizarBotonFavorito(botonFavoritoDetalle, servicioDetalle._id);
    tarjetasFavoritos.querySelectorAll('[data-accion="retirar"]').forEach(boton => {
        boton.disabled = cambiandoFavorito || cargandoFavoritos;
    });
}

function mostrarCatalogo() {
    const texto = buscarCatalogo.value.trim().toLowerCase();
    const resultados = catalogo.filter(item => [item.nombre, item.tipo]
        .some(valor => String(valor).toLowerCase().includes(texto)));
    tarjetas.replaceChildren();
    sinCatalogo.hidden = resultados.length !== 0;
    sinCatalogo.textContent = catalogo.length ? "No hay servicios que coincidan con la búsqueda."
        : "No hay servicios publicados disponibles.";
    for (const item of resultados) {
        const tarjeta = crearTarjeta("tarjetaServicioFavorito", item);
        if (esCliente) {
            const boton = tarjeta.querySelector('[data-accion="favorito"]');
            boton.dataset.servicioId = item._id;
            boton.hidden = false;
            actualizarBotonFavorito(boton, item._id);
            boton.addEventListener("click", () => seleccionarFavorito(item, "mensajeFavoritosCatalogo"));
        }
        tarjetas.append(tarjeta);
    }
}

async function cargarCatalogo() {
    buscarCatalogo.disabled = true;
    sinCatalogo.hidden = true;
    tarjetas.replaceChildren();
    mostrarMensaje(mensajeCatalogo, "Cargando catálogo...", "info");
    try {
        const resultado = await consultarAPI(`${API.SERVICIOS}/publicos`);
        if (!Array.isArray(resultado)) throw new Error("No se recibió un catálogo válido.");
        catalogo = resultado;
        mostrarCatalogo();
        mostrarMensaje(mensajeCatalogo, "");
    } catch (error) {
        catalogo = [];
        mostrarMensaje(mensajeCatalogo, `${error.message} Recargá la página para reintentar.`);
    } finally { buscarCatalogo.disabled = false; }
}

async function abrirDetalle(id) {
    const consulta = ++consultaDetalle;
    const mensaje = document.getElementById("mensajeDetalleServicio");
    servicioDetalle = null;
    document.getElementById("accionesFavoritoDetalle").hidden = true;
    mostrarMensaje(document.getElementById("mensajeFavoritoDetalle"), "");
    for (const campo of ["nombre", "tipo", "descripcion"]) {
        document.getElementById(`${campo}DetalleServicio`).textContent = "";
    }
    mostrarMensaje(mensaje, "Cargando detalle...", "info");
    bootstrap.Modal.getOrCreateInstance(elementoDetalle).show();
    try {
        const item = await consultarAPI(`${API.SERVICIOS}/publicos/${encodeURIComponent(id)}`);
        if (consulta !== consultaDetalle) return;
        for (const campo of ["nombre", "tipo", "descripcion"]) {
            document.getElementById(`${campo}DetalleServicio`).textContent = item[campo];
        }
        if (esCliente) {
            servicioDetalle = item;
            actualizarBotonFavorito(botonFavoritoDetalle, item._id);
            document.getElementById("accionesFavoritoDetalle").hidden = false;
        }
        mostrarMensaje(mensaje, "");
    } catch (error) {
        if (consulta === consultaDetalle) mostrarMensaje(mensaje, error.message);
    }
}

function mostrarFavoritos() {
    tarjetasFavoritos.replaceChildren();
    for (const servicio of favoritos) {
        const tarjeta = crearTarjeta("tarjetaFavorito", servicio);
        tarjeta.querySelector('[data-accion="retirar"]').addEventListener("click", () => abrirRetiroFavorito(servicio));
        tarjetasFavoritos.append(tarjeta);
    }
    document.getElementById("sinFavoritos").hidden = !favoritosListos || favoritos.length > 0;
}

async function cargarFavoritos() {
    if (!esCliente || cargandoFavoritos) return;
    cargandoFavoritos = true;
    const carga = document.getElementById("cargandoFavoritos");
    const errorFavoritos = document.getElementById("errorFavoritos");
    carga.hidden = false;
    errorFavoritos.hidden = true;
    tarjetasFavoritos.replaceChildren();
    document.getElementById("sinFavoritos").hidden = true;
    actualizarBotonesFavoritos();
    try {
        const resultado = await consultarAPI(API.FAVORITOS);
        if (!Array.isArray(resultado)) throw new Error("No se recibió un listado válido de favoritos.");
        favoritos = resultado;
        favoritosListos = true;
    } catch (error) {
        favoritos = [];
        favoritosListos = false;
        errorFavoritos.textContent = error.message;
        errorFavoritos.hidden = false;
    } finally {
        cargandoFavoritos = false;
        carga.hidden = true;
        mostrarFavoritos();
        actualizarBotonesFavoritos();
    }
}

async function seleccionarFavorito(servicio, mensajeId) {
    if (!esCliente || !favoritosListos || cargandoFavoritos || cambiandoFavorito) return;
    if (favoritos.some(item => item._id === servicio._id)) {
        abrirRetiroFavorito(servicio);
        return;
    }
    const mensaje = document.getElementById(mensajeId);
    cambiandoFavorito = true;
    actualizarBotonesFavoritos();
    mostrarMensaje(mensaje, "");
    try {
        await consultarAPI(API.FAVORITOS, "POST", { servicio: servicio._id });
        await cargarFavoritos();
        mostrarMensaje(mensaje, "Servicio guardado en tus favoritos.", "success");
    } catch (error) {
        mostrarMensaje(mensaje, error.message);
    } finally {
        cambiandoFavorito = false;
        actualizarBotonesFavoritos();
    }
}

function abrirRetiroFavorito(servicio) {
    if (!esCliente || cargandoFavoritos || cambiandoFavorito) return;
    favoritoRetirar = servicio;
    document.getElementById("nombreFavoritoRetirar").textContent = servicio.nombre;
    document.getElementById("errorRetirarFavorito").hidden = true;
    botonRetirar.disabled = false;
    const confirmacion = bootstrap.Modal.getOrCreateInstance(modalRetirar);
    if (elementoDetalle.classList.contains("show")) {
        elementoDetalle.addEventListener("hidden.bs.modal", () => confirmacion.show(), { once: true });
        bootstrap.Modal.getOrCreateInstance(elementoDetalle).hide();
    } else {
        confirmacion.show();
    }
}

async function confirmarRetiroFavorito() {
    if (!esCliente || !favoritoRetirar || cambiandoFavorito) return;
    const errorRetiro = document.getElementById("errorRetirarFavorito");
    errorRetiro.hidden = true;
    cambiandoFavorito = true;
    botonRetirar.disabled = true;
    actualizarBotonesFavoritos();
    try {
        await consultarAPI(`${API.FAVORITOS}/${encodeURIComponent(favoritoRetirar._id)}`, "DELETE");
        await cargarFavoritos();
    } catch (error) {
        errorRetiro.textContent = error.message;
        errorRetiro.hidden = false;
        return;
    } finally {
        cambiandoFavorito = false;
        botonRetirar.disabled = false;
        actualizarBotonesFavoritos();
    }
    bootstrap.Modal.getOrCreateInstance(modalRetirar).hide();
    if (document.getElementById("misFavoritos").classList.contains("active")) {
        document.getElementById("favoritoRetirado").hidden = false;
    } else {
        mostrarMensaje(document.getElementById("mensajeFavoritosCatalogo"), "Servicio retirado de tus favoritos.", "success");
    }
}

function abrirVisibilidad(servicio) {
    if (!esAdministrador || cambiandoVisibilidad) return;
    servicioVisibilidad = servicio;
    mostrarMensaje(document.getElementById("mensajeVisibilidad"), "");
    document.getElementById("textoVisibilidad").textContent =
        `${servicio.publicado ? "¿Ocultar" : "¿Publicar"} el servicio «${servicio.nombre}»?`;
    bootstrap.Modal.getOrCreateInstance(elementoVisibilidad).show();
}

async function confirmarVisibilidad() {
    if (!esAdministrador || !servicioVisibilidad || cambiandoVisibilidad) return;
    cambiandoVisibilidad = true;
    botonConfirmar.disabled = true;
    try {
        const resultado = await consultarAPI(`${API.SERVICIOS}/${servicioVisibilidad._id}/visibilidad`,
            "PATCH", { publicado: !servicioVisibilidad.publicado });
        cambiandoVisibilidad = false;
        bootstrap.Modal.getOrCreateInstance(elementoVisibilidad).hide();
        mostrarMensaje(mensajePagina, resultado.mensaje, "success");
        await actualizarListados();
    } catch (error) {
        mostrarMensaje(document.getElementById("mensajeVisibilidad"), error.message);
    } finally {
        cambiandoVisibilidad = false;
        botonConfirmar.disabled = false;
    }
}

async function actualizarListados() {
    try { await cargarServicios(); }
    catch (error) {
        mostrarMensaje(mensajePagina, `El cambio se guardó, pero no se pudo actualizar el listado. ${error.message}`, "warning");
    }
    await cargarCatalogo();
}

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

    if (respuesta.status === 401 && !url.startsWith(`${API.SERVICIOS}/publicos`)) {
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
        const errores = Array.isArray(resultado?.errores)
            ? resultado.errores.join(" ")
            : "";

        throw new Error(
            errores ||
            resultado?.message ||
            "No se pudo completar la operación."
        );
    }

    return resultado;
}

function mostrarServicios() {
    const texto = buscarServicio.value.trim().toLowerCase();

    const resultados = servicios.filter((servicio) => {
        const valores = [
            servicio.nombre,
            servicio.tipo,
            servicio.proveedor?.nombre
        ];

        return valores.some((valor) =>
            String(valor ?? "").toLowerCase().includes(texto)
        );
    });

    tablaServicios.replaceChildren();
    sinServicios.hidden = resultados.length !== 0;

    sinServicios.textContent = servicios.length === 0
        ? "No hay servicios registrados."
        : "No hay servicios que coincidan con la búsqueda.";

    for (const servicio of resultados) {
        const fila = document.createElement("tr");

        const valores = [
            servicio.nombre,
            servicio.tipo,
            servicio.proveedor?.nombre || "Proveedor no disponible",
            servicio.publicado ? "Publicado" : "Uso interno"
        ];

        // Muestra los datos como texto, sin interpretarlos como HTML.
        for (const valor of valores) {
            const celda = document.createElement("td");
            celda.textContent = valor;
            fila.appendChild(celda);
        }

        const acciones = document.createElement("td");
        acciones.append(crearBoton("Editar", () => {
            servicioEditar = servicio;
            modal.show();
        }));
        const visibilidad = crearBoton(servicio.publicado ? "Ocultar" : "Publicar", () => abrirVisibilidad(servicio));
        visibilidad.disabled = !servicio.activo && !servicio.publicado;
        acciones.append(visibilidad);
        fila.append(acciones);
        tablaServicios.appendChild(fila);
    }
}

async function cargarServicios() {
    buscarServicio.disabled = true;
    sinServicios.hidden = true;

    try {
        const resultado = await consultarAPI(API.SERVICIOS);

        if (!Array.isArray(resultado)) {
            throw new Error("No se recibió un listado válido de servicios.");
        }

        servicios = resultado;
        mostrarServicios();
        buscarServicio.disabled = false;
    } catch (error) {
        servicios = [];
        tablaServicios.replaceChildren();
        throw error;
    }
}

async function prepararFormulario(evento) {
    if (!esAdministrador) {
        evento.preventDefault();
        return;
    }

    formulario.reset();
    document.getElementById("tituloServicio").textContent = servicioEditar ? "Editar servicio" : "Nuevo servicio";
    if (servicioEditar) {
        nombre.value = servicioEditar.nombre;
        tipo.value = servicioEditar.tipo;
        descripcion.value = servicioEditar.descripcion;
    }

    mostrarMensaje(mensajePagina, "");
    mostrarMensaje(mensajeFormulario, "Cargando proveedores...", "info");

    proveedor.replaceChildren(new Option("Seleccioná un proveedor", ""));
    proveedor.disabled = true;
    botonGuardar.disabled = true;
    cargando = true;

    try {
        const proveedores = await consultarAPI(API.PROVEEDORES);

        if (!Array.isArray(proveedores)) {
            throw new Error("No se recibió un listado válido de proveedores.");
        }

        // Recarga los proveedores cada vez que se abre el formulario.
        const activos = proveedores.filter((item) => item.activo === true);

        for (const item of activos) {
            proveedor.add(
                new Option(`${item.nombre} — ${item.tipoServicio}`, item._id)
            );
        }

        const proveedorActual = servicioEditar?.proveedor?._id;
        if (proveedorActual && !activos.some(item => item._id === proveedorActual)) {
            proveedor.add(new Option(`${servicioEditar.proveedor.nombre} (actual, inactivo)`, proveedorActual));
        }
        if (proveedorActual) proveedor.value = proveedorActual;

        if (activos.length === 0 && !proveedorActual) {
            mostrarMensaje(
                mensajeFormulario,
                "No hay proveedores activos. Registrá o reactivá uno en Proveedores.",
                "warning"
            );
            return;
        }

        proveedor.disabled = false;
        botonGuardar.disabled = false;
        mostrarMensaje(mensajeFormulario, "");
    } catch (error) {
        mostrarMensaje(mensajeFormulario, error.message);
    } finally {
        cargando = false;
    }
}

async function guardarServicio(evento) {
    evento.preventDefault();

    if (!esAdministrador || cargando || guardando || botonGuardar.disabled) {
        return;
    }

    if (!formulario.reportValidity()) return;

    const datos = {
        nombre: nombre.value.trim(),
        tipo: tipo.value.trim(),
        descripcion: descripcion.value.trim(),
        proveedor: proveedor.value
    };

    if (Object.values(datos).some((valor) => !valor)) {
        mostrarMensaje(
            mensajeFormulario,
            "Completá todos los campos obligatorios."
        );
        return;
    }

    mostrarMensaje(mensajeFormulario, "");
    guardando = true;
    botonGuardar.disabled = true;
    botonGuardar.textContent = "Guardando...";

    try {
        // La API verifica nuevamente el proveedor y define el estado inicial.
        await consultarAPI(servicioEditar ? `${API.SERVICIOS}/${servicioEditar._id}` : API.SERVICIOS,
            servicioEditar ? "PUT" : "POST", datos);
    } catch (error) {
        mostrarMensaje(mensajeFormulario, error.message);
        return;
    } finally {
        guardando = false;
        botonGuardar.disabled = false;
        botonGuardar.textContent = "Guardar servicio";
    }

    modal.hide();
    formulario.reset();

    mostrarMensaje(
        mensajePagina,
        servicioEditar ? "Servicio actualizado correctamente." : "Servicio registrado correctamente para uso interno.",
        "success"
    );

    // Evita iniciar otro registro mientras se actualiza el listado.
    botonNuevo.disabled = true;

    try {
        await actualizarListados();
    } catch (error) {
        mostrarMensaje(
            mensajePagina,
            `El servicio se guardó, pero no se pudo actualizar el listado. ${error.message}`,
            "warning"
        );
    } finally {
        botonNuevo.disabled = !esAdministrador;
    }
}

export async function iniciarServicios(rol) {
    esAdministrador = rol === "administrador";
    esCliente = rol === "cliente";
    botonNuevo.disabled = true;
    buscarServicio.disabled = true;

    const cargaCatalogo = cargarCatalogo();
    if (esCliente) await cargarFavoritos();
    if (esAdministrador) {
        try {
            await cargarServicios();
        } catch (error) {
            mostrarMensaje(mensajePagina, error.message);
        } finally {
            botonNuevo.disabled = false;
        }
    }
    await cargaCatalogo;
}

elementoModal.addEventListener("show.bs.modal", prepararFormulario);

elementoModal.addEventListener("hide.bs.modal", (evento) => {
    // Impide cerrar mientras se cargan proveedores o se guarda el servicio.
    if (cargando || guardando) evento.preventDefault();
});

formulario.addEventListener("submit", guardarServicio);
buscarServicio.addEventListener("input", mostrarServicios);
buscarCatalogo.addEventListener("input", mostrarCatalogo);
botonNuevo.addEventListener("click", () => { servicioEditar = null; });
botonConfirmar.addEventListener("click", confirmarVisibilidad);
elementoVisibilidad.addEventListener("hide.bs.modal", evento => {
    if (cambiandoVisibilidad) evento.preventDefault();
});
elementoDetalle.addEventListener("hide.bs.modal", () => {
    consultaDetalle++;
    servicioDetalle = null;
});
document.getElementById("tab-favoritos").addEventListener("shown.bs.tab", () => {
    document.getElementById("favoritoRetirado").hidden = true;
    if (!cambiandoFavorito) cargarFavoritos();
});
botonFavoritoDetalle.addEventListener("click", () => {
    if (servicioDetalle) seleccionarFavorito(servicioDetalle, "mensajeFavoritoDetalle");
});
botonRetirar.addEventListener("click", confirmarRetiroFavorito);
modalRetirar.addEventListener("hide.bs.modal", evento => {
    if (cambiandoFavorito) evento.preventDefault();
});
