// Centraliza las direcciones de los módulos implementados en la API.
const API_BASE = "http://localhost:5001";

export const API = {
    AUTH: `${API_BASE}/auth`,
    USUARIOS: `${API_BASE}/usuarios`,
    PROVEEDORES: `${API_BASE}/proveedores`,
    SERVICIOS: `${API_BASE}/servicios`,
    SOLICITUDES: `${API_BASE}/solicitudes`
};
