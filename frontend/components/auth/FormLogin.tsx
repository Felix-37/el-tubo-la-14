"use client";

import { useEffect, useState, type SubmitEvent } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, LogIn } from "lucide-react";
import Boton from "@/components/Boton";
import Mensaje, { type MensajeEstado } from "@/components/Mensaje";
import { useSesion } from "./ProveedorSesion";
import { inicioDe, puedeEntrar, type Rol } from "@/lib/roles";

// Solo se acepta volver a una ruta de esta misma aplicación. Se resuelve la
// URL completa y se compara el origen: así "/\\otro.com" o "/%09/otro.com",
// que el navegador convierte en otro sitio, quedan descartados.
function rutaInterna(volver: string | null) {
  if (!volver || !volver.startsWith("/")) return null;
  try {
    const url = new URL(volver, window.location.origin);
    if (url.origin !== window.location.origin || url.pathname === "/login") return null;
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}

// A dónde ir después del login: la ruta pedida si es del rol; si no, su inicio.
function destino(rol: Rol, volver: string | null) {
  return volver && puedeEntrar(rol, volver.split(/[?#]/)[0]) ? volver : inicioDe(rol);
}

export default function FormLogin() {
  const { usuario, hidratado, login } = useSesion();
  const router = useRouter();
  const parametros = useSearchParams();
  const volver = typeof window === "undefined" ? null : rutaInterna(parametros.get("volver"));

  const [form, setForm] = useState({ usuario: "", clave: "" });
  const [verClave, setVerClave] = useState(false);
  const [enviando, setEnviando] = useState(false);
  // Al llegar desde el perfil tras cambiar la clave, se avisa por qué se cerró la sesión.
  const [mensaje, setMensaje] = useState<MensajeEstado>(
    parametros.get("cambio") === "1"
      ? { tipo: "exito", texto: "La contraseña se cambió. Inicie sesión con la nueva." }
      : null,
  );

  // Si ya hay sesión, no tiene sentido mostrar el login.
  useEffect(() => {
    if (hidratado && usuario && !enviando) router.replace(destino(usuario.rol, volver));
  }, [hidratado, usuario, enviando, router, volver]);

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (enviando) return;
    if (!form.usuario.trim() || !form.clave) {
      setMensaje({ tipo: "error", texto: "Escriba el usuario y la contraseña." });
      return;
    }
    setEnviando(true);
    setMensaje(null);
    try {
      const u = await login(form.usuario.trim(), form.clave);
      router.replace(destino(u.rol, volver));
    } catch (error) {
      setMensaje({ tipo: "error", texto: (error as Error).message });
      setForm((f) => ({ ...f, clave: "" }));
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <Image src="/brand/logo.png" alt="Logo de El Tubo La 14" width={120} height={80} priority />
          <h1 className="text-2xl font-bold">El Tubo La 14</h1>
          <p className="text-sm text-muted">Inicie sesión para continuar</p>
        </div>
        <Mensaje mensaje={mensaje} />
        <form onSubmit={handleSubmit} noValidate className="grid gap-4">
          <div>
            <label htmlFor="usuario" className="etiqueta">
              Usuario o correo
            </label>
            <input
              id="usuario"
              className="campo"
              autoComplete="username"
              autoFocus
              maxLength={120}
              value={form.usuario}
              onChange={(e) => setForm({ ...form, usuario: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="clave" className="etiqueta">
              Contraseña
            </label>
            <div className="relative">
              <input
                id="clave"
                type={verClave ? "text" : "password"}
                className="campo pr-10"
                autoComplete="current-password"
                maxLength={72}
                value={form.clave}
                onChange={(e) => setForm({ ...form, clave: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setVerClave((v) => !v)}
                aria-label={verClave ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted hover:text-foreground"
              >
                {verClave ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <Boton type="submit" icono={LogIn} procesando={enviando}>
            {enviando ? "Ingresando…" : "Ingresar"}
          </Boton>
        </form>
        <p className="mt-6 text-center text-xs text-muted">
          Cada rol entra a su pantalla de inicio: el administrador al área de trabajo, el cajero al punto de venta y el
          cliente a «Mi cuenta».
        </p>
      </div>
    </div>
  );
}
