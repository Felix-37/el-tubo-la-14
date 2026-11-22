"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AreaTrabajo from "@/components/AreaTrabajo";
import RequiereRol from "./RequiereRol";
import { useSesion } from "./ProveedorSesion";
import { inicioDe } from "@/lib/roles";

export default function Inicio() {
  const { usuario } = useSesion();
  const router = useRouter();
  const otroRol = usuario && usuario.rol !== "ADMIN";

  useEffect(() => {
    if (usuario && usuario.rol !== "ADMIN") router.replace(inicioDe(usuario.rol));
  }, [usuario, router]);

  if (otroRol) return null;
  return (
    <RequiereRol roles={["ADMIN"]}>
      <AreaTrabajo />
    </RequiereRol>
  );
}
