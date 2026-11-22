"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Mensaje from "@/components/Mensaje";
import { pesos } from "@/lib/formato";
import type { CompraDetalle } from "@/lib/tipos-cuenta";
import { useRegistro } from "@/lib/useDatos";
import { Anulada } from "./ListaCompras";
import { Cargando } from "./Tarjeta";
import { fechaHora } from "./utilidades";

// Ruta /mi-cuenta/compras/[id]: comprobante de una compra con sus líneas.
// Si la compra es de otro cliente (403) o no existe (404), se muestra el mensaje del backend.
export default function DetalleCompra() {
  const { id } = useParams<{ id: string }>();
  const { registro: compra, cargando, error } = useRegistro<CompraDetalle>(`/mi-cuenta/compras/${id}`);
  const anulada = compra?.estado === "ANULADA";

  return (
    <div className="mx-auto max-w-xl">
      <Link
        href="/mi-cuenta/compras"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-primary"
      >
        <ArrowLeft size={16} />
        Volver a mis compras
      </Link>
      <h1 className="mb-4 text-2xl font-bold">{compra ? `Venta N.º ${compra.numero_venta}` : "Detalle de la compra"}</h1>
      <Mensaje mensaje={error ? { tipo: "error", texto: error } : null} />

      {cargando ? (
        <Cargando />
      ) : (
        compra && (
          <div className="rounded-lg border border-border bg-surface p-5 shadow-sm md:p-6">
            <div className="border-b border-dashed border-border pb-4 text-center">
              <p className="font-bold">Cerrajería El Tubo La 14</p>
              <p className="mt-1 text-sm text-muted">
                {fechaHora(compra.fecha)} · Atendió {compra.cajero}
              </p>
              {anulada && (
                <p className="mt-2">
                  <Anulada />
                </p>
              )}
            </div>

            <ul className="divide-y divide-border">
              {compra.lineas.map((l) => (
                <li key={l.linea} className="flex items-start justify-between gap-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="break-words">{l.descripcion}</p>
                    {l.cantidad != null && l.cantidad > 1 && (
                      <p className="mt-0.5 text-xs text-muted">
                        {l.cantidad} × {pesos(l.precio_unitario)}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0">{pesos(l.valor)}</span>
                </li>
              ))}
            </ul>

            <dl className="grid gap-2 border-t border-border pt-3 text-sm">
              {compra.descuento > 0 && (
                <>
                  {/* Suma de las líneas: el subtotal de la venta no incluye las tarifas de corte. */}
                  <Fila etiqueta="Subtotal" valor={pesos(compra.lineas.reduce((suma, l) => suma + l.valor, 0))} />
                  <Fila etiqueta="Descuento" valor={`−${pesos(compra.descuento)}`} />
                </>
              )}
              <div className="flex items-baseline justify-between gap-4 border-y border-border py-3">
                <dt className="font-bold">Total</dt>
                <dd className={`text-2xl font-bold ${anulada ? "text-muted line-through" : "text-primary"}`}>
                  {pesos(compra.total)}
                </dd>
              </div>
              <Fila etiqueta="Forma de pago" valor={compra.forma_pago_nombre} />
              {compra.forma_pago === "EFECTIVO" && compra.valor_recibido != null && (
                <Fila
                  etiqueta="Recibido / cambio"
                  valor={`${pesos(compra.valor_recibido)} / ${pesos(compra.cambio ?? 0)}`}
                />
              )}
            </dl>

            {compra.observacion && (
              <p className="mt-4 rounded-md border border-dashed border-border bg-background px-4 py-3 text-sm break-words">
                {compra.observacion}
              </p>
            )}
            <p className="mt-4 text-center text-xs text-muted">Precios con IVA incluido</p>
          </div>
        )
      )}
    </div>
  );
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{etiqueta}</dt>
      <dd className="text-right">{valor}</dd>
    </div>
  );
}
