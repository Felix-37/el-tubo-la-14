const pool = require('../config/db');

// Los listados traen también el nombre del producto y del calibre.
const SELECT_PRESENTACION = `
  SELECT pr.*, p.nombre AS producto, ca.nombre AS calibre
  FROM presentacion pr
  JOIN producto p ON p.producto_id = pr.producto_id
  LEFT JOIN calibre ca ON ca.calibre_id = pr.calibre_id`;

const CAMPOS = [
  'producto_id', 'referencia', 'codigo_barras', 'medida', 'calibre_id', 'largo_fabrica_cm',
  'precio_venta', 'costo', 'existencia', 'existencia_minima', 'activo',
];

async function listar() {
  const { rows } = await pool.query(`${SELECT_PRESENTACION} ORDER BY pr.presentacion_id`);
  return rows;
}

async function obtenerPorId(id) {
  const { rows } = await pool.query(`${SELECT_PRESENTACION} WHERE pr.presentacion_id = $1`, [id]);
  return rows[0] || null;
}

async function crear(datos) {
  const valores = CAMPOS.map((campo) => datos[campo]);
  const marcadores = CAMPOS.map((_, i) => `$${i + 1}`).join(', ');
  const { rows } = await pool.query(
    `INSERT INTO presentacion (${CAMPOS.join(', ')}) VALUES (${marcadores}) RETURNING *`,
    valores,
  );
  return rows[0];
}

async function actualizar(id, datos) {
  const valores = CAMPOS.map((campo) => datos[campo]);
  const asignaciones = CAMPOS.map((campo, i) => `${campo} = $${i + 1}`).join(', ');
  const { rows } = await pool.query(
    `UPDATE presentacion SET ${asignaciones} WHERE presentacion_id = $${CAMPOS.length + 1} RETURNING *`,
    [...valores, id],
  );
  return rows[0] || null;
}

async function eliminar(id) {
  const { rows } = await pool.query('DELETE FROM presentacion WHERE presentacion_id = $1 RETURNING *', [id]);
  return rows[0] || null;
}

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar };
