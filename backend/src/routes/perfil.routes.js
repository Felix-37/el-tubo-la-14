const { Router } = require('express');
const controlador = require('../controllers/usuarios.controller');
const autenticar = require('../middlewares/autenticar');
const limitarIntentos = require('../middlewares/limitarIntentos');

const router = Router();

// Perfil propio, para cualquier rol: el usuario solo ve y edita sus datos
// porque el id sale del token, no de la URL. Para cambiar la clave debe
// enviar la actual; se limita por IP para frenar la fuerza bruta.
const limiteCambios = limitarIntentos({ maximo: 10, ventanaMs: 60 * 1000 });

router.use(autenticar);
router.get('/', controlador.perfil);
router.put('/', limiteCambios, controlador.actualizarPerfil);

module.exports = router;
