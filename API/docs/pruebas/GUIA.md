# Pruebas de API — base existente y solicitudes del sprint 2

## Importación y entorno

1. Ejecutar API y frontend siguiendo el README de la raíz, con una base de pruebas.
2. En Thunder Client, abrir Collections > Import y seleccionar Collection.json de esta carpeta.
3. Crear y seleccionar un entorno local con las variables de la tabla.
4. Conservar las cookies entre peticiones y borrar las de localhost antes de comenzar.
5. Ejecutar individualmente en orden numérico. Pausar para copiar los IDs indicados.

| Variable | Valor local |
|---|---|
| baseUrl | http://localhost:5001 |
| correoCliente | Correo ficticio nuevo, por ejemplo cliente.sprint1@example.com |
| claveCliente | Contraseña local del cliente de pruebas |
| claveIncorrecta | Texto distinto de la contraseña del cliente |
| correoAdmin | Correo de un administrador activo de pruebas |
| claveAdmin | Contraseña local del administrador |
| idCliente | Copiar datos._id de la respuesta 02 |
| idAdmin | Copiar datos._id de la respuesta 16 |
| idProveedor | Copiar datos._id de la respuesta 30 |
| idSolicitud | Copiar datos._id de la respuesta 82 antes de ejecutar 84 |
| idSolicitudViajeros | Copiar datos._id de la respuesta 109 |
| idViajeroInicial | Copiar el _id del primer elemento de la respuesta 110 |
| idViajeroNuevo | Copiar datos._id de la respuesta 111 |
| correoCliente2 | Correo ficticio nuevo y diferente para el segundo cliente |
| claveCliente2 | Contraseña local del segundo cliente |

Preparar antes el administrador: registrar otra cuenta ficticia y cambiar su rol
 directamente en MongoDB, como indica el README. Usar correos distintos para cliente
y administrador. No exportar contraseñas, cookies ni valores de la base real.

## Orden y resultados

Cada nombre incluye el HTTP esperado. La colección no contiene aserciones automáticas:
comparar el código, el contenido y la persistencia. El cuerpo raw mantiene el formato
de la colección original de Thunder Client.

| Peticiones | Comprobación |
|---|---|
| 01–05 | Sin sesión, registro válido/duplicado/inválido y credenciales incorrectas |
| 06–13 | Sesión cliente, perfil y rechazo de operaciones administrativas |
| 14–16 | Logout, sesión invalidada y login administrador |
| 17–29 | Consulta, filtros, edición y estado de cuentas; IDs inválidos/inexistentes |
| 30–44 | Registro, filtros, detalle, edición y estado de proveedores |
| 45–46 | JSON mal formado y ruta inexistente |
| 47–51 | Cliente inactivo, restauración y cierre de sesión |
| 52–54 | Servicios/solicitudes sin sesión y login administrador |
| 55–59 | Servicio válido, listado, campos e identificadores inválidos/inexistentes |
| 60–62 | Desactivar proveedor, rechazar servicio y restaurar proveedor |
| 63–67 | Admin no crea solicitudes; cliente no administra servicios |
| 68–77 | Solicitud válida; destino, fechas, cantidad y edades inválidas |
| 78 | Ignorar cliente/estado del body: usar cliente de sesión y estado Nueva |
| 79–80 | Logout y rechazo de solicitud sin sesión |
| 81–88 | Crear solicitud para pruebas, copiar ID, listar/detallar, editar y rechazar cambios inválidos/protegidos |
| 89–90 | Cliente no cambia estado; cierre de sesión |
| 91–98 | Administración: listado, filtros/detalle, inicio de atención y estados/transiciones inválidos |
| 99–105 | Edición bloqueada, consulta de estado, logout y consultas sin sesión |

La 29 supone un único administrador activo; con varios, el intento de desactivar la
propia cuenta también devuelve 409, con otro mensaje. Los IDs inexistentes utilizados
deben estar ausentes de la base. La 45 tiene JSON mal formado intencionalmente.

Después de 10, consultar de nuevo el perfil para comprobar que conserva su nombre.
Después de 11, confirmar que sigue siendo cliente. Después de 41, repetir 37 y confirmar
que conserva el nombre del proveedor. Ninguna respuesta debe exponer clave ni hashes.
Las búsquedas sin coincidencias deben devolver un array vacío.

Después de 55, comprobar el servicio en 56 y MongoDB: activo true, publicado false,
proveedor correcto. Después de 68 y 78, revisar solicitudes en MongoDB: referencia al
cliente autenticado, fechas exactas, cantidad, edades y estado Nueva. Los casos inválidos
no deben crear registros. GET /solicitudes permite comprobar los registros por API;
la conexión de Mis solicitudes en la interfaz continúa pendiente.

Después de 82, copiar datos._id a idSolicitud. Después de 86, comprobar por GET que
destino es Monteverde y conserva fechas, cantidad y edades; 87 y 88 no deben
alterarlos. 94 incluye datos del cliente sin clave. 96 cambia a En cotización y
101 devuelve 409; 102 conserva Monteverde y el nuevo estado. No puede pasarse
a Cotizada desde este endpoint: esa transición pertenece a publicación de oferta.

Con un segundo cliente ficticio, consultar y editar el idSolicitud del primero
debe devolver 404. Su listado devuelve únicamente registros propios (o []). Verificar
los filtros inválidos y la compatibilidad de registros existentes con peticiones en
Thunder Client; conservar capturas de los resultados y comprobar persistencia en MongoDB.

## Restauración y repetición

### Viajeros: SCRUM-158 y SCRUM-159 (106–139)

Ejecutar en orden, pausando para copiar los IDs de 109, 110 y 111. Las rutas de viajeros
solo permiten al cliente propietario: administración consulta su información desde
GET /solicitudes/:id. Un ID de viajero no pertenece a otras solicitudes.

- 106–110: sin sesión devuelve 401; crear solicitud con un viajero de edad 30 y consultar su ID.
- 111–113: agregar Ana (8), comprobar cantidad 2 y edades [30,8]; editar a 9 sin perder nombre ni ID.
- 114–119: datos inválidos, campos protegidos e IDs inválidos/inexistentes deben rechazarse sin modificar el grupo.
- 120–121: retirar a Ana deja cantidad 1 y edades [30]; retirar el último devuelve 409.
- 122–128: registrar y usar otro cliente; consulta, alta, edición y retiro de la solicitud ajena devuelven 404.
- 129–133: administrador recibe 403 en la ruta de viajeros; cambia la solicitud a En cotización.
- 134–139: propietario puede consultar, pero alta/edición/retiro devuelven 409; cerrar sesión.

Comprobar por GET y MongoDB que fechas, destino, cliente y estado no cambian al modificar
viajeros. Repetir 109–110 crea IDs diferentes para una solicitud diferente; para repetir
el bloque completo, usar correoCliente2 nuevo (123 registra una cuenta).

Compatibilidad de registros antiguos: usar una solicitud de prueba creada antes de este
cambio (sin campo viajeros). Consultar dos veces y comprobar mismos IDs y edades previas,
sin escrituras por GET; una edición válida persiste viajeros y conserva el resto de datos.
El PUT anterior con cantidad/edades conserva los IDs y nombres por posición. Comprobar
también edad 0 válida y nombre omitido válido. No se elimina físicamente la solicitud.

Ejecutar las pruebas manuales en Thunder Client contra una base de pruebas de MongoDB.
Conservar capturas del método, URL, código HTTP y respuesta como evidencia para Jira.

50 y 62 restauran cliente y proveedor activos. Si se interrumpe la ejecución, iniciar
sesión como administrador y reactivarlos antes de repetir. La colección crea y modifica
registros de prueba; no los elimina. Para repetir desde 02, elegir un correo nuevo y
actualizar los IDs obtenidos. Cerrar sesión al finalizar. Para repetir 81–105,
crear una solicitud nueva en 82 y reemplazar idSolicitud: la anterior permanece
En cotización.

## Evidencia para Jira

SCRUM-93: captura de colección importada y entorno seleccionado (ocultar contraseñas),
resultados de ejecución y enlace al commit de Collection.json y esta guía. Reutilizar
las evidencias ya adjuntadas a las tareas por módulo, sin duplicar su ejecución.
Preparar el archivo no acredita que se haya importado: registrar el resultado real
antes de cerrar la tarea.

SCRUM-94: ejecutar los pasos de instalación y arranque del README, confirmar los puertos
y los ejemplos con el rol indicado. Adjuntar evidencia reproducible y el commit del
README. Distinguir la comprobación de instalación de las pruebas previas de endpoints.
