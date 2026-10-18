const pool = require('../config/db');

async function listar() {
  const { rows } = await pool.query('SELECT * FROM calibre ORDER BY calibre_id');
  return rows;
}

async function obtenerPorId(id) {
  const { rows } = await pool.query('SELECT * FROM calibre WHERE calibre_id = $1', [id]);
  return rows[0] || null;
}

async function crear({ nombre, descripcion, tarifa_corte, activo }) {
  const { rows } = await pool.query(
    `INSERT INTO calibre (nombre, descripcion, tarifa_corte, activo)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [nombre, descripcion, tarifa_corte, activo],
  );
  return rows[0];
}

async function actualizar(id, { nombre, descripcion, tarifa_corte, activo }) {
  const { rows } = await pool.query(
    `UPDATE calibre SET nombre = $1, descripcion = $2, tarifa_corte = $3, activo = $4
     WHERE calibre_id = $5 RETURNING *`,
    [nombre, descripcion, tarifa_corte, activo, id],
  );
  return rows[0] || null;
}

async function eliminar(id) {
  const { rows } = await pool.query('DELETE FROM calibre WHERE calibre_id = $1 RETURNING *', [id]);
  return rows[0] || null;
}

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar };
