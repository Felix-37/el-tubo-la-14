const { Router } = require('express');
const controlador = require('../controllers/ventas.controller');
const autenticar = require('../middlewares/autenticar');
const { autorizar, propietarioDelRegistro } = require('../middlewares/autorizar');
const { duenos } = require('../models/ventas.model');

const router = Router();

// Funcionalidad exclusiva del CAJERO: registrar ventas (con su caja).
// El ADMIN solo consulta; el CLIENTE no tiene acceso (ve sus compras en /mi-cuenta).
router.use(autenticar);

// Dueño de una venta: el cajero que la registró.
const cajeroDeLaVenta = propietarioDelRegistro(
  async (id) => { const d = await duenos(id); return d ? d.usuario_id : undefined; },
  { nombre: 'venta' },
);

router.get('/caja', autorizar('CAJERO', 'ADMIN'), controlador.cajaActual);
router.post('/caja/abrir', autorizar('CAJERO'), controlador.abrirCaja);
router.post('/caja/cerrar', autorizar('CAJERO'), controlador.cerrarCaja);
router.get('/clientes', autorizar('CAJERO'), controlador.clientes);

router.get('/', autorizar('CAJERO', 'ADMIN'), controlador.listar);
router.get('/:id', autorizar('CAJERO', 'ADMIN'), cajeroDeLaVenta, controlador.obtener);
router.post('/', autorizar('CAJERO'), controlador.registrar);

module.exports = router;
