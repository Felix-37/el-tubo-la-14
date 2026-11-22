const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const usuariosRoutes = require('./routes/usuarios.routes');
const perfilRoutes = require('./routes/perfil.routes');
const ventasRoutes = require('./routes/ventas.routes');
const miCuentaRoutes = require('./routes/miCuenta.routes');
const categoriasRoutes = require('./routes/categorias.routes');
const calibresRoutes = require('./routes/calibres.routes');
const productosRoutes = require('./routes/productos.routes');
const presentacionesRoutes = require('./routes/presentaciones.routes');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/perfil', perfilRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/mi-cuenta', miCuentaRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/calibres', calibresRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/presentaciones', presentacionesRoutes);

// Si ninguna ruta atendió la solicitud, responde 404.
app.use(notFound);
// Todos los errores salen con el mismo formato JSON.
app.use(errorHandler);

module.exports = app;
