const modelo = require('../models/miCuenta.model');
const ventas = require('../models/ventas.model');
const HttpError = require('../utils/httpError');
const { validarBody } = require('../utils/validar');

// Todo sale del cliente_id del usuario de la sesión, nunca de la URL ni
// del body: un cliente no puede pedir la cuenta de otro.
function clienteDe(actor) {
  if (!actor.clienteId) throw new HttpError(403, 'El usuario no está enlazado a una ficha de cliente');
  return actor.clienteId;
}

async function resumen(actor) {
  const ficha = await modelo.ficha(clienteDe(actor));
  if (!ficha) throw new HttpError(404, 'No se encontró la ficha de cliente');
  return ficha;
}

// Datos de contacto: solo cambia lo que llegue en el body.
async function actualizar(actor, body) {
  const actual = await resumen(actor);
  const datos = validarBody(body, {
    telefono: { tipo: 'texto', max: 30 },
    correo: { tipo: 'texto', max: 120 },
    direccion: { tipo: 'texto', max: 200 },
  });
  if (datos.correo !== null && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo)) {
    throw new HttpError(400, 'Datos inválidos', ['El correo no tiene un formato válido']);
  }
  const elegir = (campo) => (body[campo] === undefined ? actual[campo] : datos[campo]);
  await modelo.actualizarContacto(actual.cliente_id, {
    telefono: elegir('telefono'),
    correo: elegir('correo'),
    direccion: elegir('direccion'),
  });
  return resumen(actor);
}

async function movimientos(actor) {
  return modelo.movimientos(clienteDe(actor));
}

async function compras(actor) {
  return ventas.listar({ clienteId: clienteDe(actor) });
}

// La propiedad la valida la ruta (propietarioDelRegistro) antes de llegar aquí.
async function compra(id) {
  return ventas.obtener(Number(id));
}

module.exports = { resumen, actualizar, movimientos, compras, compra };
