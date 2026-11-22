import { Suspense } from "react";
import DetalleUsuario from "@/components/usuarios/DetalleUsuario";

// Ruta /usuarios/[id]: detalle y acciones. useParams necesita Suspense con cacheComponents.
export default function Page() {
  return (
    <Suspense>
      <DetalleUsuario />
    </Suspense>
  );
}
