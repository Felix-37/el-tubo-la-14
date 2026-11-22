const pool = require('../config/db');

const SELECT_CAJA = `
  SELECT c.caja_id, c.estado, c.fecha_apertura, c.base_inicial,
         c.abierta_por_id, ua.nombre_completo AS abierta_por,
         c.fecha_cierre, c.cerrada_por_id, uc.nombre_completo AS cerrada_por,
         c.efectivo_esperado, c.efectivo_contado, c.diferencia, c.observacion
    FROM caja c
    JOIN usuario ua ON ua.usuario_id = c.abierta_por_id
    LEFT JOIN usuario uc ON uc.usuario_id = c.cerrada_por_id`;

// Solo puede haber una caja abierta (índice ux_caja_una_abierta).
// candado: '' (sin bloqueo), 'compartido' (una venta: varias a la vez,
// pero nadie la cierra mientras tanto) o 'exclusivo' (el cierre).
const CANDADOS = { '': '', compartido: 'FOR SHARE', exclusivo: 'FOR UPDATE' };
async function abierta(cliente = pool, candado = '') {
  const { rows } = await cliente.query(
    `SELECT caja_id, base_inicial FROM caja WHERE estado = 'ABIERTA' ${CANDADOS[candado]}`,
  );
  return rows[0] || null;
}

async function obtener(id, cliente = pool) {
  const { rows } = await cliente.query(`${SELECT_CAJA} WHERE c.caja_id = $1`, [id]);
  return rows[0] || null;
}

async function abrir(usuarioId, base, observacion, cliente = pool) {
  const { rows } = await cliente.query(
    `INSERT INTO caja (abierta_por_id, base_inicial, observacion)
     VALUES ($1, $2, $3) RETURNING caja_id`,
    [usuarioId, base, observacion],
  );
  return rows[0].caja_id;
}

// Efectivo que debería haber: base + ventas en efectivo + ingresos y
// abonos - egresos y devoluciones. Además, cuánto se vendió por forma de pago.
async function resumen(cajaId, cliente = pool) {
  const { rows } = await cliente.query(
    `SELECT
       c.base_inicial,
       COALESCE((SELECT sum(total) FROM venta WHERE caja_id = c.caja_id AND estado = 'COMPLETADA' AND forma_pago_codigo = 'EFECTIVO'), 0) AS ventas_efectivo,
       COALESCE((SELECT sum(total) FROM venta WHERE caja_id = c.caja_id AND estado = 'COMPLETADA' AND forma_pago_codigo = 'TRANSFERENCIA'), 0) AS ventas_transferencia,
       COALESCE((SELECT sum(total) FROM venta WHERE caja_id = c.caja_id AND estado = 'COMPLETADA' AND forma_pago_codigo = 'CREDITO'), 0) AS ventas_credito,
       (SELECT count(*)::int FROM venta WHERE caja_id = c.caja_id AND estado = 'COMPLETADA') AS numero_ventas,
       COALESCE((SELECT sum(monto) FROM movimiento_caja WHERE caja_id = c.caja_id AND tipo IN ('INGRESO', 'ABONO')), 0) AS ingresos,
       COALESCE((SELECT sum(monto) FROM movimiento_caja WHERE caja_id = c.caja_id AND tipo IN ('EGRESO', 'DEVOLUCION')), 0) AS egresos
     FROM caja c WHERE c.caja_id = $1`,
    [cajaId],
  );
  const r = rows[0];
  const esperado = Math.round((r.base_inicial + r.ventas_efectivo + r.ingresos - r.egresos) * 100) / 100;
  return { ...r, efectivo_esperado: esperado };
}

async function cerrar(cajaId, usuarioId, esperado, contado, observacion, cliente = pool) {
  await cliente.query(
    `UPDATE caja SET estado = 'CERRADA', fecha_cierre = now(), cerrada_por_id = $2,
            efectivo_esperado = $3::numeric(14,2), efectivo_contado = $4::numeric(14,2),
            diferencia = $4::numeric(14,2) - $3::numeric(14,2),
            observacion = COALESCE($5, observacion)
      WHERE caja_id = $1`,
    [cajaId, usuarioId, esperado, contado, observacion],
  );
}

module.exports = { abierta, obtener, abrir, resumen, cerrar };
