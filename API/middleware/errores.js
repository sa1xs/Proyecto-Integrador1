function rutaNoEncontrada(req, res) {
  return res.status(404).json({ message: "Ruta no encontrada" });
}

// Express identifica este middleware por sus cuatro parámetros.
function manejarErrores(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ message: "El cuerpo debe contener JSON válido" });
  }
  if (error.type === "entity.too.large") {
    return res.status(413).json({ message: "La petición supera el tamaño permitido" });
  }
  if (error.code === 11000) {
    return res.status(409).json({ message: "Ya existe un registro con ese dato único" });
  }
  if (error.name === "VersionError") {
    return res.status(409).json({ message: "El registro cambió durante la operación. Consultalo de nuevo antes de reintentar" });
  }
  if (error.name === "ValidationError") {
    // No devuelve valores recibidos ni mensajes internos de Mongoose.
    const errores = Object.keys(error.errors).map((campo) => `Revisá el campo ${campo}`);
    return res.status(400).json({ message: "Los datos no son válidos", errores });
  }
  if (error.name === "CastError") {
    return res.status(400).json({ message: "El identificador o tipo de dato no es válido" });
  }
  return res.status(500).json({ message: "No se pudo completar la operación" });
}

module.exports = { rutaNoEncontrada, manejarErrores };
