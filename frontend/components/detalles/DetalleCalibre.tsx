"use client";

import Estado from "@/components/Estado";
import VistaDetalle from "@/components/VistaDetalle";
import { pesos } from "@/lib/formato";
import type { Calibre } from "@/lib/tipos";

export default function DetalleCalibre() {
  return (
    <VistaDetalle<Calibre>
      tabla="calibres"
      titulo="Calibre"
      conArticulo="el calibre"
      nombre={(c) => c.nombre}
      campos={(c) => [
        { etiqueta: "Id", valor: c.calibre_id },
        { etiqueta: "Nombre", valor: c.nombre },
        { etiqueta: "Tarifa de corte", valor: pesos(c.tarifa_corte) },
        { etiqueta: "Estado", valor: <Estado activo={c.activo} /> },
        { etiqueta: "Descripción", valor: c.descripcion || "—", ancho: true },
      ]}
    />
  );
}
