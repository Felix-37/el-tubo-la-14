const pool = require('../config/db');

// Columnas del usuario que necesita la autenticación (incluye el hash,
// por eso estas filas nunca salen tal cual en una respuesta).
const COLUMNAS_USUARIO = `usuario_id, nombre_usuario, nombre_completo, correo, rol_codigo,
  cliente_id, hash_clave, activo, eliminado_en, intentos_fallidos, bloqueado_hasta`;

// Se puede entrar con el nombre de usuario o con el correo.
async function buscarPorLogin(login) {
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS_USUARIO} FROM usuario
      WHERE nombre_usuario = $1 OR lower(correo) = lower($1)
      ORDER BY (nombre_usuario = $1) DESC
      LIMIT 1`,
    [login],
  );
  return rows[0] || null;
}

async function buscarPorId(id, cliente = pool) {
  const { rows } = await cliente.query(`SELECT ${COLUMNAS_USUARIO} FROM usuario WHERE usuario_id = $1`, [id]);
  return rows[0] || null;
}

async function leerParametro(clave, porDefecto) {
  const { rows } = await pool.query('SELECT valor_numero FROM parametro WHERE clave = $1', [clave]);
  return rows[0] && rows[0].valor_numero !== null ? Number(rows[0].valor_numero) : porDefecto;
}

// Suma un intento fallido y devuelve cuántos lleva seguidos.
async function sumarIntentoFallido(id) {
  const { rows } = await pool.query(
    `UPDATE usuario SET intentos_fallidos = intentos_fallidos + 1
      WHERE usuario_id = $1 RETURNING intentos_fallidos`,
    [id],
  );
  return rows[0].intentos_fallidos;
}

async function bloquear(id, minutos) {
  await pool.query(
    `UPDATE usuario SET intentos_fallidos = 0,
            bloqueado_hasta = now() + make_interval(mins => $2)
      WHERE usuario_id = $1`,
    [id, minutos],
  );
}

// Registra el ingreso solo si la cuenta no quedó bloqueada mientras se
// comparaba la clave (otra petición simultánea pudo bloquearla).
// Devuelve false si estaba bloqueada.
async function registrarIngreso(id) {
  const { rowCount } = await pool.query(
    `UPDATE usuario SET ultimo_ingreso = now(), intentos_fallidos = 0, bloqueado_hasta = NULL
      WHERE usuario_id = $1 AND (bloqueado_hasta IS NULL OR bloqueado_hasta <= now())`,
    [id],
  );
  return rowCount === 1;
}

async function guardarRefresh({ jti, usuarioId, familiaId, tokenHash, expiraEn, ip, userAgent }, cliente = pool) {
  await cliente.query(
    `INSERT INTO refresh_token (jti, usuario_id, familia_id, token_hash, expira_en, direccion_ip, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [jti, usuarioId, familiaId, tokenHash, expiraEn, ip, userAgent],
  );
}

// FOR UPDATE: si llegan dos renovaciones con el mismo token a la vez,
// la segunda espera y luego lo encuentra revocado.
async function buscarRefreshParaRotar(jti, cliente) {
  const { rows } = await cliente.query('SELECT * FROM refresh_token WHERE jti = $1 FOR UPDATE', [jti]);
  return rows[0] || null;
}

async function marcarReemplazado(jtiViejo, jtiNuevo, cliente) {
  await cliente.query(
    'UPDATE refresh_token SET revocado_en = now(), reemplazado_por = $2 WHERE jti = $1',
    [jtiViejo, jtiNuevo],
  );
}

async function revocarFamilia(familiaId, cliente = pool) {
  await cliente.query(
    'UPDATE refresh_token SET revocado_en = now() WHERE familia_id = $1 AND revocado_en IS NULL',
    [familiaId],
  );
}

// Cierre de sesión: revoca toda la familia del refresh recibido, así
// también muere el refresh vigente si el que llegó ya había sido rotado.
async function revocarSesion(jti, tokenHash) {
  const { rows } = await pool.query(
    `UPDATE refresh_token SET revocado_en = now()
      WHERE revocado_en IS NULL
        AND familia_id = (SELECT familia_id FROM refresh_token WHERE jti = $1 AND token_hash = $2)
      RETURNING usuario_id`,
    [jti, tokenHash],
  );
  return rows[0] || null;
}

// Se usa al cambiar la clave, el rol o el estado de un usuario.
async function revocarTodasDelUsuario(usuarioId, cliente = pool) {
  await cliente.query(
    'UPDATE refresh_token SET revocado_en = now() WHERE usuario_id = $1 AND revocado_en IS NULL',
    [usuarioId],
  );
}

module.exports = {
  buscarPorLogin, buscarPorId, leerParametro, sumarIntentoFallido, bloquear, registrarIngreso,
  guardarRefresh, buscarRefreshParaRotar, marcarReemplazado, revocarFamilia, revocarSesion,
  revocarTodasDelUsuario,
};
