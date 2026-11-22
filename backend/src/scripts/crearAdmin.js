// Crea el primer usuario del sistema: el administrador.
// Uso: npm run seed:admin (lee ADMIN_INICIAL_* del archivo .env).
// Si el usuario ya existe y es ADMIN, le pone la clave del .env, lo
// reactiva y cierra sus sesiones; sirve también para recuperar el acceso.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const pool = require('../config/db');
const { hashClave, validarClaveNueva } = require('../utils/clave');
const { registrarEvento } = require('../utils/bitacora');

function variable(nombre, obligatoria = true) {
  const valor = (process.env[nombre] || '').trim();
  if (obligatoria && !valor) throw new Error(`Falta ${nombre} en el archivo .env`);
  return valor || null;
}

async function main() {
  const usuario = variable('ADMIN_INICIAL_USUARIO');
  const nombre = variable('ADMIN_INICIAL_NOMBRE');
  const correo = variable('ADMIN_INICIAL_CORREO', false);
  const clave = process.env.ADMIN_INICIAL_CLAVE || '';
  validarClaveNueva(clave);

  const hash = await hashClave(clave);
  const { rows } = await pool.query(
    'SELECT usuario_id, rol_codigo FROM usuario WHERE nombre_usuario = $1',
    [usuario],
  );

  if (rows[0]) {
    if (rows[0].rol_codigo !== 'ADMIN') {
      throw new Error(`El usuario "${usuario}" ya existe con rol ${rows[0].rol_codigo}; elija otro nombre`);
    }
    const id = rows[0].usuario_id;
    await pool.query(
      `UPDATE usuario SET hash_clave = $2, clave_cambiada_en = now(), activo = true, eliminado_en = NULL,
              intentos_fallidos = 0, bloqueado_hasta = NULL
        WHERE usuario_id = $1`,
      [id, hash],
    );
    await pool.query('UPDATE refresh_token SET revocado_en = now() WHERE usuario_id = $1 AND revocado_en IS NULL', [id]);
    await registrarEvento({ usuarioId: id, nombreUsuario: usuario, evento: 'CAMBIO_CLAVE', detalle: 'Clave fijada por seed:admin' });
    console.log(`El administrador "${usuario}" ya existía: se actualizó su clave y quedó activo.`);
  } else {
    const nuevo = await pool.query(
      `INSERT INTO usuario (nombre_usuario, nombre_completo, correo, rol_codigo, hash_clave)
       VALUES ($1, $2, $3, 'ADMIN', $4) RETURNING usuario_id`,
      [usuario, nombre, correo, hash],
    );
    await registrarEvento({ usuarioId: nuevo.rows[0].usuario_id, nombreUsuario: usuario, evento: 'USUARIO_CREADO', detalle: 'Primer administrador (seed:admin)' });
    console.log(`Administrador "${usuario}" creado.`);
  }
}

main()
  .catch((error) => {
    console.error('No se pudo crear el administrador:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
