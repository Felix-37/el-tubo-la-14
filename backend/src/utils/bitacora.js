const pool = require('../config/db');

// Registra un evento de seguridad (ingresos, fallos, bloqueos, accesos
// denegados, cambios de usuarios). Si la bitácora falla, se informa en
// consola pero no se interrumpe la solicitud.
async function registrarEvento({ usuarioId = null, nombreUsuario = null, evento, detalle = null, ip = null }, cliente = pool) {
  try {
    await cliente.query(
      `INSERT INTO bitacora (usuario_id, nombre_usuario, evento, detalle, direccion_ip)
       VALUES ($1, $2, $3, $4, $5)`,
      [usuarioId, nombreUsuario ? String(nombreUsuario).slice(0, 60) : null, evento,
        detalle ? String(detalle).slice(0, 400) : null, ip ? String(ip).slice(0, 45) : null],
    );
  } catch (error) {
    console.error(`No se pudo registrar ${evento} en la bitácora:`, error.message);
  }
}

module.exports = { registrarEvento };
