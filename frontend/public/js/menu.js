import { API } from "./config.js";

const paginasPublicas = ["login", "registro", "servicios", "destinos"];
const paginasAdmin = ["cuentas", "proveedores", "reportes"];

export function aplicarRol(rol) {
  const grupos = [
    [
      "administrador",
      [
        "tab-clientes",
        "clientes",
        "tab-servicios-admin",
        "serviciosAdmin",
        "tab-gestion",
        "gestion",
        "tabCotizacionesAdmin",
        "cotizacionesAdmin",
        "tabAdminDestinos",
        "administracionDestinos",
        "tabConsultasAdmin",
        "consultasAdmin",
      ],
    ],
    [
      "cliente",
      [
        "tab-nueva",
        "nueva",
        "tab-mis-solicitudes",
        "misSolicitudes",
        "tab-favoritos",
        "misFavoritos",
        "tabMisCotizaciones",
        "misCotizaciones",
        "tabMisConsultas",
        "misConsultas",
      ],
    ],
  ];
  for (const [permitido, ids] of grupos) {
    for (const id of ids) {
      const elemento = document.getElementById(id);
      if (elemento) elemento.hidden = rol !== permitido;
    }
  }
  // Activa un panel permitido si el que venía seleccionado dejó de ser visible.
  for (const lista of document.querySelectorAll('[role="tablist"]')) {
    const tabs = [...lista.querySelectorAll('[role="tab"]')];
    if (!tabs.some((tab) => !tab.hidden && tab.classList.contains("active"))) {
      const primero = tabs.find((tab) => !tab.hidden);
      if (primero) bootstrap.Tab.getOrCreateInstance(primero).show();
    }
  }
}

export async function iniciarMenu() {
  const pagina = location.pathname.split("/").pop().replace(".html", "");
  let usuario = null,
    disponible = true;
  try {
    const respuesta = await fetch(`${API.AUTH}/sesion`, {
      credentials: "include",
      signal: AbortSignal.timeout(4000),
    });
    if (respuesta.ok) {
      const datos = (await respuesta.json()).datos;
      if (!datos || !["cliente", "administrador"].includes(datos.rol))
        throw new Error("Sesión inválida");
      usuario = datos;
    } else if (respuesta.status !== 401)
      throw new Error("No se pudo verificar la sesión");
  } catch {
    disponible = false;
  }
  const rol = usuario?.rol || "visitante";
  const menu = document.getElementById("menu");
  menu.innerHTML = `<nav class="navbar navbar-expand-xl px-3" data-bs-theme="dark" aria-label="Navegación principal">
        <div class="container-fluid">
            <a class="navbar-brand" href="/views/servicios.html">LSCT</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navegacionPrincipal"
                aria-controls="navegacionPrincipal" aria-expanded="false" aria-label="Abrir menú"><span class="navbar-toggler-icon"></span></button>
            <div class="collapse navbar-collapse" id="navegacionPrincipal"><div class="navbar-nav me-auto"></div>
            ${usuario ? '<button type="button" class="btn btn-outline-light my-2" data-bs-toggle="modal" data-bs-target="#modalCerrarSesion">Cerrar sesión</button>' : ""}
            </div>
        </div>
    </nav>`;
  const enlaces = [
    ["servicios", "Servicios"],
    ["destinos", "Destinos"],
  ];
  if (rol !== "visitante")
    enlaces.push(
      ["clientes", "Mi perfil"],
      ["solicitudes", "Solicitudes"],
      ["cotizaciones", "Cotizaciones"],
      ["consultas", "Consultas"],
    );
  if (rol === "administrador")
    enlaces.push(
      ["cuentas", "Cuentas"],
      ["proveedores", "Proveedores"],
      ["reportes", "Reportes"],
    );
  if (rol === "visitante")
    enlaces.push(["login", "Iniciar sesión"], ["registro", "Registrarse"]);
  for (const [archivo, titulo] of enlaces) {
    const enlace = document.createElement("a");
    enlace.className = "nav-link";
    enlace.href = `/views/${archivo}.html`;
    enlace.textContent = titulo;
    if (pagina === archivo) {
      enlace.classList.add("active");
      enlace.setAttribute("aria-current", "page");
    }
    menu.querySelector(".navbar-nav").appendChild(enlace);
  }
  if (!disponible) {
    const aviso = document.createElement("aside");
    aviso.className = "alert alert-warning mx-3 mt-3 mb-0";
    aviso.setAttribute("role", "alert");
    aviso.textContent =
      "La API no está disponible. Verificá que esté en ejecución y recargá la página.";
    menu.after(aviso);
  }
  const permitida =
    paginasPublicas.includes(pagina) ||
    (paginasAdmin.includes(pagina)
      ? rol === "administrador"
      : rol !== "visitante");
  aplicarRol(rol);
  if (!permitida && disponible) {
    location.replace(
      rol === "visitante" ? "/views/login.html" : "/views/clientes.html",
    );
    return { cargar: false, rol };
  }
  if (usuario) {
    const contenedor = document.createElement("div");
    contenedor.innerHTML = `<div id="modalCerrarSesion" class="modal fade" tabindex="-1" aria-labelledby="tituloCierre"><div class="modal-dialog modal-dialog-centered"><div class="modal-content">
            <div class="modal-header"><h2 id="tituloCierre" class="modal-title fs-5">Cerrar sesión</h2><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button></div>
            <div class="modal-body"><div id="mensajeCierreSesion" role="alert" class="d-none"></div><p>¿Querés salir de tu cuenta?</p></div>
            <div class="modal-footer"><button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button><button id="btnCerrarSesion" type="button" class="btn btn-azul">Cerrar sesión</button></div>
        </div></div></div>`;
    menu.appendChild(contenedor);
    document.getElementById("btnCerrarSesion").onclick = async (evento) => {
      const boton = evento.currentTarget;
      boton.disabled = true;
      try {
        const respuesta = await fetch(`${API.AUTH}/logout`, {
          method: "POST",
          credentials: "include",
        });
        if (!respuesta.ok) throw new Error("No se pudo cerrar la sesión.");
        location.replace("/views/login.html");
      } catch {
        const mensaje = document.getElementById("mensajeCierreSesion");
        mensaje.className = "alert alert-danger";
        mensaje.textContent =
          "No se pudo cerrar la sesión. Intentá nuevamente.";
      } finally {
        boton.disabled = false;
      }
    };
  }
  return { cargar: disponible && permitida, rol };
}
