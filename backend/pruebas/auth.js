// Prueba de autenticación y autorización (Tarea 4).
// Uso: con la API corriendo (npm start), ejecutar npm run test:auth.
// Cubre: login por rol, 400/401/403, token alterado, vencido o de tipo
// equivocado, rotación del refresh, reuso (revoca la familia) y logout.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const jwt = require('jsonwebtoken');

const BASE = process.env.API_URL || 'http://localhost:5000/api';

// Claves de prueba de database/02_datos_iniciales.sql (solo desarrollo).
const USUARIOS = {
  ADMIN: { usuario: process.env.ADMIN_INICIAL_USUARIO, clave: process.env.ADMIN_INICIAL_CLAVE },
  CAJERO: { usuario: 'cajero', clave: 'Cajero123*' },
  CLIENTE: { usuario: 'ramirez', clave: 'Cliente123*' },
};

let fallos = 0;

async function pedir(metodo, ruta, { body, token } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = token.includes(' ') ? token : `Bearer ${token}`;
  const res = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json() };
}

async function caso(nombre, metodo, ruta, opciones, esperado, revisar) {
  const { status, json } = await pedir(metodo, ruta, opciones);
  let ok = status === esperado && json.ok === (status < 400);
  if (ok && revisar) ok = Boolean(revisar(json));
  if (!ok) fallos++;
  console.log(`${ok ? 'OK ' : 'MAL'} ${status} ${metodo.padEnd(6)} ${ruta.padEnd(24)} ${nombre}${ok ? '' : `\n     ${JSON.stringify(json)}`}`);
  return json;
}

const sinHash = (j) => !JSON.stringify(j).includes('hash');

(async () => {
  console.log('--- Login');
  const sesiones = {};
  for (const [rol, credenciales] of Object.entries(USUARIOS)) {
    const j = await caso(`login ${rol}`, 'POST', '/auth/login', { body: credenciales }, 200,
      (r) => r.data.accessToken && r.data.refreshToken && r.data.usuario.rol === rol && sinHash(r));
    sesiones[rol] = j.data;
  }
  await caso('sin clave', 'POST', '/auth/login', { body: { usuario: 'cajero' } }, 400);
  await caso('clave incorrecta', 'POST', '/auth/login', { body: { usuario: 'ramirez', clave: 'NoEs1234' } }, 401);
  await caso('usuario inexistente', 'POST', '/auth/login', { body: { usuario: 'nadie', clave: 'NoEs1234' } }, 401,
    (r) => r.error.mensaje === 'Usuario o clave incorrectos');
  // El intento fallido de ramirez se borra al entrar bien.
  const reingreso = await caso('reingreso cliente', 'POST', '/auth/login', { body: USUARIOS.CLIENTE }, 200);
  sesiones.CLIENTE = reingreso.data;

  const admin = sesiones.ADMIN.accessToken;
  const cajero = sesiones.CAJERO.accessToken;
  const cliente = sesiones.CLIENTE.accessToken;

  console.log('--- Autenticación (401)');
  await caso('sin token', 'GET', '/categorias', {}, 401);
  await caso('esquema distinto de Bearer', 'GET', '/categorias', { token: `Basic ${admin}` }, 401);
  const partes = admin.split('.');
  const alterado = `${partes[0]}.${Buffer.from(JSON.stringify({ ...jwt.decode(admin), rol: 'ADMIN', sub: '1' })).toString('base64url')}.${partes[2]}x`;
  await caso('token alterado', 'GET', '/categorias', { token: alterado }, 401);
  await caso('refresh usado como access', 'GET', '/categorias', { token: sesiones.ADMIN.refreshToken }, 401);
  const vencido = jwt.sign({ sub: '1', rol: 'ADMIN', type: 'access' }, process.env.JWT_ACCESS_SECRET, { expiresIn: -10 });
  await caso('access vencido', 'GET', '/categorias', { token: vencido }, 401, (r) => r.error.mensaje.includes('venció'));
  const otroSecreto = jwt.sign({ sub: '1', rol: 'ADMIN', type: 'access' }, 'x'.repeat(64), { expiresIn: 60 });
  await caso('firmado con otro secreto', 'GET', '/categorias', { token: otroSecreto }, 401);
  await caso('perfil propio', 'GET', '/auth/yo', { token: cajero }, 200, (r) => r.data.rol === 'CAJERO' && sinHash(r));

  console.log('--- Autorización (403)');
  await caso('cajero consulta catálogo', 'GET', '/productos', { token: cajero }, 200);
  await caso('cliente consulta catálogo', 'GET', '/calibres/1', { token: cliente }, 200);
  await caso('cajero crea categoría', 'POST', '/categorias', { token: cajero, body: { nombre: 'No debe' } }, 403,
    (r) => r.error.detalle.rolesPermitidos.includes('ADMIN'));
  await caso('cliente elimina producto', 'DELETE', '/productos/1', { token: cliente }, 403);
  await caso('cliente edita calibre', 'PUT', '/calibres/1', { token: cliente, body: { nombre: 'X', tarifa_corte: 1 } }, 403);

  console.log('--- Refresh');
  await caso('refresh sin token', 'POST', '/auth/refresh', { body: {} }, 400);
  await caso('access usado como refresh', 'POST', '/auth/refresh', { body: { refreshToken: cajero } }, 401);
  const r1 = sesiones.CAJERO.refreshToken;
  const rot = await caso('rotación', 'POST', '/auth/refresh', { body: { refreshToken: r1 } }, 200,
    (r) => r.data.refreshToken !== r1 && r.data.accessToken);
  const r2 = rot.data.refreshToken;
  await caso('access nuevo sirve', 'GET', '/categorias', { token: rot.data.accessToken }, 200);
  await caso('reuso del refresh viejo', 'POST', '/auth/refresh', { body: { refreshToken: r1 } }, 401,
    (r) => r.error.mensaje.includes('reutilización'));
  await caso('familia revocada (r2 ya no sirve)', 'POST', '/auth/refresh', { body: { refreshToken: r2 } }, 401);

  console.log('--- Logout');
  const rCliente = sesiones.CLIENTE.refreshToken;
  await caso('logout', 'POST', '/auth/logout', { body: { refreshToken: rCliente } }, 200);
  await caso('refresh tras logout', 'POST', '/auth/refresh', { body: { refreshToken: rCliente } }, 401,
    (r) => r.error.mensaje.includes('sesión fue cerrada'));
  await caso('logout repetido', 'POST', '/auth/logout', { body: { refreshToken: rCliente } }, 200);
  // Logout con un refresh ya rotado: cierra también el vigente de la familia.
  const otra = await caso('login cajero', 'POST', '/auth/login', { body: USUARIOS.CAJERO }, 200);
  const rot2 = await caso('rotación', 'POST', '/auth/refresh', { body: { refreshToken: otra.data.refreshToken } }, 200);
  await caso('logout con refresh rotado', 'POST', '/auth/logout', { body: { refreshToken: otra.data.refreshToken } }, 200);
  await caso('el vigente también murió', 'POST', '/auth/refresh', { body: { refreshToken: rot2.data.refreshToken } }, 401,
    (r) => r.error.mensaje.includes('sesión fue cerrada'));
  await caso('esquema bearer en minúsculas', 'GET', '/auth/yo', { token: `bearer ${rot2.data.accessToken}` }, 200);

  console.log(fallos === 0 ? '\nTodo pasó.' : `\n${fallos} caso(s) fallaron.`);
  process.exit(fallos === 0 ? 0 : 1);
})().catch((e) => {
  console.error('No se pudo conectar con la API:', e.message);
  process.exit(1);
});
