import type { ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

type TarjetaProps = {
  titulo?: string;
  descripcion?: string;
  destacada?: boolean; // borde superior rojo, como el saldo en el boceto
  children: ReactNode;
};

// Tarjeta blanca de las pantallas de "Mi cuenta" y del perfil.
export default function Tarjeta({ titulo, descripcion, destacada = false, children }: TarjetaProps) {
  return (
    <section
      className={`rounded-lg border border-border bg-surface p-5 shadow-sm md:p-6 ${
        destacada ? "border-t-4 border-t-primary" : ""
      }`}
    >
      {titulo && <h2 className="text-lg font-semibold">{titulo}</h2>}
      {descripcion && <p className="mt-1 text-sm text-muted">{descripcion}</p>}
      {(titulo || descripcion) && <div className="mb-4" />}
      {children}
    </section>
  );
}

export function Cargando({ texto = "Cargando datos…" }: { texto?: string }) {
  return (
    <p className="text-sm text-muted">
      <LoaderCircle size={18} className="mr-2 inline animate-spin" />
      {texto}
    </p>
  );
}
