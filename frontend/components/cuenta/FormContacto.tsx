"use client";

import { useState, type SubmitEvent } from "react";
import { Save } from "lucide-react";
import Boton from "@/components/Boton";
import Mensaje, { type MensajeEstado } from "@/components/Mensaje";
import { api } from "@/lib/api";
import type { Contacto, FichaCliente } from "@/lib/tipos-cuenta";
import { CORREO_VALIDO } from "./utilidades";

function contactoDe(ficha: FichaCliente): Contacto {
  return { telefono: ficha.telefono ?? "", correo: ficha.correo ?? "", direccion: ficha.direccion ?? "" };
}

type FormContactoProps = {
  ficha: FichaCliente;
  onGuardado: (ficha: FichaCliente) => void;
};

// Datos de contacto del cliente (PUT /mi-cuenta). Solo se envía lo que cambió;
// un campo vacío borra el dato.
export default function FormContacto({ ficha, onGuardado }: FormContactoProps) {
  const [form, setForm] = useState<Contacto>(() => contactoDe(ficha));
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<MensajeEstado>(null);

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (guardando) return;

    const original = contactoDe(ficha);
    const cambios: Partial<Contacto> = {};
    for (const campo of ["telefono", "correo", "direccion"] as const) {
      if (form[campo].trim() !== original[campo].trim()) cambios[campo] = form[campo].trim();
    }
    if (Object.keys(cambios).length === 0) {
      setMensaje({ tipo: "error", texto: "No hay cambios para guardar." });
      return;
    }
    if (cambios.correo && !CORREO_VALIDO.test(cambios.correo)) {
      setMensaje({ tipo: "error", texto: "El correo no tiene un formato válido." });
      return;
    }

    setGuardando(true);
    setMensaje(null);
    try {
      const { data, mensaje } = await api<FichaCliente>("/mi-cuenta", { method: "PUT", body: cambios });
      onGuardado(data);
      setForm(contactoDe(data));
      setMensaje({ tipo: "exito", texto: mensaje ?? "Datos de contacto actualizados" });
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
        <label htmlFor="telefono" className="etiqueta">
          Teléfono
        </label>
        <input
          id="telefono"
          type="tel"
          className="campo"
          autoComplete="tel"
          maxLength={30}
          value={form.telefono}
          onChange={(e) => setForm({ ...form, telefono: e.target.value })}
        />
      </div>
      <div>
        <label htmlFor="correo" className="etiqueta">
          Correo
        </label>
        <input
          id="correo"
          type="email"
          className="campo"
          autoComplete="email"
          maxLength={120}
          value={form.correo}
          onChange={(e) => setForm({ ...form, correo: e.target.value })}
        />
      </div>
      <div className="md:col-span-2">
        <label htmlFor="direccion" className="etiqueta">
          Dirección
        </label>
        <input
          id="direccion"
          className="campo"
          autoComplete="street-address"
          maxLength={200}
          value={form.direccion}
          onChange={(e) => setForm({ ...form, direccion: e.target.value })}
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
