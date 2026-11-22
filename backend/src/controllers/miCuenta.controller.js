const servicio = require('../services/miCuenta.service');
const responder = require('../utils/responder');

module.exports = {
  resumen: responder((req) => servicio.resumen(req.usuario)),
  actualizar: responder((req) => servicio.actualizar(req.usuario, req.body), 200, 'Datos de contacto actualizados'),
  movimientos: responder((req) => servicio.movimientos(req.usuario)),
  compras: responder((req) => servicio.compras(req.usuario)),
  compra: responder((req) => servicio.compra(req.params.id)),
};
