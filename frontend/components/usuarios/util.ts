import type { Usuario } from "@/lib/tipos-usuarios";

const FECHA_HORA = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" });

// Fecha y hora legibles; sin fecha devuelve el texto `vacio` ("Nunca").
export function fechaHora(valor: string | null, vacio = "Nunca") {
  return valor ? FECHA_HORA.format(new Date(valor)) : vacio;
}

// Bloqueado por intentos fallidos mientras bloqueado_hasta siga en el futuro.
export function estaBloqueado(usuario: Usuario, ahora = Date.now()) {
  return usuario.bloqueado_hasta !== null && new Date(usuario.bloqueado_hasta).getTime() > ahora;
}

// Mismas reglas que el backend (utils/clave.js): mínimo 8 caracteres,
// al menos una letra y un número, y máximo 72 bytes (una tilde o una ñ ocupan 2).
export function erroresClave(clave: string, confirmacion: string) {
  const errores: string[] = [];
  if (clave.length < 8) errores.push("La clave debe tener al menos 8 caracteres.");
  if (new TextEncoder().encode(clave).length > 72) errores.push("La clave es demasiado larga (máximo 72 bytes).");
  if (!/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(clave) || !/\d/.test(clave)) {
    errores.push("La clave debe tener al menos una letra y un número.");
  }
  if (clave !== confirmacion) errores.push("La confirmación no coincide con la clave.");
  return errores;
}

// Mismo formato que exige el backend para el nombre de usuario y el correo.
export const NOMBRE_USUARIO_VALIDO = /^[A-Za-z0-9._-]{3,30}$/;
export const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
