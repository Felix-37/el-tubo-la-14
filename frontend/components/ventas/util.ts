import type { FormaPago } from "@/lib/tipos-ventas";

export const FORMAS_PAGO: { codigo: FormaPago; texto: string }[] = [
  { codigo: "EFECTIVO", texto: "Efectivo" },
  { codigo: "TRANSFERENCIA", texto: "Transferencia" },
  { codigo: "CREDITO", texto: "Crédito" },
];

const FECHA = new Intl.DateTimeFormat("es-CO", { dateStyle: "short", timeStyle: "short" });

// "2026-11-21T13:05:00Z" -> "21/11/26, 8:05 a. m."
export function fechaHora(valor: string | null | undefined) {
  return valor ? FECHA.format(new Date(valor)) : "—";
}

// Redondeo a centavos, igual que el backend.
export function redondear(n: number) {
  return Math.round(n * 100) / 100;
}

// Texto de un campo de dinero: null si está vacío, NaN si no es un valor
// válido (negativo, letras o más de 2 decimales). Acepta coma decimal.
export function leerDinero(texto: string) {
  const limpio = texto.trim().replace(",", ".");
  if (limpio === "") return null;
  return /^\d+(\.\d{1,2})?$/.test(limpio) ? Number(limpio) : NaN;
}
