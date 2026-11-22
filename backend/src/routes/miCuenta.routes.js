const { Router } = require('express');
const controlador = require('../controllers/miCuenta.controller');
const autenticar = require('../middlewares/autenticar');
const { autorizar, propietarioDelRegistro } = require('../middlewares/autorizar');
const { duenos } = require('../models/ventas.model');

const router = Router();

// Funcionalidad exclusiva del CLIENTE (cerrajero): su cuenta, su cartera
// y sus compras. Los demás roles reciben 403.
router.use(autenticar, autorizar('CLIENTE'));

// Dueño de una compra: el cliente de la venta. Aquí no hay excepción para ADMIN.
const clienteDeLaCompra = propietarioDelRegistro(
  async (id) => { const d = await duenos(id); return d ? d.cliente_id : undefined; },
  { de: (req) => req.usuario.clienteId, conAdmin: false, nombre: 'compra' },
);

router.get('/', controlador.resumen);
router.put('/', controlador.actualizar);
router.get('/movimientos', controlador.movimientos);
router.get('/compras', controlador.compras);
router.get('/compras/:id', clienteDeLaCompra, controlador.compra);

module.exports = router;
