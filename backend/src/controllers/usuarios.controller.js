const servicio = require('../services/usuarios.service');
const responder = require('../utils/responder');

module.exports = {
  listar: responder((req) => servicio.listar(req.query)),
  clientesDisponibles: responder(() => servicio.clientesDisponibles()),
  obtener: responder((req) => servicio.obtener(req.params.id)),
  crear: responder((req) => servicio.crear(req.usuario, req.body, req.ip), 201, 'Usuario creado'),
  actualizar: responder((req) => servicio.actualizarPorId(req.usuario, req.params.id, req.body, req.ip), 200, 'Usuario actualizado'),
  // Perfil propio: el id sale del token, no de la URL.
  perfil: responder((req) => servicio.obtener(String(req.usuario.id))),
  actualizarPerfil: responder((req) => servicio.actualizar(req.usuario, req.usuario.id, req.body, req.ip), 200, 'Perfil actualizado'),
  cambiarRol: responder((req) => servicio.cambiarRol(req.usuario, req.params.id, req.body, req.ip), 200, 'Rol actualizado'),
  cambiarEstado: responder((req) => servicio.cambiarEstado(req.usuario, req.params.id, req.body, req.ip), 200, 'Estado actualizado'),
  eliminar: responder((req) => servicio.eliminar(req.usuario, req.params.id, req.ip), 200, 'Usuario eliminado'),
};
