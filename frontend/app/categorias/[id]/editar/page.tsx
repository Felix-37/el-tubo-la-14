import { Suspense } from "react";
import RequiereRol from "@/components/auth/RequiereRol";
import FormCategoria from "@/components/formularios/FormCategoria";

// Solo el ADMIN crea y edita. useParams necesita Suspense cuando cacheComponents está activo.
export default function Page() {
  return (
    <Suspense>
      <RequiereRol roles={["ADMIN"]}>
        <FormCategoria />
      </RequiereRol>
    </Suspense>
  );
}
