"use client";

import { useEffect, useState, type SubmitEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Formulario from "@/components/Formulario";
import type { MensajeEstado } from "@/components/Mensaje";
import { useSesion } from "@/components/auth/ProveedorSesion";
import { api } from "@/lib/api";
import { guardarSesion, leerSesion } from "@/lib/sesion";
import type { Usuario } from "@/lib/tipos-usuarios";
import CamposClave from "./CamposClave";
import { CORREO_VALIDO, erroresClave } from "./util";

const VACIO = { nombre_completo: "", correo: "", clave: "", confirmacion: "", clave_actual: "" };

// Ruta /usuarios/[id]/editar (PUT /usuarios/:id). Solo cambia nombre, correo y,
// si se escribe, la clave. El rol y el estado se cambian desde el detalle.
export default function FormEditarUsuario() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { usuario: sesion, logout } = useSesion();
  const propio = sesion?.usuario_id === Number(id);

  const [form, setForm] = useState(VACIO);
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<MensajeEstado>(null);

  useEffect(() => {
    api<Usuario>(`/usuarios/${id}`)
      .then(({ data }) => {
        setNombreUsuario(data.nombre_usuario);
        setForm({ ...VACIO, nombre_completo: data.nombre_completo, correo: data.correo ?? "" });
        if (data.eliminado_en) {
          setMensaje({ tipo: "error", texto: "El usuario está eliminado: reactívelo desde el detalle antes de editarlo." });
        }
      })
      .catch((e: Error) => setMensaje({ tipo: "error", texto: e.message }))
      .finally(() => setCargando(false));
  }, [id]);

  const cambiaClave = form.clave !== "" || form.confirmacion !== "";

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (guardando) return;
    const errores: string[] = [];
    if (!form.nombre_completo.trim()) errores.push("El nombre completo es obligatorio.");
    if (form.correo.trim() && !CORREO_VALIDO.test(form.correo.trim())) errores.push("El correo no tiene un formato válido.");
    if (cambiaClave) {
      errores.push(...erroresClave(form.clave, form.confirmacion));
      if (propio && !form.clave_actual) errores.push("Para cambiar su propia clave escriba la clave actual.");
    }
    if (errores.length > 0) {
      setMensaje({ tipo: "error", texto: errores.join("\n") });
      return;
    }

    setGuardando(true);
    try {
      // El correo vacío se envía para borrarlo; la clave solo si se escribió.
      const { data, mensaje } = await api<Usuario>(`/usuarios/${id}`, {
        method: "PUT",
        body: {
          nombre_completo: form.nombre_completo.trim(),
          correo: form.correo.trim(),
          ...(cambiaClave && { clave: form.clave }),
          ...(cambiaClave && propio && { clave_actual: form.clave_actual }),
        },
      });
      if (propio && cambiaClave) {
        // El backend cerró todas las sesiones de la cuenta, también esta.
        setMensaje({ tipo: "exito", texto: "Clave cambiada. Inicie sesión de nuevo." });
        setTimeout(async () => {
          await logout();
          router.replace("/login?cambio=1");
        }, 1200);
        return;
      }
      if (propio) {
        // El nombre del encabezado sale de la sesión guardada: se actualiza también allí.
        const actual = leerSesion();
        if (actual && actual.usuario.usuario_id === data.usuario_id) {
          guardarSesion({ ...actual, usuario: { ...actual.usuario, nombre_completo: data.nombre_completo, correo: data.correo } });
        }
      }
      setMensaje({
        tipo: "exito",
        texto: cambiaClave
          ? `${mensaje ?? "Usuario actualizado"}. Se cerraron las sesiones abiertas de esta cuenta.`
          : (mensaje ?? "Usuario actualizado"),
      });
      setTimeout(() => router.push(`/usuarios/${id}`), 900);
    } catch (e) {
      setMensaje({ tipo: "error", texto: (e as Error).message });
      setGuardando(false);
    }
  }

  return (
    <Formulario
      titulo={nombreUsuario ? `Editar usuario ${nombreUsuario}` : `Editar usuario #${id}`}
      volver={`/usuarios/${id}`}
      cargando={cargando}
      guardando={guardando}
      mensaje={mensaje}
      onSubmit={handleSubmit}
    >
      <div>
        <label htmlFor="nombre_completo" className="etiqueta">
          Nombre completo *
        </label>
        <input
          id="nombre_completo"
          className="campo"
          maxLength={100}
          value={form.nombre_completo}
          onChange={(e) => setForm({ ...form, nombre_completo: e.target.value })}
        />
      </div>
      <div>
        <label htmlFor="correo" className="etiqueta">
          Correo
        </label>
        <input
          id="correo"
          type="email"
          className="campo"
          maxLength={120}
          value={form.correo}
          onChange={(e) => setForm({ ...form, correo: e.target.value })}
          placeholder="Opcional"
        />
      </div>
      <p className="text-xs text-muted md:col-span-2">
        El nombre de usuario no se puede cambiar. Al poner una clave nueva se cierran todas las sesiones de la cuenta.
      </p>
      <CamposClave
        clave={form.clave}
        confirmacion={form.confirmacion}
        onClave={(clave) => setForm({ ...form, clave })}
        onConfirmacion={(confirmacion) => setForm({ ...form, confirmacion })}
        obligatoria={false}
        etiqueta="Clave nueva"
      />
      {propio && cambiaClave && (
        <div>
          <label htmlFor="clave_actual" className="etiqueta">
            Clave actual *
          </label>
          <input
            id="clave_actual"
            type="password"
            autoComplete="current-password"
            className="campo"
            value={form.clave_actual}
            onChange={(e) => setForm({ ...form, clave_actual: e.target.value })}
          />
          <p className="mt-1 text-xs text-muted">Es su propia cuenta: el sistema pide la clave actual.</p>
        </div>
      )}
    </Formulario>
  );
}
