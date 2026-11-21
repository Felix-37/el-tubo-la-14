// Formas de los registros tal como los devuelve el backend.

export type Categoria = {
  categoria_id: number;
  nombre: string;
  activo: boolean;
};

export type Calibre = {
  calibre_id: number;
  nombre: string;
  descripcion: string | null;
  tarifa_corte: number;
  activo: boolean;
};

export type Producto = {
  producto_id: number;
  nombre: string;
  categoria_id: number;
  categoria: string;
  descripcion: string | null;
  es_cortable: boolean;
  activo: boolean;
};

export type Presentacion = {
  presentacion_id: number;
  producto_id: number;
  producto: string;
  referencia: string;
  codigo_barras: string | null;
  medida: string | null;
  calibre_id: number | null;
  calibre: string | null;
  largo_fabrica_cm: number | null;
  precio_venta: number;
  costo: number;
  existencia: number;
  existencia_minima: number;
  activo: boolean;
};
