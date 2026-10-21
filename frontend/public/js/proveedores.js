// Usa la configuración compartida de la API.
import { API } from "./config.js";

// null == estamos registrando, no editando.
let idEnEdicion = null;
let proveedorSeleccionado = null;

const tabla = document.getElementById("tablaProveedores");
const formulario = document.getElementById("formularioProveedor");
const mensajeListado = document.getElementById("mensajeListado");
const mensajeFormulario = document.getElementById("mensajeFormulario");
const mensajeEstado = document.getElementById("mensajeEstado");

const nombre = document.getElementById("nombreProveedor");
const tipoServicio = document.getElementById("tipoServicioProveedor");
const correo = document.getElementById("correoProveedor");
const telefono = document.getElementById("telefonoProveedor");

const tituloFormulario = document.getElementById("tituloModalProveedor");
const btnGuardar = document.getElementById("btnGuardarProveedor");
const btnConfirmar = document.getElementById("btnConfirmarEstado");
const btnNuevo = document.getElementById("btnNuevoProveedor");

const elementoFormulario = document.getElementById("modalProveedor");
const elementoEstado = document.getElementById("modalEstado");

const modalProveedor = new bootstrap.Modal(elementoFormulario);
const modalEstado = new bootstrap.Modal(elementoEstado);

function mostrarMensaje(elemento, texto, tipo = "danger") {
    elemento.textContent = texto;
    elemento.className = texto ? `alert alert-${tipo}` : "d-none";
}

async function consultarAPI(url, metodo = "GET", datos = null) {
    const opciones = { method: metodo };

    if (datos !== null) {
        opciones.headers = { "Content-Type": "application/json" };
        opciones.body = JSON.stringify(datos);
    }

    let respuesta;

    try {
        respuesta = await fetch(url, opciones);
    } catch {
        throw new Error("No se pudo conectar con el servidor.");
    }

    let resultado;

    try {
        resultado = await respuesta.json();
    } catch {
        throw new Error("El servidor devolvió una respuesta inesperada.");
    }

    if (!respuesta.ok) {
        let mensaje = resultado.message || resultado.mensaje;

        if (Array.isArray(resultado.errores)) {
            mensaje = resultado.errores.join(" ");
        }

        throw new Error(mensaje || "No se pudo completar la operación.");
    }

    return resultado;
}

async function cargarProveedores() {
    const proveedores = await consultarAPI(API.PROVEEDORES);

    if (!Array.isArray(proveedores)) {
        throw new Error("No se recibió un listado válido.");
    }

    tabla.replaceChildren();

    if (proveedores.length === 0) {
        tabla.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-secondary py-4">
                    No hay proveedores registrados.
                </td>
            </tr>
        `;
        return;
    }

    for (const proveedor of proveedores) {
        const fila = document.createElement("tr");

        fila.innerHTML = `
            <td class="nombre fw-semibold"></td>
            <td class="servicio"></td>
            <td>
                <div class="correo"></div>
                <div class="telefono small text-secondary"></div>
            </td>
            <td><span class="estado badge"></span></td>
            <td>
                <div class="d-flex gap-2">
                    <button type="button" class="editar btn btn-turquesa btn-sm">
                        Editar
                    </button>
                    <button type="button" class="cambiar-estado btn btn-naranja btn-sm">
                    </button>
                </div>
            </td>
        `;

        fila.querySelector(".nombre").textContent = proveedor.nombre;
        fila.querySelector(".servicio").textContent = proveedor.tipoServicio;
        fila.querySelector(".correo").textContent = proveedor.correo || "Sin correo";
        fila.querySelector(".telefono").textContent = proveedor.telefono || "Sin teléfono";

        const estado = fila.querySelector(".estado");
        estado.textContent = proveedor.activo ? "Activo" : "Inactivo";
        estado.classList.add(
            proveedor.activo ? "text-bg-success" : "text-bg-secondary"
        );

        fila.querySelector(".editar").onclick = () => abrirFormulario(proveedor);

        const botonEstado = fila.querySelector(".cambiar-estado");
        botonEstado.textContent = proveedor.activo ? "Desactivar" : "Reactivar";
        botonEstado.onclick = () => abrirConfirmacion(proveedor);

        tabla.appendChild(fila);
    }
}

async function actualizarListado(mensaje, tipo = "success") {
    try {
        await cargarProveedores();
        mostrarMensaje(mensajeListado, mensaje, tipo);
    } catch (error) {
        mostrarMensaje(
            mensajeListado,
            `${mensaje} No se pudo refrescar la tabla. Recargá la página. ${error.message}`,
            "warning"
        );
    }
}

function abrirFormulario(proveedor = null) {
    formulario.reset();
    mostrarMensaje(mensajeFormulario, "");

    idEnEdicion = null;
    tituloFormulario.textContent = "Nuevo proveedor";
    btnGuardar.textContent = "Guardar proveedor";

    if (proveedor !== null) {
        idEnEdicion = proveedor._id;
        tituloFormulario.textContent = "Editar proveedor";
        btnGuardar.textContent = "Guardar cambios";

        nombre.value = proveedor.nombre;
        tipoServicio.value = proveedor.tipoServicio;
        correo.value = proveedor.correo || "";
        telefono.value = proveedor.telefono || "";
    }

    modalProveedor.show();
}

async function guardarProveedor(evento) {
    evento.preventDefault();
    if (btnGuardar.disabled) return;

    mostrarMensaje(mensajeFormulario, "");

    const datos = {
        nombre: nombre.value.trim(),
        tipoServicio: tipoServicio.value.trim(),
        correo: correo.value.trim().toLowerCase(),
        telefono: telefono.value.trim()
    };

    if (!datos.nombre || !datos.tipoServicio) {
        mostrarMensaje(mensajeFormulario, "Completá el nombre y el tipo de servicio.");
        return;
    }

    if (!datos.correo && !datos.telefono) {
        mostrarMensaje(mensajeFormulario, "Indicá al menos un correo o teléfono.");
        return;
    }

    let url = API.PROVEEDORES;
    let metodo = "POST";
    let mensaje = "Proveedor registrado.";

    if (idEnEdicion !== null) {
        url = `${API.PROVEEDORES}/${idEnEdicion}`;
        metodo = "PUT";
        mensaje = "Proveedor actualizado.";
    }

    btnGuardar.disabled = true;
    let resultado;

    try {
        resultado = await consultarAPI(url, metodo, datos);
    } catch (error) {
        mostrarMensaje(mensajeFormulario, error.message);
        return;
    } finally {
        btnGuardar.disabled = false;
    }

    modalProveedor.hide();

    if (resultado.advertencia) {
        mensaje += ` ${resultado.advertencia}`;
    }

    await actualizarListado(
        mensaje,
        resultado.advertencia ? "warning" : "success"
    );
}

function abrirConfirmacion(proveedor) {
    proveedorSeleccionado = proveedor;
    mostrarMensaje(mensajeEstado, "");

    const accion = proveedor.activo ? "Desactivar" : "Reactivar";

    document.getElementById("tituloModalEstado").textContent =
        `${accion} proveedor`;

    document.getElementById("textoConfirmacion").textContent =
        `¿Querés ${accion.toLowerCase()} a "${proveedor.nombre}"?`;

    btnConfirmar.textContent = accion;
    modalEstado.show();
}

async function cambiarEstado() {
    if (btnConfirmar.disabled || proveedorSeleccionado === null) return;

    mostrarMensaje(mensajeEstado, "");

    const nuevoEstado = !proveedorSeleccionado.activo;
    const url = `${API.PROVEEDORES}/${proveedorSeleccionado._id}`;

    btnConfirmar.disabled = true;

    try {
        await consultarAPI(url, "PATCH", { activo: nuevoEstado });
    } catch (error) {
        mostrarMensaje(mensajeEstado, error.message);
        return;
    } finally {
        btnConfirmar.disabled = false;
    }

    modalEstado.hide();

    await actualizarListado(
        nuevoEstado ? "Proveedor reactivado." : "Proveedor desactivado."
    );
}

btnNuevo.onclick = () => abrirFormulario();
formulario.addEventListener("submit", guardarProveedor);
btnConfirmar.onclick = cambiarEstado;

elementoFormulario.addEventListener("hide.bs.modal", (evento) => {
    if (btnGuardar.disabled) evento.preventDefault();
});

elementoEstado.addEventListener("hide.bs.modal", (evento) => {
    if (btnConfirmar.disabled) evento.preventDefault();
});

elementoFormulario.addEventListener("shown.bs.modal", () => {
    nombre.focus();
});

cargarProveedores().catch((error) => {
    mostrarMensaje(mensajeListado, error.message);
});