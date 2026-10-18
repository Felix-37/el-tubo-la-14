const modelo = require('../models/categorias.model');
const HttpError = require('../utils/httpError');
const { validarId, validarBody } = require('../utils/validar');
const { siDependenEntonces409 } = require('../utils/erroresPg');

const REGLAS = {
  nombre: { tipo: 'texto', requerido: true, max: 60 },
  activo: { tipo: 'booleano', defecto: true },
};

async function listar() {
  return modelo.listar();
}

async function obtener(idTexto) {
  const id = validarId(idTexto);
  const categoria = await modelo.obtenerPorId(id);
  if (!categoria) throw new HttpError(404, `No existe la categoría con id ${id}`);
  return categoria;
}

async function crear(body) {
  const datos = validarBody(body, REGLAS);
  return modelo.crear(datos);
}

async function actualizar(idTexto, body) {
  const id = validarId(idTexto);
  const datos = validarBody(body, REGLAS);
  const categoria = await modelo.actualizar(id, datos);
  if (!categoria) throw new HttpError(404, `No existe la categoría con id ${id}`);
  return categoria;
}

async function eliminar(idTexto) {
  const id = validarId(idTexto);
  const categoria = await modelo.eliminar(id).catch((error) => {
    throw siDependenEntonces409(error);
  });
  if (!categoria) throw new HttpError(404, `No existe la categoría con id ${id}`);
  return categoria;
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
