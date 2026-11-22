const ventas = require('../services/ventas.service');
const caja = require('../services/caja.service');
const responder = require('../utils/responder');

module.exports = {
  cajaActual: responder(() => caja.actual()),
  abrirCaja: responder((req) => caja.abrir(req.usuario, req.body), 201, 'Caja abierta'),
  cerrarCaja: responder((req) => caja.cerrar(req.usuario, req.body), 200, 'Caja cerrada'),
  clientes: responder(() => ventas.clientes()),
  listar: responder((req) => ventas.listar(req.usuario)),
  obtener: responder((req) => ventas.obtener(req.params.id)),
  registrar: responder((req) => ventas.registrar(req.usuario, req.body), 201, 'Venta registrada'),
};
