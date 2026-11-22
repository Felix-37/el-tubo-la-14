"use client";

import { Plus } from "lucide-react";
import { useSesion } from "./auth/ProveedorSesion";
import { BotonEnlace } from "./Boton";

type EncabezadoProps = {
  titulo: string;
  descripcion: string;
  nuevo?: { href: string; texto: string };
};

// Título de cada lista con su botón para crear un registro.
export default function Encabezado({ titulo, descripcion, nuevo }: EncabezadoProps) {
  // Crear registros del catálogo es solo del ADMIN.
  const { usuario } = useSesion();
  const verNuevo = nuevo && usuario?.rol === "ADMIN";
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{titulo}</h1>
        <p className="mt-1 text-sm text-muted">{descripcion}</p>
      </div>
      {verNuevo && (
        <BotonEnlace href={nuevo.href} icono={Plus}>
          {nuevo.texto}
        </BotonEnlace>
      )}
    </div>
  );
}
