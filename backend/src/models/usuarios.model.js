const pool = require('../config/db');

// Datos visibles de un usuario. Nunca incluye hash_clave.
const SELECT_PUBLICO = `
  SELECT u.usuario_id, u.nombre_usuario, u.nombre_completo, u.correo,
         u.rol_codigo AS rol, r.nombre AS rol_nombre,
         u.cliente_id, c.nombre AS cliente_nombre,
         u.activo, u.eliminado_en, u.bloqueado_hasta, u.ultimo_ingreso, u.creado_en
    FROM usuario u
    JOIN rol r ON r.rol_codigo = u.rol_codigo
    LEFT JOIN cliente c ON c.cliente_id = u.cliente_id`;

async function listar({ incluirEliminados }) {
  const { rows } = await pool.query(
    `${SELECT_PUBLICO}
      ${incluirEliminados ? '' : 'WHERE u.eliminado_en IS NULL'}
      ORDER BY u.nombre_usuario`,
  );
  return rows;
}

async function obtener(id, cliente = pool) {
  const { rows } = await cliente.query(`${SELECT_PUBLICO} WHERE u.usuario_id = $1`, [id]);
  return rows[0] || null;
}

// Fila completa (con hash) para validar el cambio de clave. Uso interno.
async function obtenerConHash(id, cliente = pool) {
  const { rows } = await cliente.query(
    `SELECT usuario_id, nombre_usuario, nombre_completo, correo, rol_codigo, hash_clave, activo, eliminado_en
       FROM usuario WHERE usuario_id = $1 FOR UPDATE`,
    [id],
  );
  return rows[0] || null;
}

async function crear(datos, cliente = pool) {
  const { rows } = await cliente.query(
    `INSERT INTO usuario (nombre_usuario, nombre_completo, correo, rol_codigo, cliente_id, hash_clave)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING usuario_id`,
    [datos.nombre_usuario, datos.nombre_completo, datos.correo, datos.rol, datos.cliente_id, datos.hash_clave],
  );
  return rows[0].usuario_id;
}

async function actualizarDatos(id, { nombre_completo, correo }, cliente = pool) {
  await cliente.query(
    'UPDATE usuario SET nombre_completo = $2, correo = $3 WHERE usuario_id = $1',
    [id, nombre_completo, correo],
  );
}

async function cambiarClave(id, hash, cliente = pool) {
  await cliente.query(
    `UPDATE usuario SET hash_clave = $2, clave_cambiada_en = now(),
            intentos_fallidos = 0, bloqueado_hasta = NULL
      WHERE usuario_id = $1`,
    [id, hash],
  );
}

async function cambiarRol(id, rol, clienteId, cliente = pool) {
  await cliente.query(
    'UPDATE usuario SET rol_codigo = $2, cliente_id = $3 WHERE usuario_id = $1',
    [id, rol, clienteId],
  );
}

// Activar también quita un borrado lógico y un bloqueo por intentos.
async function cambiarEstado(id, activo, cliente = pool) {
  await cliente.query(
    `UPDATE usuario
        SET activo = $2,
            eliminado_en = CASE WHEN $2 THEN NULL ELSE eliminado_en END,
            intentos_fallidos = CASE WHEN $2 THEN 0 ELSE intentos_fallidos END,
            bloqueado_hasta = CASE WHEN $2 THEN NULL ELSE bloqueado_hasta END
      WHERE usuario_id = $1`,
    [id, activo],
  );
}

async function eliminarLogico(id, cliente = pool) {
  await cliente.query(
    'UPDATE usuario SET activo = false, eliminado_en = now() WHERE usuario_id = $1',
    [id],
  );
}

// Administradores activos distintos del indicado: para no dejar el
// sistema sin nadie que pueda administrarlo.
async function contarOtrosAdmins(id, cliente = pool) {
  const { rows } = await cliente.query(
    `SELECT count(*)::int AS total FROM usuario
      WHERE rol_codigo = 'ADMIN' AND activo AND eliminado_en IS NULL AND usuario_id <> $1`,
    [id],
  );
  return rows[0].total;
}

// Candado de la transacción: los cambios de rol, estado y eliminación se
// hacen de a uno, así dos administradores no se desactivan entre sí al
// mismo tiempo y el sistema nunca queda sin ADMIN.
async function bloquearCambiosDeAdmins(cliente) {
  await cliente.query('SELECT pg_advisory_xact_lock(1414)');
}

async function clienteActivo(clienteId, cliente = pool) {
  const { rowCount } = await cliente.query('SELECT 1 FROM cliente WHERE cliente_id = $1 AND activo', [clienteId]);
  return rowCount === 1;
}

// Clientes activos que todavía no tienen usuario (para crear un usuario CLIENTE).
async function clientesDisponibles() {
  const { rows } = await pool.query(
    `SELECT c.cliente_id, c.nombre, c.documento, c.clasificacion
       FROM cliente c
      WHERE c.activo AND NOT EXISTS (SELECT 1 FROM usuario u WHERE u.cliente_id = c.cliente_id)
      ORDER BY c.nombre`,
  );
  return rows;
}

module.exports = {
  listar, obtener, obtenerConHash, crear, actualizarDatos, cambiarClave, cambiarRol,
  cambiarEstado, eliminarLogico, contarOtrosAdmins, bloquearCambiosDeAdmins, clienteActivo,
  clientesDisponibles,
};
