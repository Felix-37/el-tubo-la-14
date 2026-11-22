const pool = require('../config/db');

// Ejecuta fn(cliente) dentro de BEGIN/COMMIT. Si algo falla, ROLLBACK y
// el error sigue su camino. La conexión siempre se devuelve al pool.
async function enTransaccion(fn) {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    const resultado = await fn(cliente);
    await cliente.query('COMMIT');
    return resultado;
  } catch (error) {
    await cliente.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    cliente.release();
  }
}

module.exports = { enTransaccion };
