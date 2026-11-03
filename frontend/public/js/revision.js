// Revisión del HTML sin API, almacenamiento, usuarios ni registros de ejemplo.
// Las filas con — muestran la estructura de los contenedores, no datos del sistema.
export function iniciarRevision(pagina, rol) {
    const $ = id => document.getElementById(id);
    const mostrar = (id, visible) => { if ($(id)) $(id).hidden = !visible; };
    const filas = [];
    function plantilla(origen, destino) {
        if (!$(origen) || !$(destino)) return;
        const nodo = $(origen).content.firstElementChild.cloneNode(true);
        nodo.classList.add("estructura-revision");
        nodo.querySelectorAll("[data-campo]").forEach(campo => { campo.textContent = "—"; });
        nodo.querySelectorAll("button").forEach(boton => { boton.disabled = !boton.hasAttribute("data-bs-target"); });
        $(destino).appendChild(nodo); filas.push(nodo);
    }
    function filaBasica(destino, cantidad, acciones) {
        if (!$(destino)) return;
        const fila = document.createElement("tr"); fila.className = "estructura-revision";
        for (let i = 0; i < cantidad; i++) fila.insertCell().textContent = "—";
        const celda = fila.insertCell();
        for (const [titulo, modal] of acciones) {
            const boton = document.createElement("button"); boton.type = "button"; boton.className = "btn btn-outline-primary btn-sm m-1";
            boton.textContent = titulo; boton.dataset.bsToggle = "modal"; boton.dataset.bsTarget = `#${modal}`; celda.appendChild(boton);
        }
        $(destino).appendChild(fila); filas.push(fila);
    }
    document.documentElement.classList.add("modo-revision");
    document.querySelectorAll("dd").forEach(campo => { if (!campo.textContent.trim()) campo.textContent = "—"; });
    const configuraciones = {
        clientes: { carga: ["cargandoPerfil", "cargandoClientes"], error: ["errorCargaPerfil", "errorCargaClientes"], vacio: ["sinClientesRegistrados"], ocultar: ["sinClientes"] },
        servicios: { carga: ["cargandoFavoritos"], error: ["errorFavoritos"], vacio: ["sinCatalogo", "sinFavoritos", "sinServicios"] },
        solicitudes: { carga: ["cargandoMisSolicitudes", "cargandoGestion", "cargandoDetalleSolicitud", "cargandoViajeros", "cargandoContactos"], error: ["errorMisSolicitudes", "errorGestion", "mensajeDetalleSolicitud", "errorViajeros", "errorContactos"], vacio: ["sinMisSolicitudes", "sinSolicitudes", "sinViajeros", "sinContactos"] },
        cotizaciones: { carga: ["misCotizacionesCarga", "cotizacionesAdminCarga", "detalleCotizacionCarga"], error: ["misCotizacionesError", "cotizacionesAdminError", "detalleCotizacionError"], vacio: ["sinMisCotizaciones", "sinCotizacionesAdmin", "sinPartidas"] },
        destinos: { carga: ["catalogoDestinosCarga", "adminDestinosCarga", "detalleDestinoCarga"], error: ["catalogoDestinosError", "adminDestinosError", "detalleDestinoError"], vacio: ["sinDestinosPublicos", "sinDestinosAdmin"] },
        consultas: { carga: ["cargandoMisConsultas", "cargandoConsultasAdmin", "cargandoDetalleConsulta"], error: ["errorMisConsultas", "errorConsultasAdmin", "errorDetalleConsulta"], vacio: ["sinMisConsultas", "sinConsultasAdmin"] },
        reportes: { carga: ["cargandoReportes"], error: ["errorReportes"], vacio: ["reportesSinDatos"] },
        cuentas: { carga: [], error: [], vacio: ["sinCuentas"] },
        proveedores: { carga: [], error: [], vacio: [] }
    };
    if (pagina === "clientes") {
        if (rol === "administrador") filaBasica("filasClientes", 3, [["Ver ficha", "modalCliente"]]);
        if ($("btnEditarPerfil")) $("btnEditarPerfil").disabled = false;
    }
    if (pagina === "cuentas") filaBasica("filasCuentas", 4, [["Cambiar estado", "modalEstadoCuenta"]]);
    if (pagina === "proveedores") {
        filaBasica("tablaProveedores", 4, [["Consultar", "modalDetalleProveedor"], ["Editar", "modalProveedor"], ["Cambiar estado", "modalEstado"]]);
        mostrar("datosDetalleProveedor", true);
        $("btnNuevoProveedor").onclick = () => bootstrap.Modal.getOrCreateInstance($("modalProveedor")).show();
    }
    if (pagina === "servicios") {
        plantilla("tarjetaServicioFavorito", "tarjetasServicios");
        if (rol === "cliente") plantilla("tarjetaFavorito", "tarjetasFavoritos");
        if (rol === "administrador") filaBasica("filasServicios", 4, [["Editar", "modalServicio"], ["Cambiar visibilidad", "modalVisibilidad"]]);
        $("btnNuevoServicio").disabled = false;
        mostrar("accionesFavoritoDetalle", rol === "cliente");
        mostrar("favoritoSinSesionDetalle", rol === "visitante");
        document.querySelectorAll('[data-accion="guardar-favorito"]').forEach(boton => { boton.disabled = true; });
    }
    if (pagina === "solicitudes") {
        if (rol === "cliente") plantilla("filaMiSolicitud", "filasMisSolicitudes");
        if (rol === "administrador") plantilla("filaSolicitudAdministrativa", "filasSolicitudes");
        plantilla("filaViajero", "filasViajeros");
        if (rol === "administrador") plantilla("filaContacto", "filasContactos");
        mostrar("sinSolicitudSeleccionada", false);
        // No se habilita Guardar, Retirar ni Confirmar: únicamente se abren sus diseños.
    }
    if (pagina === "cotizaciones") {
        if (rol === "cliente") plantilla("filaMiCotizacion", "filasMisCotizaciones");
        if (rol === "administrador") plantilla("filaCotizacionAdmin", "filasCotizacionesAdmin");
        plantilla("filaPartidaEditor", "filasPartidasEditor"); plantilla("filaPartidaDetalle", "partidasDetalle");
    }
    if (pagina === "destinos") {
        plantilla("tarjetaDestino", "tarjetasDestinos");
        if (rol === "administrador") plantilla("filaDestino", "filasDestinos");
    }
    if (pagina === "consultas") {
        if (rol === "cliente") plantilla("filaMiConsulta", "filasMisConsultas");
        if (rol === "administrador") plantilla("filaConsultaAdmin", "filasConsultasAdmin");
    }
    // El editor de registro no recibe datos: permanece vacío.
    document.querySelectorAll('button[type="submit"]').forEach(boton => { boton.disabled = true; });
    for (const id of ["btnGuardarPerfil", "btnConfirmarEstadoCuenta", "btnConfirmarEstado", "btnConfirmarVisibilidad"]) {
        if ($(id)) $(id).disabled = true;
    }
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener("submit", evento => evento.preventDefault());
    });
    const barra = document.querySelector(".aviso-revision");
    const controles = document.createElement("div"); controles.className = "row g-3 mt-1";
    controles.innerHTML = `<div class="col-sm-6 col-lg-4"><label for="estadoRevision" class="form-label">Estado visual</label>
        <select id="estadoRevision" class="form-select"><option value="estructura">Estructura sin datos</option><option value="carga">Cargando</option><option value="vacio">Sin registros</option><option value="error">Error</option></select></div>
        <div class="col-sm-6 col-lg-4"><label for="varianteRevision" class="form-label">Variante del diseño</label>
        <select id="varianteRevision" class="form-select"><option value="editable">Acciones disponibles</option><option value="consulta">Solo consulta / respondida</option><option value="ultimo">Último viajero / guardado / inactivo</option></select></div>`;
    barra.appendChild(controles);
    const opciones = {
        solicitudes: [["editable", "Nueva"], ["consulta", "En cotización / Cotizada"], ["ultimo", "Último viajero"]],
        servicios: [["editable", "Sin guardar"], ["consulta", "Guardado"]],
        cotizaciones: rol === "administrador"
            ? [["editable", "Borrador"], ["consulta", "Publicada"], ["ultimo", "Aceptada / Rechazada"]]
            : [["editable", "Publicada: puede responder"], ["consulta", "Aceptada / Rechazada"]],
        consultas: [["editable", "Pendiente"], ["consulta", "Respondida"]],
        destinos: [["editable", "Activo"], ["ultimo", "Inactivo"]]
    };
    if (opciones[pagina]) {
        $("varianteRevision").replaceChildren();
        for (const [valor, etiqueta] of opciones[pagina]) {
            const opcion = document.createElement("option"); opcion.value = valor; opcion.textContent = etiqueta; $("varianteRevision").appendChild(opcion);
        }
    }
    if (!["solicitudes", "servicios", "cotizaciones", "consultas", "destinos"].includes(pagina)) $("varianteRevision").parentElement.hidden = true;
    function estadoVisual() {
        const estado = $("estadoRevision").value;
        const config = configuraciones[pagina] || {};
        filas.forEach(fila => { fila.hidden = estado !== "estructura"; });
        for (const tipo of ["carga", "error", "vacio"]) {
            for (const id of config[tipo] || []) mostrar(id, tipo === estado);
        }
        for (const id of config.ocultar || []) mostrar(id, false);
        if (pagina === "solicitudes") {
            const mensaje = $("mensajeDetalleSolicitud");
            mensaje.className = estado === "error" ? "alert alert-danger" : "d-none";
            mensaje.textContent = estado === "error" ? "No se pudo cargar el detalle de la solicitud." : "";
        }
        if (pagina === "reportes") {
            document.querySelectorAll("output[data-estado]").forEach(campo => { campo.textContent = estado === "vacio" ? "0" : "—"; });
            mostrar("contenidoReportes", !["carga", "error"].includes(estado));
        }
        if (pagina === "servicios") {
            const mensaje = $("mensajeCatalogo");
            mensaje.className = ["carga", "error"].includes(estado) ? `alert alert-${estado === "carga" ? "info" : "danger"}` : "d-none";
            mensaje.textContent = estado === "carga" ? "Cargando catálogo…" : estado === "error" ? "No se pudo cargar el catálogo." : "";
        }
        if (["cuentas", "proveedores"].includes(pagina)) {
            const mensaje = $(pagina === "cuentas" ? "mensajePagina" : "mensajeListado");
            mensaje.className = ["carga", "error", "vacio"].includes(estado) ? `alert alert-${estado === "error" ? "danger" : "info"}` : "d-none";
            mensaje.textContent = estado === "carga" ? "Cargando información…" : estado === "error" ? "No se pudo cargar la información." : estado === "vacio" ? "No hay registros para mostrar." : "";
        }
    }
    function variante() {
        const valor = $("varianteRevision").value;
        if (pagina === "solicitudes") {
            const editable = rol === "cliente" && valor !== "consulta";
            document.querySelectorAll('[data-edicion-viajeros]').forEach(elemento => { elemento.hidden = !editable; });
            mostrar("viajerosSoloConsulta", !editable); mostrar("avisoUltimoViajero", editable && valor === "ultimo");
            document.querySelectorAll('[data-accion="retirar-viajero"]').forEach(boton => { boton.disabled = valor === "ultimo" || !editable; });
            mostrar("solicitudSoloConsulta", valor === "consulta");
            document.querySelectorAll('[data-accion="editar"], [data-accion="preparar"]').forEach(boton => { boton.hidden = valor === "consulta"; });
        }
        if (pagina === "cotizaciones") {
            mostrar("accionesRespuestaCotizacion", rol === "cliente" && valor === "editable");
            mostrar("respuestaYaRegistrada", rol === "cliente" ? valor === "consulta" : valor === "ultimo");
            mostrar("cotizacionNoEditable", rol === "administrador" && valor !== "editable");
            document.querySelectorAll('[data-accion="editar"], [data-accion="publicar"]').forEach(boton => { boton.hidden = valor !== "editable"; });
        }
        if (pagina === "consultas") {
            mostrar("consultaPendiente", valor === "editable"); mostrar("consultaYaRespondida", valor !== "editable");
            document.querySelectorAll('[data-accion="responder"]').forEach(boton => { boton.hidden = valor !== "editable"; });
        }
        if (pagina === "servicios") {
            const guardado = valor !== "editable";
            document.querySelectorAll('[data-accion="guardar-favorito"]').forEach(boton => { boton.hidden = guardado || rol !== "cliente"; });
            document.querySelectorAll('[data-accion="retirar-favorito"]').forEach(boton => { boton.hidden = !guardado || rol !== "cliente"; });
            mostrar("btnGuardarFavoritoDetalle", !guardado && rol === "cliente"); mostrar("btnRetirarFavoritoDetalle", guardado && rol === "cliente");
        }
        if (pagina === "destinos") {
            document.querySelectorAll('[data-accion="desactivar"]').forEach(boton => { boton.hidden = valor === "ultimo"; });
            document.querySelectorAll('[data-accion="reactivar"]').forEach(boton => { boton.hidden = valor !== "ultimo"; });
        }
    }
    $("estadoRevision").onchange = estadoVisual; $("varianteRevision").onchange = variante;
    estadoVisual(); variante();
}
