# LSCT — Sistema de cotizaciones y reservas

Prototipo académico para LS Consulting & Travel.
Backend desarrollado con Node.js, Express y MongoDB mediante Mongoose.


## Instalación y ejecución local

Requisitos: Node.js con npm y una base MongoDB accesible.

En la primera terminal, instalar e iniciar la API:

```bash
# Ejecutar desde la raíz del repositorio.
cd API
npm install
# Crear API/.env con MONGO_URI y, opcionalmente, PORT=5001 antes de iniciar.
npm run dev
```

No subir `.env` ni credenciales al repositorio. La API debe conectar con MongoDB antes de escuchar en `http://localhost:5001`.

En otra terminal, instalar e iniciar el frontend:

```bash
# Ejecutar desde la raíz del repositorio.
cd frontend
npm install
npm run dev
```

También se puede usar `npm start` en cualquiera de las dos carpetas para ejecutar sin nodemon.

- Frontend: http://localhost:5002 (redirige al login).
- Proveedores: http://localhost:5002/views/proveedores.html.
- Login: http://localhost:5002/views/login.html (interfaz pendiente de autenticación).

Abrir las páginas desde el servidor; los módulos JavaScript no están pensados para abrirse con `file://`.

## Organización del frontend

| Ruta | Responsabilidad |
|---|---|
| `frontend/server.js` | Servir únicamente la carpeta `public`, por defecto en el puerto 5002. |
| `frontend/public/views/` | Páginas HTML. |
| `frontend/public/css/` | Estilos de LSCT. |
| `frontend/public/js/config.js` | Direcciones de usuarios y proveedores en la API. |
| `frontend/public/js/menu.js` | Menú compartido y enlace activo. |
| `frontend/public/js/proveedores.js` | Formularios y listado conectados a MongoDB mediante la API. |

Si cambia el puerto de la API, actualizar `API_BASE` en `config.js`. El menú muestra las páginas disponibles; la autenticación y los permisos todavía están pendientes.

## Comprobación básica

1. Abrir login y proveedores; verificar estilos, menú y ausencia de errores de carga en la consola.
2. Con la API y MongoDB activos, registrar y editar un proveedor ficticio, desactivarlo y reactivarlo.
3. Recargar proveedores y comprobar que los cambios permanecen.
4. Detener la API y recargar proveedores: debe mostrarse el mensaje de conexión fallida.

## API de proveedores

La colección está en:
[Pruebas de proveedores](API/docs/pruebas/Collection_Proveedores.json).

URL base: `http://localhost:5001`

| Método | Ruta | Función |
|---|---|---|
| POST | `/proveedores` | Registrar |
| GET | `/proveedores` | Listar |
| GET | `/proveedores/:id` | Consultar |
| PUT | `/proveedores/:id` | Editar |
| PATCH | `/proveedores/:id` | Cambiar estado |

### Registro — POST

```json
{
    "nombre": "Hotel de prueba",
    "tipoServicio": "Hotel",
    "correo": "hotel@gmail.com",
    "telefono": "+506 8888 8888"
}
```

Nombre, tipo y al menos un contacto son obligatorios.
Un nombre coincidente genera una advertencia, pero permite guardar.

### Edición — PUT

Acepta nombre, tipoServicio, correo y telefono.
Los campos omitidos se conservan y debe quedar al menos un contacto.

```json
{
    "nombre": "Hotel actualizado"
}
```

### Estado — PATCH

```json
{
    "activo": false
}
```

`false` desactiva y `true` reactiva, sin eliminar el registro.

### Respuestas y pruebas

- `200`: operación exitosa. `201`: registro creado.
- `400`: datos inválidos. `404`: proveedor inexistente.
- `500`: error interno.

Pruebas de éxito y error en Thunder Client con datos ficticios.
Reemplazar `:id` por un ID real de la base de prueba.