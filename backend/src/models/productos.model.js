const pool = require('../config/db');

// Los listados traen también el nombre de la categoría.
const SELECT_PRODUCTO = `
  SELECT p.*, c.nombre AS categoria
  FROM producto p
  JOIN categoria c ON c.categoria_id = p.categoria_id`;

async function listar() {
  const { rows } = await pool.query(`${SELECT_PRODUCTO} ORDER BY p.producto_id`);
  return rows;
}

async function obtenerPorId(id) {
  const { rows } = await pool.query(`${SELECT_PRODUCTO} WHERE p.producto_id = $1`, [id]);
  return rows[0] || null;
}

async function crear({ nombre, categoria_id, descripcion, es_cortable, activo }) {
  const { rows } = await pool.query(
    `INSERT INTO producto (nombre, categoria_id, descripcion, es_cortable, activo)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [nombre, categoria_id, descripcion, es_cortable, activo],
  );
  return rows[0];
}

async function actualizar(id, { nombre, categoria_id, descripcion, es_cortable, activo }) {
  const { rows } = await pool.query(
    `UPDATE producto SET nombre = $1, categoria_id = $2, descripcion = $3, es_cortable = $4, activo = $5
     WHERE producto_id = $6 RETURNING *`,
    [nombre, categoria_id, descripcion, es_cortable, activo, id],
  );
  return rows[0] || null;
}

async function eliminar(id) {
  const { rows } = await pool.query('DELETE FROM producto WHERE producto_id = $1 RETURNING *', [id]);
  return rows[0] || null;
}

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar };
