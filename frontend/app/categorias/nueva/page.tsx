import { Suspense } from "react";
import FormCategoria from "@/components/formularios/FormCategoria";

// useParams necesita Suspense cuando cacheComponents está activo.
export default function Page() {
  return (
    <Suspense>
      <FormCategoria />
    </Suspense>
  );
}
