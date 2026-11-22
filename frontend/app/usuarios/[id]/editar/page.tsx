import { Suspense } from "react";
import FormEditarUsuario from "@/components/usuarios/FormEditarUsuario";

// Ruta /usuarios/[id]/editar. useParams necesita Suspense con cacheComponents.
export default function Page() {
  return (
    <Suspense>
      <FormEditarUsuario />
    </Suspense>
  );
}
