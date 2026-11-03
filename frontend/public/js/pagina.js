import { esMaqueta, rolRevision, iniciarMenu } from "./menu.js";

const pagina = location.pathname.split("/").pop().replace(".html", "");
const contexto = await iniciarMenu();
const modulos = {
    login: "./login.js", registro: "./registro.js", cuentas: "./cuentas.js",
    clientes: "./clientes.js", proveedores: "./proveedores.js", servicios: "./servicios.js", solicitudes: "./solicitudes.js"
};

if (esMaqueta && contexto.cargar) {
    const { iniciarRevision } = await import("./revision.js");
    iniciarRevision(pagina, rolRevision);
} else if (!esMaqueta && contexto.cargar && modulos[pagina]) {
    await import(modulos[pagina]);
}

if (!contexto.cargar || esMaqueta || !modulos[pagina]) {
    // Nunca enviar un formulario sin su controlador o durante la revisión visual.
    document.addEventListener("submit", evento => evento.preventDefault(), true);
    document.querySelectorAll('button[type="submit"]').forEach(boton => { boton.disabled = true; });
}

if (esMaqueta) {
    document.querySelectorAll('a[href]').forEach(enlace => {
        const destino = new URL(enlace.href, location.href);
        if (destino.origin === location.origin && destino.pathname.endsWith(".html") && !destino.searchParams.has("maqueta") && !enlace.hasAttribute("data-salir-revision")) {
            destino.searchParams.set("maqueta", rolRevision); enlace.href = destino.href;
        }
    });
}
