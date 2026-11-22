const modelo = require('../models/caja.model');
const HttpError = require('../utils/httpError');
const { validarBody } = require('../utils/validar');
const { enTransaccion } = require('../utils/transaccion');

// Caja abierta con su resumen; null si no hay ninguna.
async function actual() {
  const caja = await modelo.abierta();
  if (!caja) return null;
  return { ...(await modelo.obtener(caja.caja_id)), resumen: await modelo.resumen(caja.caja_id) };
}

async function abrir(actor, body) {
  const datos = validarBody(body, {
    base_inicial: { tipo: 'numero', requerido: true, min: 0, decimales: 2 },
    observacion: { tipo: 'texto', max: 400 },
  });

  const id = await enTransaccion(async (cliente) => {
    // Candado para que dos cajeros no abran caja al mismo tiempo.
    await cliente.query('LOCK TABLE caja IN SHARE ROW EXCLUSIVE MODE');
    if (await modelo.abierta(cliente)) throw new HttpError(409, 'Ya hay una caja abierta; ciérrela antes de abrir otra');
    return modelo.abrir(actor.id, datos.base_inicial, datos.observacion, cliente);
  });
  return { ...(await modelo.obtener(id)), resumen: await modelo.resumen(id) };
}

// Arqueo: compara el efectivo contado con el esperado y cierra la caja.
async function cerrar(actor, body) {
  const datos = validarBody(body, {
    efectivo_contado: { tipo: 'numero', requerido: true, min: 0, decimales: 2 },
    observacion: { tipo: 'texto', max: 400 },
  });

  const id = await enTransaccion(async (cliente) => {
    const caja = await modelo.abierta(cliente, 'exclusivo');
    if (!caja) throw new HttpError(409, 'No hay una caja abierta');
    const { efectivo_esperado: esperado } = await modelo.resumen(caja.caja_id, cliente);
    await modelo.cerrar(caja.caja_id, actor.id, esperado, datos.efectivo_contado, datos.observacion, cliente);
    return caja.caja_id;
  });
  return modelo.obtener(id);
}

module.exports = { actual, abrir, cerrar };
