import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, LoaderCircle, Pencil, Trash } from "lucide-react";
import Boton, { BotonEnlace } from "./Boton";
import Mensaje, { type MensajeEstado } from "./Mensaje";

export type Campo = { etiqueta: string; valor: ReactNode; ancho?: boolean };

type DetalleProps = {
  titulo: string;
  volver: string;
  editar: string;
  cargando: boolean;
  mensaje: MensajeEstado;
  campos: Campo[] | null;
  onEliminar: () => void;
};

// Vista de un solo registro (GET /tabla/:id) con sus botones de Editar y Eliminar.
export default function Detalle({ titulo, volver, editar, cargando, mensaje, campos, onEliminar }: DetalleProps) {
  return (
    <div className="mx-auto max-w-3xl">
      <Link href={volver} className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-primary">
        <ArrowLeft size={16} />
        Volver a la lista
      </Link>
      <div className="rounded-lg border border-border bg-surface p-6 shadow-sm md:p-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="text-2xl font-bold">{titulo}</h1>
          {campos && (
            <div className="flex gap-3">
              <BotonEnlace href={editar} variante="secundario" icono={Pencil}>
                Editar
              </BotonEnlace>
              <Boton variante="peligro" icono={Trash} onClick={onEliminar}>
                Eliminar
              </Boton>
            </div>
          )}
        </div>
        <Mensaje mensaje={mensaje} />
        {cargando ? (
          <p className="text-sm text-muted">
            <LoaderCircle size={18} className="mr-2 inline animate-spin" />
            Cargando datos…
          </p>
        ) : (
          campos && (
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {campos.map(({ etiqueta, valor, ancho }) => (
                <div key={etiqueta} className={`border-b border-border pb-3 ${ancho ? "sm:col-span-2" : ""}`}>
                  <dt className="text-xs font-semibold tracking-wide text-muted uppercase">{etiqueta}</dt>
                  <dd className="mt-1 text-sm">{valor ?? "—"}</dd>
                </div>
              ))}
            </dl>
          )
        )}
      </div>
    </div>
  );
}
