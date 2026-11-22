"use client";

import type { ClienteDisponible } from "@/lib/tipos-usuarios";
import { useDatos } from "@/lib/useDatos";

type SelectClienteProps = {
  id: string;
  valor: string;
  onCambio: (valor: string) => void;
};

// Clientes activos que aún no tienen usuario. Solo se monta cuando el rol
// elegido es CLIENTE, así la consulta se hace únicamente si hace falta.
export default function SelectCliente({ id, valor, onCambio }: SelectClienteProps) {
  const { datos, cargando, error } = useDatos<ClienteDisponible>("/usuarios/clientes-disponibles");
  return (
    <>
      <select id={id} className="campo" value={valor} onChange={(e) => onCambio(e.target.value)}>
        <option value="">{cargando ? "Cargando…" : "Seleccione…"}</option>
        {datos.map((c) => (
          <option key={c.cliente_id} value={c.cliente_id}>
            {c.nombre}
            {c.documento ? ` (${c.documento})` : ""}
          </option>
        ))}
      </select>
      {error ? (
        <p className="mt-1 text-xs whitespace-pre-line text-primary-dark">{error}</p>
      ) : (
        !cargando &&
        datos.length === 0 && (
          <p className="mt-1 text-xs text-muted">No hay clientes activos sin usuario para enlazar.</p>
        )
      )}
    </>
  );
}
