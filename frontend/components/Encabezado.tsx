import { Plus } from "lucide-react";
import { BotonEnlace } from "./Boton";

type EncabezadoProps = {
  titulo: string;
  descripcion: string;
  nuevo?: { href: string; texto: string };
};

// Título de cada lista con su botón para crear un registro.
export default function Encabezado({ titulo, descripcion, nuevo }: EncabezadoProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{titulo}</h1>
        <p className="mt-1 text-sm text-muted">{descripcion}</p>
      </div>
      {nuevo && (
        <BotonEnlace href={nuevo.href} icono={Plus}>
          {nuevo.texto}
        </BotonEnlace>
      )}
    </div>
  );
}
