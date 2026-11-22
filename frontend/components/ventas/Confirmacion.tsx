"use client";

import { useEffect, type ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import Boton from "@/components/Boton";

type ConfirmacionProps = {
  abierto: boolean;
  titulo: string;
  children: ReactNode;
  textoConfirmar: string;
  textoProcesando: string;
  procesando?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
};

// Igual que Modal, pero con el texto del botón propio de la acción
// (Modal dice "Eliminando…" mientras procesa, pensado para borrar).
export default function Confirmacion({
  abierto,
  titulo,
  children,
  textoConfirmar,
  textoProcesando,
  procesando = false,
  onConfirmar,
  onCancelar,
}: ConfirmacionProps) {
  // La tecla Escape cierra la ventana.
  useEffect(() => {
    if (!abierto) return;
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !procesando) onCancelar();
    };
    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  }, [abierto, procesando, onCancelar]);

  if (!abierto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => !procesando && onCancelar()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmacion-titulo"
        className="w-full max-w-md rounded-lg bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="rounded-full bg-primary-soft p-2 text-primary">
            <TriangleAlert size={22} />
          </span>
          <div className="flex-1">
            <h2 id="confirmacion-titulo" className="text-lg font-semibold">
              {titulo}
            </h2>
            <div className="mt-1 text-sm text-muted">{children}</div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Boton variante="secundario" onClick={() => !procesando && onCancelar()}>
            Cancelar
          </Boton>
          <Boton onClick={onConfirmar} procesando={procesando}>
            {procesando ? textoProcesando : textoConfirmar}
          </Boton>
        </div>
      </div>
    </div>
  );
}
