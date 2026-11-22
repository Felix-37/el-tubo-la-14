// Roles del sistema y a dónde llega cada uno después de iniciar sesión.

export type Rol = "ADMIN" | "CAJERO" | "CLIENTE";

export const TODOS: Rol[] = ["ADMIN", "CAJERO", "CLIENTE"];

export const NOMBRE_ROL: Record<Rol, string> = {
  ADMIN: "Administrador",
  CAJERO: "Cajero",
  CLIENTE: "Cliente",
};

// Qué roles pueden entrar a cada ruta (la regla más específica primero).
// Se usa para no mandar a un usuario, después del login, a una pantalla de otro rol.
const CATALOGO = /^\/(categorias|calibres|productos|presentaciones)(\/|$)/;
export function puedeEntrar(rol: Rol, ruta: string) {
  if (ruta === "/") return rol === "ADMIN";
  if (/^\/(categorias|calibres|productos|presentaciones)\/(nueva|nuevo|\d+\/editar)(\/|$)/.test(ruta)) return rol === "ADMIN";
  if (CATALOGO.test(ruta) || ruta.startsWith("/perfil")) return true;
  if (ruta.startsWith("/usuarios")) return rol === "ADMIN";
  if (ruta.startsWith("/ventas/nueva")) return rol === "CAJERO";
  if (ruta.startsWith("/ventas") || ruta.startsWith("/caja")) return rol === "CAJERO" || rol === "ADMIN";
  if (ruta.startsWith("/mi-cuenta")) return rol === "CLIENTE";
  return false;
}

// Pantalla de inicio de cada rol: el administrador al área de trabajo,
// el cajero al punto de venta y el cliente a "Mi cuenta".
export function inicioDe(rol: Rol) {
  if (rol === "CAJERO") return "/ventas/nueva";
  if (rol === "CLIENTE") return "/mi-cuenta";
  return "/";
}
