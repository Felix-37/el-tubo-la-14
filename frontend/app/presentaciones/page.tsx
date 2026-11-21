"use client";

import { useState } from "react";
import Acciones from "@/components/Acciones";
import Buscador from "@/components/Buscador";
import Encabezado from "@/components/Encabezado";
import Estado from "@/components/Estado";
import Mensaje, { type MensajeEstado } from "@/components/Mensaje";
import Modal from "@/components/Modal";
import Tabla from "@/components/Tabla";
import { normalizar, pesos } from "@/lib/formato";
import type { Presentacion } from "@/lib/tipos";
import { useDatos } from "@/lib/useDatos";
import { useEliminar } from "@/lib/useEliminar";

// Existencia en rojo si llegó al mínimo, verde si está por encima.
function Existencia({ p }: { p: Presentacion }) {
  const baja = p.existencia <= p.existencia_minima;
  return (
    <span className="whitespace-nowrap">
      {p.existencia}
      <span
        className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${
          baja ? "bg-primary-soft text-primary-dark" : "bg-success-soft text-success"
        }`}
      >
        {baja ? "Baja" : "Disponible"}
      </span>
    </span>
  );
}

export default function PresentacionesPage() {
  const { datos, setDatos, cargando, error } = useDatos<Presentacion>("/presentaciones");
  const [busqueda, setBusqueda] = useState("");
  const [soloBajas, setSoloBajas] = useState(false);
  const [mensaje, setMensaje] = useState<MensajeEstado>(null);

  const borrado = useEliminar<Presentacion>((p) => `/presentaciones/${p.presentacion_id}`, {
    alEliminar: (presentacion, texto) => {
      setDatos((lista) => lista.filter((p) => p.presentacion_id !== presentacion.presentacion_id));
      setMensaje({ tipo: "exito", texto });
    },
    alFallar: (texto) => setMensaje({ tipo: "error", texto }),
  });

  const texto = normalizar(busqueda);
  const filtradas = datos.filter(
    (p) =>
      (!soloBajas || p.existencia <= p.existencia_minima) &&
      (normalizar(p.referencia).includes(texto) ||
        normalizar(p.producto).includes(texto) ||
        normalizar(p.codigo_barras).includes(texto)),
  );

  return (
    <>
      <Encabezado
        titulo="Presentaciones"
        descripcion="Lo que se vende en el mostrador. El precio de venta ya incluye el IVA."
        nuevo={{ href: "/presentaciones/nueva", texto: "Nueva presentación" }}
      />
      <Mensaje mensaje={error ? { tipo: "error", texto: error } : mensaje} />
      <div className="flex flex-col gap-x-4 sm:flex-row sm:items-start">
        <div className="flex-1">
          <Buscador
            valor={busqueda}
            onCambio={setBusqueda}
            placeholder="Buscar por referencia, producto o código de barras"
          />
        </div>
        <label className="mb-4 flex items-center gap-2 py-2 text-sm">
          <input
            type="checkbox"
            checked={soloBajas}
            onChange={(e) => setSoloBajas(e.target.checked)}
            className="size-4 accent-primary"
          />
          Solo existencia baja
        </label>
      </div>
      <Tabla
        columnas={["Referencia", "Producto", "Medida", "Calibre", "Precio con IVA", "Costo", "Existencia", "Estado", "Acciones"]}
        cargando={cargando}
        vacia={filtradas.length === 0}
        textoVacia="No hay presentaciones para mostrar."
      >
        {filtradas.map((p) => (
          <tr key={p.presentacion_id} className="hover:bg-background/60">
            <td className="font-mono text-xs font-semibold whitespace-nowrap">{p.referencia}</td>
            <td className="font-medium">{p.producto}</td>
            <td className="whitespace-nowrap">{p.medida || "—"}</td>
            <td className="whitespace-nowrap">{p.calibre || "—"}</td>
            <td className="whitespace-nowrap">{pesos(p.precio_venta)}</td>
            <td className="whitespace-nowrap text-muted">{pesos(p.costo)}</td>
            <td>
              <Existencia p={p} />
            </td>
            <td>
              <Estado activo={p.activo} />
            </td>
            <td>
              <Acciones
                ver={`/presentaciones/${p.presentacion_id}`}
                editar={`/presentaciones/${p.presentacion_id}/editar`}
                onEliminar={() => borrado.pedir(p)}
              />
            </td>
          </tr>
        ))}
      </Tabla>
      <Modal
        abierto={borrado.pendiente !== null}
        titulo="Eliminar presentación"
        procesando={borrado.eliminando}
        onConfirmar={borrado.confirmar}
        onCancelar={borrado.cancelar}
      >
        ¿Seguro que quiere eliminar la presentación <strong>{borrado.pendiente?.referencia}</strong> (
        {borrado.pendiente?.producto})? Esta acción no se puede deshacer.
      </Modal>
    </>
  );
}
