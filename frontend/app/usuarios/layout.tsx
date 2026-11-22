import { Suspense, type ReactNode } from "react";
import RequiereRol from "@/components/auth/RequiereRol";

// La gestión de usuarios es exclusiva del ADMIN (el backend responde 403 a los demás).
export default function Layout({ children }: { children: ReactNode }) {
  // RequiereRol usa usePathname: con cacheComponents necesita Suspense.
  return (
    <Suspense>
      <RequiereRol roles={["ADMIN"]}>{children}</RequiereRol>
    </Suspense>
  );
}
