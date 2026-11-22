"use client";

import { useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import Formulario from "@/components/Formulario";
import type { MensajeEstado } from "@/components/Mensaje";
import { api } from "@/lib/api";
import { NOMBRE_ROL, TODOS, type Rol } from "@/lib/roles";
import type { Usuario } from "@/lib/tipos-usuarios";
import CamposClave from "./CamposClave";
import SelectCliente from "./SelectCliente";
import { CORREO_VALIDO, NOMBRE_USUARIO_VALIDO, erroresClave } from "./util";

const VACIO = {
  nombre_usuario: "",
  nombre_completo: "",
  correo: "",
  rol: "CAJERO" as Rol,
  cliente_id: "",
  clave: "",
  confirmacion: "",
};

// Ruta /usuarios/nuevo (POST /usuarios). Un usuario CLIENTE queda enlazado a una ficha de cliente.
export default function FormNuevoUsuario() {
  const router = useRouter();
  const [form, setForm] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<MensajeEstado>(null);

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (guardando) return;
    const errores: string[] = [];
    if (!NOMBRE_USUARIO_VALIDO.test(form.nombre_usuario.trim())) {
      errores.push("El nombre de usuario debe tener de 3 a 30 caracteres: letras, números, punto, guion o guion bajo.");
    }
    if (!form.nombre_completo.trim()) errores.push("El nombre completo es obligatorio.");
    if (form.correo.trim() && !CORREO_VALIDO.test(form.correo.trim())) errores.push("El correo no tiene un formato válido.");
    if (form.rol === "CLIENTE" && !form.cliente_id) errores.push("Elija el cliente que se enlaza a este usuario.");
    errores.push(...erroresClave(form.clave, form.confirmacion));
    if (errores.length > 0) {
      setMensaje({ tipo: "error", texto: errores.join("\n") });
      return;
    }

    setGuardando(true);
    try {
      const { data, mensaje } = await api<Usuario>("/usuarios", {
        method: "POST",
        body: {
          nombre_usuario: form.nombre_usuario.trim(),
          nombre_completo: form.nombre_completo.trim(),
          correo: form.correo.trim(),
          rol: form.rol,
          ...(form.rol === "CLIENTE" && { cliente_id: Number(form.cliente_id) }),
          clave: form.clave,
        },
      });
      setMensaje({ tipo: "exito", texto: `${mensaje ?? "Usuario creado"}. Abriendo el detalle…` });
      setTimeout(() => router.push(`/usuarios/${data.usuario_id}`), 900);
    } catch (e) {
      setMensaje({ tipo: "error", texto: (e as Error).message });
      setGuardando(false);
    }
  }

  return (
    <Formulario
      titulo="Nuevo usuario"
      volver="/usuarios"
      cargando={false}
      guardando={guardando}
      mensaje={mensaje}
      onSubmit={handleSubmit}
    >
      <div>
        <label htmlFor="nombre_usuario" className="etiqueta">
          Nombre de usuario *
        </label>
        <input
          id="nombre_usuario"
          className="campo"
          maxLength={30}
          autoComplete="off"
          value={form.nombre_usuario}
          onChange={(e) => setForm({ ...form, nombre_usuario: e.target.value })}
          placeholder="Ej.: caja2"
        />
        <p className="mt-1 text-xs text-muted">De 3 a 30: letras, números, punto, guion o guion bajo.</p>
      </div>
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
          placeholder="Ej.: Laura Gómez"
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
      <div>
        <label htmlFor="rol" className="etiqueta">
          Rol *
        </label>
        <select
          id="rol"
          className="campo"
          value={form.rol}
          onChange={(e) => setForm({ ...form, rol: e.target.value as Rol, cliente_id: "" })}
        >
          {TODOS.map((r) => (
            <option key={r} value={r}>
              {NOMBRE_ROL[r]}
            </option>
          ))}
        </select>
      </div>
      {form.rol === "CLIENTE" && (
        <div className="md:col-span-2">
          <label htmlFor="cliente" className="etiqueta">
            Cliente enlazado *
          </label>
          <SelectCliente id="cliente" valor={form.cliente_id} onCambio={(cliente_id) => setForm({ ...form, cliente_id })} />
        </div>
      )}
      <CamposClave
        clave={form.clave}
        confirmacion={form.confirmacion}
        onClave={(clave) => setForm({ ...form, clave })}
        onConfirmacion={(confirmacion) => setForm({ ...form, confirmacion })}
        obligatoria
      />
    </Formulario>
  );
}
