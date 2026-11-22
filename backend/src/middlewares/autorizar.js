const HttpError = require('../utils/httpError');
const { registrarEvento } = require('../utils/bitacora');

async function denegar(req, motivo) {
  await registrarEvento({
    usuarioId: req.usuario.id,
    nombreUsuario: req.usuario.nombreUsuario,
    evento: 'ACCESO_DENEGADO',
    detalle: `${req.method} ${req.originalUrl}: ${motivo}`,
    ip: req.ip,
  });
}

// Deja pasar solo a los roles indicados. Va después de autenticar,
// porque lee req.usuario. Autenticado pero sin permiso: 403.
function autorizar(...rolesPermitidos) {
  return async (req, res, next) => {
    if (!req.usuario) return next(new HttpError(401, 'No se envió el token de acceso'));
    if (rolesPermitidos.includes(req.usuario.rol)) return next();

    await denegar(req, `rol ${req.usuario.rol}`);
    next(new HttpError(403, 'No tiene permiso para esta operación', {
      rolesPermitidos,
      rolActual: req.usuario.rol,
    }));
  };
}

// Propiedad del recurso: el :id de la ruta debe ser el del usuario de la
// sesión. El ADMIN puede actuar sobre cualquier usuario.
function propietarioOAdmin(parametro = 'id') {
  return async (req, res, next) => {
    if (!req.usuario) return next(new HttpError(401, 'No se envió el token de acceso'));
    if (req.usuario.rol === 'ADMIN') return next();
    if (Number(req.params[parametro]) === req.usuario.id) return next();

    await denegar(req, 'recurso de otro usuario');
    next(new HttpError(403, 'Solo puede acceder a su propia información'));
  };
}

// Propiedad de un registro (una venta, una compra): buscarDueno(id) dice
// a quién pertenece el registro del :id. Si no existe: 404. Si no es del
// usuario de la sesión: 403. de(req) es con qué se compara: por defecto el
// id del usuario; para el CLIENTE, su cliente_id. El ADMIN puede consultar
// todo si conAdmin es true.
function propietarioDelRegistro(buscarDueno, { de = (req) => req.usuario.id, conAdmin = true, nombre = 'registro' } = {}) {
  return async (req, res, next) => {
    try {
      if (!req.usuario) throw new HttpError(401, 'No se envió el token de acceso');
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        throw new HttpError(400, 'El id debe ser un número entero positivo', { id: req.params.id });
      }
      const dueno = await buscarDueno(id);
      if (dueno === undefined) throw new HttpError(404, `No existe el ${nombre} con id ${id}`);
      if (conAdmin && req.usuario.rol === 'ADMIN') return next();
      if (dueno !== null && dueno === de(req)) return next();

      await denegar(req, `${nombre} de otro usuario`);
      throw new HttpError(403, `Solo puede consultar sus propios registros (${nombre} ${id})`);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { autorizar, propietarioOAdmin, propietarioDelRegistro };
