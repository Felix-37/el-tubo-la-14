"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle, LogOut } from "lucide-react";
import { useSesion } from "./ProveedorSesion";
import { NOMBRE_ROL } from "@/lib/roles";

// Parte derecha del encabezado: usuario, rol y botón de cerrar sesión.
export default function UsuarioActual() {
  const { usuario, logout } = useSesion();
  const router = useRouter();
  const [saliendo, setSaliendo] = useState(false);

  if (!usuario) return null;

  async function salir() {
    setSaliendo(true);
    await logout();
    router.replace("/login");
    setSaliendo(false);
  }

  return (
    <div className="ml-auto flex items-center gap-3 text-sm">
      <Link href="/perfil" className="hidden text-right leading-tight hover:text-white sm:block" title="Mi perfil">
        <span className="block font-semibold">{usuario.nombre_usuario}</span>
        <span className="block text-xs text-white/60">{usuario.nombre_completo}</span>
      </Link>
      <span className="rounded bg-white/10 px-2 py-1 text-xs font-medium">{NOMBRE_ROL[usuario.rol]}</span>
      <button
        type="button"
        onClick={salir}
        disabled={saliendo}
        className="inline-flex items-center gap-2 rounded-md border border-white/20 px-3 py-1.5 text-xs font-semibold hover:bg-white/10 disabled:opacity-60"
      >
        {saliendo ? <LoaderCircle size={16} className="animate-spin" /> : <LogOut size={16} />}
        <span className="hidden sm:inline">Cerrar sesión</span>
      </button>
    </div>
  );
}
