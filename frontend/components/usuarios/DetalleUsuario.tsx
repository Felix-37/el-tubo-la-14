"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Info,
  LoaderCircle,
  LockOpen,
  Pencil,
  Power,
  PowerOff,
  RotateCcw,
  Save,
  Trash,
  type LucideIcon,
} from "lucide-react";
import { BotonEnlace } from "@/components/Boton";
import Mensaje, { type MensajeEstado } from "@/components/Mensaje";
import Modal from "@/components/Modal";
import { useSesion } from "@/components/auth/ProveedorSesion";
import { api } from "@/lib/api";
import { NOMBRE_ROL, TODOS, type Rol } from "@/lib/roles";
import type { Usuario } from "@/lib/tipos-usuarios";
import EstadoUsuario from "./EstadoUsuario";
import SelectCliente from "./SelectCliente";
import { estaBloqueado, fechaHora } from "./util";

type Accion = "rol" | "estado" | "desbloquear" | "eliminar";

const CLASES = {
  primario: "boton-primario",
  secundario: "boton-secundario disabled:cursor-not-allowed disabled:opacity-60",
  peligro: "boton-peligro",
};

// Botón de las acciones del detalle: a diferencia de Boton, se puede deshabilitar
// (para la cuenta propia) y muestra el motivo al pasar el cursor.
function BotonAccion({
  children,
  icono: Icono,
  variante = "secundario",
  procesando = false,
  deshabilitado = false,
  motivo,
  onClick,
}: {
  children: ReactNode;
  icono: LucideIcon;
  variante?: keyof typeof CLASES;
  procesando?: boolean;
  deshabilitado?: boolean;
  motivo?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={procesando || deshabilitado}
      title={deshabilitado ? motivo : undefined}
      className={CLASES[variante]}
    >
      {procesando ? <LoaderCircle size={18} className="animate-spin" /> : <Icono size={18} />}
      {children}
    </button>
  );
}

function Tarjeta({ titulo, children }: { titulo?: string; children: ReactNode }) {
  return (
    <section className="mt-6 rounded-lg border border-border bg-surface p-6 shadow-sm md:p-8">
      {titulo && <h2 className="mb-4 text-lg font-semibold">{titulo}</h2>}
      {children}
    </section>
  );
}

// Ruta /usuarios/[id]: datos de la cuenta y acciones del ADMIN (rol, estado, eliminar).
export default function DetalleUsuario() {
  const { id } = useParams<{ id: string }>();
  const { usuario: sesion } = useSesion();
  const propio = sesion?.usuario_id === Number(id);
  const MOTIVO_PROPIO = "No puede hacerlo sobre su propia cuenta.";

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState<MensajeEstado>(null);
  const [procesando, setProcesando] = useState<Accion | null>(null);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const [rolNuevo, setRolNuevo] = useState<Rol>("CAJERO");
  const [clienteNuevo, setClienteNuevo] = useState("");

  useEffect(() => {
    api<Usuario>(`/usuarios/${id}`)
      .then(({ data }) => {
        setUsuario(data);
        setRolNuevo(data.rol);
      })
      .catch((e: Error) => setMensaje({ tipo: "error", texto: e.message }))
      .finally(() => setCargando(false));
  }, [id]);

  // Ejecuta una acción, guarda el usuario que devuelve el backend y muestra el resultado.
  async function ejecutar(accion: Accion, peticion: () => Promise<{ data: Usuario; mensaje?: string }>, extra = "") {
    if (procesando) return;
    setProcesando(accion);
    try {
      const { data, mensaje } = await peticion();
      setUsuario(data);
      setRolNuevo(data.rol);
      setClienteNuevo("");
      setMensaje({ tipo: "exito", texto: `${mensaje ?? "Cambios guardados"}${extra}` });
    } catch (e) {
      setMensaje({ tipo: "error", texto: (e as Error).message });
    } finally {
      setProcesando(null);
      setConfirmarBorrado(false);
    }
  }

  function cambiarRol() {
    if (!usuario) return;
    if (rolNuevo === "CLIENTE" && !clienteNuevo) {
      setMensaje({ tipo: "error", texto: "Elija el cliente que se enlaza a este usuario." });
      return;
    }
    if (rolNuevo === "CLIENTE" && usuario.rol === "CLIENTE" && Number(clienteNuevo) === usuario.cliente_id) {
      setMensaje({ tipo: "error", texto: "El usuario ya está enlazado a ese cliente." });
      return;
    }
    if (rolNuevo === usuario.rol && rolNuevo !== "CLIENTE") {
      setMensaje({ tipo: "error", texto: "El usuario ya tiene ese rol." });
      return;
    }
    ejecutar(
      "rol",
      () =>
        api<Usuario>(`/usuarios/${id}/rol`, {
          method: "PATCH",
          body: { rol: rolNuevo, ...(rolNuevo === "CLIENTE" && { cliente_id: Number(clienteNuevo) }) },
        }),
      ". Se cerraron las sesiones abiertas de esta cuenta.",
    );
  }

  const cambiarEstado = (activo: boolean, accion: Accion = "estado") =>
    ejecutar(
      accion,
      () => api<Usuario>(`/usuarios/${id}/estado`, { method: "PATCH", body: { activo } }),
      activo ? "" : ". Se cerraron las sesiones abiertas de esta cuenta.",
    );

  const eliminar = () => ejecutar("eliminar", () => api<Usuario>(`/usuarios/${id}`, { method: "DELETE" }));

  const eliminado = Boolean(usuario?.eliminado_en);
  const bloqueado = usuario ? estaBloqueado(usuario) : false;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/usuarios" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-primary">
        <ArrowLeft size={16} />
        Volver a la lista
      </Link>
      <div className="rounded-lg border border-border bg-surface p-6 shadow-sm md:p-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="text-2xl font-bold break-words">
            {usuario ? `Usuario ${usuario.nombre_usuario}` : `Usuario #${id}`}
          </h1>
          {usuario && !eliminado && (
            <BotonEnlace href={`/usuarios/${id}/editar`} variante="secundario" icono={Pencil}>
              Editar
            </BotonEnlace>
          )}
        </div>
        <Mensaje mensaje={mensaje} />
        {cargando ? (
          <p className="text-sm text-muted">
            <LoaderCircle size={18} className="mr-2 inline animate-spin" />
            Cargando datos…
          </p>
        ) : (
          usuario && (
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {[
                { etiqueta: "Id", valor: usuario.usuario_id },
                { etiqueta: "Nombre de usuario", valor: usuario.nombre_usuario },
                { etiqueta: "Nombre completo", valor: usuario.nombre_completo },
                { etiqueta: "Correo", valor: usuario.correo ?? "Sin correo" },
                { etiqueta: "Rol", valor: NOMBRE_ROL[usuario.rol] ?? usuario.rol_nombre },
                { etiqueta: "Cliente enlazado", valor: usuario.cliente_nombre ?? "Ninguno" },
                { etiqueta: "Estado", valor: <EstadoUsuario usuario={usuario} /> },
                { etiqueta: "Último ingreso", valor: fechaHora(usuario.ultimo_ingreso) },
                { etiqueta: "Creado", valor: fechaHora(usuario.creado_en, "Sin dato") },
                ...(bloqueado ? [{ etiqueta: "Bloqueado hasta", valor: fechaHora(usuario.bloqueado_hasta) }] : []),
                ...(eliminado ? [{ etiqueta: "Eliminado el", valor: fechaHora(usuario.eliminado_en) }] : []),
              ].map(({ etiqueta, valor }) => (
                <div key={etiqueta} className="border-b border-border pb-3">
                  <dt className="text-xs font-semibold tracking-wide text-muted uppercase">{etiqueta}</dt>
                  <dd className="mt-1 text-sm break-words">{valor}</dd>
                </div>
              ))}
            </dl>
          )
        )}
      </div>

      {usuario && propio && (
        <div className="mt-6 flex items-start gap-2 rounded-md border border-border bg-background px-4 py-3 text-sm text-muted">
          <Info size={18} className="mt-0.5 shrink-0" />
          <span>
            Esta es su propia cuenta. No puede cambiar su rol, desactivarla ni eliminarla: así el sistema nunca se queda
            sin el administrador que está trabajando. Otro administrador puede hacerlo. Sus datos y su clave sí los
            puede cambiar con Editar.
          </span>
        </div>
      )}

      {usuario && !eliminado && (
        <Tarjeta titulo="Cambiar rol">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="rol" className="etiqueta">
                Rol nuevo
              </label>
              <select
                id="rol"
                className="campo disabled:opacity-60"
                value={rolNuevo}
                disabled={propio}
                onChange={(e) => {
                  setRolNuevo(e.target.value as Rol);
                  setClienteNuevo("");
                }}
              >
                {TODOS.map((r) => (
                  <option key={r} value={r}>
                    {NOMBRE_ROL[r]}
                  </option>
                ))}
              </select>
            </div>
            {rolNuevo === "CLIENTE" && !propio && (
              <div>
                <label htmlFor="cliente" className="etiqueta">
                  {usuario.rol === "CLIENTE" ? "Enlazar a otro cliente" : "Cliente enlazado"}
                </label>
                {/* key: al cambiar el cliente enlazado, la lista de clientes libres se vuelve a pedir. */}
                <SelectCliente key={usuario.cliente_id ?? "ninguno"} id="cliente" valor={clienteNuevo} onCambio={setClienteNuevo} />
              </div>
            )}
          </div>
          <p className="mt-3 text-xs text-muted">
            Al cambiar el rol se cierran las sesiones abiertas del usuario. Debe quedar al menos un administrador activo.
          </p>
          <div className="mt-4 flex justify-end">
            <BotonAccion
              icono={Save}
              variante="primario"
              procesando={procesando === "rol"}
              deshabilitado={propio}
              motivo={MOTIVO_PROPIO}
              onClick={cambiarRol}
            >
              {procesando === "rol" ? "Guardando…" : "Guardar rol"}
            </BotonAccion>
          </div>
        </Tarjeta>
      )}

      {usuario && (
        <Tarjeta titulo="Estado de la cuenta">
          {eliminado ? (
            <>
              <p className="mb-4 text-sm text-muted">
                La cuenta está eliminada: conserva su historial pero no puede ingresar. Al reactivarla vuelve a quedar
                activa.
              </p>
              <BotonAccion
                icono={RotateCcw}
                variante="primario"
                procesando={procesando === "estado"}
                deshabilitado={propio}
                motivo={MOTIVO_PROPIO}
                onClick={() => cambiarEstado(true)}
              >
                Reactivar
              </BotonAccion>
            </>
          ) : (
            <>
              <p className="mb-4 text-sm text-muted">
                Una cuenta inactiva no puede ingresar. Eliminar es un borrado lógico: se conserva el historial y se
                puede reactivar.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {usuario.activo ? (
                  <BotonAccion
                    icono={PowerOff}
                    procesando={procesando === "estado"}
                    deshabilitado={propio}
                    motivo={MOTIVO_PROPIO}
                    onClick={() => cambiarEstado(false)}
                  >
                    Desactivar
                  </BotonAccion>
                ) : (
                  <BotonAccion
                    icono={Power}
                    procesando={procesando === "estado"}
                    deshabilitado={propio}
                    motivo={MOTIVO_PROPIO}
                    onClick={() => cambiarEstado(true)}
                  >
                    Activar
                  </BotonAccion>
                )}
                {bloqueado && usuario.activo && (
                  <BotonAccion
                    icono={LockOpen}
                    procesando={procesando === "desbloquear"}
                    deshabilitado={propio}
                    motivo={MOTIVO_PROPIO}
                    onClick={() => cambiarEstado(true, "desbloquear")}
                  >
                    Desbloquear
                  </BotonAccion>
                )}
                <BotonAccion
                  icono={Trash}
                  variante="peligro"
                  deshabilitado={propio || procesando !== null}
                  motivo={propio ? MOTIVO_PROPIO : undefined}
                  onClick={() => setConfirmarBorrado(true)}
                >
                  Eliminar
                </BotonAccion>
              </div>
            </>
          )}
        </Tarjeta>
      )}

      <Modal
        abierto={confirmarBorrado}
        titulo="Eliminar usuario"
        procesando={procesando === "eliminar"}
        onConfirmar={eliminar}
        onCancelar={() => setConfirmarBorrado(false)}
      >
        ¿Seguro que quiere eliminar al usuario <strong>{usuario?.nombre_usuario}</strong>? No podrá ingresar y se
        cerrarán sus sesiones. Su historial se conserva y la cuenta se puede reactivar después.
      </Modal>
    </div>
  );
}
