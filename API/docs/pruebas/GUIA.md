# Pruebas de API — sprint 1

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
no deben crear registros. Aún no hay GET de solicitudes; Mis solicitudes no es una
prueba de persistencia en este sprint.

## Restauración y repetición

50 y 62 restauran cliente y proveedor activos. Si se interrumpe la ejecución, iniciar
sesión como administrador y reactivarlos antes de repetir. La colección crea y modifica
registros de prueba; no los elimina. Para repetir desde 02, elegir un correo nuevo y
actualizar los IDs obtenidos. Cerrar sesión al finalizar.

## Evidencia para Jira

SCRUM-93: captura de colección importada y entorno seleccionado (ocultar contraseñas),
resultados de ejecución y enlace al commit de Collection.json y esta guía. Reutilizar
las evidencias ya adjuntadas a las tareas por módulo, sin duplicar su ejecución.
Preparar el archivo no acredita que se haya importado: registrar el resultado real
antes de cerrar la tarea.

SCRUM-94: ejecutar los pasos de instalación y arranque del README, confirmar los puertos
y los ejemplos con el rol indicado. Adjuntar evidencia reproducible y el commit del
README. Distinguir la comprobación de instalación de las pruebas previas de endpoints.
