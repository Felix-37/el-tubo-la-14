import Link from "next/link";
import {
  Boxes,
  Gauge,
  LayoutDashboard,
  Package,
  Receipt,
  ShoppingCart,
  Tags,
  UserRound,
  Users,
  Wallet,
  WalletCards,
} from "lucide-react";
import type { Rol } from "@/lib/roles";

// Opciones del menú y qué roles las ven. Ocultar una opción es comodidad:
// la protección real está en el backend y en RequiereRol.
export const OPCIONES = [
  { href: "/", texto: "Área de trabajo", icono: LayoutDashboard, roles: ["ADMIN"] },
  { href: "/ventas/nueva", texto: "Punto de venta", icono: ShoppingCart, roles: ["CAJERO"] },
  { href: "/caja", texto: "Caja", icono: Wallet, roles: ["CAJERO", "ADMIN"] },
  { href: "/ventas", texto: "Ventas", icono: Receipt, roles: ["CAJERO", "ADMIN"] },
  { href: "/mi-cuenta", texto: "Mi cuenta", icono: WalletCards, roles: ["CLIENTE"] },
  { href: "/mi-cuenta/compras", texto: "Mis compras", icono: Receipt, roles: ["CLIENTE"] },
  { href: "/usuarios", texto: "Usuarios", icono: Users, roles: ["ADMIN"] },
  { href: "/categorias", texto: "Categorías", icono: Tags, roles: ["ADMIN", "CAJERO"] },
  { href: "/calibres", texto: "Calibres", icono: Gauge, roles: ["ADMIN", "CAJERO"] },
  { href: "/productos", texto: "Productos", icono: Package, roles: ["ADMIN", "CAJERO", "CLIENTE"] },
  { href: "/presentaciones", texto: "Presentaciones", icono: Boxes, roles: ["ADMIN", "CAJERO", "CLIENTE"] },
  { href: "/perfil", texto: "Mi perfil", icono: UserRound, roles: ["ADMIN", "CAJERO", "CLIENTE"] },
] satisfies { href: string; texto: string; icono: unknown; roles: Rol[] }[];

// La opción activa es la de la ruta más específica que coincide
// (en /ventas/nueva se marca "Punto de venta", no "Ventas").
function activaPara(rutaActual: string, opciones: typeof OPCIONES) {
  const coinciden = opciones.filter(({ href }) =>
    href === "/" ? rutaActual === "/" : rutaActual === href || rutaActual.startsWith(`${href}/`),
  );
  return coinciden.sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

// Menú lateral. Muestra solo las opciones del rol y marca en rojo la activa.
export default function Menu({ rutaActual, rol }: { rutaActual: string; rol: Rol | null }) {
  const visibles = rol ? OPCIONES.filter((o) => (o.roles as Rol[]).includes(rol)) : [];
  const activa = activaPara(rutaActual, visibles);
  return (
    <nav className="bg-sidebar text-white/80 md:w-60 md:shrink-0">
      <ul className="flex overflow-x-auto md:flex-col md:py-4">
        {visibles.map(({ href, texto, icono: Icono }) => (
          <li key={href}>
            <Link
              href={href}
              className={`flex items-center gap-3 px-5 py-3 text-sm whitespace-nowrap transition ${
                href === activa ? "bg-primary font-semibold text-white" : "hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icono size={18} />
              {texto}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
