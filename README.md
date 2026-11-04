# LSCT — Solicitudes y cotizaciones turísticas

Proyecto académico con 12 módulos, API REST en Node.js/Express/Mongoose y frontend en HTML5, Bootstrap y CSS.

## Segundo avance: frontend

La entrega presenta las pantallas y formularios preparados para la API.
La integración completa de solicitudes, viajeros, contactos, cotizaciones, destinos,
favoritos, consultas y reportes corresponde a Sprint 3. Las funciones ya conectadas
del primer avance se conservan al usar una sesión real.

### Iniciar y revisar sin API

Requisito: Node.js 20.19 o superior.

1. Desde la raíz del repositorio:

   ```bash
   cd frontend
   npm ci
   npm start
   ```

2. Abrir una perspectiva de revisión:

   - [Visitante](http://localhost:5002/views/servicios.html?maqueta=visitante)
   - [Cliente](http://localhost:5002/views/servicios.html?maqueta=cliente)
   - [Administrador](http://localhost:5002/views/servicios.html?maqueta=administrador)

3. Navegar por el menú común. El parámetro `maqueta` se conserva entre pantallas.
   Elegir **Estado visual** para revisar carga, vacío y error, y **Variante del diseño**
   para consulta, guardado o último viajero, según el módulo.

Este modo no inicia sesión, no llama a la API, no guarda datos y no contiene
registros ficticios. Las filas y tarjetas con **—** permiten abrir los componentes
del HTML sin representar registros. Las confirmaciones finales están deshabilitadas.
Los ceros de Reportes en “Sin registros” muestran exclusivamente el diseño de ese estado.

Para salir, usar **Salir de revisión**. En el modo normal se requiere API para las
funciones existentes; si no responde, se conserva la pantalla con enlaces a revisión.
No usar el modo de maquetación para comprobar autenticación ni permisos del backend.

### Matriz de vistas, Jira y API

Los IDs distinguen controles en el documento. Los `name` y el mapeo indicado a
continuación corresponden a los atributos o parámetros de la API.

| Módulo / épica | Vista o sección | Tarea de diseño | Entidad y campos principales |
|---|---|---|---|
| 01 · Usuarios y acceso · SCRUM-9 | [Login](frontend/public/views/login.html), [registro](frontend/public/views/registro.html), [cuentas](frontend/public/views/cuentas.html) | [SCRUM-78](https://ucenfotec-sebassalas.atlassian.net/browse/SCRUM-78) | Usuario: nombre, correo, clave, telefono, direccion, rol y activo; confirmación de clave solo en interfaz |
| 02 · Clientes · SCRUM-10 | [Perfil, edición, búsqueda y ficha](frontend/public/views/clientes.html) | [SCRUM-79](https://ucenfotec-sebassalas.atlassian.net/browse/SCRUM-79) | Usuario con rol cliente: nombre, correo, telefono y direccion |
| 03 · Proveedores · SCRUM-11 | [Listado, consulta, formulario y estado](frontend/public/views/proveedores.html) | [SCRUM-80](https://ucenfotec-sebassalas.atlassian.net/browse/SCRUM-80) | Proveedor: nombre, tipoServicio, correo, telefono y activo |
| 04 · Servicios · SCRUM-12 | [Catálogo, detalle y administración](frontend/public/views/servicios.html) | [SCRUM-81](https://ucenfotec-sebassalas.atlassian.net/browse/SCRUM-81) | Servicio: nombre, tipo, descripcion, proveedor y publicado |
| 05 · Solicitudes · SCRUM-13 | [Formulario, listados, edición y gestión](frontend/public/views/solicitudes.html) | [SCRUM-82](https://ucenfotec-sebassalas.atlassian.net/browse/SCRUM-82) | Solicitud: destino, fechaSalida, fechaRegreso, cantidadViajeros, edades y estado |
| 06 · Viajeros · SCRUM-141 | Mis solicitudes → Ver detalle → Viajeros, en Solicitudes | [SCRUM-160](https://ucenfotec-sebassalas.atlassian.net/browse/SCRUM-160) | Solicitud.viajeros: nombre opcional y edad |
| 07 · Cotización simple · SCRUM-15 | [Listados, editor, detalle y respuesta](frontend/public/views/cotizaciones.html) | [SCRUM-84](https://ucenfotec-sebassalas.atlassian.net/browse/SCRUM-84) | Cotizacion: solicitud, partidas, moneda CRC, total, estado y fechas |
| 08 · Destinos · SCRUM-142 | [Catálogo público, detalle y administración](frontend/public/views/destinos.html) | [SCRUM-164](https://ucenfotec-sebassalas.atlassian.net/browse/SCRUM-164) | Destino: nombre, pais, descripcion y activo |
| 09 · Favoritos · SCRUM-144 | Servicios → Catálogo/detalle y Mis favoritos | [SCRUM-172](https://ucenfotec-sebassalas.atlassian.net/browse/SCRUM-172) | Usuario.favoritos: referencia de Servicio; agregar envía servicio |
| 10 · Consultas · SCRUM-145 | [Pregunta, listados, detalle y respuesta administrativa](frontend/public/views/consultas.html) | [SCRUM-176](https://ucenfotec-sebassalas.atlassian.net/browse/SCRUM-176) | Consulta: pregunta y respuesta; cliente, estado y fechas definidos por API |
| 11 · Seguimiento · SCRUM-143 | Solicitudes → Gestión administrativa → Seguimiento comercial | [SCRUM-168](https://ucenfotec-sebassalas.atlassian.net/browse/SCRUM-168) | Solicitud.contactos: fecha, canal y nota |
| 12 · Reportes · SCRUM-146 | [Contadores administrativos](frontend/public/views/reportes.html) | [SCRUM-179](https://ucenfotec-sebassalas.atlassian.net/browse/SCRUM-179) | Agregación de Solicitud y Cotizacion por estado; sin modelo Reporte |

Mapeos para la siguiente integración:

- `edades[]` se transforma en `edades`, array de números; `cantidadViajeros` es entero.
- Partidas: `servicio`, `cantidad` y `precio` forman cada elemento de `partidas`.
  En edición, `cantidades[]` y `precios[]` se asocian a la referencia de servicio de cada fila.
- Estado de proveedor/destino/cuenta: `activo` booleano; visibilidad del servicio: `publicado` booleano.
- Aceptación/rechazo de cotización envía `estado`; responder una consulta envía `respuesta`.
- Total, subtotales, identidad del cliente y fechas del servidor no se toman de campos editables.
- Las pantallas restringen visualmente acciones por perspectiva y estado durante revisión;
  la autorización real siempre corresponde a la API.

### Capturas y revisión responsive

Las [capturas de escritorio y móvil](frontend/docs/capturas/README.md) cubren los
12 módulos, incluyendo listados, formularios, detalles y confirmaciones representativas.
Se tomaron del frontend el 3 de noviembre de 2026 con anchos de 1366 y 390 px.
Las páginas completas pueden superar el alto de la ventana; los modales conservan
su desplazamiento interno. El modo de revisión muestra los contenedores sin datos
y no constituye una prueba de integración con la API.

## Estructura

- `frontend/public/views/`: 11 pantallas HTML; Viajeros, Favoritos y Seguimiento son secciones de sus módulos.
- `frontend/public/css/styles.css`: identidad visual, contraste, foco y ajustes responsive.
- `frontend/public/js/`: menú común, revisión de maquetación y controladores existentes.
- `frontend/docs/`: revisión y capturas de la entrega.
- `API/`: configuración, modelos, controladores, rutas y middleware del backend.
- No hay imágenes decorativas en las pantallas actuales. Si se agregan, ubicarlas
  en `frontend/public/img/` con un texto alternativo adecuado.

## Primer avance: API REST

Las instrucciones completas de MongoDB, variables de entorno, permisos y las
54 rutas con sus cuerpos se conservan en [la documentación de la API](API/docs/API.md).
La conexión sigue siendo compatible con MongoDB local.

- [Colección de Thunder Client](API/docs/pruebas/Collection.json).
- [Guía de pruebas](API/docs/pruebas/GUIA.md).
- `API/.env.example` es la plantilla; el `.env` real está excluido del repositorio.

## Entrega

Repositorio: [Proyecto-Integrador1](https://github.com/sa1xs/Proyecto-Integrador1).
El segundo avance se entrega con los cambios publicados y este README,
incluida la matriz y las capturas solicitadas. No requiere completar la integración de Sprint 3.
