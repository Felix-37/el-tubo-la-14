import type { Usuario } from "@/lib/tipos-usuarios";
import { estaBloqueado } from "./util";

const ETIQUETA = "rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap";

// Estado de una cuenta: eliminada, inactiva o activa, y además bloqueada
// si superó los intentos fallidos de ingreso.
export default function EstadoUsuario({ usuario }: { usuario: Usuario }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {usuario.eliminado_en ? (
        <span className={`${ETIQUETA} bg-primary-soft text-primary-dark`}>Eliminado</span>
      ) : usuario.activo ? (
        <span className={`${ETIQUETA} bg-success-soft text-success`}>Activo</span>
      ) : (
        <span className={`${ETIQUETA} bg-background text-muted`}>Inactivo</span>
      )}
      {estaBloqueado(usuario) && <span className={`${ETIQUETA} bg-accent-soft text-accent`}>Bloqueado</span>}
    </span>
  );
}
