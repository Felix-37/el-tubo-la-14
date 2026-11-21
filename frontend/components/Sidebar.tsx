"use client";

import { usePathname } from "next/navigation";
import Menu from "./Menu";

// Es componente de cliente porque necesita saber en qué ruta está el usuario.
export default function Sidebar() {
  const ruta = usePathname();
  return <Menu rutaActual={ruta} />;
}
