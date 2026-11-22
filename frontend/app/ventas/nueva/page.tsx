import { Suspense } from "react";
import RequiereRol from "@/components/auth/RequiereRol";
import PuntoVenta from "@/components/ventas/PuntoVenta";

// Ruta /ventas/nueva: punto de venta, solo del CAJERO.
export default function Page() {
  // RequiereRol usa usePathname: con cacheComponents necesita Suspense.
  return (
    <Suspense>
      <RequiereRol roles={["CAJERO"]}>
        <PuntoVenta />
      </RequiereRol>
    </Suspense>
  );
}
