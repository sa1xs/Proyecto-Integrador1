document.addEventListener("DOMContentLoaded", () => {
    const menu = document.getElementById("menu");
    if (!menu) return;

    // Comparte el menú LSCT entre las páginas que ya existen.
    menu.innerHTML = `
        <nav class="navbar navbar-expand-lg px-3">
            <div class="container-fluid">
                <a class="navbar-brand" href="/">LSCT</a>
                <button class="navbar-toggler" type="button" data-bs-toggle="collapse"
                    data-bs-target="#navbarNavAltMarkup" aria-controls="navbarNavAltMarkup"
                    aria-expanded="false" aria-label="Abrir menú">
                    <span class="navbar-toggler-icon"></span>
                </button>
                <div class="collapse navbar-collapse" id="navbarNavAltMarkup">
                    <div class="navbar-nav">
                        <a class="nav-link" href="/views/login.html">Iniciar sesión</a>
                        <a class="nav-link" href="/views/proveedores.html">Proveedores</a>
                    </div>
                </div>
            </div>
        </nav>
    `;

    // Resalta la página actual; el menú no sustituye los futuros permisos del backend.
    for (const enlace of menu.querySelectorAll(".nav-link")) {
        if (enlace.pathname === window.location.pathname) {
            enlace.classList.add("active");
            enlace.setAttribute("aria-current", "page");
        }
    }
});
