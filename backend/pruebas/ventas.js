// Prueba de las funcionalidades exclusivas del CAJERO (caja y ventas) y del
// CLIENTE (Mi cuenta). Uso: con la API corriendo, npm run test:ventas.
// Al final deshace todo lo que creó (ventas, caja, existencias, consecutivo,
// cartera y el cajero de prueba) para dejar la base como estaba.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require('../src/config/db');

const BASE = process.env.API_URL || 'http://localhost:5000/api';
let fallos = 0;

async function pedir(metodo, ruta, { body, token } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${ruta}`, { method: metodo, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  return { status: res.status, json: await res.json() };
}

async function caso(nombre, metodo, ruta, opciones, esperado, revisar) {
  const { status, json } = await pedir(metodo, ruta, opciones);
  let ok = status === esperado && json.ok === (status < 400);
  if (ok && revisar) ok = Boolean(revisar(json));
  if (!ok) fallos++;
  console.log(`${ok ? 'OK ' : 'MAL'} ${status} ${metodo.padEnd(6)} ${ruta.padEnd(30)} ${nombre}${ok ? '' : `\n     ${JSON.stringify(json)}`}`);
  return json;
}

const login = async (usuario, clave) => (await pedir('POST', '/auth/login', { body: { usuario, clave } })).json.data;
const existencia = async (id) => (await pool.query('SELECT existencia FROM presentacion WHERE presentacion_id = $1', [id])).rows[0].existencia;

(async () => {
  // Foto de la base antes de la prueba, para restaurarla al final.
  const antes = {
    venta: (await pool.query('SELECT COALESCE(max(venta_id), 0) AS n FROM venta')).rows[0].n,
    caja: (await pool.query('SELECT COALESCE(max(caja_id), 0) AS n FROM caja')).rows[0].n,
    consecutivo: (await pool.query("SELECT ultimo_numero FROM consecutivo WHERE nombre = 'VENTA'")).rows[0].ultimo_numero,
    existencias: (await pool.query('SELECT presentacion_id, existencia FROM presentacion')).rows,
    contacto: (await pool.query('SELECT telefono, correo, direccion FROM cliente WHERE cliente_id = 1')).rows[0],
  };
  if ((await pool.query("SELECT 1 FROM caja WHERE estado = 'ABIERTA'")).rowCount) {
    throw new Error('Hay una caja abierta en la base; ciérrela antes de correr la prueba');
  }
  const creados = [];
  const sufijo = String(Date.now()).slice(-6);

  try {
    const admin = await login(process.env.ADMIN_INICIAL_USUARIO, process.env.ADMIN_INICIAL_CLAVE);
    const cajero = await login('cajero', 'Cajero123*');
    const ramirez = await login('ramirez', 'Cliente123*');
    const [A, C, R] = [admin.accessToken, cajero.accessToken, ramirez.accessToken];

    // Un segundo cajero, para probar la propiedad de las ventas.
    const otro = await caso('crear otro cajero', 'POST', '/usuarios', { token: A, body: { nombre_usuario: `caja${sufijo}`, nombre_completo: 'Otro cajero', rol: 'CAJERO', clave: 'Prueba123' } }, 201);
    creados.push(otro.data.usuario_id);
    const O = (await login(`caja${sufijo}`, 'Prueba123')).accessToken;

    console.log('--- Caja');
    await caso('sin token', 'GET', '/ventas/caja', {}, 401);
    await caso('cliente consulta caja', 'GET', '/ventas/caja', { token: R }, 403);
    await caso('sin caja abierta', 'GET', '/ventas/caja', { token: C }, 200, (j) => j.data === null);
    await caso('vender sin caja', 'POST', '/ventas', { token: C, body: { forma_pago: 'TRANSFERENCIA', lineas: [{ presentacion_id: 4, cantidad: 1 }] } }, 409);
    await caso('admin abre caja', 'POST', '/ventas/caja/abrir', { token: A, body: { base_inicial: 50000 } }, 403);
    await caso('base negativa', 'POST', '/ventas/caja/abrir', { token: C, body: { base_inicial: -1 } }, 400);
    await caso('abrir caja', 'POST', '/ventas/caja/abrir', { token: C, body: { base_inicial: 50000 } }, 201, (j) => j.data.estado === 'ABIERTA');
    await caso('abrir otra vez', 'POST', '/ventas/caja/abrir', { token: O, body: { base_inicial: 0 } }, 409, (j) => /Ya hay una caja/.test(j.error.mensaje));

    console.log('--- Ventas: validaciones');
    await caso('admin vende', 'POST', '/ventas', { token: A, body: { forma_pago: 'TRANSFERENCIA', lineas: [{ presentacion_id: 4, cantidad: 1 }] } }, 403);
    await caso('cliente vende', 'POST', '/ventas', { token: R, body: { forma_pago: 'TRANSFERENCIA', lineas: [{ presentacion_id: 4, cantidad: 1 }] } }, 403);
    await caso('sin líneas', 'POST', '/ventas', { token: C, body: { forma_pago: 'TRANSFERENCIA', lineas: [] } }, 400);
    await caso('forma de pago inválida', 'POST', '/ventas', { token: C, body: { forma_pago: 'BITCOIN', lineas: [{ presentacion_id: 4, cantidad: 1 }] } }, 400);
    await caso('cantidad 0', 'POST', '/ventas', { token: C, body: { forma_pago: 'TRANSFERENCIA', lineas: [{ presentacion_id: 4, cantidad: 0 }] } }, 400);
    await caso('producto por corte', 'POST', '/ventas', { token: C, body: { forma_pago: 'TRANSFERENCIA', lineas: [{ presentacion_id: 1, cantidad: 1 }] } }, 400);
    await caso('presentación inexistente', 'POST', '/ventas', { token: C, body: { forma_pago: 'TRANSFERENCIA', lineas: [{ presentacion_id: 99999, cantidad: 1 }] } }, 400);
    await caso('existencia insuficiente', 'POST', '/ventas', { token: C, body: { forma_pago: 'TRANSFERENCIA', lineas: [{ presentacion_id: 3, cantidad: 1000 }] } }, 409, (j) => /Existencia insuficiente/.test(j.error.mensaje));
    await caso('efectivo sin valor recibido', 'POST', '/ventas', { token: C, body: { forma_pago: 'EFECTIVO', lineas: [{ presentacion_id: 4, cantidad: 1 }] } }, 400);
    await caso('efectivo que no alcanza', 'POST', '/ventas', { token: C, body: { forma_pago: 'EFECTIVO', valor_recibido: 1000, lineas: [{ presentacion_id: 4, cantidad: 1 }] } }, 400);
    await caso('crédito sin cliente', 'POST', '/ventas', { token: C, body: { forma_pago: 'CREDITO', lineas: [{ presentacion_id: 4, cantidad: 1 }] } }, 400);
    await caso('crédito sin cupo (cliente 2)', 'POST', '/ventas', { token: C, body: { forma_pago: 'CREDITO', cliente_id: 2, lineas: [{ presentacion_id: 4, cantidad: 1 }] } }, 409, (j) => /cupo/.test(j.error.mensaje));
    await caso('crédito que supera el cupo', 'POST', '/ventas', { token: C, body: { forma_pago: 'CREDITO', cliente_id: 1, lineas: [{ presentacion_id: 3, cantidad: 18 }] } }, 409, (j) => /cupo/.test(j.error.mensaje));
    await caso('recibido con 3 decimales', 'POST', '/ventas', { token: C, body: { forma_pago: 'EFECTIVO', valor_recibido: 5000.005, lineas: [{ presentacion_id: 4, cantidad: 1 }] } }, 400);

    console.log('--- Ventas: registro');
    const stock4 = await existencia(4);
    const efectivo = await caso('venta en efectivo con cambio', 'POST', '/ventas', { token: C, body: { forma_pago: 'EFECTIVO', valor_recibido: 20000, lineas: [{ presentacion_id: 4, cantidad: 2 }, { presentacion_id: 4, cantidad: 1 }] } }, 201,
      (j) => j.data.total === 10500 && j.data.cambio === 9500 && j.data.lineas.length === 1 && j.data.numero_venta === antes.consecutivo + 1);
    console.log(`     existencia BIS-CAZ-3: ${stock4} -> ${await existencia(4)}`);
    if (await existencia(4) !== stock4 - 3) { fallos++; console.log('MAL la existencia no bajó 3 unidades'); }
    const credito = await caso('venta a crédito a ramirez', 'POST', '/ventas', { token: C, body: { forma_pago: 'CREDITO', cliente_id: 1, lineas: [{ presentacion_id: 3, cantidad: 2 }] } }, 201,
      (j) => j.data.total === 96000 && j.data.cliente_id === 1);
    // Dos ventas a crédito al mismo tiempo que juntas pasan el cupo de ramirez
    // (quedan 724.000 y cada una es de 384.000): solo una debe pasar.
    const simultaneas = await Promise.all([1, 2].map(() => pedir('POST', '/ventas', { token: C, body: { forma_pago: 'CREDITO', cliente_id: 1, lineas: [{ presentacion_id: 3, cantidad: 8 }] } })));
    const estados = simultaneas.map((r) => r.status).sort().join(',');
    const okSim = estados === '201,409';
    if (!okSim) fallos++;
    console.log(`${okSim ? 'OK ' : 'MAL'} ${estados} POST   /ventas (x2 a la vez)          dos créditos simultáneos no pasan el cupo`);
    const transferencia = await caso('venta por transferencia (cliente 2)', 'POST', '/ventas', { token: C, body: { forma_pago: 'TRANSFERENCIA', cliente_id: 2, lineas: [{ presentacion_id: 4, cantidad: 1 }] } }, 201);
    const delOtro = await caso('venta del otro cajero', 'POST', '/ventas', { token: O, body: { forma_pago: 'TRANSFERENCIA', lineas: [{ presentacion_id: 4, cantidad: 1 }] } }, 201);

    console.log('--- Ventas: consulta y propiedad');
    await caso('el cajero ve solo las suyas', 'GET', '/ventas', { token: C }, 200, (j) => j.data.length === 4 && j.data.every((v) => v.usuario_id === cajero.usuario.usuario_id));
    await caso('el admin ve todas', 'GET', '/ventas', { token: A }, 200, (j) => j.data.length >= 5);
    await caso('detalle propio', 'GET', `/ventas/${efectivo.data.venta_id}`, { token: C }, 200, (j) => j.data.lineas.length === 1);
    await caso('detalle de otro cajero', 'GET', `/ventas/${delOtro.data.venta_id}`, { token: C }, 403);
    await caso('admin ve cualquier detalle', 'GET', `/ventas/${delOtro.data.venta_id}`, { token: A }, 200);
    await caso('cliente ve ventas', 'GET', '/ventas', { token: R }, 403);
    await caso('venta inexistente', 'GET', '/ventas/99999', { token: C }, 404);
    await caso('id no numérico', 'GET', '/ventas/abc', { token: C }, 400);
    await caso('caja con resumen', 'GET', '/ventas/caja', { token: C }, 200, (j) => j.data.resumen.numero_ventas === 5 && j.data.resumen.efectivo_esperado === 60500);

    console.log('--- Mi cuenta (CLIENTE)');
    await caso('cajero entra a mi cuenta', 'GET', '/mi-cuenta', { token: C }, 403);
    await caso('admin entra a mi cuenta', 'GET', '/mi-cuenta', { token: A }, 403);
    await caso('resumen con el cargo', 'GET', '/mi-cuenta', { token: R }, 200, (j) => j.data.cliente_id === 1 && j.data.saldo === 660000);
    await caso('movimientos', 'GET', '/mi-cuenta/movimientos', { token: R }, 200, (j) => j.data.some((m) => m.tipo === 'CARGO' && m.valor === 96000));
    await caso('solo sus compras', 'GET', '/mi-cuenta/compras', { token: R }, 200, (j) => j.data.length === 2 && j.data.every((v) => v.cliente_id === 1) && j.data.some((v) => v.venta_id === credito.data.venta_id));
    await caso('detalle de su compra', 'GET', `/mi-cuenta/compras/${credito.data.venta_id}`, { token: R }, 200, (j) => j.data.lineas.length === 1);
    await caso('compra de otro cliente', 'GET', `/mi-cuenta/compras/${transferencia.data.venta_id}`, { token: R }, 403);
    await caso('venta sin cliente', 'GET', `/mi-cuenta/compras/${efectivo.data.venta_id}`, { token: R }, 403);
    await caso('editar teléfono', 'PUT', '/mi-cuenta', { token: R, body: { telefono: '3001234567' } }, 200,
      (j) => j.data.telefono === '3001234567' && j.data.correo === antes.contacto.correo);
    await caso('correo inválido', 'PUT', '/mi-cuenta', { token: R, body: { correo: 'sin-arroba' } }, 400);

    console.log('--- Cierre de caja');
    await caso('cliente cierra caja', 'POST', '/ventas/caja/cerrar', { token: R, body: { efectivo_contado: 0 } }, 403);
    await caso('conteo con 3 decimales', 'POST', '/ventas/caja/cerrar', { token: C, body: { efectivo_contado: 60000.005 } }, 400);
    await caso('cerrar sin conteo', 'POST', '/ventas/caja/cerrar', { token: C, body: {} }, 400);
    await caso('arqueo con faltante', 'POST', '/ventas/caja/cerrar', { token: C, body: { efectivo_contado: 60000 } }, 200,
      (j) => j.data.estado === 'CERRADA' && j.data.efectivo_esperado === 60500 && j.data.diferencia === -500);
    await caso('cerrar otra vez', 'POST', '/ventas/caja/cerrar', { token: C, body: { efectivo_contado: 0 } }, 409, (j) => /No hay una caja abierta/.test(j.error.mensaje));
  } finally {
    // Restauración: todo lo creado por la prueba sale de la base.
    const q = (sql, p) => pool.query(sql, p);
    await q('DELETE FROM movimiento_cartera WHERE venta_id > $1', [antes.venta]);
    await q('DELETE FROM movimiento_inventario WHERE venta_id > $1', [antes.venta]);
    await q('DELETE FROM venta_detalle WHERE venta_id > $1', [antes.venta]);
    await q('DELETE FROM venta WHERE venta_id > $1', [antes.venta]);
    await q('DELETE FROM caja WHERE caja_id > $1', [antes.caja]);
    await q("UPDATE consecutivo SET ultimo_numero = $1 WHERE nombre = 'VENTA'", [antes.consecutivo]);
    for (const p of antes.existencias) {
      await q('UPDATE presentacion SET existencia = $2 WHERE presentacion_id = $1 AND existencia <> $2', [p.presentacion_id, p.existencia]);
    }
    await q('UPDATE cliente SET telefono = $1, correo = $2, direccion = $3 WHERE cliente_id = 1', [antes.contacto.telefono, antes.contacto.correo, antes.contacto.direccion]);
    if (creados.length) {
      await q('DELETE FROM refresh_token WHERE usuario_id = ANY($1)', [creados]);
      await q('UPDATE bitacora SET usuario_id = NULL WHERE usuario_id = ANY($1)', [creados]);
      await q('DELETE FROM usuario WHERE usuario_id = ANY($1)', [creados]);
    }
    await pool.end();
  }

  console.log(fallos === 0 ? '\nTodo pasó.' : `\n${fallos} caso(s) fallaron.`);
  process.exit(fallos === 0 ? 0 : 1);
})().catch((e) => {
  console.error('Error en la prueba:', e.message);
  process.exit(1);
});
