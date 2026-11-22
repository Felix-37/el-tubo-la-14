"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, Plus } from "lucide-react";
import { BotonEnlace } from "@/components/Boton";
import Buscador from "@/components/Buscador";
import Mensaje from "@/components/Mensaje";
import Tabla from "@/components/Tabla";
import { useSesion } from "@/components/auth/ProveedorSesion";
import { normalizar, pesos } from "@/lib/formato";
import type { Venta } from "@/lib/tipos-ventas";
import { useDatos } from "@/lib/useDatos";
import { fechaHora } from "./util";

// Ruta /ventas. El backend ya filtra: el cajero recibe solo sus ventas y el admin todas.
export default function ListaVentas() {
  const { usuario } = useSesion();
  const esCajero = usuario?.rol === "CAJERO";
  const { datos, cargando, error } = useDatos<Venta>("/ventas");
  const [busqueda, setBusqueda] = useState("");

  const texto = normalizar(busqueda.trim());
  const filtradas = datos.filter((v) =>
    [String(v.numero_venta), v.cajero, v.cliente, v.forma_pago_nombre].some((campo) => normalizar(campo).includes(texto)),
  );

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">{esCajero ? "Mis ventas" : "Ventas"}</h1>
          <p className="mt-1 text-sm text-muted">
            {esCajero ? "Ventas que usted registró, de la más reciente a la más antigua." : "Ventas de todos los cajeros."}
          </p>
        </div>
        {esCajero && (
          <BotonEnlace href="/ventas/nueva" icono={Plus}>
            Nueva venta
          </BotonEnlace>
        )}
      </div>
      <Mensaje mensaje={error ? { tipo: "error", texto: error } : null} />
      <Buscador valor={busqueda} onCambio={setBusqueda} placeholder="Buscar por número, cajero, cliente o forma de pago" />
      <Tabla
        columnas={["N.º", "Fecha", "Cajero", "Cliente", "Forma de pago", "Total", "Acciones"]}
        cargando={cargando}
        vacia={filtradas.length === 0}
        textoVacia="No hay ventas para mostrar."
      >
        {filtradas.map((v) => (
          <tr key={v.venta_id} className="hover:bg-background/60">
            <td className="font-medium">{v.numero_venta}</td>
            <td className="whitespace-nowrap text-muted">{fechaHora(v.fecha)}</td>
            <td>{v.cajero}</td>
            <td>{v.cliente ?? <span className="text-muted">Mostrador</span>}</td>
            <td>{v.forma_pago_nombre}</td>
            <td className="text-right font-semibold whitespace-nowrap tabular-nums">{pesos(v.total)}</td>
            <td>
              <Link
                href={`/ventas/${v.venta_id}`}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-foreground hover:bg-background"
              >
                <Eye size={14} />
                Ver
              </Link>
            </td>
          </tr>
        ))}
      </Tabla>
    </>
  );
}
