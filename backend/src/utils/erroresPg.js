const HttpError = require('./httpError');

// Traduce los errores de PostgreSQL a respuestas HTTP entendibles.
// Códigos: https://www.postgresql.org/docs/current/errcodes-appendix.html
function traducirErrorPg(error) {
  switch (error.code) {
    case '23505': // unique_violation
      return new HttpError(409, 'Ya existe un registro con ese valor', error.detail);
    case '23503': // foreign_key_violation (al crear o actualizar; el borrado lo atiende cada servicio)
      return new HttpError(400, 'El registro relacionado no existe', error.detail);
    case '23514': // check_violation
      return new HttpError(400, 'Un valor no cumple las reglas de la tabla', error.constraint);
    case '23502': // not_null_violation
      return new HttpError(400, `El campo "${error.column}" es obligatorio`);
    case '22P02': // invalid_text_representation
    case '22003': // numeric_value_out_of_range
      return new HttpError(400, 'Un valor tiene un formato o tamaño inválido');
    default:
      return null;
  }
}

// Al borrar, una violación de llave foránea significa que otros registros
// dependen del que se quiere eliminar: se responde 409 (conflicto).
function siDependenEntonces409(error) {
  if (error.code === '23503') {
    return new HttpError(409, 'No se puede eliminar: otros registros dependen de este', error.detail);
  }
  return error;
}

module.exports = { traducirErrorPg, siDependenEntonces409 };
