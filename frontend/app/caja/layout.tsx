import { Suspense, type ReactNode } from "react";
import RequiereRol from "@/components/auth/RequiereRol";

// La caja la abre y la cierra el CAJERO; el ADMIN solo consulta.
export default function Layout({ children }: { children: ReactNode }) {
  // RequiereRol usa usePathname: con cacheComponents necesita Suspense.
  return (
    <Suspense>
      <RequiereRol roles={["CAJERO", "ADMIN"]}>{children}</RequiereRol>
    </Suspense>
  );
}
