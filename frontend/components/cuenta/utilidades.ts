import type { TipoMovimiento } from "@/lib/tipos-cuenta";

// Las fechas se muestran en la hora de Colombia, sin importar el equipo.
const ZONA = "America/Bogota";

const FECHA = new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: ZONA });
const FECHA_CORTA = new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "2-digit", timeZone: ZONA });
const FECHA_HORA = new Intl.DateTimeFormat("es-CO", { dateStyle: "short", timeStyle: "short", timeZone: ZONA });

// "2026-09-17T15:42:00Z" -> "17/09/2026"
export function fecha(iso: string) {
  return FECHA.format(new Date(iso));
}

// "2026-09-17T15:42:00Z" -> "17/09"
export function fechaCorta(iso: string) {
  return FECHA_CORTA.format(new Date(iso));
}

// "2026-09-17T15:42:00Z" -> "17/09/26, 10:42 a. m."
export function fechaHora(iso: string) {
  return FECHA_HORA.format(new Date(iso));
}

// Abonos y reversos bajan la deuda: se muestran en verde y con signo menos.
export function restaDeuda(tipo: TipoMovimiento) {
  return tipo === "ABONO" || tipo === "REVERSO";
}

const NOMBRE_FORMA: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
  CREDITO: "Crédito",
};

export function nombreForma(codigo: string | null) {
  return codigo ? (NOMBRE_FORMA[codigo] ?? codigo) : "";
}

// Texto de cada movimiento de la cartera.
export function textoMovimiento(tipo: TipoMovimiento, numeroVenta: number | null, formaPago: string | null) {
  const venta = numeroVenta ? ` N.º ${numeroVenta}` : "";
  if (tipo === "CARGO") return `Venta a crédito${venta}`;
  if (tipo === "SALDO_INICIAL") return "Saldo inicial";
  if (tipo === "REVERSO") return `Anulación de venta${venta}`;
  return formaPago ? `Abono (${nombreForma(formaPago)})` : "Abono";
}

// Reglas de la clave nueva, las mismas del backend: mínimo 8 caracteres,
// máximo 72 bytes (bcrypt), al menos una letra y un número.
export function errorClaveNueva(clave: string) {
  if (clave.length < 8) return "La contraseña nueva debe tener al menos 8 caracteres.";
  if (new TextEncoder().encode(clave).length > 72) return "La contraseña nueva es demasiado larga (máximo 72 bytes).";
  if (!/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(clave) || !/\d/.test(clave)) {
    return "La contraseña nueva debe tener al menos una letra y un número.";
  }
  return null;
}

export const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
