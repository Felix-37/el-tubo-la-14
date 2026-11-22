const bcrypt = require('bcrypt');
const { costoBcrypt, claveMinima } = require('../config/auth');
const HttpError = require('./httpError');

// Funciones internas: no se exponen como endpoint.

function hashClave(clave) {
  return bcrypt.hash(clave, costoBcrypt);
}

// bcrypt.compare, nunca ===: el hash cambia cada vez por la sal.
// Si algo falla (hash dañado, por ejemplo) se toma como clave incorrecta.
async function verificarClave(clave, hash) {
  try {
    return await bcrypt.compare(clave, hash);
  } catch {
    return false;
  }
}

// Hash de una clave que nadie conoce. El login lo compara cuando el
// usuario no existe, para que la respuesta tarde lo mismo y no revele
// qué usuarios existen (ataque de tiempo).
const hashFicticio = bcrypt.hashSync(`ficticia-${Date.now()}-${Math.random()}`, costoBcrypt);

// Reglas de la clave nueva: longitud mínima del .env, y al menos una letra y un número.
function validarClaveNueva(clave) {
  if (typeof clave !== 'string' || clave.length < claveMinima) {
    throw new HttpError(400, `La clave debe tener al menos ${claveMinima} caracteres`);
  }
  if (Buffer.byteLength(clave, 'utf8') > 72) {
    // bcrypt solo usa los primeros 72 bytes (una tilde o una ñ ocupan 2).
    throw new HttpError(400, 'La clave es demasiado larga (máximo 72 bytes)');
  }
  if (!/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(clave) || !/\d/.test(clave)) {
    throw new HttpError(400, 'La clave debe tener al menos una letra y un número');
  }
}

module.exports = { hashClave, verificarClave, hashFicticio, validarClaveNueva };
