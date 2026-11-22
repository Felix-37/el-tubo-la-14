const modelo = require('../models/usuarios.model');
const { revocarTodasDelUsuario } = require('../models/auth.model');
const HttpError = require('../utils/httpError');
const { validarId, validarBody } = require('../utils/validar');
const { hashClave, verificarClave, validarClaveNueva } = require('../utils/clave');
const { registrarEvento } = require('../utils/bitacora');
const { enTransaccion } = require('../utils/transaccion');

const ROLES = ['ADMIN', 'CAJERO', 'CLIENTE'];

const REGLAS_CREAR = {
  nombre_usuario: { tipo: 'texto', requerido: true, max: 30 },
  nombre_completo: { tipo: 'texto', requerido: true, max: 100 },
  correo: { tipo: 'texto', max: 120 },
  rol: { tipo: 'texto', requerido: true, max: 10 },
  cliente_id: { tipo: 'entero', min: 1 },
};

// En la actualización todo es opcional: lo que no se envía, no cambia.
const REGLAS_DATOS = {
  nombre_completo: { tipo: 'texto', max: 100 },
  correo: { tipo: 'texto', max: 120 },
};

const REGLAS_ROL = {
  rol: { tipo: 'texto', requerido: true, max: 10 },
  cliente_id: { tipo: 'entero', min: 1 },
};

function invalido(mensaje) {
  return new HttpError(400, 'Datos inválidos', [mensaje]);
}

function validarNombreUsuario(nombre) {
  if (!/^[A-Za-z0-9._-]{3,30}$/.test(nombre)) {
    throw invalido('El nombre de usuario debe tener de 3 a 30 caracteres: letras, números, punto, guion o guion bajo');
  }
}

function validarCorreo(correo) {
  if (correo !== null && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    throw invalido('El correo no tiene un formato válido');
  }
}

// Un usuario CLIENTE debe quedar enlazado a una ficha de cliente activa;
// los demás roles no tienen cliente (regla ck_usuario_cliente de la base).
async function validarRolYCliente(rol, clienteId, cliente) {
  if (!ROLES.includes(rol)) throw invalido(`El rol debe ser uno de: ${ROLES.join(', ')}`);
  if (rol !== 'CLIENTE') return null;
  if (clienteId === null) throw invalido('Un usuario CLIENTE necesita el campo "cliente_id"');
  if (!(await modelo.clienteActivo(clienteId, cliente))) throw invalido(`No existe un cliente activo con id ${clienteId}`);
  return clienteId;
}

function evento(actor, ip, usuario, tipo, detalle) {
  return registrarEvento({
    usuarioId: actor.id,
    nombreUsuario: actor.nombreUsuario,
    evento: tipo,
    detalle: `${usuario.nombre_usuario} (id ${usuario.usuario_id}): ${detalle}`,
    ip,
  });
}

async function obtenerExistente(id, cliente) {
  const usuario = await modelo.obtener(id, cliente);
  if (!usuario) throw new HttpError(404, `No existe el usuario con id ${id}`);
  return usuario;
}

function exigirNoEliminado(usuario) {
  if (usuario.eliminado_en) throw new HttpError(409, 'El usuario está eliminado; reactívelo primero');
}

// No se puede dejar el sistema sin un administrador activo.
async function exigirOtroAdmin(usuario, cliente) {
  if (usuario.rol_codigo === 'ADMIN' || usuario.rol === 'ADMIN') {
    if (usuario.activo && (await modelo.contarOtrosAdmins(usuario.usuario_id, cliente)) === 0) {
      throw new HttpError(409, 'Debe quedar al menos un administrador activo');
    }
  }
}

function exigirOtro(actor, id, accion) {
  if (actor.id === id) throw new HttpError(409, `No puede ${accion} su propia cuenta`);
}

async function listar(query) {
  return modelo.listar({ incluirEliminados: query.eliminados === 'true' });
}

async function obtener(idTexto) {
  return obtenerExistente(validarId(idTexto));
}

async function clientesDisponibles() {
  return modelo.clientesDisponibles();
}

async function crear(actor, body, ip) {
  const datos = validarBody(body, REGLAS_CREAR);
  validarNombreUsuario(datos.nombre_usuario);
  validarCorreo(datos.correo);
  const clienteId = await validarRolYCliente(datos.rol, datos.cliente_id);
  validarClaveNueva(body.clave);

  const id = await modelo.crear({ ...datos, cliente_id: clienteId, hash_clave: await hashClave(body.clave) });
  const usuario = await modelo.obtener(id);
  await evento(actor, ip, usuario, 'USUARIO_CREADO', `rol ${usuario.rol}`);
  return usuario;
}

// Cambia nombre, correo y/o clave; solo lo que llegue en el body.
// Para cambiar la propia clave hay que enviar la actual. El ADMIN puede
// restablecer la clave de otro usuario sin conocerla.
async function actualizar(actor, id, body, ip) {
  const datos = validarBody(body, REGLAS_DATOS);
  if (datos.correo !== null) validarCorreo(datos.correo);
  const cambiaClave = body.clave !== undefined && body.clave !== null && body.clave !== '';
  if (cambiaClave) validarClaveNueva(body.clave);

  let antes;
  let claveActualMala = false;
  await enTransaccion(async (cliente) => {
    antes = await modelo.obtenerConHash(id, cliente);
    if (!antes) throw new HttpError(404, `No existe el usuario con id ${id}`);
    exigirNoEliminado(antes);

    if (cambiaClave && actor.id === id) {
      const claveActual = typeof body.clave_actual === 'string' ? body.clave_actual : '';
      if (!(await verificarClave(claveActual, antes.hash_clave))) {
        claveActualMala = true;
        throw invalido('La clave actual no es correcta');
      }
    }

    await modelo.actualizarDatos(id, {
      nombre_completo: body.nombre_completo === undefined ? antes.nombre_completo : datos.nombre_completo || antes.nombre_completo,
      correo: body.correo === undefined ? antes.correo : datos.correo,
    }, cliente);

    if (cambiaClave) {
      await modelo.cambiarClave(id, await hashClave(body.clave), cliente);
      // Al cambiar la clave se cierran todas las sesiones de ese usuario.
      await revocarTodasDelUsuario(id, cliente);
    }
  }).catch(async (error) => {
    if (claveActualMala) {
      await evento(actor, ip, antes, 'INGRESO_FALLIDO', 'clave actual incorrecta al cambiar la clave');
    }
    throw error;
  });

  const usuario = await modelo.obtener(id);
  const cambios = [];
  if (usuario.nombre_completo !== antes.nombre_completo) cambios.push('nombre');
  if (usuario.correo !== antes.correo) cambios.push(`correo ${antes.correo || '(vacío)'} -> ${usuario.correo || '(vacío)'}`);
  if (cambios.length) await evento(actor, ip, usuario, 'USUARIO_DATOS', cambios.join(', '));
  if (cambiaClave) {
    await evento(actor, ip, usuario, 'CAMBIO_CLAVE', actor.id === id ? 'cambió su clave' : 'clave restablecida por el administrador');
  }
  return usuario;
}

async function actualizarPorId(actor, idTexto, body, ip) {
  return actualizar(actor, validarId(idTexto), body, ip);
}

async function cambiarRol(actor, idTexto, body, ip) {
  const id = validarId(idTexto);
  exigirOtro(actor, id, 'cambiar el rol de');
  const datos = validarBody(body, REGLAS_ROL);

  let anterior;
  await enTransaccion(async (cliente) => {
    await modelo.bloquearCambiosDeAdmins(cliente);
    anterior = await obtenerExistente(id, cliente);
    exigirNoEliminado(anterior);
    const clienteId = await validarRolYCliente(datos.rol, datos.cliente_id, cliente);
    if (anterior.rol === datos.rol && anterior.cliente_id === clienteId) return;
    if (datos.rol !== 'ADMIN') await exigirOtroAdmin(anterior, cliente);
    await modelo.cambiarRol(id, datos.rol, clienteId, cliente);
    await revocarTodasDelUsuario(id, cliente);
  });

  const usuario = await modelo.obtener(id);
  if (anterior.rol !== usuario.rol || anterior.cliente_id !== usuario.cliente_id) {
    await evento(actor, ip, usuario, 'CAMBIO_ROL', `${anterior.rol} -> ${usuario.rol}`);
  }
  return usuario;
}

async function cambiarEstado(actor, idTexto, body, ip) {
  const id = validarId(idTexto);
  exigirOtro(actor, id, 'activar o desactivar');
  const { activo } = validarBody(body, { activo: { tipo: 'booleano', requerido: true } });

  let anterior;
  await enTransaccion(async (cliente) => {
    await modelo.bloquearCambiosDeAdmins(cliente);
    anterior = await obtenerExistente(id, cliente);
    if (!activo) {
      await exigirOtroAdmin(anterior, cliente);
      await revocarTodasDelUsuario(id, cliente);
    }
    await modelo.cambiarEstado(id, activo, cliente);
  });

  const usuario = await modelo.obtener(id);
  if (anterior.activo !== usuario.activo || anterior.eliminado_en !== usuario.eliminado_en) {
    await evento(actor, ip, usuario, 'USUARIO_ESTADO', activo ? 'activado' : 'desactivado');
  }
  return usuario;
}

// Borrado lógico: el usuario conserva su historial (ventas, bitácora)
// pero no puede volver a entrar. Se puede reactivar cambiando su estado.
async function eliminar(actor, idTexto, ip) {
  const id = validarId(idTexto);
  exigirOtro(actor, id, 'eliminar');

  await enTransaccion(async (cliente) => {
    await modelo.bloquearCambiosDeAdmins(cliente);
    const actual = await obtenerExistente(id, cliente);
    exigirNoEliminado(actual);
    await exigirOtroAdmin(actual, cliente);
    await revocarTodasDelUsuario(id, cliente);
    await modelo.eliminarLogico(id, cliente);
  });

  const usuario = await modelo.obtener(id);
  await evento(actor, ip, usuario, 'USUARIO_ESTADO', 'eliminado (borrado lógico)');
  return usuario;
}

module.exports = {
  listar, obtener, clientesDisponibles, crear, actualizar, actualizarPorId, cambiarRol, cambiarEstado, eliminar,
};
