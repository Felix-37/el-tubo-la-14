import { Suspense } from "react";
import FormPresentacion from "@/components/formularios/FormPresentacion";

// useParams necesita Suspense cuando cacheComponents está activo.
export default function Page() {
  return (
    <Suspense>
      <FormPresentacion />
    </Suspense>
  );
}
