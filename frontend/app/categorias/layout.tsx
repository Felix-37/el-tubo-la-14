import { Suspense, type ReactNode } from "react";
import RequiereRol from "@/components/auth/RequiereRol";
import { TODOS } from "@/lib/roles";

// El catálogo se consulta con cualquier rol; crear, editar y eliminar es solo del ADMIN.
export default function Layout({ children }: { children: ReactNode }) {
  // RequiereRol usa usePathname: con cacheComponents necesita Suspense.
  return (
    <Suspense>
      <RequiereRol roles={TODOS}>{children}</RequiereRol>
    </Suspense>
  );
}
