const servicio = require('../services/productos.service');

async function listar(req, res, next) {
  try {
    const datos = await servicio.listar();
    res.status(200).json({ ok: true, data: datos });
  } catch (error) {
    next(error);
  }
}

async function obtener(req, res, next) {
  try {
    const producto = await servicio.obtener(req.params.id);
    res.status(200).json({ ok: true, data: producto });
  } catch (error) {
    next(error);
  }
}

async function crear(req, res, next) {
  try {
    const producto = await servicio.crear(req.body);
    res.status(201).json({ ok: true, mensaje: 'Producto creado', data: producto });
  } catch (error) {
    next(error);
  }
}

async function actualizar(req, res, next) {
  try {
    const producto = await servicio.actualizar(req.params.id, req.body);
    res.status(200).json({ ok: true, mensaje: 'Producto actualizado', data: producto });
  } catch (error) {
    next(error);
  }
}

async function eliminar(req, res, next) {
  try {
    const producto = await servicio.eliminar(req.params.id);
    res.status(200).json({ ok: true, mensaje: 'Producto eliminado', data: producto });
  } catch (error) {
    next(error);
  }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };