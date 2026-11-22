"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { api, cerrarSesionEnServidor, iniciarSesion } from "@/lib/api";
import {
  EVENTO_SESION,
  esCambioDeSesion,
  guardarSesion,
  leerSesion,
  textoSesion,
  type UsuarioSesion,
} from "@/lib/sesion";

type ContextoSesion = {
  usuario: UsuarioSesion | null;
  // false mientras se lee localStorage: evita mandar a /login antes de saber si hay sesión.
  hidratado: boolean;
  login: (usuario: string, clave: string) => Promise<UsuarioSesion>;
  logout: () => Promise<void>;
};

const Contexto = createContext<ContextoSesion | null>(null);

export function useSesion() {
  const valor = useContext(Contexto);
  if (!valor) throw new Error("useSesion debe usarse dentro de ProveedorSesion");
  return valor;
}

// localStorage es una fuente externa a React: se lee con useSyncExternalStore,
// que vuelve a leer cuando esta pestaña (EVENTO_SESION) u otra (storage) la cambia.
function suscribir(avisar: () => void) {
  const deOtraPestana = (e: StorageEvent) => esCambioDeSesion(e) && avisar();
  window.addEventListener(EVENTO_SESION, avisar);
  window.addEventListener("storage", deOtraPestana);
  return () => {
    window.removeEventListener(EVENTO_SESION, avisar);
    window.removeEventListener("storage", deOtraPestana);
  };
}
const nadaQueSuscribir = () => () => {};

// Guarda en React el usuario de la sesión y lo mantiene al día con
// localStorage (renovaciones, logout en otra pestaña o sesión expirada).
export default function ProveedorSesion({ children }: { children: ReactNode }) {
  const texto = useSyncExternalStore(suscribir, textoSesion, () => null);
  // En el servidor no hay localStorage: hidratado es false hasta llegar al navegador.
  const hidratado = useSyncExternalStore(nadaQueSuscribir, () => true, () => false);
  const usuario = useMemo(() => (texto ? (leerSesion()?.usuario ?? null) : null), [texto]);

  // Al abrir la aplicación se piden los datos actuales al backend: si al
  // usuario le cambiaron el rol o lo desactivaron, se nota de inmediato.
  useEffect(() => {
    if (!leerSesion()) return;
    api<UsuarioSesion>("/auth/yo")
      .then(({ data }) => {
        const vigente = leerSesion();
        // Solo si la sesión sigue siendo del mismo usuario que se consultó.
        if (vigente && vigente.usuario.usuario_id === data.usuario_id) guardarSesion({ ...vigente, usuario: data });
      })
      .catch(() => {});
  }, []);

  const login = useCallback(async (nombre: string, clave: string) => (await iniciarSesion(nombre, clave)).usuario, []);
  const logout = useCallback(() => cerrarSesionEnServidor(), []);

  return <Contexto.Provider value={{ usuario, hidratado, login, logout }}>{children}</Contexto.Provider>;
}
