"use client";

import { ShieldAlert } from "lucide-react";
import { BotonEnlace } from "@/components/Boton";
import { inicioDe, NOMBRE_ROL, type Rol } from "@/lib/roles";

// Pantalla del 403 en la interfaz: hay sesión, pero el rol no tiene permiso.
export default function AccesoDenegado({ rol, permitidos }: { rol: Rol; permitidos: Rol[] }) {
  return (
    <div className="mx-auto mt-8 max-w-lg rounded-lg border border-primary/30 bg-surface p-8 text-center shadow-sm">
      <span className="mx-auto mb-4 inline-flex rounded-full bg-primary-soft p-3 text-primary">
        <ShieldAlert size={28} />
      </span>
      <h1 className="text-xl font-bold">Acceso denegado</h1>
      <p className="mt-2 text-sm text-muted">
        Esta sección es para {permitidos.map((r) => NOMBRE_ROL[r].toLowerCase()).join(" o ")}. Su rol es{" "}
        <strong>{NOMBRE_ROL[rol]}</strong>.
      </p>
      <div className="mt-6 flex justify-center">
        <BotonEnlace href={inicioDe(rol)}>Ir a mi inicio</BotonEnlace>
      </div>
    </div>
  );
}
