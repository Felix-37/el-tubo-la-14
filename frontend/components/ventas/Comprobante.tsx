"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, LoaderCircle, Plus, Printer } from "lucide-react";
import Boton, { BotonEnlace } from "@/components/Boton";
import Mensaje from "@/components/Mensaje";
import { useSesion } from "@/components/auth/ProveedorSesion";
import { pesos } from "@/lib/formato";
import type { VentaConLineas } from "@/lib/tipos-ventas";
import { useRegistro } from "@/lib/useDatos";
import Fila from "./Fila";
import { fechaHora } from "./util";

// Ruta /ventas/[id]: comprobante de una venta (GET /ventas/:id). Si la venta
// es de otro cajero, el backend responde 403 y se muestra su mensaje.
export default function Comprobante() {
  const { id } = useParams<{ id: string }>();
  const { usuario } = useSesion();
  const { registro: venta, cargando, error } = useRegistro<VentaConLineas>(`/ventas/${id}`);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/ventas" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-primary print:hidden">
        <ArrowLeft size={16} />
        Volver a ventas
      </Link>
      <div className="rounded-lg border border-border bg-surface p-5 shadow-sm md:p-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{venta ? `Venta N.º ${venta.numero_venta}` : `Venta #${id}`}</h1>
            {venta && <p className="mt-1 text-sm text-muted">{fechaHora(venta.fecha)}</p>}
          </div>
          {venta && (
            <div className="flex flex-wrap gap-3 print:hidden">
              <Boton variante="secundario" icono={Printer} onClick={() => window.print()}>
                Imprimir
              </Boton>
              {usuario?.rol === "CAJERO" && (
                <BotonEnlace href="/ventas/nueva" icono={Plus}>
                  Nueva venta
                </BotonEnlace>
              )}
            </div>
          )}
        </div>

        <Mensaje mensaje={error ? { tipo: "error", texto: error } : null} />

        {cargando ? (
          <p className="text-sm text-muted">
            <LoaderCircle size={18} className="mr-2 inline animate-spin" />
            Cargando la venta…
          </p>
        ) : (
          venta && (
            <>
              <dl className="mb-6 grid gap-x-6 gap-y-4 sm:grid-cols-3">
                {[
                  { etiqueta: "Cajero", valor: venta.cajero },
                  { etiqueta: "Cliente", valor: venta.cliente ?? "Mostrador" },
                  { etiqueta: "Forma de pago", valor: venta.forma_pago_nombre },
                ].map(({ etiqueta, valor }) => (
                  <div key={etiqueta} className="border-b border-border pb-3">
                    <dt className="text-xs font-semibold tracking-wide text-muted uppercase">{etiqueta}</dt>
                    <dd className="mt-1 text-sm">{valor}</dd>
                  </div>
                ))}
              </dl>

              <div className="mb-6 overflow-x-auto rounded-lg border border-border">
                <table className="tabla w-full">
                  <thead>
                    <tr>
                      <th>Descripción</th>
                      <th className="text-right">Cant.</th>
                      <th className="text-right">Precio</th>
                      <th className="text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {venta.lineas.map((l) => (
                      <tr key={l.linea}>
                        <td>{l.descripcion}</td>
                        <td className="text-right tabular-nums">{l.cantidad}</td>
                        <td className="text-right whitespace-nowrap tabular-nums">{pesos(l.precio_unitario)}</td>
                        <td className="text-right font-medium whitespace-nowrap tabular-nums">{pesos(l.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="ml-auto max-w-sm">
                <Fila texto="Total" valor={<span className="text-primary">{pesos(venta.total)}</span>} fuerte />
                {venta.forma_pago === "EFECTIVO" && (
                  <>
                    <Fila texto="Recibido" valor={pesos(venta.valor_recibido)} />
                    <Fila texto="Cambio" valor={pesos(venta.cambio)} />
                  </>
                )}
                {venta.forma_pago === "CREDITO" && (
                  <p className="mt-2 text-sm text-muted">Cargado a la cartera de {venta.cliente}.</p>
                )}
              </div>

              {venta.observacion && <p className="mt-6 text-sm text-muted">Observación: {venta.observacion}</p>}
            </>
          )
        )}
      </div>
    </div>
  );
}
