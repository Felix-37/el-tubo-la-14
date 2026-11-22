"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import Mensaje from "@/components/Mensaje";
import { useSesion } from "@/components/auth/ProveedorSesion";
import { pesos } from "@/lib/formato";
import type { FichaCliente, MovimientoCartera } from "@/lib/tipos-cuenta";
import { useDatos, useRegistro } from "@/lib/useDatos";
import FormContacto from "./FormContacto";
import Tarjeta, { Cargando } from "./Tarjeta";
import { fechaCorta, restaDeuda, textoMovimiento } from "./utilidades";

// Cuántos movimientos se ven antes de pulsar "Ver todos".
const ULTIMOS = 5;

// Ruta /mi-cuenta: saldo y cupo del cliente, sus últimos movimientos
// y sus datos de contacto. Pensada primero para el celular.
export default function MiCuenta() {
  const { usuario } = useSesion();
  const { registro, cargando, error } = useRegistro<FichaCliente>("/mi-cuenta");
  const movimientos = useDatos<MovimientoCartera>("/mi-cuenta/movimientos");
  // Después de guardar el contacto, el backend devuelve la ficha nueva.
  const [actualizada, setActualizada] = useState<FichaCliente | null>(null);
  const [verTodos, setVerTodos] = useState(false);

  const ficha = actualizada ?? registro;
  const nombre = usuario?.nombre_completo.split(" ")[0] ?? "";
  const lista = verTodos ? movimientos.datos : movimientos.datos.slice(0, ULTIMOS);

  return (
    <div className="mx-auto grid max-w-3xl gap-5">
      <h1 className="text-2xl font-bold md:text-3xl">Hola, {nombre}</h1>
      <Mensaje mensaje={error ? { tipo: "error", texto: error } : null} />

      {cargando ? (
        <Tarjeta destacada>
          <Cargando />
        </Tarjeta>
      ) : (
        ficha && <Saldo ficha={ficha} />
      )}

      <Tarjeta titulo="Últimos movimientos">
        <Mensaje mensaje={movimientos.error ? { tipo: "error", texto: movimientos.error } : null} />
        {movimientos.cargando ? (
          <Cargando texto="Cargando movimientos…" />
        ) : movimientos.datos.length === 0 ? (
          !movimientos.error && <p className="text-sm text-muted">Todavía no hay movimientos en su cuenta.</p>
        ) : (
          <>
            <ul className="divide-y divide-border">
              {lista.map((m) => {
                const resta = restaDeuda(m.tipo);
                return (
                  <li key={m.movimiento_id} className="flex items-start justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm">
                        {fechaCorta(m.fecha)} · {textoMovimiento(m.tipo, m.numero_venta, m.forma_pago)}
                      </p>
                      {m.observacion && <p className="mt-0.5 text-xs break-words text-muted">{m.observacion}</p>}
                    </div>
                    <span className={`shrink-0 text-sm font-bold ${resta ? "text-success" : ""}`}>
                      {resta ? `−${pesos(m.valor)}` : pesos(m.valor)}
                    </span>
                  </li>
                );
              })}
            </ul>
            {movimientos.datos.length > ULTIMOS && (
              <button
                type="button"
                onClick={() => setVerTodos((v) => !v)}
                className="mt-3 text-sm font-semibold text-primary hover:text-primary-dark"
              >
                {verTodos ? "Ver menos" : `Ver todos (${movimientos.datos.length})`}
              </button>
            )}
          </>
        )}
      </Tarjeta>

      <Link
        href="/mi-cuenta/compras"
        className="flex items-center justify-between rounded-lg border border-border bg-surface p-5 font-semibold shadow-sm hover:border-primary hover:text-primary"
      >
        Ver mis compras
        <ChevronRight size={20} />
      </Link>

      {ficha && (
        <Tarjeta titulo="Datos de contacto" descripcion="Así lo contacta el almacén. Deje un campo vacío para borrarlo.">
          <FormContacto key={ficha.cliente_id} ficha={ficha} onGuardado={setActualizada} />
        </Tarjeta>
      )}
    </div>
  );
}

// Saldo pendiente con la barra de cupo usado y disponible.
function Saldo({ ficha }: { ficha: FichaCliente }) {
  const { saldo, cupo_credito: cupo, cupo_disponible: disponible } = ficha;
  const usado = cupo > 0 ? Math.min(100, Math.max(0, (saldo / cupo) * 100)) : saldo > 0 ? 100 : 0;
  return (
    <Tarjeta destacada>
      <p className="text-sm text-muted">Saldo pendiente</p>
      <p className="mt-1 text-4xl font-bold tracking-tight md:text-5xl">{pesos(saldo)}</p>
      {cupo > 0 ? (
        <>
          <div
            className="mt-5 h-3 overflow-hidden rounded-full bg-border"
            role="progressbar"
            aria-label="Cupo de crédito usado"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(usado)}
          >
            <div className="h-full rounded-full bg-primary" style={{ width: `${usado}%` }} />
          </div>
          <p className="mt-3 text-sm text-muted">
            Usado {pesos(saldo)} de {pesos(cupo)} · Disponible{" "}
            <span className={disponible > 0 ? "font-semibold text-foreground" : "font-semibold text-primary"}>
              {pesos(disponible)}
            </span>
          </p>
        </>
      ) : (
        <p className="mt-3 text-sm text-muted">No tiene cupo de crédito asignado.</p>
      )}
    </Tarjeta>
  );
}
