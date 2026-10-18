const pool = require('../config/db');

async function listar() {
  const { rows } = await pool.query('SELECT * FROM categoria ORDER BY categoria_id');
  return rows;
}

async function obtenerPorId(id) {
  const { rows } = await pool.query('SELECT * FROM categoria WHERE categoria_id = $1', [id]);
  return rows[0] || null;
}

async function crear({ nombre, activo }) {
  const { rows } = await pool.query(
    'INSERT INTO categoria (nombre, activo) VALUES ($1, $2) RETURNING *',
    [nombre, activo],
  );
  return rows[0];
}

async function actualizar(id, { nombre, activo }) {
  const { rows } = await pool.query(
    'UPDATE categoria SET nombre = $1, activo = $2 WHERE categoria_id = $3 RETURNING *',
    [nombre, activo, id],
  );
  return rows[0] || null;
}

async function eliminar(id) {
  const { rows } = await pool.query('DELETE FROM categoria WHERE categoria_id = $1 RETURNING *', [id]);
  return rows[0] || null;
}

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar };
