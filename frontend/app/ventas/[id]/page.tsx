import { Suspense } from "react";
import Comprobante from "@/components/ventas/Comprobante";

// Ruta /ventas/[id]: comprobante de una venta. useParams necesita Suspense con cacheComponents.
export default function Page() {
  return (
    <Suspense>
      <Comprobante />
    </Suspense>
  );
}
