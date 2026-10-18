const modelo = require('../models/calibres.model');
const HttpError = require('../utils/httpError');
const { validarId, validarBody } = require('../utils/validar');
const { siDependenEntonces409 } = require('../utils/erroresPg');

const REGLAS = {
  nombre: { tipo: 'texto', requerido: true, max: 40 },
  descripcion: { tipo: 'texto', max: 200 },
  tarifa_corte: { tipo: 'numero', requerido: true, min: 0 },
  activo: { tipo: 'booleano', defecto: true },
};

async function listar() {
  return modelo.listar();
}

async function obtener(idTexto) {
  const id = validarId(idTexto);
  const calibre = await modelo.obtenerPorId(id);
  if (!calibre) throw new HttpError(404, `No existe el calibre con id ${id}`);
  return calibre;
}

async function crear(body) {
  const datos = validarBody(body, REGLAS);
  return modelo.crear(datos);
}

async function actualizar(idTexto, body) {
  const id = validarId(idTexto);
  const datos = validarBody(body, REGLAS);
  const calibre = await modelo.actualizar(id, datos);
  if (!calibre) throw new HttpError(404, `No existe el calibre con id ${id}`);
  return calibre;
}

async function eliminar(idTexto) {
  const id = validarId(idTexto);
  const calibre = await modelo.eliminar(id).catch((error) => {
    throw siDependenEntonces409(error);
  });
  if (!calibre) throw new HttpError(404, `No existe el calibre con id ${id}`);
  return calibre;
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
