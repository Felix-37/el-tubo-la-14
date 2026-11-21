"use client";

import { useEffect, useState, type SubmitEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Casilla from "@/components/Casilla";
import Formulario from "@/components/Formulario";
import type { MensajeEstado } from "@/components/Mensaje";
import { api } from "@/lib/api";
import type { Categoria, Producto } from "@/lib/tipos";
import { useDatos } from "@/lib/useDatos";

const VACIO = { nombre: "", categoria_id: "", descripcion: "", es_cortable: false, activo: true };

// Sirve para crear (sin id en la URL) y para editar (ruta /productos/[id]/editar).
export default function FormProducto() {
  const { id } = useParams<{ id?: string }>();
  const router = useRouter();
  const editando = Boolean(id);
  const categorias = useDatos<Categoria>("/categorias");

  const [form, setForm] = useState(VACIO);
  const [cargando, setCargando] = useState(editando);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<MensajeEstado>(null);

  useEffect(() => {
    if (!id) return;
    api<Producto>(`/productos/${id}`)
      .then(({ data }) =>
        setForm({
          nombre: data.nombre,
          categoria_id: String(data.categoria_id),
          descripcion: data.descripcion ?? "",
          es_cortable: data.es_cortable,
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
    if (!form.categoria_id) errores.push("Elija una categoría.");
    if (errores.length > 0) {
      setMensaje({ tipo: "error", texto: errores.join("\n") });
      return;
    }

    setGuardando(true);
    try {
      const { mensaje } = await api(editando ? `/productos/${id}` : "/productos", {
        method: editando ? "PUT" : "POST",
        body: {
          nombre: form.nombre,
          categoria_id: Number(form.categoria_id),
          descripcion: form.descripcion,
          es_cortable: form.es_cortable,
          activo: form.activo,
        },
      });
      setMensaje({ tipo: "exito", texto: mensaje ?? "Guardado" });
      if (editando) setTimeout(() => router.push(`/productos/${id}`), 900);
      else setForm(VACIO);
    } catch (e) {
      setMensaje({ tipo: "error", texto: (e as Error).message });
    } finally {
      setGuardando(false);
    }
  }

  // Solo se ofrecen categorías activas, más la que ya tenga el producto.
  const opciones = categorias.datos.filter((c) => c.activo || String(c.categoria_id) === form.categoria_id);

  return (
    <Formulario
      titulo={editando ? `Editar producto #${id}` : "Nuevo producto"}
      volver={editando ? `/productos/${id}` : "/productos"}
      cargando={cargando}
      guardando={guardando}
      mensaje={mensaje ?? (categorias.error ? { tipo: "error", texto: categorias.error } : null)}
      onSubmit={handleSubmit}
    >
      <div>
        <label htmlFor="nombre" className="etiqueta">
          Nombre *
        </label>
        <input
          id="nombre"
          className="campo"
          maxLength={120}
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          placeholder='Ej.: Tubo cold rolled cuadrado 1"'
        />
      </div>
      <div>
        <label htmlFor="categoria" className="etiqueta">
          Categoría *
        </label>
        <select
          id="categoria"
          className="campo"
          value={form.categoria_id}
          onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}
        >
          <option value="">{categorias.cargando ? "Cargando…" : "Seleccione…"}</option>
          {opciones.map((c) => (
            <option key={c.categoria_id} value={c.categoria_id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </div>
      <div className="md:col-span-2">
        <label htmlFor="descripcion" className="etiqueta">
          Descripción
        </label>
        <textarea
          id="descripcion"
          rows={3}
          className="campo"
          maxLength={400}
          value={form.descripcion}
          onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
          placeholder="Ej.: Tubo cuadrado en barra de 6 m"
        />
      </div>
      <Casilla
        texto="Se vende por corte"
        ayuda="El cliente puede pedir la medida que necesite; se cobra la tarifa del calibre."
        marcada={form.es_cortable}
        onCambio={(es_cortable) => setForm({ ...form, es_cortable })}
      />
      <Casilla texto="Activo" marcada={form.activo} onCambio={(activo) => setForm({ ...form, activo })} />
    </Formulario>
  );
}
