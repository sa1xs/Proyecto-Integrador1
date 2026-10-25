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
            servicio.publicado ? "Publicado" : "Uso interno",
            "—"
        ];

        // Muestra los datos como texto, sin interpretarlos como HTML.
        for (const valor of valores) {
            const celda = document.createElement("td");
            celda.textContent = valor;
            fila.appendChild(celda);
        }

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
    document.getElementById("tituloServicio").textContent = "Nuevo servicio";

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

        if (activos.length === 0) {
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
        await consultarAPI(API.SERVICIOS, "POST", datos);
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
        "Servicio registrado correctamente para uso interno.",
        "success"
    );

    // Evita iniciar otro registro mientras se actualiza el listado.
    botonNuevo.disabled = true;

    try {
        await cargarServicios();
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

async function verificarAdministrador() {
    botonNuevo.disabled = true;
    buscarServicio.disabled = true;

    try {
        const respuesta = await fetch(`${API.AUTH}/sesion`, {
            credentials: "include"
        });

        // La página también permite visitantes; no consulta datos administrativos.
        if (respuesta.status === 401) return;

        if (!respuesta.ok) {
            throw new Error("No se pudo verificar la sesión.");
        }

        const resultado = await respuesta.json();
        esAdministrador = resultado.datos?.rol === "administrador";
    } catch {
        mostrarMensaje(
            mensajePagina,
            "No se pudo verificar la sesión. Recargá la página."
        );
        return;
    }

    if (!esAdministrador) return;

    try {
        await cargarServicios();
    } catch (error) {
        mostrarMensaje(mensajePagina, error.message);
    } finally {
        botonNuevo.disabled = false;
    }
}

elementoModal.addEventListener("show.bs.modal", prepararFormulario);

elementoModal.addEventListener("hide.bs.modal", (evento) => {
    // Impide cerrar mientras se cargan proveedores o se guarda el servicio.
    if (cargando || guardando) evento.preventDefault();
});

formulario.addEventListener("submit", guardarServicio);
buscarServicio.addEventListener("input", mostrarServicios);

verificarAdministrador();