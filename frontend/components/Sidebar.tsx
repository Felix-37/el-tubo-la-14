"use client";

import { usePathname } from "next/navigation";
import Menu from "./Menu";
import { useSesion } from "./auth/ProveedorSesion";

// Es componente de cliente porque necesita la ruta actual y el rol de la sesión.
// Sin sesión (o en /login) no hay menú.
export default function Sidebar() {
  const ruta = usePathname();
  const { usuario } = useSesion();
  if (!usuario || ruta === "/login") return null;
  return <Menu rutaActual={ruta} rol={usuario.rol} />;
}
