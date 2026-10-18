const modelo = require('../models/presentaciones.model');
const HttpError = require('../utils/httpError');
const { validarId, validarBody } = require('../utils/validar');
const { siDependenEntonces409 } = require('../utils/erroresPg');

const REGLAS = {
  producto_id: { tipo: 'entero', requerido: true, min: 1 },
  referencia: { tipo: 'texto', requerido: true, max: 40 },
  codigo_barras: { tipo: 'texto', max: 40 },
  medida: { tipo: 'texto', max: 40 },
  calibre_id: { tipo: 'entero', min: 1 },
  largo_fabrica_cm: { tipo: 'entero', min: 1 },
  precio_venta: { tipo: 'numero', requerido: true, min: 0 },
  costo: { tipo: 'numero', min: 0, defecto: 0 },
  existencia: { tipo: 'entero', min: 0, defecto: 0 },
  existencia_minima: { tipo: 'entero', min: 0, defecto: 0 },
  activo: { tipo: 'booleano', defecto: true },
};

async function listar() {
  return modelo.listar();
}

async function obtener(idTexto) {
  const id = validarId(idTexto);
  const presentacion = await modelo.obtenerPorId(id);
  if (!presentacion) throw new HttpError(404, `No existe la presentación con id ${id}`);
  return presentacion;
}

async function crear(body) {
  const datos = validarBody(body, REGLAS);
  return modelo.crear(datos);
}

async function actualizar(idTexto, body) {
  const id = validarId(idTexto);
  const datos = validarBody(body, REGLAS);
  const presentacion = await modelo.actualizar(id, datos);
  if (!presentacion) throw new HttpError(404, `No existe la presentación con id ${id}`);
  return presentacion;
}

async function eliminar(idTexto) {
  const id = validarId(idTexto);
  const presentacion = await modelo.eliminar(id).catch((error) => {
    throw siDependenEntonces409(error);
  });
  if (!presentacion) throw new HttpError(404, `No existe la presentación con id ${id}`);
  return presentacion;
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
