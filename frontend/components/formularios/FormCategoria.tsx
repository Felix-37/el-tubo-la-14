"use client";

import { useEffect, useState, type SubmitEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Casilla from "@/components/Casilla";
import Formulario from "@/components/Formulario";
import type { MensajeEstado } from "@/components/Mensaje";
import { api } from "@/lib/api";
import type { Categoria } from "@/lib/tipos";

const VACIO = { nombre: "", activo: true };

// Sirve para crear (sin id en la URL) y para editar (ruta /categorias/[id]/editar).
export default function FormCategoria() {
  const { id } = useParams<{ id?: string }>();
  const router = useRouter();
  const editando = Boolean(id);

  const [form, setForm] = useState(VACIO);
  const [cargando, setCargando] = useState(editando);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<MensajeEstado>(null);

  // Al editar, primero se cargan los datos actuales del registro.
  useEffect(() => {
    if (!id) return;
    api<Categoria>(`/categorias/${id}`)
      .then(({ data }) => setForm({ nombre: data.nombre, activo: data.activo }))
      .catch((e: Error) => setMensaje({ tipo: "error", texto: e.message }))
      .finally(() => setCargando(false));
  }, [id]);

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.nombre.trim()) {
      setMensaje({ tipo: "error", texto: "El nombre es obligatorio." });
      return;
    }

    setGuardando(true);
    try {
      const { mensaje } = await api(editando ? `/categorias/${id}` : "/categorias", {
        method: editando ? "PUT" : "POST",
        body: { nombre: form.nombre, activo: form.activo },
      });
      setMensaje({ tipo: "exito", texto: mensaje ?? "Guardado" });
      if (editando) setTimeout(() => router.push(`/categorias/${id}`), 900);
      else setForm(VACIO);
    } catch (e) {
      setMensaje({ tipo: "error", texto: (e as Error).message });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Formulario
      titulo={editando ? `Editar categoría #${id}` : "Nueva categoría"}
      volver={editando ? `/categorias/${id}` : "/categorias"}
      cargando={cargando}
      guardando={guardando}
      mensaje={mensaje}
      onSubmit={handleSubmit}
    >
      <div className="md:col-span-2">
        <label htmlFor="nombre" className="etiqueta">
          Nombre *
        </label>
        <input
          id="nombre"
          className="campo"
          maxLength={60}
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          placeholder="Ej.: Tubos"
        />
      </div>
      <div className="md:col-span-2">
        <Casilla
          texto="Activa"
          ayuda="Las categorías inactivas no aparecen al crear productos."
          marcada={form.activo}
          onCambio={(activo) => setForm({ ...form, activo })}
        />
      </div>
    </Formulario>
  );
}
