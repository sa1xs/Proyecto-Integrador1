# Guía de pruebas esenciales

1. Iniciar la API con una base de pruebas. Importar `Collection.json` en Thunder Client.
2. Preparar un administrador activo y seleccionar un entorno con estas variables:

| Variable | Valor o respuesta de origen |
|---|---|
| `baseUrl` | `http://localhost:5001` |
| `correoAdmin`, `claveAdmin` | Administrador preparado previamente |
| `correoCliente`, `claveCliente` | Cuenta ficticia nueva, registrada en 02 |
| `correoCliente2`, `claveCliente2` | Otra cuenta ficticia nueva, registrada en 03 |
| `idCliente` | `datos._id` de 02 |
| `idSolicitud` | `datos._id` de 10 |
| `idViajeroInicial` | `_id` del primer elemento de 14 |
| `idViajeroNuevo` | `datos._id` de 15 |
| `idProveedor` | `datos._id` de 30 |
| `idServicio` | `datos._id` de 34 |
| `idCotizacion` | `datos._id` de 46 |
| `idDestino` | `datos._id` de 83 |

3. Ejecutar las 106 peticiones en orden, conservando cookies y pausando para copiar IDs.

| Peticiones | Comprobación principal |
|---|---|
| 01–09 | Registro, sesión, perfil, datos inválidos y permisos |
| 10–23 | Solicitudes y viajeros propios; impedir retirar al último y consultar una solicitud ajena |
| 24–33 | Administración de clientes y proveedores |
| 34–44 | Crear/editar servicio, publicar/ocultar, catálogo y proveedor inactivo |
| 45–54 | Borrador único, cálculo, publicación y solicitud Cotizada |
| 55–64 | Cotización privada, consulta propia y respuesta única |
| 65–76 | Contactos administrativos: lista vacía, registro, fecha inválida y permisos |
| 77–93 | Destinos públicos y administración: registro, edición, validación y activar/desactivar |
| 94–106 | Favoritos propios: sesión/rol, agregar sin duplicados, listar y retirar |

Cada nombre indica el HTTP esperado. Revisar también la respuesta y la persistencia por GET/MongoDB: la colección no tiene aserciones automáticas. En 49, tres unidades a 0.10 deben totalizar 0.30 CRC; en 52 la solicitud debe estar Cotizada. Los errores no deben alterar datos válidos ni exponer contraseñas o datos privados del proveedor.

Para probar rechazo, repetir con una solicitud y cotización nuevas y enviar `{"estado":"Rechazada"}` en 62. Para repetir el recorrido completo, usar correos nuevos y reemplazar todos los IDs. La colección crea/modifica datos de prueba; no los elimina.

Contactos: 66 debe devolver `[]`; 67 devuelve ID, fecha, canal y nota; 68 muestra el registro y 69 no lo modifica. Los casos 72, 74 y 75 deben devolver 401/403. Para verificar orden, registrar otra fecha y consultar de nuevo. En el detalle de solicitud del cliente no deben aparecer las notas.

Destinos: copiar el ID de 83 antes de editar. El nombre inválido de 86 conserva los datos; 88 devuelve 404 por destino inactivo, 89 mantiene el registro administrativo y 93 vuelve a mostrarlo públicamente tras reactivar. Las solicitudes anteriores conservan su destino de texto.

Favoritos: 100 y 105 devuelven `[]`; después de 101/102, la lista de 103 debe tener el servicio una sola vez y no exponer el proveedor. Para comprobar privacidad, iniciar sesión con el segundo cliente: debe ver su propia lista vacía. Ocultar el servicio lo excluye del listado, pero aún permite retirarlo. Repetir la retirada devuelve 200 y no elimina el servicio.

Para Jira, adjuntar capturas con método, URL, HTTP y respuesta de los casos del módulo, y el commit correspondiente. No exportar credenciales ni cookies.
