"use client";

import { useEffect, useState, type SubmitEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Casilla from "@/components/Casilla";
import Formulario from "@/components/Formulario";
import type { MensajeEstado } from "@/components/Mensaje";
import { api } from "@/lib/api";
import { numeroONulo, pesos } from "@/lib/formato";
import type { Calibre, Presentacion, Producto } from "@/lib/tipos";
import { useDatos } from "@/lib/useDatos";

// Los números se guardan como texto mientras se escriben y se convierten al enviar.
const VACIO = {
  producto_id: "",
  referencia: "",
  codigo_barras: "",
  medida: "",
  calibre_id: "",
  largo_fabrica_cm: "",
  precio_venta: "",
  costo: "",
  existencia: "",
  existencia_minima: "",
  activo: true,
};
type Campo = Exclude<keyof typeof VACIO, "activo">;

const texto = (valor: number | string | null) => (valor === null ? "" : String(valor));

// Sirve para crear (sin id en la URL) y para editar (ruta /presentaciones/[id]/editar).
export default function FormPresentacion() {
  const { id } = useParams<{ id?: string }>();
  const router = useRouter();
  const editando = Boolean(id);
  const productos = useDatos<Producto>("/productos");
  const calibres = useDatos<Calibre>("/calibres");

  const [form, setForm] = useState(VACIO);
  const [cargando, setCargando] = useState(editando);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<MensajeEstado>(null);

  useEffect(() => {
    if (!id) return;
    api<Presentacion>(`/presentaciones/${id}`)
      .then(({ data }) =>
        setForm({
          producto_id: texto(data.producto_id),
          referencia: data.referencia,
          codigo_barras: texto(data.codigo_barras),
          medida: texto(data.medida),
          calibre_id: texto(data.calibre_id),
          largo_fabrica_cm: texto(data.largo_fabrica_cm),
          precio_venta: texto(data.precio_venta),
          costo: texto(data.costo ?? null),
          existencia: texto(data.existencia),
          existencia_minima: texto(data.existencia_minima),
          activo: data.activo,
        }),
      )
      .catch((e: Error) => setMensaje({ tipo: "error", texto: e.message }))
      .finally(() => setCargando(false));
  }, [id]);

  // Un solo manejador para todos los inputs de texto y número.
  const cambiar = (campo: Campo) => (e: { target: { value: string } }) => setForm({ ...form, [campo]: e.target.value });

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const errores: string[] = [];
    if (!form.producto_id) errores.push("Elija el producto.");
    if (!form.referencia.trim()) errores.push("La referencia es obligatoria.");
    if (form.precio_venta.trim() === "") errores.push("El precio de venta es obligatorio.");
    const numeros: Campo[] = ["precio_venta", "costo", "existencia", "existencia_minima"];
    if (numeros.some((campo) => Number(form[campo]) < 0)) errores.push("Precios y existencias no pueden ser negativos.");
    if (form.largo_fabrica_cm !== "" && Number(form.largo_fabrica_cm) <= 0) errores.push("El largo de fábrica debe ser mayor que 0.");
    const enteros: Campo[] = ["existencia", "existencia_minima", "largo_fabrica_cm"];
    if (enteros.some((campo) => form[campo] !== "" && !Number.isInteger(Number(form[campo])))) {
      errores.push("Existencias y largo de fábrica deben ser números enteros.");
    }
    if (errores.length > 0) {
      setMensaje({ tipo: "error", texto: errores.join("\n") });
      return;
    }

    setGuardando(true);
    try {
      const { mensaje } = await api(editando ? `/presentaciones/${id}` : "/presentaciones", {
        method: editando ? "PUT" : "POST",
        body: {
          producto_id: Number(form.producto_id),
          referencia: form.referencia,
          codigo_barras: form.codigo_barras,
          medida: form.medida,
          calibre_id: numeroONulo(form.calibre_id),
          largo_fabrica_cm: numeroONulo(form.largo_fabrica_cm),
          precio_venta: Number(form.precio_venta),
          costo: numeroONulo(form.costo),
          existencia: numeroONulo(form.existencia),
          existencia_minima: numeroONulo(form.existencia_minima),
          activo: form.activo,
        },
      });
      setMensaje({ tipo: "exito", texto: mensaje ?? "Guardado" });
      if (editando) setTimeout(() => router.push(`/presentaciones/${id}`), 900);
      else setForm(VACIO);
    } catch (e) {
      setMensaje({ tipo: "error", texto: (e as Error).message });
    } finally {
      setGuardando(false);
    }
  }

  // Solo se ofrecen registros activos, más el que ya tenga la presentación.
  const opcionesProducto = productos.datos.filter((p) => p.activo || String(p.producto_id) === form.producto_id);
  const opcionesCalibre = calibres.datos.filter((c) => c.activo || String(c.calibre_id) === form.calibre_id);
  const producto = productos.datos.find((p) => String(p.producto_id) === form.producto_id);
  const errorListas = productos.error ?? calibres.error;
  const margen = Number(form.precio_venta) - Number(form.costo || 0);

  return (
    <Formulario
      titulo={editando ? `Editar presentación #${id}` : "Nueva presentación"}
      volver={editando ? `/presentaciones/${id}` : "/presentaciones"}
      cargando={cargando}
      guardando={guardando}
      mensaje={mensaje ?? (errorListas ? { tipo: "error", texto: errorListas } : null)}
      onSubmit={handleSubmit}
    >
      <div>
        <label htmlFor="producto" className="etiqueta">
          Producto *
        </label>
        <select id="producto" className="campo" value={form.producto_id} onChange={cambiar("producto_id")}>
          <option value="">{productos.cargando ? "Cargando…" : "Seleccione…"}</option>
          {opcionesProducto.map((p) => (
            <option key={p.producto_id} value={p.producto_id}>
              {p.nombre}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="referencia" className="etiqueta">
          Referencia *
        </label>
        <input
          id="referencia"
          className="campo"
          maxLength={40}
          value={form.referencia}
          onChange={cambiar("referencia")}
          placeholder="Ej.: TCR-1-C18"
        />
      </div>
      <div>
        <label htmlFor="codigo" className="etiqueta">
          Código de barras
        </label>
        <input
          id="codigo"
          className="campo"
          maxLength={40}
          value={form.codigo_barras}
          onChange={cambiar("codigo_barras")}
          placeholder="7701234567890"
        />
      </div>
      <div>
        <label htmlFor="medida" className="etiqueta">
          Medida
        </label>
        <input
          id="medida"
          className="campo"
          maxLength={40}
          value={form.medida}
          onChange={cambiar("medida")}
          placeholder='Ej.: 1" x 6 m'
        />
      </div>

      <fieldset className="grid gap-5 rounded-md border border-dashed border-border bg-background/50 p-4 md:col-span-2 md:grid-cols-2">
        <legend className="px-1 text-xs font-medium text-muted">
          {producto?.es_cortable ? "Datos de corte (el producto se vende por corte)" : "Datos de corte (opcionales)"}
        </legend>
        <div>
          <label htmlFor="calibre" className="etiqueta">
            Calibre
          </label>
          <select id="calibre" className="campo" value={form.calibre_id} onChange={cambiar("calibre_id")}>
            <option value="">Sin calibre</option>
            {opcionesCalibre.map((c) => (
              <option key={c.calibre_id} value={c.calibre_id}>
                {c.nombre} · {pesos(c.tarifa_corte)} por corte
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="largo" className="etiqueta">
            Largo de fábrica (cm)
          </label>
          <input
            id="largo"
            type="number"
            min={1}
            className="campo"
            value={form.largo_fabrica_cm}
            onChange={cambiar("largo_fabrica_cm")}
            placeholder="600"
          />
        </div>
      </fieldset>

      <div>
        <label htmlFor="precio" className="etiqueta">
          Precio de venta con IVA (COP) *
        </label>
        <input
          id="precio"
          type="number"
          min={0}
          step={100}
          className="campo"
          value={form.precio_venta}
          onChange={cambiar("precio_venta")}
          placeholder="60000"
        />
      </div>
      <div>
        <label htmlFor="costo" className="etiqueta">
          Costo (COP)
        </label>
        <input
          id="costo"
          type="number"
          min={0}
          step={100}
          className="campo"
          value={form.costo}
          onChange={cambiar("costo")}
          placeholder="45000"
        />
        {form.precio_venta !== "" && form.costo !== "" && (
          <p className={`mt-1 text-xs ${margen < 0 ? "text-primary" : "text-muted"}`}>Margen: {pesos(margen)}</p>
        )}
      </div>
      <div>
        <label htmlFor="existencia" className="etiqueta">
          Existencia
        </label>
        <input
          id="existencia"
          type="number"
          min={0}
          className="campo"
          value={form.existencia}
          onChange={cambiar("existencia")}
          placeholder="0"
        />
      </div>
      <div>
        <label htmlFor="minima" className="etiqueta">
          Existencia mínima
        </label>
        <input
          id="minima"
          type="number"
          min={0}
          className="campo"
          value={form.existencia_minima}
          onChange={cambiar("existencia_minima")}
          placeholder="5"
        />
      </div>
      <div className="md:col-span-2">
        <Casilla texto="Activa" marcada={form.activo} onCambio={(activo) => setForm({ ...form, activo })} />
      </div>
    </Formulario>
  );
}
