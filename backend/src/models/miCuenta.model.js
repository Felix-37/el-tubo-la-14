const pool = require('../config/db');

// Ficha del cliente con su cartera (saldo y cupo disponible).
async function ficha(clienteId) {
  const { rows } = await pool.query(
    `SELECT c.cliente_id, c.nombre, c.documento, c.telefono, c.correo, c.direccion,
            c.clasificacion, c.tope_descuento_pct, v.cupo_credito, v.saldo, v.cupo_disponible
       FROM cliente c JOIN v_cartera_cliente v ON v.cliente_id = c.cliente_id
      WHERE c.cliente_id = $1`,
    [clienteId],
  );
  return rows[0] || null;
}

async function actualizarContacto(clienteId, { telefono, correo, direccion }) {
  await pool.query(
    'UPDATE cliente SET telefono = $2, correo = $3, direccion = $4 WHERE cliente_id = $1',
    [clienteId, telefono, correo, direccion],
  );
}

// Cargos, saldo inicial, abonos y reversos de la cartera del cliente.
async function movimientos(clienteId) {
  const { rows } = await pool.query(
    `SELECT m.movimiento_id, m.fecha, m.tipo, m.valor, m.forma_pago_codigo AS forma_pago,
            v.numero_venta, m.observacion
       FROM movimiento_cartera m LEFT JOIN venta v ON v.venta_id = m.venta_id
      WHERE m.cliente_id = $1
      ORDER BY m.fecha DESC, m.movimiento_id DESC`,
    [clienteId],
  );
  return rows;
}

module.exports = { ficha, actualizarContacto, movimientos };
