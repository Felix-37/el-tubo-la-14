// Prueba de humo: recorre los 20 endpoints con casos exitosos y fallidos.
// Uso: con la API corriendo (npm start), ejecutar npm test.
// Crea sus propios registros y los borra al final, así la base queda igual.
// Desde la Tarea 4 el catálogo exige sesión: entra como el administrador
// del .env (ADMIN_INICIAL_USUARIO / ADMIN_INICIAL_CLAVE).
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const BASE = process.env.API_URL || 'http://localhost:5000/api';

let fallos = 0;
let token = null;

async function pedir(metodo, ruta, body) {
  const headers = body !== undefined ? { 'Content-Type': 'application/json' } : {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers,
    body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
  });
  const json = await res.json();
  return { status: res.status, json };
}

async function caso(nombre, metodo, ruta, body, esperado, revisar) {
  const { status, json } = await pedir(metodo, ruta, body);
  let ok = status === esperado && typeof json.ok === 'boolean' && json.ok === (status < 400);
  if (ok && revisar) ok = revisar(json);
  if (!ok) fallos++;
  console.log(`${ok ? 'OK ' : 'MAL'} ${status} ${metodo.padEnd(6)} ${ruta.padEnd(28)} ${nombre}${ok ? '' : `\n     ${JSON.stringify(json)}`}`);
  return json;
}

(async () => {
  const sufijo = Date.now();

  const sesion = await pedir('POST', '/auth/login', {
    usuario: process.env.ADMIN_INICIAL_USUARIO, clave: process.env.ADMIN_INICIAL_CLAVE,
  });
  if (sesion.status !== 200) {
    console.error('No se pudo iniciar sesión como administrador:', JSON.stringify(sesion.json));
    process.exit(1);
  }
  token = sesion.json.data.accessToken;

  console.log('--- Categorías');
  await caso('listar', 'GET', '/categorias', undefined, 200, (j) => Array.isArray(j.data));
  await caso('obtener', 'GET', '/categorias/1', undefined, 200, (j) => j.data.categoria_id === 1);
  await caso('id inexistente', 'GET', '/categorias/9999', undefined, 404);
  await caso('id no numérico', 'GET', '/categorias/abc', undefined, 400);
  const cat = await caso('crear', 'POST', '/categorias', { nombre: `Rieles ${sufijo}` }, 201);
  await caso('crear sin nombre', 'POST', '/categorias', {}, 400);
  await caso('crear duplicada', 'POST', '/categorias', { nombre: 'Tubos' }, 409);
  await caso('JSON inválido', 'POST', '/categorias', '{"nombre": ', 400);
  await caso('actualizar', 'PUT', `/categorias/${cat.data.categoria_id}`, { nombre: `Rieles y canales ${sufijo}`, activo: true }, 200);
  await caso('actualizar inexistente', 'PUT', '/categorias/9999', { nombre: 'X' }, 404);
  await caso('eliminar con productos', 'DELETE', '/categorias/1', undefined, 409);

  console.log('--- Calibres');
  await caso('listar', 'GET', '/calibres', undefined, 200, (j) => Array.isArray(j.data));
  await caso('obtener', 'GET', '/calibres/1', undefined, 200);
  await caso('id inexistente', 'GET', '/calibres/9999', undefined, 404);
  const cal = await caso('crear', 'POST', '/calibres', { nombre: `Calibre 12 ${sufijo}`, descripcion: 'Lámina extra gruesa', tarifa_corte: 3500 }, 201);
  await caso('tarifa negativa', 'POST', '/calibres', { nombre: 'Calibre 10', tarifa_corte: -100 }, 400);
  await caso('tarifa como texto', 'POST', '/calibres', { nombre: 'Calibre 10', tarifa_corte: 'mil' }, 400);
  await caso('actualizar', 'PUT', `/calibres/${cal.data.calibre_id}`, { nombre: `Calibre 12 ${sufijo}`, descripcion: 'Lámina extra gruesa', tarifa_corte: 4000 }, 200);
  await caso('eliminar en uso', 'DELETE', '/calibres/1', undefined, 409);

  console.log('--- Productos');
  await caso('listar', 'GET', '/productos', undefined, 200, (j) => Array.isArray(j.data) && 'categoria' in j.data[0]);
  await caso('obtener', 'GET', '/productos/1', undefined, 200);
  await caso('id inexistente', 'GET', '/productos/9999', undefined, 404);
  const prod = await caso('crear', 'POST', '/productos', { nombre: `Riel corredizo ${sufijo}`, categoria_id: cat.data.categoria_id, es_cortable: true }, 201);
  await caso('categoría inexistente', 'POST', '/productos', { nombre: 'Riel X', categoria_id: 9999 }, 400);
  await caso('actualizar', 'PUT', `/productos/${prod.data.producto_id}`, { nombre: `Riel corredizo ${sufijo}`, categoria_id: cat.data.categoria_id, descripcion: 'Para puertas', es_cortable: true }, 200);
  await caso('eliminar con presentaciones', 'DELETE', '/productos/1', undefined, 409);

  console.log('--- Presentaciones');
  await caso('listar', 'GET', '/presentaciones', undefined, 200, (j) => Array.isArray(j.data) && 'producto' in j.data[0]);
  await caso('obtener', 'GET', '/presentaciones/1', undefined, 200);
  await caso('id inexistente', 'GET', '/presentaciones/9999', undefined, 404);
  const pres = await caso('crear', 'POST', '/presentaciones', {
    producto_id: prod.data.producto_id, referencia: `RIEL-${sufijo}`, medida: 'Barra 6 m',
    calibre_id: cal.data.calibre_id, largo_fabrica_cm: 600, precio_venta: 52000, costo: 40000, existencia_minima: 2,
  }, 201);
  await caso('referencia repetida', 'POST', '/presentaciones', { producto_id: 1, referencia: 'TCR-1-C18', precio_venta: 1000 }, 409);
  await caso('sin precio', 'POST', '/presentaciones', { producto_id: 1, referencia: 'SIN-PRECIO' }, 400);
  await caso('actualizar', 'PUT', `/presentaciones/${pres.data.presentacion_id}`, {
    producto_id: prod.data.producto_id, referencia: `RIEL-${sufijo}`, medida: 'Barra 6 m',
    calibre_id: cal.data.calibre_id, largo_fabrica_cm: 600, precio_venta: 54000, costo: 40000, existencia: 4, existencia_minima: 2,
  }, 200);
  await caso('actualizar sin existencia la conserva', 'PUT', `/presentaciones/${pres.data.presentacion_id}`, {
    producto_id: prod.data.producto_id, referencia: `RIEL-${sufijo}`, precio_venta: 55000,
  }, 200, (j) => j.data.existencia === 4);
  await caso('eliminar', 'DELETE', `/presentaciones/${pres.data.presentacion_id}`, undefined, 200);
  await caso('eliminar inexistente', 'DELETE', `/presentaciones/${pres.data.presentacion_id}`, undefined, 404);

  console.log('--- Limpieza (eliminar lo creado)');
  await caso('eliminar producto', 'DELETE', `/productos/${prod.data.producto_id}`, undefined, 200);
  await caso('eliminar calibre', 'DELETE', `/calibres/${cal.data.calibre_id}`, undefined, 200);
  await caso('eliminar categoría', 'DELETE', `/categorias/${cat.data.categoria_id}`, undefined, 200);

  console.log('--- Ruta inexistente');
  await caso('ruta no atendida', 'GET', '/clientes', undefined, 404);

  console.log(fallos === 0 ? '\nTodo pasó.' : `\n${fallos} caso(s) fallaron.`);
  process.exit(fallos === 0 ? 0 : 1);
})().catch((e) => {
  console.error('No se pudo conectar con la API:', e.message);
  process.exit(1);
});
