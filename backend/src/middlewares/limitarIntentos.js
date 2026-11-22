const HttpError = require('../utils/httpError');

// Límite de peticiones por IP para login y refresh. Frena la fuerza bruta
// y evita que una ráfaga de bcrypt (costo 12) sature el servidor.
// Se guarda en memoria: suficiente para un solo proceso.
function limitarIntentos({ maximo, ventanaMs }) {
  const contadores = new Map();

  return (req, res, next) => {
    const ahora = Date.now();
    const clave = req.ip;
    let registro = contadores.get(clave);
    if (!registro || registro.reinicia <= ahora) {
      registro = { cantidad: 0, reinicia: ahora + ventanaMs };
      contadores.set(clave, registro);
    }
    registro.cantidad += 1;

    // Limpieza ocasional de IPs viejas para que el mapa no crezca sin fin.
    if (contadores.size > 10000) {
      for (const [ip, r] of contadores) if (r.reinicia <= ahora) contadores.delete(ip);
    }

    if (registro.cantidad > maximo) {
      const segundos = Math.ceil((registro.reinicia - ahora) / 1000);
      res.set('Retry-After', String(segundos));
      return next(new HttpError(429, `Demasiados intentos; espere ${segundos} s`));
    }
    next();
  };
}

module.exports = limitarIntentos;
