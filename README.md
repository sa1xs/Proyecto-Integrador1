# LSCT — Sistema de cotizaciones y reservas

Prototipo académico: Node.js, Express, MongoDB/Mongoose y HTML/Bootstrap.
Implementados: cuentas, sesiones, roles, perfil, consulta de clientes, proveedores,
registro y listado administrativo de servicios y creación de solicitudes de cotización.
El catálogo público, la visibilidad de servicios y la consulta/gestión de solicitudes
continúan en el sprint 2; sus interfaces todavía no ofrecen esas operaciones.

## Instalación

Requisitos: Node.js con npm y MongoDB accesible. Usar una base de pruebas.

1. En `API`, ejecutar `npm ci`.
2. Crear `API/.env` con las variables siguientes, sustituyendo los valores locales:

```dotenv
MONGO_URI=mongodb://127.0.0.1:27017/lsct_pruebas
PORT=5001
FRONTEND_URL=http://localhost:5002
SESSION_SECRET=REEMPLAZAR_POR_UN_VALOR_ALEATORIO_LOCAL
```

Generar SESSION_SECRET con este comando y copiar el resultado únicamente al `.env`:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

MONGO_URI y SESSION_SECRET son obligatorios. PORT y FRONTEND_URL usan los valores indicados por defecto.
No subir `.env`, contraseñas, cookies ni cadenas de conexión privadas.

3. Desde `API`, ejecutar `npm run dev`.
4. En otra terminal, entrar en `frontend`, ejecutar `npm ci` y `npm run dev`.
5. Abrir http://localhost:5002/views/login.html.

`npm start` ejecuta cada servidor sin nodemon. Usar `localhost` en ambas aplicaciones;
no mezclarlo con `127.0.0.1`, porque la sesión depende de una cookie.
Si cambia el puerto de la API, actualizar `frontend/public/js/config.js`.

## Cuentas y sesiones

El registro público siempre crea un cliente activo. Para preparar el primer administrador
local, registrar una cuenta ficticia y cambiar su campo `rol` a `administrador` directamente
en la base de pruebas. No existe una ruta pública para cambiar roles.

El login guarda la cookie `lsct.sid`. El frontend envía `credentials: "include"`.
Thunder Client debe conservar las cookies entre peticiones. Cerrar sesión antes de cambiar
entre administrador y cliente. Las sesiones duran una hora y se pierden al reiniciar la API:
se usa almacenamiento en memoria para este prototipo local HTTP.

Las contraseñas se almacenan con bcrypt; las respuestas no incluyen `clave` ni su hash.
Un cliente solo modifica su perfil. Solo el administrador consulta cuentas, modifica otros
perfiles, cambia estados y administra proveedores. El último administrador activo no puede
ser desactivado; tampoco se permite que un administrador desactive su propia cuenta.

## Rutas implementadas

Base: `http://localhost:5001`. Las peticiones con cuerpo usan `Content-Type: application/json`.

| Método | Ruta | Acceso | Datos / resultado |
|---|---|---|---|
| GET | `/` | Público | Mensaje de disponibilidad |
| POST | `/usuarios` | Público | Registro; devuelve 201 y `{mensaje, datos}` |
| POST | `/auth/login` | Público | correo, clave; devuelve 200, datos y cookie |
| GET | `/auth/sesion` | Sesión | Devuelve `{datos}` con identidad y rol |
| POST | `/auth/logout` | Público | Invalida sesión y borra cookie; 200 |
| GET | `/usuarios/perfil` | Sesión | `{datos}` con nombre, correo, telefono, direccion |
| PUT | `/usuarios/perfil` | Sesión | Actualiza solo esos cuatro campos; 200 |
| GET | `/usuarios` | Administrador | Array; filtros opcionales `rol` y `buscar` |
| GET | `/usuarios/:id` | Administrador | Cuenta sin contraseña; 200 |
| PUT | `/usuarios/:id` | Administrador | Campos de contacto; `{mensaje, datos}` |
| PATCH | `/usuarios/:id/estado` | Administrador | `{ "activo": false }` o true; 200 |
| GET | `/proveedores` | Administrador | Array; filtros opcionales `nombre` y `tipoServicio` |
| GET | `/proveedores/:id` | Administrador | Proveedor; 200 |
| POST | `/proveedores` | Administrador | Registro; 201 y `{mensaje, datos, advertencia}` |
| PUT | `/proveedores/:id` | Administrador | Editar datos; 200 y `{mensaje, datos}` |
| PATCH | `/proveedores/:id` | Administrador | `{ "activo": false }` o true; 200 |
| GET | `/servicios` | Administrador | Array con proveedor asociado (nombre), ordenado del más reciente al más antiguo |
| POST | `/servicios` | Administrador | nombre, tipo, descripcion, proveedor; 201 y `{mensaje, datos}` |
| POST | `/solicitudes` | Cliente | destino, fechaSalida, fechaRegreso, cantidadViajeros, edades; 201 y `{mensaje, datos}` |

Los PUT existentes conservan los campos omitidos. Rol, estado y contraseña no son editables
mediante estas actualizaciones. No hay eliminación física de cuentas o proveedores.

### Ejemplos de cuerpos

Registro de cliente (sustituir la contraseña localmente):

```json
{"nombre":"Cliente de prueba","correo":"cliente@example.com","clave":"REEMPLAZAR_LOCALMENTE","telefono":"88888888","direccion":"San José"}
```

Login:

```json
{"correo":"cliente@example.com","clave":"REEMPLAZAR_LOCALMENTE"}
```

Edición de perfil propio o de otro usuario por administrador:

```json
{"nombre":"Cliente actualizado","telefono":"88887777","direccion":"Alajuela"}
```

Registro de proveedor:

```json
{"nombre":"Hotel de prueba","tipoServicio":"Hotel","correo":"hotel@example.com","telefono":"88888888"}
```

Nombre, tipo y al menos un contacto son obligatorios. Un nombre repetido produce una
advertencia, pero permite guardar. La edición acepta estos mismos cuatro campos.

### Servicios y solicitudes

Registro de servicio (sustituir el identificador por el de un proveedor activo):

```json
{"nombre":"Traslado al aeropuerto","tipo":"Transporte","descripcion":"Traslado privado de prueba","proveedor":"507f1f77bcf86cd799439011"}
```

Los cuatro campos son obligatorios y deben ser texto no vacío. Un ID mal formado
produce 400; un proveedor inexistente, 404; un proveedor inactivo, 400.
El servidor crea el servicio con `activo: true` y `publicado: false` (uso interno).
La respuesta 201 contiene `mensaje` y `datos`, incluyendo el identificador generado.
El GET administrativo incluye el nombre del proveedor asociado. No hay todavía
rutas públicas de catálogo, edición de servicios ni cambio de visibilidad.

Creación de solicitud desde una sesión de cliente:

```json
{"destino":"La Fortuna","fechaSalida":"2026-12-10","fechaRegreso":"2026-12-15","cantidadViajeros":2,"edades":[30,8]}
```

Las fechas deben ser fechas reales en formato YYYY-MM-DD; se almacenan como texto
para conservar el día de calendario. El regreso puede ser el mismo día o posterior
a la salida. No se aplica una restricción adicional contra fechas pasadas.
La cantidad es un entero positivo y debe coincidir con la longitud de edades;
cada edad es un entero no negativo. No se exigen nombres de viajeros.
El servidor toma `cliente` desde la sesión y asigna `estado: "Nueva"`, aunque el
body intente proporcionar otros valores. Los errores de estos datos devuelven 400.
Una sesión de administrador recibe 403; sin sesión válida se recibe 401.

Respuesta de creación (identificadores ficticios; se omiten timestamps):

```json
{"mensaje":"Solicitud registrada","datos":{"_id":"507f1f77bcf86cd799439012","cliente":"507f1f77bcf86cd799439011","destino":"La Fortuna","fechaSalida":"2026-12-10","fechaRegreso":"2026-12-15","cantidadViajeros":2,"edades":[30,8],"estado":"Nueva"}}
```

Error de fechas:

```json
{"message":"Indicá fechas válidas; el regreso no puede ser anterior a la salida"}
```

En el navegador, usar una cuenta cliente en /views/solicitudes.html. El formulario
genera las edades al cambiar la cantidad; confirma código y estado al guardar y
conserva los datos ante errores. Mis solicitudes y Gestión administrativa permanecen
deshabilitadas hasta implementar sus operaciones.

### Búsquedas

`GET /usuarios?rol=cliente&buscar=ana` busca por nombre, correo o teléfono.
`GET /proveedores?nombre=hotel&tipoServicio=hotel` combina ambos filtros (deben cumplirse ambos).
La búsqueda de proveedores es parcial, ignora mayúsculas y trata símbolos como texto literal.
Filtros vacíos listan todo; sin coincidencias devuelve `200` con `[]`.
Usar `URLSearchParams` para codificar espacios y símbolos.

### Respuestas de error

Formato: `{ "message": "Descripción" }`, con `errores` opcional como array de mensajes.

| HTTP | Significado |
|---|---|
| 400 | Validación, identificador o JSON inválido |
| 401 | Sesión ausente/inactiva o credenciales incorrectas |
| 403 | Rol sin permisos |
| 404 | Registro o ruta inexistente |
| 409 | Dato único duplicado o cambio de estado no permitido |
| 413 | Cuerpo demasiado grande |
| 500 | Error inesperado, con mensaje genérico |

Los controladores pasan las excepciones a `middleware/errores.js` mediante `next(error)`.
Los rechazos de reglas del negocio, como falta de permisos, mantienen su respuesta explícita.

## Pruebas

- [Colección consolidada de Thunder Client](API/docs/pruebas/Collection.json).
- [Preparación, orden de ejecución y evidencia pendiente](API/docs/pruebas/GUIA.md).

La colección no contiene credenciales ni IDs de la base real. Importarla, configurar las
variables locales y ejecutarla antes de dar por completadas las pruebas manuales de Jira.
La colección contiene 80 peticiones con el código esperado en el nombre. No incluye
aserciones automáticas: comparar cada respuesta con la guía y comprobar persistencia
en MongoDB. No sustituye la validación visual en navegador.
