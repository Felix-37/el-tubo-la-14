import Link from "next/link";
import { Boxes, Gauge, LayoutDashboard, Package, Tags } from "lucide-react";

export const OPCIONES = [
  { href: "/", texto: "Área de trabajo", icono: LayoutDashboard },
  { href: "/categorias", texto: "Categorías", icono: Tags },
  { href: "/calibres", texto: "Calibres", icono: Gauge },
  { href: "/productos", texto: "Productos", icono: Package },
  { href: "/presentaciones", texto: "Presentaciones", icono: Boxes },
];

// Menú lateral. Marca en rojo la opción de la ruta actual (o de sus subrutas).
export default function Menu({ rutaActual }: { rutaActual: string }) {
  return (
    <nav className="bg-sidebar text-white/80 md:w-60 md:shrink-0">
      <ul className="flex overflow-x-auto md:flex-col md:py-4">
        {OPCIONES.map(({ href, texto, icono: Icono }) => {
          const activa = href === "/" ? rutaActual === "/" : rutaActual.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex items-center gap-3 px-5 py-3 text-sm whitespace-nowrap transition ${
                  activa ? "bg-primary font-semibold text-white" : "hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icono size={18} />
                {texto}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
