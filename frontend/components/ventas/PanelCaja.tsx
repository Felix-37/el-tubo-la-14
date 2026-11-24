"use client";

import { useEffect, useState, type SubmitEvent } from "react";
import Link from "next/link";
import { LoaderCircle, Lock, LockOpen, RefreshCw, ShoppingCart } from "lucide-react";
import Boton from "@/components/Boton";
import Mensaje, { type MensajeEstado } from "@/components/Mensaje";
import { useSesion } from "@/components/auth/ProveedorSesion";
import { api } from "@/lib/api";
import { pesos } from "@/lib/formato";
import type { Caja, CajaConResumen } from "@/lib/tipos-ventas";
import Confirmacion from "./Confirmacion";
import Fila from "./Fila";
import { fechaHora, leerDinero, redondear } from "./util";

const TARJETA = "rounded-lg border border-border bg-surface p-5 shadow-sm md:p-6";

// Faltante en rojo, sobrante en verde, cuadrada en gris.
function Diferencia({ valor }: { valor: number }) {
  if (valor === 0) return <span className="text-muted">{pesos(0)} (cuadrada)</span>;
  return valor < 0 ? (
    <span className="text-primary">
      {pesos(valor)} (faltante)
    </span>
  ) : (
    <span className="text-success">
      +{pesos(valor)} (sobrante)
    </span>
  );
}

// Ruta /caja. Sin caja abierta: el CAJERO la abre con la base inicial.
// Con caja abierta: resumen del turno y, para el CAJERO, el cierre con arqueo.
export default function PanelCaja() {
  const { usuario } = useSesion();
  const esCajero = usuario?.rol === "CAJERO";

  const [caja, setCaja] = useState<CajaConResumen | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [consulta, setConsulta] = useState(0);
  const [mensaje, setMensaje] = useState<MensajeEstado>(null);
  // Resultado del último cierre, para mostrarlo después de cerrar.
  const [cerrada, setCerrada] = useState<Caja | null>(null);

  const [base, setBase] = useState("");
  const [obsApertura, setObsApertura] = useState("");
  const [abriendo, setAbriendo] = useState(false);

  const [contado, setContado] = useState("");
  const [obsCierre, setObsCierre] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [cerrando, setCerrando] = useState(false);

  // GET /ventas/caja: null si no hay caja abierta.
  useEffect(() => {
    let vigente = true;
    api<CajaConResumen | null>("/ventas/caja")
      .then(({ data }) => {
        if (vigente) {
          setCaja(data);
          setErrorCarga(false);
        }
      })
      .catch((e: Error) => {
        if (vigente) {
          setMensaje({ tipo: "error", texto: e.message });
          setErrorCarga(true);
        }
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [consulta]);

  function actualizar() {
    setCargando(true);
    setMensaje(null);
    setConsulta((n) => n + 1);
  }

  async function abrir(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (abriendo) return;
    const valor = leerDinero(base);
    if (valor === null || Number.isNaN(valor)) {
      setMensaje({ tipo: "error", texto: "La base inicial debe ser un valor de 0 o más, con máximo 2 decimales." });
      return;
    }
    setAbriendo(true);
    try {
      const { data, mensaje } = await api<CajaConResumen>("/ventas/caja/abrir", {
        method: "POST",
        body: { base_inicial: valor, observacion: obsApertura.trim() || undefined },
      });
      setCaja(data);
      setCerrada(null);
      setBase("");
      setObsApertura("");
      setMensaje({ tipo: "exito", texto: mensaje ?? "Caja abierta" });
    } catch (e) {
      setMensaje({ tipo: "error", texto: (e as Error).message });
    } finally {
      setAbriendo(false);
    }
  }

  const valorContado = leerDinero(contado);
  const contadoValido = valorContado !== null && !Number.isNaN(valorContado);
  const esperado = caja?.resumen.efectivo_esperado ?? 0;
  const diferencia = contadoValido ? redondear(valorContado - esperado) : null;

  function pedirCierre(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!contadoValido) {
      setMensaje({ tipo: "error", texto: "El efectivo contado debe ser un valor de 0 o más, con máximo 2 decimales." });
      return;
    }
    setMensaje(null);
    setConfirmando(true);
  }

  async function cerrar() {
    if (cerrando || !contadoValido) return;
    setCerrando(true);
    try {
      const { data, mensaje } = await api<Caja>("/ventas/caja/cerrar", {
        method: "POST",
        body: { efectivo_contado: valorContado, observacion: obsCierre.trim() || undefined },
      });
      setCerrada(data);
      setCaja(null);
      setContado("");
      setObsCierre("");
      setMensaje({ tipo: "exito", texto: mensaje ?? "Caja cerrada" });
    } catch (e) {
      setMensaje({ tipo: "error", texto: (e as Error).message });
    } finally {
      setCerrando(false);
      setConfirmando(false);
    }
  }

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Caja</h1>
          <p className="mt-1 text-sm text-muted">
            {/* La hora ya termina en "a. m." o "p. m.": el punto final solo se agrega si falta. */}
            {caja ? `Turno abierto desde ${fechaHora(caja.fecha_apertura)}`.replace(/\.?$/, ".") : "Apertura, resumen del turno y arqueo de cierre."}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Boton variante="secundario" icono={RefreshCw} procesando={cargando} onClick={actualizar}>
            Actualizar
          </Boton>
          {caja && esCajero && (
            <Link href="/ventas/nueva" className="boton-primario">
              <ShoppingCart size={18} />
              Punto de venta
            </Link>
          )}
        </div>
      </div>

      <Mensaje mensaje={mensaje} />

      {cerrada && (
        <section className={`${TARJETA} mb-6`}>
          <h2 className="mb-3 text-lg font-semibold">Resultado del cierre</h2>
          <Fila texto="Abierta por" valor={`${cerrada.abierta_por} · ${fechaHora(cerrada.fecha_apertura)}`} />
          <Fila texto="Cerrada por" valor={`${cerrada.cerrada_por ?? "—"} · ${fechaHora(cerrada.fecha_cierre)}`} />
          <Fila texto="Efectivo esperado" valor={pesos(cerrada.efectivo_esperado ?? 0)} />
          <Fila texto="Efectivo contado" valor={pesos(cerrada.efectivo_contado ?? 0)} />
          <Fila texto="Diferencia" valor={<Diferencia valor={cerrada.diferencia ?? 0} />} fuerte />
          {cerrada.observacion && <p className="mt-3 text-sm text-muted">Observación: {cerrada.observacion}</p>}
        </section>
      )}

      {cargando && !caja ? (
        <p className="text-sm text-muted">
          <LoaderCircle size={18} className="mr-2 inline animate-spin" />
          Consultando la caja…
        </p>
      ) : errorCarga && !caja ? (
        <p className="text-sm text-muted">No se pudo consultar el estado de la caja. Pulse Actualizar para intentar de nuevo.</p>
      ) : !caja ? (
        esCajero ? (
          <section className={`${TARJETA} max-w-lg`}>
            <h2 className="mb-1 text-lg font-semibold">Abrir caja</h2>
            <p className="mb-4 text-sm text-muted">Cuente el efectivo con el que inicia el turno. Sin caja abierta no se puede vender.</p>
            <form onSubmit={abrir} noValidate className="grid gap-4">
              <div>
                <label htmlFor="base" className="etiqueta">
                  Base inicial *
                </label>
                <input
                  id="base"
                  className="campo"
                  inputMode="decimal"
                  value={base}
                  onChange={(e) => setBase(e.target.value)}
                  placeholder="Ej.: 200000"
                />
              </div>
              <div>
                <label htmlFor="obs-apertura" className="etiqueta">
                  Observación
                </label>
                <textarea
                  id="obs-apertura"
                  className="campo"
                  rows={2}
                  maxLength={400}
                  value={obsApertura}
                  onChange={(e) => setObsApertura(e.target.value)}
                />
              </div>
              <Boton type="submit" icono={LockOpen} procesando={abriendo}>
                {abriendo ? "Abriendo…" : "Abrir caja"}
              </Boton>
            </form>
          </section>
        ) : (
          <section className={`${TARJETA} max-w-lg`}>
            <h2 className="text-lg font-semibold">No hay caja abierta</h2>
            <p className="mt-1 text-sm text-muted">Cuando un cajero abra la caja, aquí verá el resumen del turno.</p>
          </section>
        )
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          <section className={`${TARJETA} lg:col-span-3`}>
            <h2 className="mb-3 text-lg font-semibold">Resumen del turno</h2>
            <Fila texto="Abierta por" valor={caja.abierta_por} />
            <Fila texto="Desde" valor={fechaHora(caja.fecha_apertura)} />
            <Fila texto="Base inicial" valor={pesos(caja.resumen.base_inicial)} />
            <Fila texto="Ventas en efectivo" valor={pesos(caja.resumen.ventas_efectivo)} />
            <Fila texto="Ventas por transferencia" valor={pesos(caja.resumen.ventas_transferencia)} />
            <Fila texto="Ventas a crédito" valor={pesos(caja.resumen.ventas_credito)} />
            {caja.resumen.ingresos > 0 && <Fila texto="Ingresos y abonos" valor={pesos(caja.resumen.ingresos)} />}
            {caja.resumen.egresos > 0 && <Fila texto="Egresos y devoluciones" valor={`-${pesos(caja.resumen.egresos)}`} />}
            <Fila texto="Número de ventas" valor={caja.resumen.numero_ventas} />
            <Fila texto="Efectivo esperado" valor={pesos(caja.resumen.efectivo_esperado)} fuerte />
            {caja.observacion && <p className="mt-3 text-sm text-muted">Observación: {caja.observacion}</p>}
          </section>

          {esCajero ? (
            <section className={`${TARJETA} lg:col-span-2`}>
              <h2 className="mb-4 text-lg font-semibold">Cierre de caja</h2>
              <form onSubmit={pedirCierre} noValidate className="grid gap-4">
                <div>
                  <label htmlFor="contado" className="etiqueta">
                    Efectivo contado *
                  </label>
                  <input
                    id="contado"
                    className="campo"
                    inputMode="decimal"
                    value={contado}
                    onChange={(e) => setContado(e.target.value)}
                    placeholder="Ej.: 818000"
                  />
                </div>
                <div className="flex items-baseline justify-between rounded-md border border-border bg-background px-4 py-3 text-sm">
                  <span className="text-muted">Diferencia</span>
                  <span className="font-semibold tabular-nums">
                    {diferencia === null ? "—" : <Diferencia valor={diferencia} />}
                  </span>
                </div>
                <div>
                  <label htmlFor="obs-cierre" className="etiqueta">
                    Observación
                  </label>
                  <textarea
                    id="obs-cierre"
                    className="campo"
                    rows={3}
                    maxLength={400}
                    value={obsCierre}
                    onChange={(e) => setObsCierre(e.target.value)}
                    placeholder={diferencia ? "Explique la diferencia" : undefined}
                  />
                </div>
                <Boton type="submit" icono={Lock} procesando={cerrando}>
                  Cerrar caja
                </Boton>
              </form>
            </section>
          ) : (
            <section className={`${TARJETA} lg:col-span-2`}>
              <h2 className="text-lg font-semibold">Solo consulta</h2>
              <p className="mt-1 text-sm text-muted">El cierre con arqueo lo hace el cajero del turno.</p>
            </section>
          )}
        </div>
      )}

      <Confirmacion
        abierto={confirmando}
        titulo="Cerrar caja"
        textoConfirmar="Cerrar caja"
        textoProcesando="Cerrando…"
        procesando={cerrando}
        onConfirmar={cerrar}
        onCancelar={() => setConfirmando(false)}
      >
        <div className="mt-2">
          <Fila texto="Efectivo esperado" valor={pesos(esperado)} />
          <Fila texto="Efectivo contado" valor={pesos(valorContado ?? 0)} />
          <Fila texto="Diferencia" valor={<Diferencia valor={diferencia ?? 0} />} fuerte />
        </div>
        <p className="mt-3">
          El backend recalcula el esperado al cerrar, por si entró una venta mientras tanto. Después de cerrar no se
          puede vender hasta abrir otra caja.
        </p>
      </Confirmacion>
    </>
  );
}
