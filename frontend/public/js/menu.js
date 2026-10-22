document.addEventListener("DOMContentLoaded", () => {
    const menu = document.getElementById("menu");
    if (!menu) return;

    const paginaActual = window.location.pathname;
    const mostrarCierre = [
        "/views/cuentas.html",
        "/views/proveedores.html",
        "/views/clientes.html",
        "/views/servicios.html",
        "/views/solicitudes.html"
    ].includes(paginaActual);

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

                    ${mostrarCierre ? `
                        <button type="button"
                            class="btn btn-outline-light mt-3 mt-lg-0"
                            data-bs-toggle="modal"
                            data-bs-target="#modalCerrarSesion">
                            Cerrar sesión
                        </button>
                    ` : ""}
                </div>
            </div>
        </nav>

        ${mostrarCierre ? `
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
        ` : ""}
    `;

    for (const enlace of menu.querySelectorAll(".nav-link")) {
        if (enlace.pathname === paginaActual) {
            enlace.classList.add("active");
            enlace.setAttribute("aria-current", "page");
        }
    }
});