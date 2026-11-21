import { Suspense } from "react";
import FormCalibre from "@/components/formularios/FormCalibre";

// useParams necesita Suspense cuando cacheComponents está activo.
export default function Page() {
  return (
    <Suspense>
      <FormCalibre />
    </Suspense>
  );
}
