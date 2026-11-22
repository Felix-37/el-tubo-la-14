"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import AccesoDenegado from "./AccesoDenegado";
import { useSesion } from "./ProveedorSesion";
import type { Rol } from "@/lib/roles";

// Guarda de las páginas: sin sesión manda a /login (y luego regresa aquí);
// con sesión pero sin el rol, muestra "Acceso denegado". La seguridad real
// la hace el backend (401/403); esto solo evita mostrar pantallas que no sirven.
export default function RequiereRol({ roles, children }: { roles: Rol[]; children: ReactNode }) {
  const { usuario, hidratado } = useSesion();
  const router = useRouter();
  const ruta = usePathname();

  useEffect(() => {
    if (hidratado && !usuario) router.replace(`/login?volver=${encodeURIComponent(ruta)}`);
  }, [hidratado, usuario, router, ruta]);

  if (!hidratado || !usuario) {
    return (
      <p className="text-sm text-muted">
        <LoaderCircle size={18} className="mr-2 inline animate-spin" />
        Verificando la sesión…
      </p>
    );
  }
  if (!roles.includes(usuario.rol)) return <AccesoDenegado rol={usuario.rol} permitidos={roles} />;
  return <>{children}</>;
}
