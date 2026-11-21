"use client";

import Estado from "@/components/Estado";
import VistaDetalle from "@/components/VistaDetalle";
import type { Categoria } from "@/lib/tipos";

export default function DetalleCategoria() {
  return (
    <VistaDetalle<Categoria>
      tabla="categorias"
      titulo="Categoría"
      conArticulo="la categoría"
      nombre={(c) => c.nombre}
      campos={(c) => [
        { etiqueta: "Id", valor: c.categoria_id },
        { etiqueta: "Nombre", valor: c.nombre },
        { etiqueta: "Estado", valor: <Estado activo={c.activo} /> },
      ]}
    />
  );
}
