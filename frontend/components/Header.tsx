import Image from "next/image";
import Link from "next/link";
import UsuarioActual from "./auth/UsuarioActual";

// Encabezado oscuro: el logo tiene un halo rojo que solo se ve bien sobre fondo oscuro.
export default function Header() {
  return (
    <header className="flex items-center gap-4 bg-sidebar px-4 py-3 text-white md:px-6">
      <Link href="/" className="flex items-center gap-3">
        <Image src="/brand/logo.png" alt="Logo de El Tubo La 14" width={66} height={44} priority />
        <div className="leading-tight">
          <p className="text-lg font-bold">El Tubo La 14</p>
          <p className="hidden text-xs text-white/60 sm:block">Cerrajería · perfilería y cubiertas</p>
        </div>
      </Link>
      <UsuarioActual />
    </header>
  );
}
