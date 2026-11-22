// Configuración de la autenticación. Todo sale del .env; si falta algo
// crítico o tiene un formato inválido, el servidor no arranca.

const { requerida, enteroRequerido } = require('./env');

// Si alguien pone un valor menor al mínimo, se usa el mínimo.
function entero(nombre, minimo) {
  return Math.max(enteroRequerido(nombre), minimo);
}

// Duraciones como las entiende jsonwebtoken: 30s, 5m, 2h, 1d.
function duracion(nombre) {
  const valor = requerida(nombre);
  if (!/^\d+[smhd]$/.test(valor)) {
    throw new Error(`La variable ${nombre} debe ser una duración como 5m, 2h o 1d`);
  }
  return valor;
}

// Un secreto HS256 debe tener al menos 256 bits: 32 bytes, o 64 caracteres hex.
function secreto(nombre) {
  const valor = requerida(nombre);
  if (valor.length < 64) {
    throw new Error(`El secreto ${nombre} es muy corto: use al menos 64 caracteres aleatorios`);
  }
  return valor;
}

const accessSecret = secreto('JWT_ACCESS_SECRET');
const refreshSecret = secreto('JWT_REFRESH_SECRET');
if (accessSecret === refreshSecret) {
  throw new Error('JWT_ACCESS_SECRET y JWT_REFRESH_SECRET deben ser distintos');
}

module.exports = {
  accessSecret,
  refreshSecret,
  accessExpira: duracion('JWT_ACCESS_EXPIRES_IN'),
  refreshExpira: duracion('JWT_REFRESH_EXPIRES_IN'),
  costoBcrypt: entero('BCRYPT_COST', 12),
  claveMinima: entero('PASSWORD_MIN_LENGTH', 8),
  loginPorMinuto: entero('LOGIN_INTENTOS_POR_MINUTO', 1),
};
