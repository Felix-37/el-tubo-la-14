// Prueba de la gestión de usuarios (Tarea 4).
// Uso: con la API corriendo (npm start), ejecutar npm run test:usuarios.
// Crea usuarios de prueba y al final los borra de la base para dejarla igual.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

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

const sinHash = (j) => !JSON.stringify(j).includes('hash');
const login = (usuario, clave) => pedir('POST', '/auth/login', { body: { usuario, clave } });

(async () => {
  const sufijo = String(Date.now()).slice(-6);
  const creados = [];

  const admin = (await login(process.env.ADMIN_INICIAL_USUARIO, process.env.ADMIN_INICIAL_CLAVE)).json.data;
  const cliente = (await login('ramirez', 'Cliente123*')).json.data;
  const A = admin.accessToken;

  console.log('--- Acceso al módulo');
  await caso('sin token', 'GET', '/usuarios', {}, 401);
  await caso('listar (admin)', 'GET', '/usuarios', { token: A }, 200, (j) => j.data.length >= 3 && sinHash(j));
  await caso('listar (cliente)', 'GET', '/usuarios', { token: cliente.accessToken }, 403);
  const disp = await caso('clientes sin usuario', 'GET', '/usuarios/clientes-disponibles', { token: A }, 200, (j) => j.data.length > 0);
  await caso('id inexistente', 'GET', '/usuarios/99999', { token: A }, 404);
  await caso('id no numérico', 'GET', '/usuarios/abc', { token: A }, 400);

  console.log('--- Crear');
  const nuevoCajero = { nombre_usuario: `caja${sufijo}`, nombre_completo: 'Cajero de prueba', correo: `caja${sufijo}@prueba.co`, rol: 'CAJERO', clave: 'Prueba123' };
  const c1 = await caso('crear cajero', 'POST', '/usuarios', { token: A, body: nuevoCajero }, 201, (j) => j.data.rol === 'CAJERO' && sinHash(j));
  creados.push(c1.data.usuario_id);
  await caso('nombre repetido', 'POST', '/usuarios', { token: A, body: nuevoCajero }, 409);
  await caso('correo repetido (mayúsculas)', 'POST', '/usuarios', { token: A, body: { ...nuevoCajero, nombre_usuario: `otro${sufijo}`, correo: nuevoCajero.correo.toUpperCase() } }, 409);
  await caso('nombre con @', 'POST', '/usuarios', { token: A, body: { ...nuevoCajero, nombre_usuario: 'a@b.co' } }, 400);
  await caso('clave corta', 'POST', '/usuarios', { token: A, body: { ...nuevoCajero, nombre_usuario: `x${sufijo}`, clave: 'Ab1' } }, 400);
  await caso('rol inválido', 'POST', '/usuarios', { token: A, body: { ...nuevoCajero, nombre_usuario: `x${sufijo}`, rol: 'JEFE' } }, 400);
  await caso('CLIENTE sin cliente_id', 'POST', '/usuarios', { token: A, body: { ...nuevoCajero, nombre_usuario: `x${sufijo}`, correo: null, rol: 'CLIENTE' } }, 400);
  await caso('no envía hash aunque lo pidan', 'POST', '/usuarios', { token: A, body: { ...nuevoCajero, nombre_usuario: `h${sufijo}`, correo: null, hash_clave: 'x' } }, 201,
    (j) => creados.push(j.data.usuario_id) && sinHash(j));
  const clienteLibre = disp.data[0].cliente_id;
  const c2 = await caso('crear cliente', 'POST', '/usuarios', { token: A, body: { nombre_usuario: `cli${sufijo}`, nombre_completo: 'Cliente de prueba', rol: 'CLIENTE', cliente_id: clienteLibre, clave: 'Prueba123' } }, 201,
    (j) => j.data.cliente_id === clienteLibre);
  creados.push(c2.data.usuario_id);
  await caso('cliente ya con usuario', 'POST', '/usuarios', { token: A, body: { nombre_usuario: `cli2${sufijo}`, nombre_completo: 'X', rol: 'CLIENTE', cliente_id: clienteLibre, clave: 'Prueba123' } }, 409);
  await caso('cajero no crea usuarios', 'POST', '/usuarios', { token: (await login('cajero', 'Cajero123*')).json.data.accessToken, body: nuevoCajero }, 403);

  console.log('--- Gestión solo ADMIN y perfil propio');
  const id = c1.data.usuario_id;
  let sesion = (await login(nuevoCajero.nombre_usuario, 'Prueba123')).json.data;
  await caso('cajero consulta un usuario', 'GET', `/usuarios/${id}`, { token: sesion.accessToken }, 403);
  await caso('cliente edita un usuario', 'PUT', `/usuarios/${id}`, { token: cliente.accessToken, body: { nombre_completo: 'Hackeado' } }, 403);
  await caso('consulta su perfil', 'GET', '/perfil', { token: sesion.accessToken }, 200, (j) => j.data.usuario_id === id && sinHash(j));
  await caso('edita solo su nombre', 'PUT', '/perfil', { token: sesion.accessToken, body: { nombre_completo: 'Cajero editado' } }, 200,
    (j) => j.data.nombre_completo === 'Cajero editado' && j.data.correo === nuevoCajero.correo);
  await caso('el perfil ignora rol y usuario_id', 'PUT', '/perfil', { token: sesion.accessToken, body: { rol: 'ADMIN', usuario_id: 1 } }, 200,
    (j) => j.data.rol === 'CAJERO' && j.data.usuario_id === id);
  await caso('cambia su clave sin la actual', 'PUT', '/perfil', { token: sesion.accessToken, body: { clave: 'Nueva1234' } }, 400);
  await caso('cambia su clave', 'PUT', '/perfil', { token: sesion.accessToken, body: { clave: 'Nueva1234', clave_actual: 'Prueba123' } }, 200);
  await caso('su access viejo dejó de servir', 'GET', '/perfil', { token: sesion.accessToken }, 401, (j) => j.error.mensaje.includes('clave cambió'));
  await caso('sus sesiones se cerraron', 'POST', '/auth/refresh', { body: { refreshToken: sesion.refreshToken } }, 401);
  await caso('entra con la clave nueva', 'POST', '/auth/login', { body: { usuario: nuevoCajero.nombre_usuario, clave: 'Nueva1234' } }, 200);
  await caso('admin restablece la clave', 'PUT', `/usuarios/${id}`, { token: A, body: { clave: 'Prueba123' } }, 200,
    (j) => j.data.correo === nuevoCajero.correo);
  sesion = (await login(nuevoCajero.nombre_usuario, 'Prueba123')).json.data;

  console.log('--- Rol');
  await caso('cajero a admin', 'PATCH', `/usuarios/${id}/rol`, { token: A, body: { rol: 'ADMIN' } }, 200, (j) => j.data.rol === 'ADMIN');
  await caso('el rol nuevo aplica ya', 'GET', '/usuarios', { token: (await login(nuevoCajero.nombre_usuario, 'Prueba123')).json.data.accessToken }, 200);
  await caso('admin a cajero', 'PATCH', `/usuarios/${id}/rol`, { token: A, body: { rol: 'CAJERO' } }, 200, (j) => j.data.rol === 'CAJERO');
  await caso('a CLIENTE sin cliente_id', 'PATCH', `/usuarios/${id}/rol`, { token: A, body: { rol: 'CLIENTE' } }, 400);
  await caso('cambiar su propio rol', 'PATCH', `/usuarios/${admin.usuario.usuario_id}/rol`, { token: A, body: { rol: 'CAJERO' } }, 409);
  await caso('cajero cambia roles', 'PATCH', `/usuarios/${id}/rol`, { token: sesion.accessToken, body: { rol: 'ADMIN' } }, 403);

  console.log('--- Estado y eliminación');
  sesion = (await login(nuevoCajero.nombre_usuario, 'Prueba123')).json.data;
  await caso('estado sin "activo"', 'PATCH', `/usuarios/${id}/estado`, { token: A, body: {} }, 400);
  await caso('desactivar', 'PATCH', `/usuarios/${id}/estado`, { token: A, body: { activo: false } }, 200, (j) => j.data.activo === false);
  await caso('su access deja de servir', 'GET', '/perfil', { token: sesion.accessToken }, 401);
  await caso('no puede entrar', 'POST', '/auth/login', { body: { usuario: nuevoCajero.nombre_usuario, clave: 'Prueba123' } }, 401);
  await caso('activar', 'PATCH', `/usuarios/${id}/estado`, { token: A, body: { activo: true } }, 200, (j) => j.data.activo === true);
  await caso('desactivarse a sí mismo', 'PATCH', `/usuarios/${admin.usuario.usuario_id}/estado`, { token: A, body: { activo: false } }, 409);
  await caso('eliminar', 'DELETE', `/usuarios/${id}`, { token: A }, 200, (j) => j.data.eliminado_en && !j.data.activo);
  await caso('no aparece en la lista', 'GET', '/usuarios', { token: A }, 200, (j) => !j.data.some((u) => u.usuario_id === id));
  await caso('sí con ?eliminados=true', 'GET', '/usuarios?eliminados=true', { token: A }, 200, (j) => j.data.some((u) => u.usuario_id === id));
  await caso('eliminado no entra', 'POST', '/auth/login', { body: { usuario: nuevoCajero.nombre_usuario, clave: 'Prueba123' } }, 401);
  await caso('editar eliminado', 'PUT', `/usuarios/${id}`, { token: A, body: { nombre_completo: 'X' } }, 409);
  await caso('eliminar de nuevo', 'DELETE', `/usuarios/${id}`, { token: A }, 409);
  await caso('eliminarse a sí mismo', 'DELETE', `/usuarios/${admin.usuario.usuario_id}`, { token: A }, 409);
  await caso('reactivar eliminado', 'PATCH', `/usuarios/${id}/estado`, { token: A, body: { activo: true } }, 200, (j) => j.data.activo && !j.data.eliminado_en);

  // Limpieza directa en la base: los usuarios de prueba no deben quedar.
  const pool = require('../src/config/db');
  await pool.query('DELETE FROM refresh_token WHERE usuario_id = ANY($1)', [creados]);
  await pool.query('UPDATE bitacora SET usuario_id = NULL WHERE usuario_id = ANY($1)', [creados]);
  await pool.query('DELETE FROM usuario WHERE usuario_id = ANY($1)', [creados]);
  await pool.end();

  console.log(fallos === 0 ? '\nTodo pasó.' : `\n${fallos} caso(s) fallaron.`);
  process.exit(fallos === 0 ? 0 : 1);
})().catch((e) => {
  console.error('Error en la prueba:', e.message);
  process.exit(1);
});
