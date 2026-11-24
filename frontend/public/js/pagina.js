import { iniciarMenu } from "./menu.js";

const pagina = location.pathname.split("/").pop().replace(".html", "");
const contexto = await iniciarMenu();
const modulos = {
    login: "./login.js", registro: "./registro.js", cuentas: "./cuentas.js",
    clientes: "./clientes.js", proveedores: "./proveedores.js", servicios: "./servicios.js",
    solicitudes: "./solicitudes.js", cotizaciones: "./cotizaciones.js",
    destinos: "./destinos.js", consultas: "./consultas.js", reportes: "./reportes.js"
};

if (contexto.cargar && modulos[pagina]) {
    const modulo = await import(modulos[pagina]);
    for (const boton of document.querySelectorAll("[data-limpiar-busqueda]")) {
        const buscador = document.getElementById(boton.dataset.limpiarBusqueda);
        boton.addEventListener("click", () => {
            buscador.value = "";
            if (buscador.disabled) return;
            buscador.dispatchEvent(new Event("input", { bubbles: true }));
            buscador.focus();
        });
    }
    if (pagina === "clientes") await modulo.iniciarClientes(contexto.rol);
    if (pagina === "servicios") await modulo.iniciarServicios(contexto.rol);
    if (pagina === "cotizaciones") await modulo.iniciarCotizaciones(contexto.rol);
    if (pagina === "destinos") await modulo.iniciarDestinos(contexto.rol);
    if (pagina === "consultas") await modulo.iniciarConsultas(contexto.rol);
} else {
    // Evita enviar formularios sin su controlador.
    document.addEventListener("submit", evento => evento.preventDefault(), true);
    document.querySelectorAll('button[type="submit"]').forEach(boton => { boton.disabled = true; });
}
