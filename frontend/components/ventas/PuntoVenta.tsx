"use client";

import { useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Banknote, CircleAlert, Landmark, LoaderCircle, Minus, NotebookPen, Plus, Search, ShoppingCart, Trash } from "lucide-react";
import Mensaje, { type MensajeEstado } from "@/components/Mensaje";
import { api } from "@/lib/api";
import { normalizar, pesos } from "@/lib/formato";
import type { Presentacion, Producto } from "@/lib/tipos";
import type { CajaConResumen, ClienteVenta, FormaPago, VentaConLineas } from "@/lib/tipos-ventas";
import { useDatos, useRegistro } from "@/lib/useDatos";
import { FORMAS_PAGO, fechaHora, leerDinero, redondear } from "./util";

type ItemCarrito = { p: Presentacion; cantidad: string };

const MAX_RESULTADOS = 30;
const ICONO_PAGO = { EFECTIVO: Banknote, TRANSFERENCIA: Landmark, CREDITO: NotebookPen };
const TARJETA = "rounded-lg border border-border bg-surface p-4 shadow-sm";

// Cantidad del carrito como entero; 0 si el texto no es un número entero.
function entero(texto: string) {
  return /^\d+$/.test(texto.trim()) ? Number(texto) : 0;
}

function nombreDe(p: Presentacion) {
  return `${p.producto}${p.medida ? ` ${p.medida}` : ""}`;
}

// Ruta /ventas/nueva: punto de venta del CAJERO. Solo ventas por unidad
// (sin cortes ni descuentos), en la caja abierta.
export default function PuntoVenta() {
  const router = useRouter();
  const { registro: caja, cargando: cargandoCaja, error: errorCaja } = useRegistro<CajaConResumen>("/ventas/caja");
  const presentaciones = useDatos<Presentacion>("/presentaciones");
  const productos = useDatos<Producto>("/productos");
  const clientes = useDatos<ClienteVenta>("/ventas/clientes");

  const [busqueda, setBusqueda] = useState("");
  const [porAgregar, setPorAgregar] = useState<Record<number, string>>({});
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [formaPago, setFormaPago] = useState<FormaPago>("EFECTIVO");
  const [recibido, setRecibido] = useState("");
  const [observacion, setObservacion] = useState("");
  const [mensaje, setMensaje] = useState<MensajeEstado>(null);
  const [cobrando, setCobrando] = useState(false);

  // Se venden por unidad las presentaciones activas, con existencia, de productos activos no cortables.
  const productoPorId = new Map(productos.datos.map((pr) => [pr.producto_id, pr]));
  const vendibles = presentaciones.datos.filter((p) => {
    const pr = productoPorId.get(p.producto_id);
    return p.activo && pr && pr.activo && !pr.es_cortable && p.existencia > 0;
  });
  const texto = normalizar(busqueda.trim());
  const encontradas = vendibles.filter((p) =>
    [p.producto, p.referencia, p.codigo_barras, p.medida].some((campo) => normalizar(campo).includes(texto)),
  );
  const cargandoCatalogo = presentaciones.cargando || productos.cargando;
  const errorCarga = errorCaja ?? presentaciones.error ?? productos.error ?? clientes.error;

  function enCarrito(id: number) {
    return carrito.find((i) => i.p.presentacion_id === id);
  }

  // Suma `cantidad` a la línea de la presentación sin pasar la existencia.
  function agregar(p: Presentacion, cantidad: number) {
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      setMensaje({ tipo: "error", texto: "La cantidad a agregar debe ser un entero mayor que 0." });
      return;
    }
    const actual = entero(enCarrito(p.presentacion_id)?.cantidad ?? "0");
    let nueva = actual + cantidad;
    if (nueva > p.existencia) {
      nueva = p.existencia;
      setMensaje({ tipo: "error", texto: `Solo hay ${p.existencia} de ${nombreDe(p)} (${p.referencia}).` });
    } else {
      setMensaje(null);
    }
    setCarrito((lista) =>
      lista.some((i) => i.p.presentacion_id === p.presentacion_id)
        ? lista.map((i) => (i.p.presentacion_id === p.presentacion_id ? { ...i, cantidad: String(nueva) } : i))
        : [...lista, { p, cantidad: String(nueva) }],
    );
    setPorAgregar((m) => ({ ...m, [p.presentacion_id]: "1" }));
  }

  function cambiarCantidad(id: number, cantidad: string) {
    setCarrito((lista) => lista.map((i) => (i.p.presentacion_id === id ? { ...i, cantidad } : i)));
  }

  function quitar(id: number) {
    setCarrito((lista) => lista.filter((i) => i.p.presentacion_id !== id));
  }

  // Con lector de código de barras: Enter con un código o referencia exactos agrega una unidad.
  function alPresionarEnBuscador(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const codigo = normalizar(busqueda.trim());
    const exacta = vendibles.find((p) => normalizar(p.codigo_barras) === codigo || normalizar(p.referencia) === codigo);
    if (exacta) {
      agregar(exacta, 1);
      setBusqueda("");
    } else if (encontradas.length === 1) {
      agregar(encontradas[0], 1);
      setBusqueda("");
    }
  }

  const cantidadValida = (i: ItemCarrito) => {
    const n = entero(i.cantidad);
    return n >= 1 && n <= i.p.existencia;
  };
  const total = redondear(carrito.reduce((s, i) => s + i.p.precio_venta * entero(i.cantidad), 0));
  const cliente = clientes.datos.find((c) => String(c.cliente_id) === clienteId) ?? null;
  const valorRecibido = leerDinero(recibido);
  const recibidoValido = valorRecibido !== null && !Number.isNaN(valorRecibido);

  // Lo que impide cobrar, en el orden en que conviene corregirlo.
  let bloqueo: string | null = null;
  if (!caja) bloqueo = "No hay una caja abierta.";
  else if (carrito.length === 0) bloqueo = "Agregue al menos un producto.";
  else if (!carrito.every(cantidadValida)) bloqueo = "Revise las cantidades del carrito.";
  else if (formaPago === "EFECTIVO" && !recibidoValido) bloqueo = "Escriba el valor recibido (máximo 2 decimales).";
  else if (formaPago === "EFECTIVO" && recibidoValido && valorRecibido < total) bloqueo = "El valor recibido no alcanza para el total.";
  else if (formaPago === "CREDITO" && !cliente) bloqueo = "La venta a crédito necesita un cliente.";
  else if (formaPago === "CREDITO" && cliente && total > cliente.cupo_disponible)
    bloqueo = `La venta supera el cupo disponible de ${cliente.nombre} (${pesos(cliente.cupo_disponible)}).`;

  async function cobrar() {
    if (cobrando || bloqueo) return;
    setCobrando(true);
    setMensaje(null);
    try {
      const { data } = await api<VentaConLineas>("/ventas", {
        method: "POST",
        body: {
          forma_pago: formaPago,
          cliente_id: cliente ? cliente.cliente_id : undefined,
          valor_recibido: formaPago === "EFECTIVO" ? valorRecibido : undefined,
          observacion: observacion.trim() || undefined,
          lineas: carrito.map((i) => ({ presentacion_id: i.p.presentacion_id, cantidad: entero(i.cantidad) })),
        },
      });
      setCarrito([]);
      setRecibido("");
      setObservacion("");
      router.push(`/ventas/${data.venta_id}`);
    } catch (e) {
      setMensaje({ tipo: "error", texto: (e as Error).message });
      setCobrando(false);
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-2xl font-bold md:text-3xl">Punto de venta</h1>
        {caja && (
          <p className="text-sm text-muted">
            Caja abierta desde {fechaHora(caja.fecha_apertura)} · {caja.abierta_por}
          </p>
        )}
      </div>

      {!cargandoCaja && !caja && !errorCaja && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent">
          <CircleAlert size={18} className="mt-0.5 shrink-0" />
          <span>
            No hay una caja abierta, así que no se puede cobrar.{" "}
            <Link href="/caja" className="font-semibold underline">
              Abrir la caja
            </Link>
          </span>
        </div>
      )}
      <Mensaje mensaje={mensaje ?? (errorCarga ? { tipo: "error", texto: errorCarga } : null)} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        {/* Búsqueda y resultados */}
        <section>
          <label className="relative mb-4 block">
            <Search size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={alPresionarEnBuscador}
              placeholder="Buscar por nombre, referencia o código de barras"
              aria-label="Buscar por nombre, referencia o código de barras"
              className="campo py-3 pl-10 text-base"
              autoFocus
            />
          </label>

          {cargandoCatalogo ? (
            <p className="text-sm text-muted">
              <LoaderCircle size={18} className="mr-2 inline animate-spin" />
              Cargando productos…
            </p>
          ) : encontradas.length === 0 ? (
            <p className="rounded-lg border border-border bg-surface p-4 text-sm text-muted">
              {vendibles.length === 0
                ? "No hay productos con existencia para vender por unidad."
                : "Ningún producto coincide con la búsqueda."}
            </p>
          ) : (
            <>
              {/* Tarjetas de al menos 13rem: en pantallas angostas quedan en una columna. */}
              <div className="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-3">
                {encontradas.slice(0, MAX_RESULTADOS).map((p) => {
                  const enLista = entero(enCarrito(p.presentacion_id)?.cantidad ?? "0");
                  const valor = porAgregar[p.presentacion_id] ?? "1";
                  return (
                    <article key={p.presentacion_id} className={`${TARJETA} flex flex-col gap-3`}>
                      <div>
                        <h2 className="font-semibold">{nombreDe(p)}</h2>
                        <p className="text-sm text-muted">
                          {p.referencia} · {pesos(p.precio_venta)} · {p.existencia} disp.
                        </p>
                        {enLista > 0 && <p className="mt-1 text-xs font-medium text-success">{enLista} en el carrito</p>}
                      </div>
                      <div className="mt-auto flex flex-wrap gap-2">
                        <input
                          type="number"
                          min={1}
                          max={p.existencia}
                          step={1}
                          value={valor}
                          onChange={(e) => setPorAgregar((m) => ({ ...m, [p.presentacion_id]: e.target.value }))}
                          aria-label={`Cantidad de ${nombreDe(p)}`}
                          className="campo w-20 shrink-0"
                        />
                        <button
                          type="button"
                          className="boton-primario min-w-0 flex-1"
                          onClick={() => agregar(p, entero(valor))}
                          disabled={enLista >= p.existencia}
                        >
                          <Plus size={18} />
                          Agregar
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
              {encontradas.length > MAX_RESULTADOS && (
                <p className="mt-3 text-xs text-muted">
                  Se muestran {MAX_RESULTADOS} de {encontradas.length}. Escriba más para afinar la búsqueda.
                </p>
              )}
            </>
          )}
        </section>

        {/* Venta: cliente, carrito, pago */}
        <section className="flex flex-col gap-4">
          <div>
            <label htmlFor="cliente" className="etiqueta">
              Cliente {formaPago === "CREDITO" ? "*" : "(opcional)"}
            </label>
            <select id="cliente" className="campo" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              <option value="">{clientes.cargando ? "Cargando clientes…" : "Sin cliente (mostrador)"}</option>
              {clientes.datos.map((c) => (
                <option key={c.cliente_id} value={c.cliente_id}>
                  {c.nombre}
                  {c.documento ? ` · ${c.documento}` : ""} · cupo {pesos(c.cupo_disponible)}
                </option>
              ))}
            </select>
            {cliente && (
              <p className="mt-1 text-xs text-muted">
                Cupo {pesos(cliente.cupo_credito)} · saldo {pesos(cliente.saldo)} · disponible{" "}
                <strong>{pesos(cliente.cupo_disponible)}</strong>
              </p>
            )}
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
            <div className="flex items-center justify-between bg-background px-4 py-3 text-xs font-semibold tracking-wide text-muted uppercase">
              <span className="inline-flex items-center gap-2">
                <ShoppingCart size={16} />
                Carrito
              </span>
              <span>Valor</span>
            </div>
            {carrito.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted">El carrito está vacío.</p>
            ) : (
              <ul>
                {carrito.map((i) => {
                  const n = entero(i.cantidad);
                  const valida = cantidadValida(i);
                  return (
                    <li key={i.p.presentacion_id} className="border-t border-border px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{nombreDe(i.p)}</p>
                          <p className="text-xs text-muted">
                            {i.p.referencia} · {pesos(i.p.precio_venta)} c/u
                          </p>
                        </div>
                        <span className="text-sm font-semibold whitespace-nowrap tabular-nums">
                          {pesos(redondear(i.p.precio_venta * n))}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          className="boton-secundario px-2"
                          aria-label="Restar uno"
                          disabled={n <= 1}
                          onClick={() => cambiarCantidad(i.p.presentacion_id, String(Math.max(1, n - 1)))}
                        >
                          <Minus size={16} />
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={i.p.existencia}
                          step={1}
                          value={i.cantidad}
                          onChange={(e) => cambiarCantidad(i.p.presentacion_id, e.target.value)}
                          aria-label={`Cantidad de ${nombreDe(i.p)}`}
                          className={`campo w-20 text-center ${valida ? "" : "border-primary"}`}
                        />
                        <button
                          type="button"
                          className="boton-secundario px-2"
                          aria-label="Sumar uno"
                          disabled={n >= i.p.existencia}
                          onClick={() => cambiarCantidad(i.p.presentacion_id, String(Math.min(i.p.existencia, n + 1)))}
                        >
                          <Plus size={16} />
                        </button>
                        <button
                          type="button"
                          className="ml-auto inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-primary hover:bg-primary-soft"
                          onClick={() => quitar(i.p.presentacion_id)}
                        >
                          <Trash size={14} />
                          Quitar
                        </button>
                      </div>
                      {!valida && (
                        <p className="mt-1 text-xs text-primary">Escriba un entero entre 1 y {i.p.existencia}.</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="flex items-baseline justify-between border-t border-border px-4 py-4">
              <span className="text-lg font-bold">Total</span>
              <span className="text-2xl font-bold text-primary tabular-nums">{pesos(total)}</span>
            </div>
          </div>

          <div>
            <span className="etiqueta">Forma de pago</span>
            <div className="grid grid-cols-3 gap-2">
              {FORMAS_PAGO.map(({ codigo, texto }) => {
                const Icono = ICONO_PAGO[codigo];
                return (
                  <button
                    key={codigo}
                    type="button"
                    aria-pressed={formaPago === codigo}
                    className={`${formaPago === codigo ? "boton-primario" : "boton-secundario"} flex-col gap-1 px-2 py-3 sm:flex-row`}
                    onClick={() => setFormaPago(codigo)}
                  >
                    <Icono size={18} />
                    {texto}
                  </button>
                );
              })}
            </div>
          </div>

          {formaPago === "EFECTIVO" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="recibido" className="etiqueta">
                  Recibido *
                </label>
                <input
                  id="recibido"
                  className="campo"
                  inputMode="decimal"
                  value={recibido}
                  onChange={(e) => setRecibido(e.target.value)}
                  placeholder={total > 0 ? String(total) : "0"}
                />
              </div>
              <div>
                <span className="etiqueta">Cambio</span>
                <p className="campo bg-background font-semibold tabular-nums">
                  {recibidoValido && valorRecibido >= total ? pesos(redondear(valorRecibido - total)) : "—"}
                </p>
              </div>
            </div>
          )}

          {formaPago === "CREDITO" && cliente && total > cliente.cupo_disponible && (
            <div className="flex items-start gap-2 rounded-md border border-primary/30 bg-primary-soft px-4 py-3 text-sm text-primary-dark">
              <CircleAlert size={18} className="mt-0.5 shrink-0" />
              <span>
                La venta ({pesos(total)}) supera el cupo disponible de {cliente.nombre} ({pesos(cliente.cupo_disponible)}).
              </span>
            </div>
          )}

          <div>
            <label htmlFor="observacion" className="etiqueta">
              Observación
            </label>
            <textarea
              id="observacion"
              className="campo"
              rows={2}
              maxLength={400}
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="boton-primario w-full py-3 text-base"
            disabled={Boolean(bloqueo) || cobrando}
            onClick={cobrar}
          >
            {cobrando && <LoaderCircle size={18} className="animate-spin" />}
            {cobrando ? "Cobrando…" : `Cobrar ${pesos(total)}`}
          </button>
          {bloqueo && carrito.length > 0 && <p className="-mt-2 text-center text-xs text-muted">{bloqueo}</p>}
        </section>
      </div>
    </>
  );
}
