"use client";

import Estado from "@/components/Estado";
import VistaDetalle from "@/components/VistaDetalle";
import type { Producto } from "@/lib/tipos";

export default function DetalleProducto() {
  return (
    <VistaDetalle<Producto>
      tabla="productos"
      titulo="Producto"
      conArticulo="el producto"
      nombre={(p) => p.nombre}
      campos={(p) => [
        { etiqueta: "Id", valor: p.producto_id },
        { etiqueta: "Nombre", valor: p.nombre },
        { etiqueta: "Categoría", valor: p.categoria },
        { etiqueta: "¿Se vende por corte?", valor: p.es_cortable ? "Sí" : "No" },
        { etiqueta: "Estado", valor: <Estado activo={p.activo} /> },
        { etiqueta: "Descripción", valor: p.descripcion || "—", ancho: true },
      ]}
    />
  );
}
