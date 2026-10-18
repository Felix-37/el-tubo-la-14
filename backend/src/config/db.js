const { Pool, types } = require('pg');

// Por defecto pg entrega BIGINT y NUMERIC como texto; aquí se convierten a número.
types.setTypeParser(20, (valor) => Number(valor)); // BIGINT (ids)
types.setTypeParser(1700, (valor) => Number(valor)); // NUMERIC (precios y tarifas)

// Los datos de conexión vienen del archivo .env, nunca del código.
const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Si la base cierra una conexión que estaba libre (por ejemplo, al reiniciarse),
// se registra el error en lugar de tumbar el servidor.
pool.on('error', (error) => {
  console.error('Conexión con la base interrumpida:', error.message);
});

module.exports = pool;
