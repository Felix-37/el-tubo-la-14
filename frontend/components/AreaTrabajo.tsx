"use client";

import Link from "next/link";
import { Boxes, Gauge, Package, Plus, Tags, TriangleAlert } from "lucide-react";
import Card from "@/components/Card";
import Mensaje from "@/components/Mensaje";
import type { Calibre, Categoria, Presentacion, Producto } from "@/lib/tipos";
import { useDatos } from "@/lib/useDatos";

// Panel principal: cuántos registros hay en cada tabla (GET de cada una) y accesos rápidos.
export default function AreaTrabajo() {
  const categorias = useDatos<Categoria>("/categorias");
  const calibres = useDatos<Calibre>("/calibres");
  const productos = useDatos<Producto>("/productos");
  const presentaciones = useDatos<Presentacion>("/presentaciones");

  const tablas = [
    {
      titulo: "Categorías",
      descripcion: "Agrupan los productos: tubos, perfiles, tejas, accesorios…",
      icono: Tags,
      href: "/categorias",
      nuevo: "/categorias/nueva",
      consulta: categorias,
    },
    {
      titulo: "Calibres",
      descripcion: "Grosor del material y la tarifa que se cobra por cada corte.",
      icono: Gauge,
      href: "/calibres",
      nuevo: "/calibres/nuevo",
      consulta: calibres,
    },
    {
      titulo: "Productos",
      descripcion: "Producto base, su categoría y si se vende por corte.",
      icono: Package,
      href: "/productos",
      nuevo: "/productos/nuevo",
      consulta: productos,
    },
    {
      titulo: "Presentaciones",
      descripcion: "Lo que se vende: referencia, medida, precio con IVA y existencia.",
      icono: Boxes,
      href: "/presentaciones",
      nuevo: "/presentaciones/nueva",
      consulta: presentaciones,
    },
  ];

  // Todas las consultas van al mismo backend: si falla una, basta con mostrar un aviso.
  const error = tablas.find((t) => t.consulta.error)?.consulta.error ?? null;
  const bajas = presentaciones.datos.filter((p) => p.activo && p.existencia <= p.existencia_minima);

  return (
    <>
      <h1 className="text-2xl font-bold md:text-3xl">Área de trabajo</h1>
      <p className="mt-1 mb-6 max-w-2xl text-sm text-muted">
        Catálogo de El Tubo La 14 (perfilería y cubiertas). Desde aquí se crean, consultan, editan y eliminan
        los registros de las cuatro tablas, consumiendo el backend en Express.
      </p>
      <Mensaje mensaje={error ? { tipo: "error", texto: error } : null} />

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {tablas.map(({ consulta, titulo, descripcion, icono, href }) => (
          <Card
            key={href}
            titulo={titulo}
            descripcion={descripcion}
            icono={icono}
            href={href}
            cantidad={consulta.error ? null : consulta.datos.length}
            cargando={consulta.cargando}
          />
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Accesos rápidos</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {tablas.map(({ titulo, nuevo }) => (
              <Link
                key={nuevo}
                href={nuevo}
                className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:border-primary hover:text-primary"
              >
                <Plus size={16} />
                Nuevo registro en {titulo.toLowerCase()}
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <TriangleAlert size={20} className="text-accent" />
            Existencia baja
          </h2>
          {presentaciones.cargando ? (
            <p className="text-sm text-muted">Cargando…</p>
          ) : bajas.length === 0 ? (
            <p className="text-sm text-muted">Ninguna presentación activa está en su existencia mínima.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {bajas.map((p) => (
                <li key={p.presentacion_id} className="flex items-center justify-between gap-3 py-2">
                  <Link href={`/presentaciones/${p.presentacion_id}`} className="hover:text-primary">
                    <span className="font-mono text-xs font-semibold">{p.referencia}</span> · {p.producto}
                  </Link>
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium whitespace-nowrap text-accent">
                    {p.existencia} / mín. {p.existencia_minima}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
