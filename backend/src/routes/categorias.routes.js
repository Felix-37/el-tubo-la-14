const { Router } = require('express');
const controlador = require('../controllers/categorias.controller');
const autenticar = require('../middlewares/autenticar');
const { autorizar } = require('../middlewares/autorizar');

const router = Router();

// Todo el catálogo exige sesión. Consultar: los tres roles.
// Crear, editar y eliminar: solo ADMIN (su funcionalidad exclusiva).
router.use(autenticar);

router.get('/', autorizar('ADMIN', 'CAJERO', 'CLIENTE'), controlador.listar);
router.get('/:id', autorizar('ADMIN', 'CAJERO', 'CLIENTE'), controlador.obtener);
router.post('/', autorizar('ADMIN'), controlador.crear);
router.put('/:id', autorizar('ADMIN'), controlador.actualizar);
router.delete('/:id', autorizar('ADMIN'), controlador.eliminar);

module.exports = router;