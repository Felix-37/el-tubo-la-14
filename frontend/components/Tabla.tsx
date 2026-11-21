import type { ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

type TablaProps = {
  columnas: string[];
  cargando: boolean;
  vacia: boolean;
  textoVacia: string;
  children: ReactNode;
};

// Tabla con encabezados, y filas de "cargando" o "sin registros" cuando aplica.
export default function Tabla({ columnas, cargando, vacia, textoVacia, children }: TablaProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface shadow-sm">
      <table className="tabla w-full">
        <thead>
          <tr>
            {columnas.map((columna) => (
              <th key={columna}>{columna}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cargando ? (
            <tr>
              <td colSpan={columnas.length} className="text-center text-muted">
                <LoaderCircle size={18} className="mr-2 inline animate-spin" />
                Cargando…
              </td>
            </tr>
          ) : vacia ? (
            <tr>
              <td colSpan={columnas.length} className="text-center text-muted">
                {textoVacia}
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}
