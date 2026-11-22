import { Suspense } from "react";
import FormLogin from "@/components/auth/FormLogin";

// Ruta /login. useSearchParams necesita Suspense con cacheComponents.
export default function Page() {
  return (
    <Suspense>
      <FormLogin />
    </Suspense>
  );
}
