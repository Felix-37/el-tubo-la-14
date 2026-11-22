import { Suspense } from "react";
import DetalleCompra from "@/components/cuenta/DetalleCompra";

// Ruta /mi-cuenta/compras/[id]: comprobante de una compra. useParams necesita Suspense con cacheComponents.
export default function Page() {
  return (
    <Suspense>
      <DetalleCompra />
    </Suspense>
  );
}
