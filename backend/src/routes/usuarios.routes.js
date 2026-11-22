const { Router } = require('express');
const controlador = require('../controllers/usuarios.controller');
const autenticar = require('../middlewares/autenticar');
const { autorizar } = require('../middlewares/autorizar');

const router = Router();

// Gestión de usuarios: módulo exclusivo del ADMIN (enunciado 3.2).
// Cadena: autenticar (401) -> autorizar('ADMIN') (403) -> controlador.
router.use(autenticar, autorizar('ADMIN'));

router.get('/', controlador.listar);
router.get('/clientes-disponibles', controlador.clientesDisponibles);
router.post('/', controlador.crear);
router.get('/:id', controlador.obtener);
router.put('/:id', controlador.actualizar);
router.patch('/:id/rol', controlador.cambiarRol);
router.patch('/:id/estado', controlador.cambiarEstado);
router.delete('/:id', controlador.eliminar);

module.exports = router;
