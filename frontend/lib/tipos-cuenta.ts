// Formas de los datos de "Mi cuenta" y del perfil propio, tal como los devuelve el backend.
import type { Rol } from "./roles";

// GET /mi-cuenta: ficha del cliente con su cartera.
export type FichaCliente = {
  cliente_id: number;
  nombre: string;
  documento: string | null;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  clasificacion: "OCASIONAL" | "FRECUENTE" | "CERRAJERO";
  tope_descuento_pct: number;
  cupo_credito: number;
  saldo: number;
  cupo_disponible: number;
};

// Datos de contacto que el cliente puede cambiar (PUT /mi-cuenta).
export type Contacto = { telefono: string; correo: string; direccion: string };

// GET /mi-cuenta/movimientos
export type TipoMovimiento = "CARGO" | "SALDO_INICIAL" | "ABONO" | "REVERSO";

export type MovimientoCartera = {
  movimiento_id: number;
  fecha: string;
  tipo: TipoMovimiento;
  valor: number;
  forma_pago: string | null;
  numero_venta: number | null;
  observacion: string | null;
};

// GET /mi-cuenta/compras
export type Compra = {
  venta_id: number;
  numero_venta: number;
  fecha: string;
  cajero: string;
  cliente: string | null;
  forma_pago: string;
  forma_pago_nombre: string;
  subtotal: number;
  descuento: number;
  total: number;
  valor_recibido: number | null;
  cambio: number | null;
  observacion: string | null;
  estado: "COMPLETADA" | "ANULADA";
  numero_lineas: number;
};

export type LineaCompra = {
  linea: number;
  presentacion_id: number;
  referencia: string;
  descripcion: string;
  cantidad: number | null;
  precio_unitario: number;
  valor: number;
};

// GET /mi-cuenta/compras/:id
export type CompraDetalle = Compra & { lineas: LineaCompra[] };

// GET /perfil: datos públicos del usuario de la sesión.
export type Perfil = {
  usuario_id: number;
  nombre_usuario: string;
  nombre_completo: string;
  correo: string | null;
  rol: Rol;
  rol_nombre: string;
  cliente_id: number | null;
  cliente_nombre: string | null;
  activo: boolean;
  ultimo_ingreso: string | null;
  creado_en: string;
};
