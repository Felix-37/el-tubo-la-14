// Formas de los registros de caja y ventas tal como los devuelve el backend.

export type FormaPago = "EFECTIVO" | "TRANSFERENCIA" | "CREDITO";

export type ResumenCaja = {
  base_inicial: number;
  ventas_efectivo: number;
  ventas_transferencia: number;
  ventas_credito: number;
  numero_ventas: number;
  ingresos: number;
  egresos: number;
  efectivo_esperado: number;
};

export type Caja = {
  caja_id: number;
  estado: "ABIERTA" | "CERRADA";
  fecha_apertura: string;
  base_inicial: number;
  abierta_por_id: number;
  abierta_por: string;
  fecha_cierre: string | null;
  cerrada_por_id: number | null;
  cerrada_por: string | null;
  efectivo_esperado: number | null;
  efectivo_contado: number | null;
  diferencia: number | null;
  observacion: string | null;
};

// GET /ventas/caja y POST /ventas/caja/abrir traen además el resumen.
export type CajaConResumen = Caja & { resumen: ResumenCaja };

export type ClienteVenta = {
  cliente_id: number;
  nombre: string;
  documento: string | null;
  clasificacion: string;
  cupo_credito: number;
  saldo: number;
  cupo_disponible: number;
};

export type LineaVenta = {
  linea: number;
  presentacion_id: number;
  referencia: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  valor: number;
};

export type Venta = {
  venta_id: number;
  numero_venta: number;
  fecha: string;
  caja_id: number;
  usuario_id: number;
  cajero: string;
  cliente_id: number | null;
  cliente: string | null;
  forma_pago: FormaPago;
  forma_pago_nombre: string;
  subtotal: number;
  descuento: number;
  total: number;
  valor_recibido: number;
  cambio: number;
  observacion: string | null;
  estado: string;
  numero_lineas: number;
};

// GET /ventas/:id y POST /ventas incluyen las líneas.
export type VentaConLineas = Venta & { lineas: LineaVenta[] };
