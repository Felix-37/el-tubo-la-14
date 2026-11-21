import Link from "next/link";
import type { ReactNode, SubmitEvent } from "react";
import { ArrowLeft, LoaderCircle, Save } from "lucide-react";
import Boton, { BotonEnlace } from "./Boton";
import Mensaje, { type MensajeEstado } from "./Mensaje";

type FormularioProps = {
  titulo: string;
  volver: string;
  cargando: boolean;
  guardando: boolean;
  mensaje: MensajeEstado;
  onSubmit: (e: SubmitEvent<HTMLFormElement>) => void;
  children: ReactNode;
};

// Marco común de los formularios de crear (POST) y editar (PUT).
// `volver` es la lista al crear y el detalle del registro al editar.
export default function Formulario({ titulo, volver, cargando, guardando, mensaje, onSubmit, children }: FormularioProps) {
  return (
    <div className="mx-auto max-w-3xl">
      <Link href={volver} className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-primary">
        <ArrowLeft size={16} />
        Volver
      </Link>
      <div className="rounded-lg border border-border bg-surface p-6 shadow-sm md:p-8">
        <h1 className="mb-6 text-2xl font-bold">{titulo}</h1>
        <Mensaje mensaje={mensaje} />
        {cargando ? (
          <p className="text-sm text-muted">
            <LoaderCircle size={18} className="mr-2 inline animate-spin" />
            Cargando datos…
          </p>
        ) : (
          <form onSubmit={onSubmit} noValidate className="grid gap-5 md:grid-cols-2">
            {children}
            <div className="flex justify-end gap-3 border-t border-border pt-5 md:col-span-2">
              <BotonEnlace href={volver} variante="secundario">
                Cancelar
              </BotonEnlace>
              <Boton type="submit" icono={Save} procesando={guardando}>
                {guardando ? "Guardando…" : "Guardar"}
              </Boton>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
