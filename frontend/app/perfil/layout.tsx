import { Suspense, type ReactNode } from "react";
import RequiereRol from "@/components/auth/RequiereRol";
import { TODOS } from "@/lib/roles";

// El perfil propio es de cualquier rol: el backend toma el usuario del token.
export default function Layout({ children }: { children: ReactNode }) {
  // RequiereRol usa usePathname: con cacheComponents necesita Suspense.
  return (
    <Suspense>
      <RequiereRol roles={TODOS}>{children}</RequiereRol>
    </Suspense>
  );
}
