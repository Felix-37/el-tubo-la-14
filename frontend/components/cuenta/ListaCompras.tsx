"use client";

import Link from "next/link";
import { Eye } from "lucide-react";
import Mensaje from "@/components/Mensaje";
import Tabla from "@/components/Tabla";
import { pesos } from "@/lib/formato";
import type { Compra } from "@/lib/tipos-cuenta";
import { useDatos } from "@/lib/useDatos";
import { Cargando } from "./Tarjeta";
import { fecha } from "./utilidades";

export function Anulada() {
  return (
    <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary-dark">Anulada</span>
  );
}

// Ruta /mi-cuenta/compras: compras del cliente de la sesión (GET /mi-cuenta/compras).
// En el celular se ven como tarjetas; en pantallas grandes, como tabla.
export default function ListaCompras() {
  const { datos, cargando, error } = useDatos<Compra>("/mi-cuenta/compras");

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold md:text-3xl">Mis compras</h1>
        <p className="mt-1 text-sm text-muted">Toque una compra para ver su comprobante.</p>
      </div>
      <Mensaje mensaje={error ? { tipo: "error", texto: error } : null} />

      {/* Celular */}
      <div className="grid gap-3 md:hidden">
        {cargando ? (
          <Cargando texto="Cargando compras…" />
        ) : datos.length === 0 ? (
          !error && <p className="text-sm text-muted">Todavía no tiene compras registradas.</p>
        ) : (
          datos.map((c) => (
            <Link
              key={c.venta_id}
              href={`/mi-cuenta/compras/${c.venta_id}`}
              className="flex items-start justify-between gap-4 rounded-lg border border-border bg-surface p-4 shadow-sm hover:border-primary"
            >
              <div>
                <p className="font-bold">Venta N.º {c.numero_venta}</p>
                <p className="mt-0.5 text-sm text-muted">{fecha(c.fecha)}</p>
                {c.estado === "ANULADA" && (
                  <p className="mt-1">
                    <Anulada />
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className={`font-bold ${c.estado === "ANULADA" ? "text-muted line-through" : ""}`}>{pesos(c.total)}</p>
                <p className="mt-0.5 text-sm text-muted">{c.forma_pago_nombre}</p>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Escritorio */}
      <div className="hidden md:block">
        <Tabla
          columnas={["Número", "Fecha", "Forma de pago", "Total", "Acciones"]}
          cargando={cargando}
          vacia={datos.length === 0}
          textoVacia="Todavía no tiene compras registradas."
        >
          {datos.map((c) => (
            <tr key={c.venta_id} className="hover:bg-background/60">
              <td className="font-medium">
                N.º {c.numero_venta} {c.estado === "ANULADA" && <Anulada />}
              </td>
              <td className="text-muted">{fecha(c.fecha)}</td>
              <td>{c.forma_pago_nombre}</td>
              <td className={`font-semibold ${c.estado === "ANULADA" ? "text-muted line-through" : ""}`}>
                {pesos(c.total)}
              </td>
              <td>
                <Link
                  href={`/mi-cuenta/compras/${c.venta_id}`}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-dark"
                >
                  <Eye size={16} />
                  Ver
                </Link>
              </td>
            </tr>
          ))}
        </Tabla>
      </div>
    </div>
  );
}
