import { iniciarMenu } from "./menu.js";

const pagina = location.pathname.split("/").pop().replace(".html", "");
const contexto = await iniciarMenu();
const modulos = {
    login: "./login.js", registro: "./registro.js", cuentas: "./cuentas.js",
    clientes: "./clientes.js", proveedores: "./proveedores.js", servicios: "./servicios.js",
    solicitudes: "./solicitudes.js", cotizaciones: "./cotizaciones.js",
    destinos: "./destinos.js"
};

if (contexto.cargar && modulos[pagina]) {
    const modulo = await import(modulos[pagina]);
    if (pagina === "cotizaciones") await modulo.iniciarCotizaciones(contexto.rol);
    if (pagina === "destinos") await modulo.iniciarDestinos(contexto.rol);
} else {
    // Evita enviar formularios sin su controlador.
    document.addEventListener("submit", evento => evento.preventDefault(), true);
    document.querySelectorAll('button[type="submit"]').forEach(boton => { boton.disabled = true; });
}
