require('dotenv').config();

const { enteroRequerido } = require('./config/env');
const app = require('./app');

const PORT = enteroRequerido('PORT');

app.listen(PORT, () => {
  console.log(`API de El Tubo La 14 escuchando en http://localhost:${PORT}`);
});
