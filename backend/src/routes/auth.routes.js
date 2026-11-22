const { Router } = require('express');
const controlador = require('../controllers/auth.controller');
const autenticar = require('../middlewares/autenticar');
const limitarIntentos = require('../middlewares/limitarIntentos');
const { loginPorMinuto } = require('../config/auth');

const router = Router();

// Por IP y por minuto: los logins que diga el .env y el triple de renovaciones.
const limiteLogin = limitarIntentos({ maximo: loginPorMinuto, ventanaMs: 60 * 1000 });
const limiteRefresh = limitarIntentos({ maximo: loginPorMinuto * 3, ventanaMs: 60 * 1000 });

// Públicas: no llevan access token. El refresh viaja en el body.
router.post('/login', limiteLogin, controlador.login);
router.post('/refresh', limiteRefresh, controlador.refrescar);
router.post('/logout', controlador.cerrarSesion);

// Datos del usuario de la sesión actual.
router.get('/yo', autenticar, controlador.perfil);

module.exports = router;
