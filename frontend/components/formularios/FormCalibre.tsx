"use client";

import { useEffect, useState, type SubmitEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Casilla from "@/components/Casilla";
import Formulario from "@/components/Formulario";
import type { MensajeEstado } from "@/components/Mensaje";
import { api } from "@/lib/api";
import type { Calibre } from "@/lib/tipos";

// Los números se guardan como texto mientras se escriben y se convierten al enviar.
const VACIO = { nombre: "", descripcion: "", tarifa_corte: "", activo: true };

// Sirve para crear (sin id en la URL) y para editar (ruta /calibres/[id]/editar).
export default function FormCalibre() {
  const { id } = useParams<{ id?: string }>();
  const router = useRouter();
  const editando = Boolean(id);

  const [form, setForm] = useState(VACIO);
  const [cargando, setCargando] = useState(editando);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<MensajeEstado>(null);

  useEffect(() => {
    if (!id) return;
    api<Calibre>(`/calibres/${id}`)
      .then(({ data }) =>
        setForm({
          nombre: data.nombre,
          descripcion: data.descripcion ?? "",
          tarifa_corte: String(data.tarifa_corte),
          activo: data.activo,
        }),
      )
      .catch((e: Error) => setMensaje({ tipo: "error", texto: e.message }))
      .finally(() => setCargando(false));
  }, [id]);

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const errores: string[] = [];
    if (!form.nombre.trim()) errores.push("El nombre es obligatorio.");
    if (form.tarifa_corte.trim() === "") errores.push("La tarifa de corte es obligatoria.");
    else if (Number(form.tarifa_corte) < 0) errores.push("La tarifa de corte no puede ser negativa.");
    if (errores.length > 0) {
      setMensaje({ tipo: "error", texto: errores.join("\n") });
      return;
    }

    setGuardando(true);
    try {
      const { mensaje } = await api(editando ? `/calibres/${id}` : "/calibres", {
        method: editando ? "PUT" : "POST",
        body: {
          nombre: form.nombre,
          descripcion: form.descripcion,
          tarifa_corte: Number(form.tarifa_corte),
          activo: form.activo,
        },
      });
      setMensaje({ tipo: "exito", texto: mensaje ?? "Guardado" });
      if (editando) setTimeout(() => router.push(`/calibres/${id}`), 900);
      else setForm(VACIO);
    } catch (e) {
      setMensaje({ tipo: "error", texto: (e as Error).message });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Formulario
      titulo={editando ? `Editar calibre #${id}` : "Nuevo calibre"}
      volver={editando ? `/calibres/${id}` : "/calibres"}
      cargando={cargando}
      guardando={guardando}
      mensaje={mensaje}
      onSubmit={handleSubmit}
    >
      <div>
        <label htmlFor="nombre" className="etiqueta">
          Nombre *
        </label>
        <input
          id="nombre"
          className="campo"
          maxLength={40}
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          placeholder="Ej.: Calibre 18"
        />
      </div>
      <div>
        <label htmlFor="tarifa" className="etiqueta">
          Tarifa de corte (COP) *
        </label>
        <input
          id="tarifa"
          type="number"
          min={0}
          step={100}
          className="campo"
          value={form.tarifa_corte}
          onChange={(e) => setForm({ ...form, tarifa_corte: e.target.value })}
          placeholder="2000"
        />
      </div>
      <div className="md:col-span-2">
        <label htmlFor="descripcion" className="etiqueta">
          Descripción
        </label>
        <input
          id="descripcion"
          className="campo"
          maxLength={200}
          value={form.descripcion}
          onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
          placeholder="Ej.: Lámina delgada"
        />
      </div>
      <div className="md:col-span-2">
        <Casilla texto="Activo" marcada={form.activo} onCambio={(activo) => setForm({ ...form, activo })} />
      </div>
    </Formulario>
  );
}
