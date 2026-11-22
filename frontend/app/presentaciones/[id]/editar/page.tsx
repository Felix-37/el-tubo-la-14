import { Suspense } from "react";
import RequiereRol from "@/components/auth/RequiereRol";
import FormPresentacion from "@/components/formularios/FormPresentacion";

// Solo el ADMIN crea y edita. useParams necesita Suspense cuando cacheComponents está activo.
export default function Page() {
  return (
    <Suspense>
      <RequiereRol roles={["ADMIN"]}>
        <FormPresentacion />
      </RequiereRol>
    </Suspense>
  );
}
