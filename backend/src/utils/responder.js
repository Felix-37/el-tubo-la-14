// Envuelve una función del servicio en un controlador de Express con la
// respuesta estándar { ok, mensaje, data } y el error hacia errorHandler.
function responder(fn, status = 200, mensaje) {
  return async (req, res, next) => {
    try {
      const data = await fn(req);
      res.status(status).json(mensaje ? { ok: true, mensaje, data } : { ok: true, data });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = responder;
