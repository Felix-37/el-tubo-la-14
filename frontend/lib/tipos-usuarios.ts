import type { Rol } from "./roles";

// Formas de los registros de la gestión de usuarios tal como los devuelve el backend.

export type Usuario = {
  usuario_id: number;
  nombre_usuario: string;
  nombre_completo: string;
  correo: string | null;
  rol: Rol;
  rol_nombre: string;
  cliente_id: number | null;
  cliente_nombre: string | null;
  activo: boolean;
  eliminado_en: string | null;
  bloqueado_hasta: string | null;
  ultimo_ingreso: string | null;
  creado_en: string;
};

// Clientes activos que todavía no tienen usuario (GET /usuarios/clientes-disponibles).
export type ClienteDisponible = {
  cliente_id: number;
  nombre: string;
  documento: string | null;
  clasificacion: string | null;
};
