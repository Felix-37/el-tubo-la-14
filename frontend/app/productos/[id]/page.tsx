import { Suspense } from "react";
import DetalleProducto from "@/components/detalles/DetalleProducto";

// Ruta /productos/[id]: detalle de un registro. useParams necesita Suspense con cacheComponents.
export default function Page() {
  return (
    <Suspense>
      <DetalleProducto />
    </Suspense>
  );
}
