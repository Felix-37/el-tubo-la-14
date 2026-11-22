const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config/auth');

// El payload de un JWT va codificado, no cifrado: no lleva datos sensibles.
// Claims: sub (id del usuario), rol, type ('access' o 'refresh'), jti
// (id único del token) y familia (solo en el refresh).

const ALGORITMO = 'HS256';

function firmarAccess(usuario) {
  return jwt.sign(
    // emitido: fecha de emisión en milisegundos (iat solo tiene segundos);
    // sirve para invalidar los access emitidos antes de un cambio de clave.
    { sub: String(usuario.usuario_id), rol: usuario.rol_codigo, type: 'access', emitido: Date.now() },
    config.accessSecret,
    { algorithm: ALGORITMO, expiresIn: config.accessExpira, jwtid: crypto.randomUUID() },
  );
}

function firmarRefresh(usuarioId, jti, familia) {
  return jwt.sign(
    { sub: String(usuarioId), type: 'refresh', familia },
    config.refreshSecret,
    { algorithm: ALGORITMO, expiresIn: config.refreshExpira, jwtid: jti },
  );
}

// jwt.verify revisa firma y vencimiento; además se exige el type correcto,
// así un refresh no sirve como access ni al revés.
function verificar(token, secreto, tipo) {
  const payload = jwt.verify(token, secreto, { algorithms: [ALGORITMO] });
  if (payload.type !== tipo) {
    throw new jwt.JsonWebTokenError(`Se esperaba un ${tipo} token`);
  }
  return payload;
}

function verificarAccess(token) {
  return verificar(token, config.accessSecret, 'access');
}

function verificarRefresh(token) {
  return verificar(token, config.refreshSecret, 'refresh');
}

// En la base se guarda el SHA-256 del refresh, nunca el token en claro.
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = { firmarAccess, firmarRefresh, verificarAccess, verificarRefresh, hashToken };
