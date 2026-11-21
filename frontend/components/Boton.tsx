import Link from "next/link";
import type { ReactNode } from "react";
import { LoaderCircle, type LucideIcon } from "lucide-react";

type Variante = "primario" | "secundario" | "peligro";

const CLASES: Record<Variante, string> = {
  primario: "boton-primario",
  secundario: "boton-secundario",
  peligro: "boton-peligro",
};

type BotonProps = {
  children: ReactNode;
  variante?: Variante;
  icono?: LucideIcon;
  type?: "button" | "submit";
  procesando?: boolean;
  onClick?: () => void;
};

// Botón común de la aplicación. Mientras `procesando` es true muestra un spinner y no se puede pulsar.
export default function Boton({
  children,
  variante = "primario",
  icono: Icono,
  type = "button",
  procesando = false,
  onClick,
}: BotonProps) {
  return (
    <button type={type} onClick={onClick} disabled={procesando} className={CLASES[variante]}>
      {procesando ? <LoaderCircle size={18} className="animate-spin" /> : Icono && <Icono size={18} />}
      {children}
    </button>
  );
}

// Mismo aspecto que Boton, pero navega a otra ruta.
export function BotonEnlace({
  href,
  children,
  variante = "primario",
  icono: Icono,
}: {
  href: string;
  children: ReactNode;
  variante?: Variante;
  icono?: LucideIcon;
}) {
  return (
    <Link href={href} className={CLASES[variante]}>
      {Icono && <Icono size={18} />}
      {children}
    </Link>
  );
}
