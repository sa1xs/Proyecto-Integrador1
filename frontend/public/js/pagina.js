import { iniciarMenu } from "./menu.js";

const pagina = location.pathname.split("/").pop().replace(".html", "");
const contexto = await iniciarMenu();
const modulos = {
    login: "./login.js", registro: "./registro.js", cuentas: "./cuentas.js",
    clientes: "./clientes.js", proveedores: "./proveedores.js", servicios: "./servicios.js", solicitudes: "./solicitudes.js"
};

if (contexto.cargar && modulos[pagina]) {
    await import(modulos[pagina]);
} else {
    // Evita enviar formularios sin su controlador.
    document.addEventListener("submit", evento => evento.preventDefault(), true);
    document.querySelectorAll('button[type="submit"]').forEach(boton => { boton.disabled = true; });
}
