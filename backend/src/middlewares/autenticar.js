const pool = require('../config/db');
const HttpError = require('../utils/httpError');
const { verificarAccess } = require('../utils/tokens');

// Exige un access token válido en el encabezado Authorization: Bearer <token>.
// Falta, formato malo, firma inválida, vencido o de tipo refresh: 401.
// Si pasa, deja en req.usuario el id, el rol y el cliente del usuario.
async function autenticar(req, res, next) {
  try {
    const encabezado = req.get('authorization');
    if (!encabezado) {
      throw new HttpError(401, 'No se envió el token de acceso');
    }

    const partes = encabezado.trim().split(/\s+/);
    if (partes.length !== 2 || partes[0].toLowerCase() !== 'bearer') {
      throw new HttpError(401, 'Formato de autorización inválido: use "Bearer <token>"');
    }

    let payload;
    try {
      payload = verificarAccess(partes[1]);
    } catch (error) {
      throw new HttpError(401, error.name === 'TokenExpiredError'
        ? 'El token de acceso venció'
        : 'Token de acceso inválido');
    }

    // El rol se lee de la base y no del token: si el administrador cambia
    // el rol o desactiva la cuenta, aplica desde la siguiente petición.
    const { rows } = await pool.query(
      `SELECT usuario_id, nombre_usuario, rol_codigo, cliente_id, activo, eliminado_en, clave_cambiada_en
         FROM usuario WHERE usuario_id = $1`,
      [Number(payload.sub)],
    );
    const usuario = rows[0];
    if (!usuario || !usuario.activo || usuario.eliminado_en) {
      throw new HttpError(401, 'La cuenta ya no está activa');
    }
    // Un access emitido antes del último cambio de clave ya no sirve.
    const emitido = Number.isFinite(payload.emitido) ? payload.emitido : payload.iat * 1000;
    if (usuario.clave_cambiada_en && emitido < new Date(usuario.clave_cambiada_en).getTime()) {
      throw new HttpError(401, 'La clave cambió; inicie sesión de nuevo');
    }

    req.usuario = {
      id: usuario.usuario_id,
      nombreUsuario: usuario.nombre_usuario,
      rol: usuario.rol_codigo,
      clienteId: usuario.cliente_id,
    };
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = autenticar;
