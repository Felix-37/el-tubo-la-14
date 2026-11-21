"use client";

import { useEffect, type ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import Boton from "./Boton";

type ModalProps = {
  abierto: boolean;
  titulo: string;
  children: ReactNode;
  textoConfirmar?: string;
  procesando?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
};

// Ventana de confirmación. Se usa antes de eliminar un registro, en las listas y en el detalle.
export default function Modal({
  abierto,
  titulo,
  children,
  textoConfirmar = "Eliminar",
  procesando = false,
  onConfirmar,
  onCancelar,
}: ModalProps) {
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
        aria-labelledby="modal-titulo"
        className="w-full max-w-md rounded-lg bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="rounded-full bg-primary-soft p-2 text-primary">
            <TriangleAlert size={22} />
          </span>
          <div>
            <h2 id="modal-titulo" className="text-lg font-semibold">
              {titulo}
            </h2>
            <div className="mt-1 text-sm text-muted">{children}</div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Boton variante="secundario" onClick={() => !procesando && onCancelar()}>
            Cancelar
          </Boton>
          <Boton variante="peligro" onClick={onConfirmar} procesando={procesando}>
            {procesando ? "Eliminando…" : textoConfirmar}
          </Boton>
        </div>
      </div>
    </div>
  );
}
