const modelo = require('../models/productos.model');
const HttpError = require('../utils/httpError');
const { validarId, validarBody } = require('../utils/validar');
const { siDependenEntonces409 } = require('../utils/erroresPg');

const REGLAS = {
  nombre: { tipo: 'texto', requerido: true, max: 120 },
  categoria_id: { tipo: 'entero', requerido: true, min: 1 },
  descripcion: { tipo: 'texto', max: 400 },
  es_cortable: { tipo: 'booleano', defecto: false },
  activo: { tipo: 'booleano', defecto: true },
};

async function listar() {
  return modelo.listar();
}

async function obtener(idTexto) {
  const id = validarId(idTexto);
  const producto = await modelo.obtenerPorId(id);
  if (!producto) throw new HttpError(404, `No existe el producto con id ${id}`);
  return producto;
}

async function crear(body) {
  const datos = validarBody(body, REGLAS);
  return modelo.crear(datos);
}

async function actualizar(idTexto, body) {
  const id = validarId(idTexto);
  const datos = validarBody(body, REGLAS);
  const producto = await modelo.actualizar(id, datos);
  if (!producto) throw new HttpError(404, `No existe el producto con id ${id}`);
  return producto;
}

async function eliminar(idTexto) {
  const id = validarId(idTexto);
  const producto = await modelo.eliminar(id).catch((error) => {
    throw siDependenEntonces409(error);
  });
  if (!producto) throw new HttpError(404, `No existe el producto con id ${id}`);
  return producto;
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
