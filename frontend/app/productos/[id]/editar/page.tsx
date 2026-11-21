import { Suspense } from "react";
import FormProducto from "@/components/formularios/FormProducto";

// useParams necesita Suspense cuando cacheComponents está activo.
export default function Page() {
  return (
    <Suspense>
      <FormProducto />
    </Suspense>
  );
}
