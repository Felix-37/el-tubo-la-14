"use client";

import { useState, type SubmitEvent } from "react";
import { Save } from "lucide-react";
import Boton from "@/components/Boton";
import Mensaje, { type MensajeEstado } from "@/components/Mensaje";
import { api } from "@/lib/api";
import { NOMBRE_ROL } from "@/lib/roles";
import { guardarSesion, leerSesion } from "@/lib/sesion";
import type { Perfil } from "@/lib/tipos-cuenta";
import { useRegistro } from "@/lib/useDatos";
import FormClave from "./FormClave";
import Tarjeta, { Cargando } from "./Tarjeta";
import { CORREO_VALIDO, fechaHora } from "./utilidades";

// Ruta /perfil: datos del usuario de la sesión (cualquier rol), edición de
// nombre y correo, y cambio de contraseña.
export default function MiPerfil() {
  const { registro, cargando, error } = useRegistro<Perfil>("/perfil");
  const [actualizado, setActualizado] = useState<Perfil | null>(null);
  const perfil = actualizado ?? registro;

  return (
    <div className="mx-auto grid max-w-3xl gap-5">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Mi perfil</h1>
        <p className="mt-1 text-sm text-muted">Sus datos de acceso al sistema.</p>
      </div>
      <Mensaje mensaje={error ? { tipo: "error", texto: error } : null} />

      {cargando ? (
        <Tarjeta>
          <Cargando />
        </Tarjeta>
      ) : (
        perfil && (
          <>
            <Tarjeta titulo="Datos de la cuenta">
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <Dato etiqueta="Usuario" valor={perfil.nombre_usuario} />
                <Dato etiqueta="Rol" valor={NOMBRE_ROL[perfil.rol] ?? perfil.rol_nombre} />
                <Dato etiqueta="Nombre completo" valor={perfil.nombre_completo} />
                <Dato etiqueta="Correo" valor={perfil.correo} />
                {perfil.cliente_nombre && <Dato etiqueta="Cliente" valor={perfil.cliente_nombre} />}
                <Dato
                  etiqueta="Último ingreso"
                  valor={perfil.ultimo_ingreso ? fechaHora(perfil.ultimo_ingreso) : "Sin registro"}
                />
              </dl>
            </Tarjeta>
            <Tarjeta titulo="Editar datos" descripcion="El nombre es obligatorio; el correo se puede dejar vacío.">
              <FormDatos key={perfil.usuario_id} perfil={perfil} onGuardado={setActualizado} />
            </Tarjeta>
          </>
        )
      )}

      <Tarjeta titulo="Cambiar contraseña">
        <FormClave />
      </Tarjeta>
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | null }) {
  return (
    <div className="border-b border-border pb-3">
      <dt className="text-xs font-semibold tracking-wide text-muted uppercase">{etiqueta}</dt>
      <dd className="mt-1 text-sm break-words">{valor || "Sin dato"}</dd>
    </div>
  );
}

type FormDatosProps = { perfil: Perfil; onGuardado: (perfil: Perfil) => void };

// Nombre completo y correo (PUT /perfil). Solo se envía lo que cambió.
function FormDatos({ perfil, onGuardado }: FormDatosProps) {
  const [form, setForm] = useState({ nombre_completo: perfil.nombre_completo, correo: perfil.correo ?? "" });
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<MensajeEstado>(null);

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (guardando) return;
    const nombre = form.nombre_completo.trim();
    const correo = form.correo.trim();
    if (!nombre) {
      setMensaje({ tipo: "error", texto: "El nombre completo es obligatorio." });
      return;
    }
    if (correo && !CORREO_VALIDO.test(correo)) {
      setMensaje({ tipo: "error", texto: "El correo no tiene un formato válido." });
      return;
    }
    const cambios: { nombre_completo?: string; correo?: string } = {};
    if (nombre !== perfil.nombre_completo) cambios.nombre_completo = nombre;
    if (correo !== (perfil.correo ?? "")) cambios.correo = correo;
    if (Object.keys(cambios).length === 0) {
      setMensaje({ tipo: "error", texto: "No hay cambios para guardar." });
      return;
    }

    setGuardando(true);
    setMensaje(null);
    try {
      const { data, mensaje } = await api<Perfil>("/perfil", { method: "PUT", body: cambios });
      onGuardado(data);
      setForm({ nombre_completo: data.nombre_completo, correo: data.correo ?? "" });
      // El nombre del encabezado sale de la sesión guardada: se actualiza también allí.
      const sesion = leerSesion();
      if (sesion && sesion.usuario.usuario_id === data.usuario_id) {
        guardarSesion({ ...sesion, usuario: { ...sesion.usuario, nombre_completo: data.nombre_completo, correo: data.correo } });
      }
      setMensaje({ tipo: "exito", texto: mensaje ?? "Perfil actualizado" });
    } catch (error) {
      setMensaje({ tipo: "error", texto: (error as Error).message });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <Mensaje mensaje={mensaje} />
      </div>
      <div>
        <label htmlFor="nombre-completo" className="etiqueta">
          Nombre completo *
        </label>
        <input
          id="nombre-completo"
          className="campo"
          autoComplete="name"
          maxLength={100}
          value={form.nombre_completo}
          onChange={(e) => setForm({ ...form, nombre_completo: e.target.value })}
        />
      </div>
      <div>
        <label htmlFor="correo-perfil" className="etiqueta">
          Correo
        </label>
        <input
          id="correo-perfil"
          type="email"
          className="campo"
          autoComplete="email"
          maxLength={120}
          value={form.correo}
          onChange={(e) => setForm({ ...form, correo: e.target.value })}
        />
      </div>
      <div className="flex justify-end md:col-span-2">
        <Boton type="submit" icono={Save} procesando={guardando}>
          {guardando ? "Guardando…" : "Guardar cambios"}
        </Boton>
      </div>
    </form>
  );
}
