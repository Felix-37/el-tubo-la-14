import { Suspense } from "react";
import DetalleCategoria from "@/components/detalles/DetalleCategoria";

// Ruta /categorias/[id]: detalle de un registro. useParams necesita Suspense con cacheComponents.
export default function Page() {
  return (
    <Suspense>
      <DetalleCategoria />
    </Suspense>
  );
}
