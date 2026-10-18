// Se ejecuta cuando ninguna ruta atendió la solicitud.
function notFound(req, res) {
  res.status(404).json({
    ok: false,
    error: { mensaje: `La ruta ${req.method} ${req.originalUrl} no existe`, detalle: null },
  });
}

module.exports = notFound;
