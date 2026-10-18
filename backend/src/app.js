const express = require('express');
const cors = require('cors');

const categoriasRoutes = require('./routes/categorias.routes');
const calibresRoutes = require('./routes/calibres.routes');
const productosRoutes = require('./routes/productos.routes');
const presentacionesRoutes = require('./routes/presentaciones.routes');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/categorias', categoriasRoutes);
app.use('/api/calibres', calibresRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/presentaciones', presentacionesRoutes);

// Si ninguna ruta atendió la solicitud, responde 404.
app.use(notFound);
// Todos los errores salen con el mismo formato JSON.
app.use(errorHandler);

module.exports = app;
