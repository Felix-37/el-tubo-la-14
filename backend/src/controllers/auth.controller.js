const servicio = require('../services/auth.service');

// IP y navegador de quien pide, para la bitácora y la tabla refresh_token.
function contexto(req) {
  const agente = req.get('user-agent');
  return { ip: req.ip, userAgent: agente ? agente.slice(0, 300) : null };
}

async function login(req, res, next) {
  try {
    const sesion = await servicio.login(req.body, contexto(req));
    res.status(200).json({ ok: true, mensaje: 'Sesión iniciada', data: sesion });
  } catch (error) {
    next(error);
  }
}

async function refrescar(req, res, next) {
  try {
    const sesion = await servicio.refrescar(req.body, contexto(req));
    res.status(200).json({ ok: true, mensaje: 'Sesión renovada', data: sesion });
  } catch (error) {
    next(error);
  }
}

async function cerrarSesion(req, res, next) {
  try {
    await servicio.cerrarSesion(req.body, contexto(req));
    res.status(200).json({ ok: true, mensaje: 'Sesión cerrada', data: null });
  } catch (error) {
    next(error);
  }
}

async function perfil(req, res, next) {
  try {
    const usuario = await servicio.perfil(req.usuario.id);
    res.status(200).json({ ok: true, data: usuario });
  } catch (error) {
    next(error);
  }
}

module.exports = { login, refrescar, cerrarSesion, perfil };
