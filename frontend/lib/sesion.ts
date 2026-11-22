import type { Rol } from "./roles";

// Datos del usuario que devuelve el backend al iniciar sesión.
export type UsuarioSesion = {
  usuario_id: number;
  nombre_usuario: string;
  nombre_completo: string;
  correo: string | null;
  rol: Rol;
  cliente_id: number | null;
};

export type Sesion = {
  accessToken: string;
  refreshToken: string;
  usuario: UsuarioSesion;
};

// Toda la sesión vive en localStorage bajo una sola clave. Así todas las
// pestañas comparten los mismos tokens: si una renueva, las demás usan el
// token nuevo en vez de renovar otra vez con el viejo (el backend tomaría
// eso como reuso de un refresh y cerraría la sesión).
const CLAVE = "eltubo-auth";

// Aviso para la interfaz cuando la sesión cambia o se cierra.
export const EVENTO_SESION = "eltubo-sesion";

// Texto guardado tal cual (sirve como "foto" estable para useSyncExternalStore).
export function textoSesion(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(CLAVE);
  } catch {
    return null;
  }
}

export function leerSesion(): Sesion | null {
  if (typeof window === "undefined") return null;
  try {
    const texto = window.localStorage.getItem(CLAVE);
    if (!texto) return null;
    const sesion = JSON.parse(texto) as Sesion;
    return sesion?.accessToken && sesion?.refreshToken && sesion?.usuario ? sesion : null;
  } catch {
    return null;
  }
}

export function guardarSesion(sesion: Sesion) {
  window.localStorage.setItem(CLAVE, JSON.stringify(sesion));
  window.dispatchEvent(new Event(EVENTO_SESION));
}

export function borrarSesion() {
  window.localStorage.removeItem(CLAVE);
  window.dispatchEvent(new Event(EVENTO_SESION));
}

// Otra pestaña cambió la sesión (login, renovación o logout).
export function esCambioDeSesion(e: StorageEvent) {
  return e.key === CLAVE || e.key === null;
}
