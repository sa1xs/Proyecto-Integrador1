export function leerReferenciaSolicitud(busqueda) {
    const parametros = new URLSearchParams(busqueda);
    for (const tipo of ["servicio", "destino"]) {
        const id = parametros.get(tipo);
        if (id && /^[a-fA-F0-9]{24}$/.test(id)) return { tipo, id };
    }
    return null;
}

export function rutaConReferenciaSolicitud(pagina, { tipo, id }) {
    return `/views/${pagina}.html?${new URLSearchParams({ [tipo]: id })}`;
}
