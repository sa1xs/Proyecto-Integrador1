# LSCT — Sistema de cotizaciones y reservas

Prototipo académico para LS Consulting & Travel.
Backend desarrollado con Node.js, Express y MongoDB mediante Mongoose.

## API de proveedores

La colección está en:
[Pruebas de proveedores](API\docs\pruebas\Collection_Proveedores.json).

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