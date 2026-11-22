// Lectura de variables de entorno. Si falta una obligatoria, se lanza un
// error y el servidor no arranca (nada de valores por defecto en el código).
function requerida(nombre) {
  const valor = process.env[nombre];
  if (valor === undefined || valor.trim() === '') {
    throw new Error(`Falta la variable de entorno ${nombre} (ver .env.example)`);
  }
  return valor.trim();
}

function enteroRequerido(nombre) {
  const valor = Number(requerida(nombre));
  if (!Number.isInteger(valor)) {
    throw new Error(`La variable ${nombre} debe ser un número entero`);
  }
  return valor;
}

module.exports = { requerida, enteroRequerido };
