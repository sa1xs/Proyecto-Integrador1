import { API } from "./config.js";

const contenido = document.getElementById("contenidoReportes");
const contadores = [...contenido.querySelectorAll("output[data-entidad][data-estado]")];
const cargando = document.getElementById("cargandoReportes");
const error = document.getElementById("errorReportes");
const sinPermiso = document.getElementById("reportesSinPermiso");
const sinDatos = document.getElementById("reportesSinDatos");

async function cargarReportes() {
    contenido.hidden = true;
    sinDatos.hidden = true;
    sinPermiso.hidden = true;
    error.hidden = true;
    cargando.hidden = false;

    try {
        const respuesta = await fetch(`${API.REPORTES}/estados`, { credentials: "include" });
        if (respuesta.status === 401) {
            location.replace("/views/login.html");
            return;
        }
        if (respuesta.status === 403) {
            sinPermiso.hidden = false;
            return;
        }
        if (!respuesta.ok) throw new Error("No se pudo cargar el reporte.");

        const reporte = await respuesta.json();
        const cantidades = contadores.map(({ dataset }) => reporte?.[dataset.entidad]?.[dataset.estado]);
        if (cantidades.some(cantidad => !Number.isSafeInteger(cantidad) || cantidad < 0)) {
            throw new Error("El reporte no contiene cantidades válidas.");
        }

        contadores.forEach((contador, indice) => {
            contador.textContent = cantidades[indice];
        });
        sinDatos.hidden = cantidades.some(cantidad => cantidad > 0);
        contenido.hidden = false;
    } catch {
        error.hidden = false;
    } finally {
        cargando.hidden = true;
    }
}

document.getElementById("btnReintentarReportes").addEventListener("click", cargarReportes);
cargarReportes();
