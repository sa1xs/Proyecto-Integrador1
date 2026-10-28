# LSCT — Sistema de solicitudes y cotizaciones

Proyecto académico con API REST en Node.js, Express y MongoDB, e interfaz HTML/Bootstrap.

## Instalación y ejecución local

Requisitos: Node.js con npm y MongoDB disponible (local o Atlas).

1. Clonar el repositorio y abrir una terminal en su carpeta.
2. Instalar las dependencias de la API:

   ```bash
   cd API
   npm ci
   ```

3. Copiar `API/.env.example` como `API/.env` y completar la conexión y un secreto aleatorio propio. Desde `API`, en PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

   La plantilla usa MongoDB local y los puertos 5001 (API) y 5002 (frontend). MongoDB debe estar en ejecución; para Atlas, sustituir `MONGO_URI` por su cadena de conexión. No subir `.env` al repositorio.

4. Iniciar la API desde `API`:

   ```bash
   npm start
   ```

5. En otra terminal, desde la raíz del proyecto, iniciar el frontend:

   ```bash
   cd frontend
   npm ci
   npm start
   ```

6. Abrir [la aplicación](http://localhost:5002/views/login.html). API: `http://localhost:5001`.

Para desarrollo, ambos servidores también admiten `npm run dev`. Usar `localhost` en ambas direcciones; si cambia el puerto de la API, actualizar `frontend/public/js/config.js`.

## Acceso

El registro crea cuentas de cliente. Para preparar el primer administrador local, registrar una cuenta y cambiar su campo `rol` a `administrador` en la base de pruebas.

La autenticación usa la cookie `lsct.sid`: iniciar sesión antes de las peticiones protegidas y conservar las cookies en Thunder Client. Las sesiones duran una hora y se pierden al reiniciar la API.

## Rutas de la API REST

Base: `http://localhost:5001`. Enviar los cuerpos como JSON con `Content-Type: application/json`.
`:id` representa el identificador MongoDB del registro. Los filtros indicados se envían en la URL como parámetros de consulta; son opcionales. `—` indica que no se requiere cuerpo ni parámetros adicionales.

| Método | URL | Acceso | Parámetros o cuerpo esperado |
|---|---|---|---|
| GET | `/` | Público | —; comprueba disponibilidad |
| POST | `/auth/login` | Público | `{"correo":"cliente@example.com","clave":"CONTRASEÑA_LOCAL"}` |
| GET | `/auth/sesion` | Sesión | —; devuelve identidad y rol |
| POST | `/auth/logout` | Público | —; cierra la sesión |
| POST | `/usuarios` | Público | `{"nombre":"Ana","correo":"cliente@example.com","clave":"CONTRASEÑA_LOCAL","telefono":"88888888","direccion":"San José"}`; teléfono y dirección opcionales |
| GET | `/usuarios/perfil` | Sesión | —; consulta el perfil propio |
| PUT | `/usuarios/perfil` | Sesión | Uno o más campos: `nombre`, `correo`, `telefono`, `direccion` (texto) |
| GET | `/usuarios` | Administrador | Filtros: `rol` (`cliente` o `administrador`), `buscar` (nombre, correo o teléfono) |
| GET | `/usuarios/:id` | Administrador | ID en la URL |
| PUT | `/usuarios/:id` | Administrador | Uno o más campos: `nombre`, `correo`, `telefono`, `direccion` (texto) |
| PATCH | `/usuarios/:id/estado` | Administrador | `{"activo":false}` para desactivar o `true` para reactivar |
| GET | `/proveedores` | Administrador | Filtros: `nombre`, `tipoServicio` (texto) |
| GET | `/proveedores/:id` | Administrador | ID en la URL; consulta datos del proveedor |
| POST | `/proveedores` | Administrador | `{"nombre":"Hotel Ejemplo","tipoServicio":"Hotel","correo":"hotel@example.com","telefono":"88888888"}`; exige al menos un contacto |
| PUT | `/proveedores/:id` | Administrador | Uno o más campos: `nombre`, `tipoServicio`, `correo`, `telefono` (texto); conserva al menos un contacto |
| PATCH | `/proveedores/:id` | Administrador | `{"activo":false}` o `{"activo":true}` |
| GET | `/servicios` | Administrador | —; listado con proveedor asociado |
| POST | `/servicios` | Administrador | `{"nombre":"Traslado","tipo":"Transporte","descripcion":"Traslado privado","proveedor":"ID_PROVEEDOR_ACTIVO"}`; todos obligatorios |
| PUT | `/servicios/:id` | Administrador | Uno o más campos: `nombre`, `tipo`, `descripcion`, `proveedor` (texto) |
| PATCH | `/servicios/:id/visibilidad` | Administrador | `{"publicado":true}` para publicar o `false` para ocultar |
| GET | `/servicios/publicos` | Público | —; catálogo de servicios activos y publicados |
| GET | `/servicios/publicos/:id` | Público | ID en la URL; nombre, tipo y descripción del servicio público |
| POST | `/solicitudes` | Cliente | `{"destino":"La Fortuna","fechaSalida":"2026-12-10","fechaRegreso":"2026-12-15","cantidadViajeros":2,"edades":[30,8]}`; todos obligatorios |
| GET | `/solicitudes` | Sesión | Cliente: solo propias. Administrador: todas. Filtro opcional `estado`; `cliente` (ID) es solo administrativo |
| GET | `/solicitudes/:id` | Sesión | Propietario o administrador; administración ve nombre, correo y teléfono del cliente |
| PUT | `/solicitudes/:id` | Cliente propietario | Uno o más campos: `destino`, `fechaSalida`, `fechaRegreso`, `cantidadViajeros`, `edades`; solo en Nueva |
| PATCH | `/solicitudes/:id/estado` | Administrador | `{"estado":"En cotización"}`; solo permite iniciar la atención de una Nueva |

Los PUT conservan los campos omitidos. Las fechas usan `YYYY-MM-DD`, el regreso no puede ser anterior a la salida y la cantidad de viajeros debe coincidir con las edades (enteros no negativos). La solicitud toma el cliente de la sesión y se crea con estado `Nueva`.

La edición de solicitudes rechaza campos distintos de los documentados (incluidos `cliente`, `estado` y `cotizacion`) y valida el resultado completo antes de guardar. Una solicitud ajena devuelve 404. Fuera de Nueva la edición devuelve 409; una modificación concurrente también devuelve 409 y exige volver a consultar el registro. Las consultas de cliente excluyen información interna.

Los estados del modelo son Nueva, En cotización y Cotizada. El cambio manual solo permite Nueva → En cotización; Cotizada queda reservado a la publicación de una oferta en el módulo de cotizaciones, aún pendiente. El campo opcional `cotizacion` prepara esa relación sin modificar registros anteriores. Viajeros individuales y contactos se incorporan en sus módulos posteriores; se conservan cantidad y edades actuales.

Los servicios nuevos son de uso interno. Cambiar de proveedor exige uno activo; se permite conservar el proveedor actual inactivo. El catálogo público excluye servicios ocultos o inactivos y no expone datos privados del proveedor; su detalle devuelve 404 si no está disponible.

Respuestas: `200` operación correcta, `201` creación, `400` datos inválidos, `401` sin sesión o credenciales inválidas, `403` sin permisos, `404` no encontrado, `409` conflicto, `413` cuerpo demasiado grande y `500` error interno. Los errores usan `{"message":"Descripción"}`, con un array `errores` opcional. Las listas sin resultados devuelven `[]`.

## Colección de pruebas

Importar [Collection.json](API/docs/pruebas/Collection.json) en Thunder Client y configurar las variables locales siguiendo la [guía de pruebas](API/docs/pruebas/GUIA.md). La colección incluye los casos y códigos esperados en sus nombres; comparar las respuestas y comprobar los cambios en la base de pruebas.
