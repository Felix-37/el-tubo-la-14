import type { ReactNode } from "react";

// Renglón "concepto ... valor" de los resúmenes de caja y del comprobante.
export default function Fila({ texto, valor, fuerte }: { texto: ReactNode; valor: ReactNode; fuerte?: boolean }) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 border-b border-border py-2 last:border-b-0 ${
        fuerte ? "text-base font-bold" : "text-sm"
      }`}
    >
      <span className={fuerte ? "" : "text-muted"}>{texto}</span>
      <span className="text-right font-semibold tabular-nums">{valor}</span>
    </div>
  );
}
