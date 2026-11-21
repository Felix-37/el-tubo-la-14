"use client";

import { useState } from "react";
import Acciones from "@/components/Acciones";
import Buscador from "@/components/Buscador";
import Encabezado from "@/components/Encabezado";
import Estado from "@/components/Estado";
import Mensaje, { type MensajeEstado } from "@/components/Mensaje";
import Modal from "@/components/Modal";
import Tabla from "@/components/Tabla";
import { normalizar } from "@/lib/formato";
import type { Categoria } from "@/lib/tipos";
import { useDatos } from "@/lib/useDatos";
import { useEliminar } from "@/lib/useEliminar";

export default function CategoriasPage() {
  const { datos, setDatos, cargando, error } = useDatos<Categoria>("/categorias");
  const [busqueda, setBusqueda] = useState("");
  const [mensaje, setMensaje] = useState<MensajeEstado>(null);

  const borrado = useEliminar<Categoria>((c) => `/categorias/${c.categoria_id}`, {
    alEliminar: (categoria, texto) => {
      setDatos((lista) => lista.filter((c) => c.categoria_id !== categoria.categoria_id));
      setMensaje({ tipo: "exito", texto });
    },
    alFallar: (texto) => setMensaje({ tipo: "error", texto }),
  });

  const filtradas = datos.filter((c) => normalizar(c.nombre).includes(normalizar(busqueda)));

  return (
    <>
      <Encabezado
        titulo="Categorías"
        descripcion="Grupos en los que se organizan los productos."
        nuevo={{ href: "/categorias/nueva", texto: "Nueva categoría" }}
      />
      <Mensaje mensaje={error ? { tipo: "error", texto: error } : mensaje} />
      <Buscador valor={busqueda} onCambio={setBusqueda} placeholder="Buscar por nombre" />
      <Tabla
        columnas={["Id", "Nombre", "Estado", "Acciones"]}
        cargando={cargando}
        vacia={filtradas.length === 0}
        textoVacia="No hay categorías para mostrar."
      >
        {filtradas.map((c) => (
          <tr key={c.categoria_id} className="hover:bg-background/60">
            <td className="text-muted">{c.categoria_id}</td>
            <td className="font-medium">{c.nombre}</td>
            <td>
              <Estado activo={c.activo} />
            </td>
            <td>
              <Acciones
                ver={`/categorias/${c.categoria_id}`}
                editar={`/categorias/${c.categoria_id}/editar`}
                onEliminar={() => borrado.pedir(c)}
              />
            </td>
          </tr>
        ))}
      </Tabla>
      <Modal
        abierto={borrado.pendiente !== null}
        titulo="Eliminar categoría"
        procesando={borrado.eliminando}
        onConfirmar={borrado.confirmar}
        onCancelar={borrado.cancelar}
      >
        ¿Seguro que quiere eliminar la categoría <strong>{borrado.pendiente?.nombre}</strong>? Esta acción no se
        puede deshacer.
      </Modal>
    </>
  );
}
