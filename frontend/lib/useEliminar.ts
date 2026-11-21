"use client";

import { useState } from "react";
import { api } from "./api";

type Avisos<T> = {
  alEliminar: (registro: T, mensaje: string) => void;
  alFallar: (mensaje: string) => void;
};

// Lógica del borrado con confirmación: `pedir` abre el modal con el registro elegido,
// `confirmar` hace el DELETE y `cancelar` cierra el modal sin hacer nada.
export function useEliminar<T>(ruta: (registro: T) => string, { alEliminar, alFallar }: Avisos<T>) {
  const [pendiente, setPendiente] = useState<T | null>(null);
  const [eliminando, setEliminando] = useState(false);

  async function confirmar() {
    if (!pendiente) return;
    setEliminando(true);
    try {
      const { mensaje } = await api(ruta(pendiente), { method: "DELETE" });
      alEliminar(pendiente, mensaje ?? "Registro eliminado");
    } catch (e) {
      alFallar((e as Error).message);
    } finally {
      setEliminando(false);
      setPendiente(null);
    }
  }

  return { pendiente, pedir: setPendiente, cancelar: () => setPendiente(null), confirmar, eliminando };
}
