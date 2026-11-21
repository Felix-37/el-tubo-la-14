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
import type { Producto } from "@/lib/tipos";
import { useDatos } from "@/lib/useDatos";
import { useEliminar } from "@/lib/useEliminar";

export default function ProductosPage() {
  const { datos, setDatos, cargando, error } = useDatos<Producto>("/productos");
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("");
  const [mensaje, setMensaje] = useState<MensajeEstado>(null);

  const borrado = useEliminar<Producto>((p) => `/productos/${p.producto_id}`, {
    alEliminar: (producto, texto) => {
      setDatos((lista) => lista.filter((p) => p.producto_id !== producto.producto_id));
      setMensaje({ tipo: "exito", texto });
    },
    alFallar: (texto) => setMensaje({ tipo: "error", texto }),
  });

  // Categorías que aparecen en la lista, para el filtro.
  const categorias = [...new Set(datos.map((p) => p.categoria))].sort();
  const texto = normalizar(busqueda);
  const filtrados = datos.filter(
    (p) =>
      (categoria === "" || p.categoria === categoria) &&
      (normalizar(p.nombre).includes(texto) || normalizar(p.descripcion).includes(texto)),
  );

  return (
    <>
      <Encabezado
        titulo="Productos"
        descripcion="Producto base. Sus medidas, precios y existencias están en Presentaciones."
        nuevo={{ href: "/productos/nuevo", texto: "Nuevo producto" }}
      />
      <Mensaje mensaje={error ? { tipo: "error", texto: error } : mensaje} />
      <div className="flex flex-col gap-x-3 sm:flex-row">
        <div className="flex-1">
          <Buscador valor={busqueda} onCambio={setBusqueda} placeholder="Buscar por nombre o descripción" />
        </div>
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          aria-label="Filtrar por categoría"
          className="campo mb-4 sm:w-56"
        >
          <option value="">Categoría: todas</option>
          {categorias.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <Tabla
        columnas={["Id", "Nombre", "Categoría", "¿Se corta?", "Descripción", "Estado", "Acciones"]}
        cargando={cargando}
        vacia={filtrados.length === 0}
        textoVacia="No hay productos para mostrar."
      >
        {filtrados.map((p) => (
          <tr key={p.producto_id} className="hover:bg-background/60">
            <td className="text-muted">{p.producto_id}</td>
            <td className="font-medium">{p.nombre}</td>
            <td className="whitespace-nowrap">{p.categoria}</td>
            <td>{p.es_cortable ? "Sí" : "No"}</td>
            <td className="text-muted">{p.descripcion || "—"}</td>
            <td>
              <Estado activo={p.activo} />
            </td>
            <td>
              <Acciones
                ver={`/productos/${p.producto_id}`}
                editar={`/productos/${p.producto_id}/editar`}
                onEliminar={() => borrado.pedir(p)}
              />
            </td>
          </tr>
        ))}
      </Tabla>
      <Modal
        abierto={borrado.pendiente !== null}
        titulo="Eliminar producto"
        procesando={borrado.eliminando}
        onConfirmar={borrado.confirmar}
        onCancelar={borrado.cancelar}
      >
        ¿Seguro que quiere eliminar el producto <strong>{borrado.pendiente?.nombre}</strong>? Esta acción no se
        puede deshacer.
      </Modal>
    </>
  );
}
