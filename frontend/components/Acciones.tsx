import Link from "next/link";
import { Eye, Pencil, Trash } from "lucide-react";

type AccionesProps = { ver: string; editar: string; onEliminar: () => void };

const ENLACE = "inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-foreground hover:bg-background";

// Botones de cada fila: Ver lleva al detalle (/tabla/[id]), Editar al formulario
// (/tabla/[id]/editar) y Eliminar abre el modal de confirmación.
export default function Acciones({ ver, editar, onEliminar }: AccionesProps) {
  return (
    <div className="flex gap-1 whitespace-nowrap">
      <Link href={ver} className={ENLACE}>
        <Eye size={14} />
        Ver
      </Link>
      <Link href={editar} className={ENLACE}>
        <Pencil size={14} />
        Editar
      </Link>
      <button
        type="button"
        onClick={onEliminar}
        className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-primary hover:bg-primary-soft"
      >
        <Trash size={14} />
        Eliminar
      </button>
    </div>
  );
}
