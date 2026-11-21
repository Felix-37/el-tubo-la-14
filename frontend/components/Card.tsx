import Link from "next/link";
import { LoaderCircle, type LucideIcon } from "lucide-react";

type CardProps = {
  titulo: string;
  descripcion: string;
  icono: LucideIcon;
  href: string;
  cantidad?: number | null;
  cargando?: boolean;
};

// Tarjeta del área de trabajo: muestra cuántos registros tiene la tabla y lleva a su lista.
export default function Card({ titulo, descripcion, icono: Icono, href, cantidad, cargando }: CardProps) {
  return (
    <Link
      href={href}
      className="group rounded-lg border border-border bg-surface p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
    >
      <div className="mb-4 flex items-start justify-between">
        <span className="inline-flex rounded-md bg-primary-soft p-3 text-primary">
          <Icono size={24} />
        </span>
        {cargando ? (
          <LoaderCircle size={20} className="animate-spin text-muted" />
        ) : (
          cantidad != null && (
            <span className="text-right">
              <span className="block text-3xl leading-none font-bold">{cantidad}</span>
              <span className="text-xs text-muted">{cantidad === 1 ? "registro" : "registros"}</span>
            </span>
          )
        )}
      </div>
      <h2 className="text-lg font-semibold group-hover:text-primary">{titulo}</h2>
      <p className="mt-1 text-sm text-muted">{descripcion}</p>
    </Link>
  );
}
