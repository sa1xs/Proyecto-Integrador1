import { API } from "./config.js";

document.addEventListener("DOMContentLoaded", async () => {
  const menu = document.getElementById("menu");
  if (!menu) return;

  const paginaActual = window.location.pathname;
  let usuario = null;

  try {
    const respuesta = await fetch(`${API.AUTH}/sesion`, {
      credentials: "include",
    });

    if (respuesta.ok) {
      const resultado = await respuesta.json();
      usuario = resultado.datos;

      if (!usuario || !["cliente", "administrador"].includes(usuario.rol)) {
        throw new Error("La sesión recibida no es válida.");
      }
    } else if (respuesta.status !== 401) {
      throw new Error("No se pudo verificar la sesión.");
    }
  } catch {
    menu.textContent = "No se pudo verificar la sesión. Recargá la página.";
    const contenido = document.querySelector("main");
    if (contenido) contenido.hidden = true;
    return;
  }

  const paginasPrivadas = [
    "/views/cuentas.html",
    "/views/proveedores.html",
    "/views/clientes.html",
    "/views/solicitudes.html",
  ];

  const paginasAdministrador = [
    "/views/cuentas.html",
    "/views/proveedores.html",
  ];

  if (!usuario && paginasPrivadas.includes(paginaActual)) {
    window.location.replace("/views/login.html");
    return;
  }

  if (
    usuario &&
    usuario.rol !== "administrador" &&
    paginasAdministrador.includes(paginaActual)
  ) {
    window.location.replace("/views/clientes.html");
    return;
  }

  const esAdministrador = usuario?.rol === "administrador";
  const mostrarCierre = usuario !== null;

  menu.innerHTML = `
        <nav class="navbar navbar-expand-lg px-3" data-bs-theme="dark">
            <div class="container-fluid">
                <a class="navbar-brand" href="/">LSCT</a>

                <button class="navbar-toggler" type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#navbarNavAltMarkup"
                    aria-controls="navbarNavAltMarkup"
                    aria-expanded="false" aria-label="Abrir menú">
                    <span class="navbar-toggler-icon"></span>
                </button>

                <div class="collapse navbar-collapse" id="navbarNavAltMarkup">
                    <div class="navbar-nav me-auto">
                        <a class="nav-link" href="/views/login.html">Iniciar sesión</a>
                        <a class="nav-link" href="/views/registro.html">Registrarse</a>
                        <a class="nav-link" href="/views/cuentas.html">Administrar cuentas</a>
                        <a class="nav-link" href="/views/proveedores.html">Proveedores</a>
                        <a class="nav-link" href="/views/clientes.html">Clientes</a>
                        <a class="nav-link" href="/views/servicios.html">Servicios</a>
                        <a class="nav-link" href="/views/solicitudes.html">Solicitudes</a>
                    </div>

                    ${
                      mostrarCierre
                        ? `
                        <button type="button"
                            class="btn btn-outline-light mt-3 mt-lg-0"
                            data-bs-toggle="modal"
                            data-bs-target="#modalCerrarSesion">
                            Cerrar sesión
                        </button>
                    `
                        : ""
                    }
                </div>
            </div>
        </nav>

        ${
          mostrarCierre
            ? `
            <div id="modalCerrarSesion" class="modal fade"
                tabindex="-1" aria-labelledby="tituloCierre">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h2 id="tituloCierre" class="modal-title fs-5">
                                Cerrar sesión
                            </h2>
                            <button type="button" class="btn-close"
                                data-bs-dismiss="modal" aria-label="Cerrar">
                            </button>
                        </div>

                        <div class="modal-body">
                            <div id="mensajeCierreSesion"
                                class="d-none" role="alert"></div>
                            <p class="mb-0">¿Querés salir de tu cuenta?</p>
                        </div>

                        <div class="modal-footer">
                            <button type="button"
                                class="btn btn-outline-secondary"
                                data-bs-dismiss="modal">
                                Cancelar
                            </button>
                            <button id="btnCerrarSesion" type="button"
                                class="btn btn-azul">
                                Cerrar sesión
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `
            : ""
        }
    `;

  const enlacesPermitidos = new Set(["/views/servicios.html"]);

  if (usuario) {
    enlacesPermitidos.add("/views/clientes.html");
    enlacesPermitidos.add("/views/solicitudes.html");

    if (esAdministrador) {
      enlacesPermitidos.add("/views/cuentas.html");
      enlacesPermitidos.add("/views/proveedores.html");
    }
  } else {
    enlacesPermitidos.add("/views/login.html");
    enlacesPermitidos.add("/views/registro.html");
  }

  for (const enlace of menu.querySelectorAll(".nav-link")) {
    enlace.hidden = !enlacesPermitidos.has(enlace.pathname);
  }

  if (!esAdministrador) {
    const elementosAdministrativos = [
      "tab-clientes",
      "clientes",
      "tab-servicios-admin",
      "serviciosAdmin",
      "tab-gestion",
      "gestion",
    ];

    for (const id of elementosAdministrativos) {
      const elemento = document.getElementById(id);
      if (elemento) elemento.hidden = true;
    }
  }

  for (const enlace of menu.querySelectorAll(".nav-link")) {
    if (enlace.pathname === paginaActual) {
      enlace.classList.add("active");
      enlace.setAttribute("aria-current", "page");
    }
  }
  const botonCerrarSesion = document.getElementById("btnCerrarSesion");
  const mensajeCierre = document.getElementById("mensajeCierreSesion");

  if (botonCerrarSesion) {
    botonCerrarSesion.addEventListener("click", async () => {
      if (botonCerrarSesion.disabled) return;

      mensajeCierre.textContent = "";
      mensajeCierre.className = "d-none";
      botonCerrarSesion.disabled = true;
      botonCerrarSesion.textContent = "Cerrando sesión...";

      try {
        let respuesta;

        try {
          respuesta = await fetch(`${API.AUTH}/logout`, {
            method: "POST",
            credentials: "include",
          });
        } catch {
          throw new Error("No se pudo conectar con la API.");
        }

        if (!respuesta.ok) {
          throw new Error("No se pudo cerrar la sesión. Intentá nuevamente.");
        }

        window.location.replace("/views/login.html");
      } catch (error) {
        mensajeCierre.textContent = error.message;
        mensajeCierre.className = "alert alert-danger";
      } finally {
        botonCerrarSesion.disabled = false;
        botonCerrarSesion.textContent = "Cerrar sesión";
      }
    });
  }
});
