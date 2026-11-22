import { Suspense, type ReactNode } from "react";
import RequiereRol from "@/components/auth/RequiereRol";

// "Mi cuenta" y "Mis compras" son solo del CLIENTE (el backend responde 403 a los demás roles).
export default function Layout({ children }: { children: ReactNode }) {
  // RequiereRol usa usePathname: con cacheComponents necesita Suspense.
  return (
    <Suspense>
      <RequiereRol roles={["CLIENTE"]}>{children}</RequiereRol>
    </Suspense>
  );
}
