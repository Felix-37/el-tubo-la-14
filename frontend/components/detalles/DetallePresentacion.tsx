"use client";

import Estado from "@/components/Estado";
import VistaDetalle from "@/components/VistaDetalle";
import { pesos } from "@/lib/formato";
import type { Presentacion } from "@/lib/tipos";

export default function DetallePresentacion() {
  return (
    <VistaDetalle<Presentacion>
      tabla="presentaciones"
      titulo="Presentación"
      conArticulo="la presentación"
      nombre={(p) => p.referencia}
      campos={(p) => [
        { etiqueta: "Id", valor: p.presentacion_id },
        { etiqueta: "Referencia", valor: <span className="font-mono">{p.referencia}</span> },
        { etiqueta: "Producto", valor: p.producto },
        { etiqueta: "Código de barras", valor: p.codigo_barras || "—" },
        { etiqueta: "Medida", valor: p.medida || "—" },
        { etiqueta: "Calibre", valor: p.calibre || "Sin calibre" },
        { etiqueta: "Largo de fábrica", valor: p.largo_fabrica_cm ? `${p.largo_fabrica_cm} cm` : "—" },
        { etiqueta: "Precio de venta con IVA", valor: pesos(p.precio_venta) },
        // El backend solo envía el costo al ADMIN; para los demás roles no se muestra.
        ...(p.costo !== undefined
          ? [
              { etiqueta: "Costo", valor: pesos(p.costo) },
              { etiqueta: "Margen", valor: pesos(p.precio_venta - p.costo) },
            ]
          : []),
        {
          etiqueta: "Existencia",
          valor: (
            <span className={p.existencia <= p.existencia_minima ? "font-semibold text-primary" : ""}>
              {p.existencia} (mínima {p.existencia_minima})
            </span>
          ),
        },
        { etiqueta: "Estado", valor: <Estado activo={p.activo} /> },
      ]}
    />
  );
}
