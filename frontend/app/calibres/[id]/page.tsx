import { Suspense } from "react";
import DetalleCalibre from "@/components/detalles/DetalleCalibre";

// Ruta /calibres/[id]: detalle de un registro. useParams necesita Suspense con cacheComponents.
export default function Page() {
  return (
    <Suspense>
      <DetalleCalibre />
    </Suspense>
  );
}
