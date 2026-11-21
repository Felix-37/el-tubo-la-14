"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Detalle, { type Campo } from "./Detalle";
import type { MensajeEstado } from "./Mensaje";
import Modal from "./Modal";
import { useRegistro } from "@/lib/useDatos";
import { useEliminar } from "@/lib/useEliminar";

type VistaDetalleProps<T> = {
  tabla: string; // segmento de la ruta y del endpoint, p. ej. "categorias"
  titulo: string; // "Categoría"
  conArticulo: string; // "la categoría", para el texto del modal
  nombre: (registro: T) => string;
  campos: (registro: T) => Campo[];
};

// Ruta /tabla/[id]: consulta un único registro (GET /tabla/:id), lo muestra
// y permite ir a editarlo o eliminarlo con confirmación.
export default function VistaDetalle<T>({ tabla, titulo, conArticulo, nombre, campos }: VistaDetalleProps<T>) {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { registro, cargando, error } = useRegistro<T>(`/${tabla}/${id}`);
  const [mensaje, setMensaje] = useState<MensajeEstado>(null);
  const [eliminado, setEliminado] = useState(false);

  const borrado = useEliminar<T>(() => `/${tabla}/${id}`, {
    alEliminar: (_, texto) => {
      setEliminado(true);
      setMensaje({ tipo: "exito", texto: `${texto}. Volviendo a la lista…` });
      setTimeout(() => router.push(`/${tabla}`), 1200);
    },
    alFallar: (texto) => setMensaje({ tipo: "error", texto }),
  });

  return (
    <>
      <Detalle
        titulo={registro ? `${titulo} #${id} · ${nombre(registro)}` : `${titulo} #${id}`}
        volver={`/${tabla}`}
        editar={`/${tabla}/${id}/editar`}
        cargando={cargando}
        mensaje={mensaje ?? (error ? { tipo: "error", texto: error } : null)}
        campos={registro && !eliminado ? campos(registro) : null}
        onEliminar={() => registro && borrado.pedir(registro)}
      />
      <Modal
        abierto={borrado.pendiente !== null}
        titulo={`Eliminar ${titulo.toLowerCase()}`}
        procesando={borrado.eliminando}
        onConfirmar={borrado.confirmar}
        onCancelar={borrado.cancelar}
      >
        ¿Seguro que quiere eliminar {conArticulo} <strong>{registro && nombre(registro)}</strong>? Esta acción no se
        puede deshacer.
      </Modal>
    </>
  );
}
