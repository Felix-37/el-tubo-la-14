const pool = require('../config/db');

const SELECT_VENTA = `
  SELECT v.venta_id, v.numero_venta, v.fecha, v.caja_id,
         v.usuario_id, u.nombre_completo AS cajero,
         v.cliente_id, c.nombre AS cliente,
         v.forma_pago_codigo AS forma_pago, fp.nombre AS forma_pago_nombre,
         v.subtotal, v.descuento, v.total, v.valor_recibido, v.cambio,
         v.observacion, v.estado,
         (SELECT count(*)::int FROM venta_detalle d WHERE d.venta_id = v.venta_id) AS numero_lineas
    FROM venta v
    JOIN usuario u ON u.usuario_id = v.usuario_id
    JOIN forma_pago fp ON fp.forma_pago_codigo = v.forma_pago_codigo
    LEFT JOIN cliente c ON c.cliente_id = v.cliente_id`;

// Filtros opcionales: ventas de un cajero o compras de un cliente.
async function listar({ usuarioId = null, clienteId = null } = {}) {
  const { rows } = await pool.query(
    `${SELECT_VENTA}
      WHERE ($1::bigint IS NULL OR v.usuario_id = $1)
        AND ($2::bigint IS NULL OR v.cliente_id = $2)
      ORDER BY v.fecha DESC, v.venta_id DESC`,
    [usuarioId, clienteId],
  );
  return rows;
}

async function obtener(id, cliente = pool) {
  const { rows } = await cliente.query(`${SELECT_VENTA} WHERE v.venta_id = $1`, [id]);
  if (!rows[0]) return null;
  const detalle = await cliente.query(
    `SELECT d.linea, d.presentacion_id, p.referencia, d.descripcion, d.cantidad,
            d.precio_unitario, d.valor
       FROM venta_detalle d JOIN presentacion p ON p.presentacion_id = d.presentacion_id
      WHERE d.venta_id = $1 ORDER BY d.linea`,
    [id],
  );
  return { ...rows[0], lineas: detalle.rows };
}

// Dueños de una venta, para las reglas de propiedad.
async function duenos(id) {
  const { rows } = await pool.query('SELECT usuario_id, cliente_id FROM venta WHERE venta_id = $1', [id]);
  return rows[0] || null;
}

// Consecutivo sin huecos: la fila queda bloqueada hasta el COMMIT.
async function siguienteNumero(cliente) {
  const { rows } = await cliente.query(
    "UPDATE consecutivo SET ultimo_numero = ultimo_numero + 1 WHERE nombre = 'VENTA' RETURNING ultimo_numero",
  );
  return rows[0].ultimo_numero;
}

// Presentaciones de la venta, bloqueadas para descontar existencia sin carreras.
async function presentacionesParaVenta(ids, cliente) {
  const { rows } = await cliente.query(
    `SELECT p.presentacion_id, p.referencia, p.medida, p.precio_venta, p.existencia,
            p.activo AND pr.activo AS activa, pr.nombre AS producto, pr.es_cortable
       FROM presentacion p JOIN producto pr ON pr.producto_id = p.producto_id
      WHERE p.presentacion_id = ANY($1::bigint[])
      ORDER BY p.presentacion_id
      FOR UPDATE OF p`,
    [ids],
  );
  return rows;
}

// Cliente con su saldo. Primero se bloquea la fila del cliente y después,
// en otra sentencia, se suma la cartera: en READ COMMITTED cada sentencia
// toma una foto nueva, así que si otra venta a crédito del mismo cliente
// acaba de confirmar su cargo, aquí ya se ve y el cupo no se pasa.
// (Si la suma fuera en la misma sentencia del FOR UPDATE, usaría la foto
// tomada antes de esperar el candado y no vería ese cargo.)
async function clienteParaVenta(clienteId, cliente) {
  const { rows } = await cliente.query(
    'SELECT cliente_id, nombre, activo, cupo_credito FROM cliente WHERE cliente_id = $1 FOR UPDATE',
    [clienteId],
  );
  if (!rows[0]) return null;
  const saldo = await cliente.query(
    `SELECT COALESCE(sum(CASE WHEN tipo IN ('CARGO', 'SALDO_INICIAL') THEN valor ELSE -valor END), 0) AS saldo
       FROM movimiento_cartera WHERE cliente_id = $1`,
    [clienteId],
  );
  return { ...rows[0], saldo: saldo.rows[0].saldo };
}

async function insertarVenta(v, cliente) {
  const { rows } = await cliente.query(
    `INSERT INTO venta (numero_venta, caja_id, usuario_id, cliente_id, forma_pago_codigo,
                        subtotal, total, valor_recibido, cambio, observacion)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING venta_id`,
    [v.numero, v.cajaId, v.usuarioId, v.clienteId, v.formaPago, v.subtotal, v.total, v.recibido, v.cambio, v.observacion],
  );
  return rows[0].venta_id;
}

async function insertarLinea(ventaId, l, usuarioId, cliente) {
  await cliente.query(
    `INSERT INTO venta_detalle (venta_id, linea, tipo_linea, presentacion_id, descripcion, cantidad, precio_unitario, valor)
     VALUES ($1, $2, 'MATERIAL', $3, $4, $5, $6, $7)`,
    [ventaId, l.linea, l.presentacion_id, l.descripcion, l.cantidad, l.precio_unitario, l.valor],
  );
  await cliente.query(
    'UPDATE presentacion SET existencia = existencia - $2 WHERE presentacion_id = $1',
    [l.presentacion_id, l.cantidad],
  );
  await cliente.query(
    `INSERT INTO movimiento_inventario (tipo, presentacion_id, cantidad, usuario_id, motivo, venta_id)
     VALUES ('VENTA', $1, $2, $3, $4, $5)`,
    [l.presentacion_id, -l.cantidad, usuarioId, `Venta ${ventaId}`, ventaId],
  );
}

async function cargarCartera(clienteId, valor, ventaId, usuarioId, numero, cliente) {
  await cliente.query(
    `INSERT INTO movimiento_cartera (cliente_id, tipo, valor, venta_id, usuario_id, observacion)
     VALUES ($1, 'CARGO', $2, $3, $4, $5)`,
    [clienteId, valor, ventaId, usuarioId, `Venta a crédito N.º ${numero}`],
  );
}

// Clientes activos con su cupo disponible, para elegir en la venta.
async function clientesParaVenta() {
  const { rows } = await pool.query(
    `SELECT c.cliente_id, c.nombre, c.documento, c.clasificacion, v.cupo_credito, v.saldo, v.cupo_disponible
       FROM cliente c JOIN v_cartera_cliente v ON v.cliente_id = c.cliente_id
      WHERE c.activo ORDER BY c.nombre`,
  );
  return rows;
}

module.exports = {
  listar, obtener, duenos, siguienteNumero, presentacionesParaVenta, clienteParaVenta,
  insertarVenta, insertarLinea, cargarCartera, clientesParaVenta,
};
