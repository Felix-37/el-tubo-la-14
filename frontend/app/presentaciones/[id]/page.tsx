import { Suspense } from "react";
import DetallePresentacion from "@/components/detalles/DetallePresentacion";

// Ruta /presentaciones/[id]: detalle de un registro. useParams necesita Suspense con cacheComponents.
export default function Page() {
  return (
    <Suspense>
      <DetallePresentacion />
    </Suspense>
  );
}
