const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const modelo = require('../models/auth.model');
const HttpError = require('../utils/httpError');
const { verificarClave, hashFicticio } = require('../utils/clave');
const tokens = require('../utils/tokens');
const { registrarEvento } = require('../utils/bitacora');

const CREDENCIALES_INVALIDAS = 'Usuario o clave incorrectos';

// Lo que se puede mostrar del usuario: nunca el hash de la clave.
function usuarioPublico(u) {
  return {
    usuario_id: u.usuario_id,
    nombre_usuario: u.nombre_usuario,
    nombre_completo: u.nombre_completo,
    correo: u.correo,
    rol: u.rol_codigo,
    cliente_id: u.cliente_id,
  };
}

function cuentaInactiva(u) {
  return !u.activo || u.eliminado_en !== null;
}

// Crea el par de tokens y guarda el hash del refresh. Un login abre una
// familia nueva; una renovación hereda la familia del refresh anterior.
async function emitirSesion(usuario, contexto, familiaId = crypto.randomUUID(), cliente = pool) {
  const jti = crypto.randomUUID();
  const refreshToken = tokens.firmarRefresh(usuario.usuario_id, jti, familiaId);
  const { exp: expRefresh } = jwt.decode(refreshToken);

  await modelo.guardarRefresh({
    jti,
    usuarioId: usuario.usuario_id,
    familiaId,
    tokenHash: tokens.hashToken(refreshToken),
    expiraEn: new Date(expRefresh * 1000),
    ip: contexto.ip,
    userAgent: contexto.userAgent,
  }, cliente);

  const accessToken = tokens.firmarAccess(usuario);
  const { iat, exp } = jwt.decode(accessToken);

  return {
    jti,
    sesion: {
      accessToken,
      refreshToken,
      tipoToken: 'Bearer',
      expiraEn: exp - iat, // segundos de vida del access token
      usuario: usuarioPublico(usuario),
    },
  };
}

function textoRequerido(valor, campo) {
  if (typeof valor !== 'string' || valor.trim() === '') {
    throw new HttpError(400, 'Datos inválidos', [`El campo "${campo}" es obligatorio`]);
  }
  return valor.trim();
}

async function login(body, contexto) {
  const datos = body && typeof body === 'object' ? body : {};
  const login = textoRequerido(datos.usuario, 'usuario');
  // La clave no se recorta: los espacios también cuentan.
  textoRequerido(datos.clave, 'clave');
  const clave = datos.clave;

  const usuario = await modelo.buscarPorLogin(login);
  // Siempre se ejecuta bcrypt.compare, exista o no el usuario.
  const claveCorrecta = await verificarClave(clave, usuario ? usuario.hash_clave : hashFicticio);

  if (!usuario) {
    await registrarEvento({ nombreUsuario: login, evento: 'INGRESO_FALLIDO', detalle: 'Usuario inexistente', ip: contexto.ip });
    throw new HttpError(401, CREDENCIALES_INVALIDAS);
  }

  const base = { usuarioId: usuario.usuario_id, nombreUsuario: usuario.nombre_usuario, ip: contexto.ip };

  if (usuario.bloqueado_hasta && new Date(usuario.bloqueado_hasta) > new Date()) {
    await registrarEvento({ ...base, evento: 'INGRESO_FALLIDO', detalle: 'Cuenta bloqueada' });
    // Solo quien conoce la clave se entera de que la cuenta está bloqueada.
    throw new HttpError(401, claveCorrecta
      ? 'La cuenta está bloqueada temporalmente por intentos fallidos; intente más tarde'
      : CREDENCIALES_INVALIDAS);
  }

  if (!claveCorrecta) {
    const intentos = await modelo.sumarIntentoFallido(usuario.usuario_id);
    const maximo = await modelo.leerParametro('INTENTOS_BLOQUEO', 5);
    if (intentos >= maximo) {
      const minutos = await modelo.leerParametro('BLOQUEO_MINUTOS', 10);
      await modelo.bloquear(usuario.usuario_id, minutos);
      await registrarEvento({ ...base, evento: 'BLOQUEO', detalle: `${intentos} intentos fallidos; bloqueo de ${minutos} min` });
    } else {
      await registrarEvento({ ...base, evento: 'INGRESO_FALLIDO', detalle: `Clave incorrecta (intento ${intentos})` });
    }
    throw new HttpError(401, CREDENCIALES_INVALIDAS);
  }

  if (cuentaInactiva(usuario)) {
    await registrarEvento({ ...base, evento: 'INGRESO_FALLIDO', detalle: 'Cuenta desactivada' });
    throw new HttpError(401, 'La cuenta está desactivada');
  }

  if (!(await modelo.registrarIngreso(usuario.usuario_id))) {
    // Otra petición simultánea bloqueó la cuenta mientras se comparaba la clave.
    await registrarEvento({ ...base, evento: 'INGRESO_FALLIDO', detalle: 'Cuenta bloqueada' });
    throw new HttpError(401, 'La cuenta está bloqueada temporalmente por intentos fallidos; intente más tarde');
  }
  await registrarEvento({ ...base, evento: 'INGRESO' });
  const { sesion } = await emitirSesion(usuario, contexto);
  return sesion;
}

// Rotación: cada refresh sirve una sola vez. Si llega uno ya usado, se
// revoca toda su familia y el usuario (y el atacante) deben volver a entrar.
async function refrescar(body, contexto) {
  const refreshToken = textoRequerido(body && body.refreshToken, 'refreshToken');

  let payload;
  try {
    payload = tokens.verificarRefresh(refreshToken);
  } catch (error) {
    throw new HttpError(401, error.name === 'TokenExpiredError'
      ? 'El refresh token venció; inicie sesión de nuevo'
      : 'Refresh token inválido');
  }

  const cliente = await pool.connect();
  let reuso = null;
  try {
    await cliente.query('BEGIN');
    const registro = await modelo.buscarRefreshParaRotar(payload.jti, cliente);

    if (!registro || registro.token_hash !== tokens.hashToken(refreshToken)) {
      await cliente.query('ROLLBACK');
      throw new HttpError(401, 'Refresh token no reconocido');
    }

    if (registro.revocado_en && registro.reemplazado_por) {
      // Ya fue rotado: alguien está usando un refresh viejo.
      await modelo.revocarFamilia(registro.familia_id, cliente);
      await cliente.query('COMMIT');
      reuso = registro;
    } else if (registro.revocado_en) {
      // Revocado sin reemplazo: logout, cambio de clave o desactivación.
      await cliente.query('ROLLBACK');
      throw new HttpError(401, 'La sesión fue cerrada; inicie sesión de nuevo');
    } else {
      if (new Date(registro.expira_en) <= new Date()) {
        await cliente.query('ROLLBACK');
        throw new HttpError(401, 'El refresh token venció; inicie sesión de nuevo');
      }

      const usuario = await modelo.buscarPorId(registro.usuario_id, cliente);
      if (!usuario || cuentaInactiva(usuario)) {
        await modelo.revocarFamilia(registro.familia_id, cliente);
        await cliente.query('COMMIT');
        throw new HttpError(401, 'La cuenta está desactivada');
      }

      // Primero se crea el refresh nuevo y luego se marca el viejo como
      // reemplazado por él, todo en la misma transacción.
      const { jti, sesion } = await emitirSesion(usuario, contexto, registro.familia_id, cliente);
      await modelo.marcarReemplazado(registro.jti, jti, cliente);
      await cliente.query('COMMIT');
      return sesion;
    }
  } catch (error) {
    if (!(error instanceof HttpError)) await cliente.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    cliente.release();
  }

  await registrarEvento({
    usuarioId: reuso.usuario_id,
    evento: 'REUSO_TOKEN',
    detalle: `Refresh ${reuso.jti} reutilizado; familia ${reuso.familia_id} revocada`,
    ip: contexto.ip,
  });
  throw new HttpError(401, 'Se detectó la reutilización de un refresh token; inicie sesión de nuevo');
}

async function cerrarSesion(body, contexto) {
  const refreshToken = textoRequerido(body && body.refreshToken, 'refreshToken');

  let payload;
  try {
    payload = tokens.verificarRefresh(refreshToken);
  } catch (error) {
    // Un refresh vencido ya no sirve para nada: la sesión ya está cerrada.
    if (error.name === 'TokenExpiredError') return;
    throw new HttpError(401, 'Refresh token inválido');
  }

  const revocado = await modelo.revocarSesion(payload.jti, tokens.hashToken(refreshToken));
  if (revocado) {
    await registrarEvento({ usuarioId: revocado.usuario_id, evento: 'CIERRE_SESION', ip: contexto.ip });
  }
}

async function perfil(usuarioId) {
  const usuario = await modelo.buscarPorId(usuarioId);
  if (!usuario) throw new HttpError(404, 'El usuario no existe');
  return usuarioPublico(usuario);
}

module.exports = { login, refrescar, cerrarSesion, perfil, usuarioPublico };
