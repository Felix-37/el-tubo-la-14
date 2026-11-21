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
import type { Calibre } from "@/lib/tipos";
import { useDatos } from "@/lib/useDatos";
import { useEliminar } from "@/lib/useEliminar";

export default function CalibresPage() {
  const { datos, setDatos, cargando, error } = useDatos<Calibre>("/calibres");
  const [busqueda, setBusqueda] = useState("");
  const [mensaje, setMensaje] = useState<MensajeEstado>(null);

  const borrado = useEliminar<Calibre>((c) => `/calibres/${c.calibre_id}`, {
    alEliminar: (calibre, texto) => {
      setDatos((lista) => lista.filter((c) => c.calibre_id !== calibre.calibre_id));
      setMensaje({ tipo: "exito", texto });
    },
    alFallar: (texto) => setMensaje({ tipo: "error", texto }),
  });

  const texto = normalizar(busqueda);
  const filtrados = datos.filter(
    (c) => normalizar(c.nombre).includes(texto) || normalizar(c.descripcion).includes(texto),
  );

  return (
    <>
      <Encabezado
        titulo="Calibres"
        descripcion="Grosor del material y tarifa de corte que se cobra por cada corte."
        nuevo={{ href: "/calibres/nuevo", texto: "Nuevo calibre" }}
      />
      <Mensaje mensaje={error ? { tipo: "error", texto: error } : mensaje} />
      <Buscador valor={busqueda} onCambio={setBusqueda} placeholder="Buscar por nombre o descripción" />
      <Tabla
        columnas={["Id", "Nombre", "Descripción", "Tarifa de corte", "Estado", "Acciones"]}
        cargando={cargando}
        vacia={filtrados.length === 0}
        textoVacia="No hay calibres para mostrar."
      >
        {filtrados.map((c) => (
          <tr key={c.calibre_id} className="hover:bg-background/60">
            <td className="text-muted">{c.calibre_id}</td>
            <td className="font-medium whitespace-nowrap">{c.nombre}</td>
            <td className="text-muted">{c.descripcion || "—"}</td>
            <td className="whitespace-nowrap">{pesos(c.tarifa_corte)}</td>
            <td>
              <Estado activo={c.activo} />
            </td>
            <td>
              <Acciones
                ver={`/calibres/${c.calibre_id}`}
                editar={`/calibres/${c.calibre_id}/editar`}
                onEliminar={() => borrado.pedir(c)}
              />
            </td>
          </tr>
        ))}
      </Tabla>
      <Modal
        abierto={borrado.pendiente !== null}
        titulo="Eliminar calibre"
        procesando={borrado.eliminando}
        onConfirmar={borrado.confirmar}
        onCancelar={borrado.cancelar}
      >
        ¿Seguro que quiere eliminar el calibre <strong>{borrado.pendiente?.nombre}</strong>? Esta acción no se puede
        deshacer.
      </Modal>
    </>
  );
}
