"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, Pencil } from "lucide-react";
import Buscador from "@/components/Buscador";
import Casilla from "@/components/Casilla";
import Encabezado from "@/components/Encabezado";
import Mensaje from "@/components/Mensaje";
import Tabla from "@/components/Tabla";
import EstadoUsuario from "@/components/usuarios/EstadoUsuario";
import { fechaHora } from "@/components/usuarios/util";
import { normalizar } from "@/lib/formato";
import { NOMBRE_ROL, TODOS, type Rol } from "@/lib/roles";
import type { Usuario } from "@/lib/tipos-usuarios";
import { useDatos } from "@/lib/useDatos";

const ENLACE = "inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-foreground hover:bg-background";

// Ruta /usuarios: lista de cuentas con búsqueda, filtro por rol y opción de ver las eliminadas.
export default function UsuariosPage() {
  const [conEliminados, setConEliminados] = useState(false);
  const { datos, cargando, error } = useDatos<Usuario>(conEliminados ? "/usuarios?eliminados=true" : "/usuarios");
  const [busqueda, setBusqueda] = useState("");
  const [rol, setRol] = useState<Rol | "">("");

  const texto = normalizar(busqueda.trim());
  const filtrados = datos.filter(
    (u) =>
      (rol === "" || u.rol === rol) &&
      [u.nombre_usuario, u.nombre_completo, u.correo].some((campo) => normalizar(campo).includes(texto)),
  );

  return (
    <>
      <Encabezado
        titulo="Usuarios"
        descripcion="Cuentas que pueden ingresar al sistema y el rol de cada una."
        nuevo={{ href: "/usuarios/nuevo", texto: "Nuevo usuario" }}
      />
      <Mensaje mensaje={error ? { tipo: "error", texto: error } : null} />
      <Buscador valor={busqueda} onCambio={setBusqueda} placeholder="Buscar por usuario, nombre o correo" />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted">Rol</span>
          <select className="campo w-auto" value={rol} onChange={(e) => setRol(e.target.value as Rol | "")}>
            <option value="">Todos</option>
            {TODOS.map((r) => (
              <option key={r} value={r}>
                {NOMBRE_ROL[r]}
              </option>
            ))}
          </select>
        </label>
        <Casilla texto="Mostrar eliminados" marcada={conEliminados} onCambio={setConEliminados} />
      </div>
      <Tabla
        columnas={["Usuario", "Nombre", "Rol", "Cliente", "Estado", "Último ingreso", "Acciones"]}
        cargando={cargando}
        vacia={filtrados.length === 0}
        textoVacia="No hay usuarios para mostrar."
      >
        {filtrados.map((u) => (
          <tr key={u.usuario_id} className="hover:bg-background/60">
            <td className="font-medium">{u.nombre_usuario}</td>
            <td>
              {u.nombre_completo}
              {u.correo && <span className="block text-xs text-muted">{u.correo}</span>}
            </td>
            <td>{NOMBRE_ROL[u.rol] ?? u.rol_nombre}</td>
            <td>{u.cliente_nombre ?? <span className="text-muted">Ninguno</span>}</td>
            <td>
              <EstadoUsuario usuario={u} />
            </td>
            <td className="whitespace-nowrap text-muted">{fechaHora(u.ultimo_ingreso)}</td>
            <td>
              <div className="flex gap-1 whitespace-nowrap">
                <Link href={`/usuarios/${u.usuario_id}`} className={ENLACE}>
                  <Eye size={14} />
                  Ver
                </Link>
                {!u.eliminado_en && (
                  <Link href={`/usuarios/${u.usuario_id}/editar`} className={ENLACE}>
                    <Pencil size={14} />
                    Editar
                  </Link>
                )}
              </div>
            </td>
          </tr>
        ))}
      </Tabla>
    </>
  );
}
