const HttpError = require('./httpError');

// Convierte el :id de la URL en número; si no es un entero positivo, responde 400.
function validarId(valor) {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, 'El id debe ser un número entero positivo', { id: valor });
  }
  return id;
}

// Revisa el body contra unas reglas y devuelve solo los campos permitidos.
// Cada regla: { tipo: 'texto' | 'numero' | 'entero' | 'booleano', requerido, max, min, decimales }.
function validarBody(body, reglas) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'El cuerpo de la solicitud debe ser un objeto JSON');
  }

  const errores = [];
  const datos = {};

  for (const [campo, regla] of Object.entries(reglas)) {
    const valor = body[campo];
    const falta = valor === undefined || valor === null || valor === '';

    if (falta) {
      if (regla.requerido) errores.push(`El campo "${campo}" es obligatorio`);
      else datos[campo] = regla.defecto !== undefined ? regla.defecto : null;
      continue;
    }

    if (regla.tipo === 'texto') {
      if (typeof valor !== 'string') errores.push(`El campo "${campo}" debe ser texto`);
      else if (regla.max && valor.trim().length > regla.max) errores.push(`El campo "${campo}" admite máximo ${regla.max} caracteres`);
      else datos[campo] = valor.trim();
    } else if (regla.tipo === 'numero' || regla.tipo === 'entero') {
      const esEntero = regla.tipo === 'entero';
      if (typeof valor !== 'number' || Number.isNaN(valor) || (esEntero && !Number.isInteger(valor))) {
        errores.push(`El campo "${campo}" debe ser un número${esEntero ? ' entero' : ''}`);
      } else if (regla.min !== undefined && valor < regla.min) {
        errores.push(`El campo "${campo}" debe ser mayor o igual a ${regla.min}`);
      } else if (regla.decimales !== undefined && Number(valor.toFixed(regla.decimales)) !== valor) {
        errores.push(`El campo "${campo}" admite máximo ${regla.decimales} decimales`);
      } else {
        datos[campo] = valor;
      }
    } else if (regla.tipo === 'booleano') {
      if (typeof valor !== 'boolean') errores.push(`El campo "${campo}" debe ser true o false`);
      else datos[campo] = valor;
    }
  }

  if (errores.length > 0) {
    throw new HttpError(400, 'Datos inválidos', errores);
  }
  return datos;
}

module.exports = { validarId, validarBody };
