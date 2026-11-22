"use client";

import { useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import Boton from "@/components/Boton";
import Mensaje, { type MensajeEstado } from "@/components/Mensaje";
import { useSesion } from "@/components/auth/ProveedorSesion";
import { api } from "@/lib/api";
import { errorClaveNueva } from "./utilidades";

const VACIO = { actual: "", nueva: "", confirmar: "" };

// Cambio de la clave propia (PUT /perfil con clave_actual y clave).
// El backend cierra todas las sesiones del usuario: al terminar se sale
// y se lleva al login.
export default function FormClave() {
  const { logout } = useSesion();
  const router = useRouter();
  const [form, setForm] = useState(VACIO);
  const [verClaves, setVerClaves] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<MensajeEstado>(null);

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (enviando) return;
    if (!form.actual || !form.nueva || !form.confirmar) {
      setMensaje({ tipo: "error", texto: "Complete los tres campos." });
      return;
    }
    const problema = errorClaveNueva(form.nueva);
    if (problema) {
      setMensaje({ tipo: "error", texto: problema });
      return;
    }
    if (form.nueva !== form.confirmar) {
      setMensaje({ tipo: "error", texto: "La confirmación no coincide con la contraseña nueva." });
      return;
    }

    setEnviando(true);
    setMensaje(null);
    try {
      await api("/perfil", { method: "PUT", body: { clave_actual: form.actual, clave: form.nueva } });
      setForm(VACIO);
      setMensaje({ tipo: "exito", texto: "Contraseña actualizada. Inicie sesión de nuevo con la contraseña nueva…" });
      // Se deja ver el aviso un momento; enviando sigue en true para no repetir el envío.
      setTimeout(async () => {
        await logout();
        router.replace("/login?cambio=1");
      }, 1500);
    } catch (error) {
      setMensaje({ tipo: "error", texto: (error as Error).message });
      setForm((f) => ({ ...f, actual: "" }));
      setEnviando(false);
    }
  }

  const tipo = verClaves ? "text" : "password";

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <Mensaje mensaje={mensaje} />
      <div>
        <label htmlFor="clave-actual" className="etiqueta">
          Contraseña actual
        </label>
        <input
          id="clave-actual"
          type={tipo}
          className="campo"
          autoComplete="current-password"
          maxLength={72}
          value={form.actual}
          onChange={(e) => setForm({ ...form, actual: e.target.value })}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="clave-nueva" className="etiqueta">
            Contraseña nueva
          </label>
          <input
            id="clave-nueva"
            type={tipo}
            className="campo"
            autoComplete="new-password"
            maxLength={72}
            value={form.nueva}
            onChange={(e) => setForm({ ...form, nueva: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="clave-confirmar" className="etiqueta">
            Confirmar contraseña nueva
          </label>
          <input
            id="clave-confirmar"
            type={tipo}
            className="campo"
            autoComplete="new-password"
            maxLength={72}
            value={form.confirmar}
            onChange={(e) => setForm({ ...form, confirmar: e.target.value })}
          />
        </div>
      </div>
      <p className="text-xs text-muted">
        Mínimo 8 caracteres, con al menos una letra y un número. Al cambiarla se cierran todas sus sesiones abiertas.
      </p>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => setVerClaves((v) => !v)}
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
        >
          {verClaves ? <EyeOff size={16} /> : <Eye size={16} />}
          {verClaves ? "Ocultar contraseñas" : "Mostrar contraseñas"}
        </button>
        <Boton type="submit" icono={KeyRound} procesando={enviando}>
          {enviando ? "Cambiando…" : "Cambiar contraseña"}
        </Boton>
      </div>
    </form>
  );
}
