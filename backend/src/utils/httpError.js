// Error con código HTTP, para que el errorHandler sepa qué responder.
class HttpError extends Error {
  constructor(status, mensaje, detalle = null) {
    super(mensaje);
    this.status = status;
    this.detalle = detalle;
  }
}

module.exports = HttpError;
