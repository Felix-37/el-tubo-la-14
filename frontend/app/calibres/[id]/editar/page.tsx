import { Suspense } from "react";
import RequiereRol from "@/components/auth/RequiereRol";
import FormCalibre from "@/components/formularios/FormCalibre";

// Solo el ADMIN crea y edita. useParams necesita Suspense cuando cacheComponents está activo.
export default function Page() {
  return (
    <Suspense>
      <RequiereRol roles={["ADMIN"]}>
        <FormCalibre />
      </RequiereRol>
    </Suspense>
  );
}
