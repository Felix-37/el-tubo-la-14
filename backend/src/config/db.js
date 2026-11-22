const { Pool, types } = require('pg');
const { requerida, enteroRequerido } = require('./env');

// Por defecto pg entrega BIGINT y NUMERIC como texto; aquí se convierten a número.
types.setTypeParser(20, (valor) => Number(valor)); // BIGINT (ids)
types.setTypeParser(1700, (valor) => Number(valor)); // NUMERIC (precios y tarifas)

// Los datos de conexión vienen del archivo .env, nunca del código.
// Si falta alguno, el servidor no arranca.
const pool = new Pool({
  host: requerida('DB_HOST'),
  port: enteroRequerido('DB_PORT'),
  user: requerida('DB_USER'),
  password: requerida('DB_PASSWORD'),
  database: requerida('DB_NAME'),
});

// Si la base cierra una conexión que estaba libre (por ejemplo, al reiniciarse),
// se registra el error en lugar de tumbar el servidor.
pool.on('error', (error) => {
  console.error('Conexión con la base interrumpida:', error.message);
});

module.exports = pool;
