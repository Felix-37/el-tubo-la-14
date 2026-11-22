import { Suspense } from "react";
import RequiereRol from "@/components/auth/RequiereRol";
import FormProducto from "@/components/formularios/FormProducto";

// Solo el ADMIN crea y edita. useParams necesita Suspense cuando cacheComponents está activo.
export default function Page() {
  return (
    <Suspense>
      <RequiereRol roles={["ADMIN"]}>
        <FormProducto />
      </RequiereRol>
    </Suspense>
  );
}
