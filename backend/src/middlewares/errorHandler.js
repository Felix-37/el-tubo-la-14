const HttpError = require('../utils/httpError');
const { traducirErrorPg } = require('../utils/erroresPg');

// Todos los errores pasan por aquí y salen con el mismo formato JSON.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // JSON mal escrito en el body.
  if (err.type === 'entity.parse.failed') {
    err = new HttpError(400, 'El cuerpo de la solicitud no es un JSON válido');
  }

  const error = err instanceof HttpError ? err : traducirErrorPg(err);

  if (error) {
    return res.status(error.status).json({
      ok: false,
      error: { mensaje: error.message, detalle: error.detalle },
    });
  }

  console.error(err);
  res.status(500).json({
    ok: false,
    error: { mensaje: 'Error interno del servidor', detalle: null },
  });
}

module.exports = errorHandler;
