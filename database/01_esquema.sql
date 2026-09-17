-- =====================================================================
-- Cerrajería El Tubo La 14 — Base de datos (PostgreSQL 16+)
-- Programación 5 — Tarea 1: modelo inicial
-- ---------------------------------------------------------------------
-- Convenciones
--   * Nombres en minúscula y snake_case, en español.
--   * Llaves primarias GENERATED ALWAYS AS IDENTITY.
--   * Dinero en NUMERIC(14,2); los precios ya incluyen el IVA.
--   * Longitudes en CENTÍMETROS ENTEROS: el precio se calcula por
--     centímetro (precio de la barra / 600 x cm) y se redondea al final.
--   * Fechas en TIMESTAMPTZ; la aplicación las muestra en America/Bogota.
--   * Nada se borra: los registros se desactivan (activo = false) o se
--     anulan, y los movimientos son solo de inserción.
--
-- Ejecutar sobre una base vacía:
--   psql -U postgres -d el_tubo_la_14 -f 01_esquema.sql
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Configuración
-- ---------------------------------------------------------------------

-- Datos del negocio. Una sola fila; la usan el comprobante y los reportes.
CREATE TABLE empresa (
  empresa_id           SMALLINT      PRIMARY KEY DEFAULT 1,
  razon_social         VARCHAR(120)  NOT NULL,
  nombre_corto         VARCHAR(60)   NOT NULL,
  nit                  VARCHAR(20)   NOT NULL,
  direccion            VARCHAR(120)  NOT NULL,
  ciudad               VARCHAR(60)   NOT NULL,
  telefono             VARCHAR(30),
  iva_porcentaje       NUMERIC(5,2)  NOT NULL DEFAULT 19,
  leyenda_iva          VARCHAR(120)  NOT NULL,
  pie_comprobante      VARCHAR(200),
  CONSTRAINT ck_empresa_unica CHECK (empresa_id = 1),
  CONSTRAINT ck_empresa_iva   CHECK (iva_porcentaje BETWEEN 0 AND 100)
);

-- Valores de negocio que el administrador cambia sin tocar código
-- (por ejemplo, el mínimo aprovechable de un retazo: 100 cm).
CREATE TABLE parametro (
  clave          VARCHAR(40)   PRIMARY KEY,
  valor_numero   NUMERIC,
  valor_texto    VARCHAR(400),
  descripcion    VARCHAR(400)  NOT NULL,
  modificado_en  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT ck_parametro_valor CHECK (valor_numero IS NOT NULL OR valor_texto IS NOT NULL)
);

-- Consecutivos sin huecos (RF05-4). Se bloquea la fila con
-- SELECT ... FOR UPDATE dentro de la transacción de la venta; una
-- SEQUENCE deja huecos cuando la transacción se revierte.
CREATE TABLE consecutivo (
  nombre         VARCHAR(20)  PRIMARY KEY,
  ultimo_numero  BIGINT       NOT NULL DEFAULT 0,
  CONSTRAINT ck_consecutivo_numero CHECK (ultimo_numero >= 0)
);


-- ---------------------------------------------------------------------
-- 2. Seguridad: roles, permisos y usuarios
-- ---------------------------------------------------------------------

-- Tabla fija: ADMIN, CAJERO, CLIENTE.
CREATE TABLE rol (
  rol_codigo   VARCHAR(10)   PRIMARY KEY,
  nombre       VARCHAR(40)   NOT NULL UNIQUE,
  descripcion  VARCHAR(200)  NOT NULL
);

-- Tabla fija: cada acción protegida de la API (por ejemplo VENTA_CREAR).
CREATE TABLE permiso (
  permiso_codigo  VARCHAR(40)   PRIMARY KEY,
  modulo          VARCHAR(30)   NOT NULL,
  descripcion     VARCHAR(200)  NOT NULL
);

-- Relación muchos a muchos entre roles y permisos. El backend la
-- consulta en cada petición: el control de acceso vive en el servidor
-- y no solo en ocultar botones (RF02).
CREATE TABLE rol_permiso (
  rol_codigo      VARCHAR(10)  NOT NULL REFERENCES rol (rol_codigo),
  permiso_codigo  VARCHAR(40)  NOT NULL REFERENCES permiso (permiso_codigo),
  PRIMARY KEY (rol_codigo, permiso_codigo)
);


-- ---------------------------------------------------------------------
-- 3. Clientes y descuentos
-- ---------------------------------------------------------------------

CREATE TABLE cliente (
  cliente_id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre              VARCHAR(120)   NOT NULL,
  documento           VARCHAR(20)    UNIQUE,
  telefono            VARCHAR(30),
  correo              VARCHAR(120),
  direccion           VARCHAR(200),
  clasificacion       VARCHAR(12)    NOT NULL DEFAULT 'OCASIONAL',
  cupo_credito        NUMERIC(14,2)  NOT NULL DEFAULT 0,
  tope_descuento_pct  NUMERIC(5,2)   NOT NULL DEFAULT 0,
  activo              BOOLEAN        NOT NULL DEFAULT true,
  creado_en           TIMESTAMPTZ    NOT NULL DEFAULT now(),
  CONSTRAINT ck_cliente_clasificacion CHECK (clasificacion IN ('OCASIONAL', 'FRECUENTE', 'CERRAJERO')),
  CONSTRAINT ck_cliente_cupo          CHECK (cupo_credito >= 0),
  CONSTRAINT ck_cliente_tope          CHECK (tope_descuento_pct BETWEEN 0 AND 100)
);

-- Usuarios del sistema. Un usuario con rol CLIENTE queda enlazado a su
-- ficha de cliente para consultar sus compras, abonos y saldo; los
-- usuarios ADMIN y CAJERO no tienen cliente.
CREATE TABLE usuario (
  usuario_id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre_usuario     VARCHAR(30)   NOT NULL UNIQUE,
  nombre_completo    VARCHAR(100)  NOT NULL,
  correo             VARCHAR(120)  UNIQUE,
  rol_codigo         VARCHAR(10)   NOT NULL REFERENCES rol (rol_codigo),
  cliente_id         BIGINT        UNIQUE REFERENCES cliente (cliente_id),
  hash_clave         VARCHAR(100)  NOT NULL,          -- bcrypt, nunca texto claro (RNF01)
  activo             BOOLEAN       NOT NULL DEFAULT true,
  intentos_fallidos  SMALLINT      NOT NULL DEFAULT 0,
  bloqueado_hasta    TIMESTAMPTZ,
  ultimo_ingreso     TIMESTAMPTZ,
  creado_en          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT ck_usuario_cliente  CHECK ((rol_codigo = 'CLIENTE') = (cliente_id IS NOT NULL)),
  CONSTRAINT ck_usuario_intentos CHECK (intentos_fallidos >= 0)
);

-- Ingresos, fallos, bloqueos y accesos denegados (RF01-3, RF02-3).
CREATE TABLE bitacora (
  bitacora_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fecha           TIMESTAMPTZ   NOT NULL DEFAULT now(),
  usuario_id      BIGINT        REFERENCES usuario (usuario_id),
  nombre_usuario  VARCHAR(60),
  evento          VARCHAR(20)   NOT NULL,
  detalle         VARCHAR(400),
  direccion_ip    VARCHAR(45),
  CONSTRAINT ck_bitacora_evento CHECK (evento IN (
    'INGRESO', 'INGRESO_FALLIDO', 'BLOQUEO', 'ACCESO_DENEGADO',
    'USUARIO_CREADO', 'CAMBIO_CLAVE', 'CAMBIO_ROL', 'USUARIO_ESTADO'))
);

-- Tope de descuento según el monto de la compra. Aplica la fila con el
-- monto_desde más alto que no supere la compra; el tope efectivo es el
-- menor entre este y el del cliente.
CREATE TABLE tope_descuento_monto (
  tope_id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  monto_desde  NUMERIC(14,2)  NOT NULL UNIQUE,
  pct_maximo   NUMERIC(5,2)   NOT NULL,
  CONSTRAINT ck_tope_monto CHECK (monto_desde >= 0),
  CONSTRAINT ck_tope_pct   CHECK (pct_maximo BETWEEN 0 AND 100)
);


-- ---------------------------------------------------------------------
-- 4. Catálogo e inventario de piezas
-- ---------------------------------------------------------------------

CREATE TABLE categoria (
  categoria_id  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre        VARCHAR(60)  NOT NULL UNIQUE,
  activo        BOOLEAN      NOT NULL DEFAULT true
);

-- Tarifa de corte por calibre (RF04-3, RNF07-2): cambiarla aquí cambia
-- el cobro de las ventas siguientes sin tocar pantallas.
CREATE TABLE calibre (
  calibre_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre        VARCHAR(40)    NOT NULL UNIQUE,
  descripcion   VARCHAR(200),
  tarifa_corte  NUMERIC(14,2)  NOT NULL,
  activo        BOOLEAN        NOT NULL DEFAULT true,
  CONSTRAINT ck_calibre_tarifa CHECK (tarifa_corte >= 0)
);

-- Producto base: «Tubo cold rolled 1"», «Teja trapezoidal galvanizada».
CREATE TABLE producto (
  producto_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre        VARCHAR(120)  NOT NULL UNIQUE,
  categoria_id  BIGINT        NOT NULL REFERENCES categoria (categoria_id),
  descripcion   VARCHAR(400),
  es_cortable   BOOLEAN       NOT NULL DEFAULT false,
  activo        BOOLEAN       NOT NULL DEFAULT true
);

-- Presentación: lo que realmente se vende, con referencia, precio y
-- existencia propios. Una teja en cinco largos son cinco presentaciones.
--   Por unidad:  existencia cuenta unidades.
--   Cortable:    existencia queda en 0; la existencia real son las
--                piezas disponibles en pieza_inventario, y precio_venta
--                es el de la barra completa de largo_fabrica_cm.
CREATE TABLE presentacion (
  presentacion_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  producto_id        BIGINT         NOT NULL REFERENCES producto (producto_id),
  referencia         VARCHAR(40)    NOT NULL UNIQUE,
  codigo_barras      VARCHAR(40)    UNIQUE,
  medida             VARCHAR(40),
  calibre_id         BIGINT         REFERENCES calibre (calibre_id),
  largo_fabrica_cm   INTEGER,
  precio_venta       NUMERIC(14,2)  NOT NULL,
  costo              NUMERIC(14,2)  NOT NULL DEFAULT 0,
  existencia         INTEGER        NOT NULL DEFAULT 0,
  existencia_minima  INTEGER        NOT NULL DEFAULT 0,
  activo             BOOLEAN        NOT NULL DEFAULT true,
  CONSTRAINT ck_presentacion_precio     CHECK (precio_venta >= 0),
  CONSTRAINT ck_presentacion_costo      CHECK (costo >= 0),
  CONSTRAINT ck_presentacion_existencia CHECK (existencia >= 0 AND existencia_minima >= 0),
  CONSTRAINT ck_presentacion_largo      CHECK (largo_fabrica_cm IS NULL OR largo_fabrica_cm > 0)
);

-- Todo cambio de precio o costo, con quién y cuándo (RF03-4).
CREATE TABLE historial_precio (
  historial_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  presentacion_id  BIGINT         NOT NULL REFERENCES presentacion (presentacion_id),
  precio_anterior  NUMERIC(14,2),
  precio_nuevo     NUMERIC(14,2),
  costo_anterior   NUMERIC(14,2),
  costo_nuevo      NUMERIC(14,2),
  usuario_id       BIGINT         NOT NULL REFERENCES usuario (usuario_id),
  fecha            TIMESTAMPTZ    NOT NULL DEFAULT now()
);

-- Cada pieza física de material cortable: una barra de fábrica o un
-- retazo. La longitud de una pieza no cambia: cortarla la agota y crea
-- una pieza nueva con el sobrante, que apunta a su pieza de origen.
CREATE TABLE pieza_inventario (
  pieza_id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  presentacion_id  BIGINT       NOT NULL REFERENCES presentacion (presentacion_id),
  tipo             VARCHAR(10)  NOT NULL,
  longitud_cm      INTEGER      NOT NULL,
  estado           VARCHAR(12)  NOT NULL DEFAULT 'DISPONIBLE',
  pieza_origen_id  BIGINT       REFERENCES pieza_inventario (pieza_id),
  creado_en        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT ck_pieza_tipo     CHECK (tipo IN ('BARRA', 'RETAZO')),
  CONSTRAINT ck_pieza_longitud CHECK (longitud_cm > 0),
  CONSTRAINT ck_pieza_estado   CHECK (estado IN ('DISPONIBLE', 'AGOTADA', 'ANULADA'))
);


-- ---------------------------------------------------------------------
-- 5. Caja
-- ---------------------------------------------------------------------

-- Tabla fija: EFECTIVO, TRANSFERENCIA, CREDITO.
CREATE TABLE forma_pago (
  forma_pago_codigo  VARCHAR(13)  PRIMARY KEY,
  nombre             VARCHAR(40)  NOT NULL UNIQUE,
  mueve_efectivo     BOOLEAN      NOT NULL,
  admite_abono       BOOLEAN      NOT NULL
);

CREATE TABLE caja (
  caja_id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  estado             VARCHAR(8)     NOT NULL DEFAULT 'ABIERTA',
  abierta_por_id     BIGINT         NOT NULL REFERENCES usuario (usuario_id),
  fecha_apertura     TIMESTAMPTZ    NOT NULL DEFAULT now(),
  base_inicial       NUMERIC(14,2)  NOT NULL,
  cerrada_por_id     BIGINT         REFERENCES usuario (usuario_id),
  fecha_cierre       TIMESTAMPTZ,
  efectivo_esperado  NUMERIC(14,2),
  efectivo_contado   NUMERIC(14,2),
  diferencia         NUMERIC(14,2),
  observacion        VARCHAR(400),
  CONSTRAINT ck_caja_estado CHECK (estado IN ('ABIERTA', 'CERRADA')),
  CONSTRAINT ck_caja_base   CHECK (base_inicial >= 0),
  CONSTRAINT ck_caja_cierre CHECK (
       (estado = 'ABIERTA' AND fecha_cierre IS NULL AND efectivo_contado IS NULL)
    OR (estado = 'CERRADA' AND fecha_cierre IS NOT NULL AND cerrada_por_id IS NOT NULL
        AND efectivo_contado >= 0 AND efectivo_esperado IS NOT NULL
        AND diferencia = efectivo_contado - efectivo_esperado))
);

-- Una sola caja abierta a la vez (RF06-1).
CREATE UNIQUE INDEX ux_caja_una_abierta ON caja ((true)) WHERE estado = 'ABIERTA';

-- Ajuste posterior sobre una caja ya cerrada (RF06-6). Solo ADMIN.
CREATE TABLE ajuste_caja (
  ajuste_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  caja_id     BIGINT         NOT NULL REFERENCES caja (caja_id),
  monto       NUMERIC(14,2)  NOT NULL,
  motivo      VARCHAR(400)   NOT NULL,
  usuario_id  BIGINT         NOT NULL REFERENCES usuario (usuario_id),
  fecha       TIMESTAMPTZ    NOT NULL DEFAULT now(),
  CONSTRAINT ck_ajuste_monto CHECK (monto <> 0)
);


-- ---------------------------------------------------------------------
-- 6. Ventas
-- ---------------------------------------------------------------------

-- Autorización del administrador para vender a crédito por encima del
-- cupo (RF07-3). El cajero la solicita; el administrador la resuelve.
CREATE TABLE autorizacion (
  autorizacion_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  estado             VARCHAR(10)    NOT NULL DEFAULT 'PENDIENTE',
  cliente_id         BIGINT         NOT NULL REFERENCES cliente (cliente_id),
  monto              NUMERIC(14,2)  NOT NULL,
  motivo_solicitud   VARCHAR(400),
  solicitada_por_id  BIGINT         NOT NULL REFERENCES usuario (usuario_id),
  fecha_solicitud    TIMESTAMPTZ    NOT NULL DEFAULT now(),
  resuelta_por_id    BIGINT         REFERENCES usuario (usuario_id),
  fecha_resolucion   TIMESTAMPTZ,
  motivo_resolucion  VARCHAR(400),
  CONSTRAINT ck_autorizacion_estado   CHECK (estado IN ('PENDIENTE', 'APROBADA', 'RECHAZADA', 'USADA')),
  CONSTRAINT ck_autorizacion_monto    CHECK (monto > 0),
  CONSTRAINT ck_autorizacion_resuelta CHECK (
    estado = 'PENDIENTE' OR (resuelta_por_id IS NOT NULL AND fecha_resolucion IS NOT NULL))
);

-- Encabezado de la venta. Las CHECK repiten reglas del backend a
-- propósito: aunque alguien escriba directo en la tabla, la base no
-- acepta una venta incoherente.
CREATE TABLE venta (
  venta_id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  numero_venta       BIGINT         NOT NULL UNIQUE,
  fecha              TIMESTAMPTZ    NOT NULL DEFAULT now(),
  caja_id            BIGINT         NOT NULL REFERENCES caja (caja_id),
  usuario_id         BIGINT         NOT NULL REFERENCES usuario (usuario_id),
  cliente_id         BIGINT         REFERENCES cliente (cliente_id),
  forma_pago_codigo  VARCHAR(13)    NOT NULL REFERENCES forma_pago (forma_pago_codigo),
  autorizacion_id    BIGINT         UNIQUE REFERENCES autorizacion (autorizacion_id),
  subtotal           NUMERIC(14,2)  NOT NULL DEFAULT 0,
  total_cortes       NUMERIC(14,2)  NOT NULL DEFAULT 0,
  descuento          NUMERIC(14,2)  NOT NULL DEFAULT 0,
  descuento_pct      NUMERIC(5,2)   NOT NULL DEFAULT 0,
  total              NUMERIC(14,2)  NOT NULL DEFAULT 0,
  valor_recibido     NUMERIC(14,2)  NOT NULL DEFAULT 0,
  cambio             NUMERIC(14,2)  NOT NULL DEFAULT 0,
  observacion        VARCHAR(400),
  estado             VARCHAR(10)    NOT NULL DEFAULT 'COMPLETADA',
  anulada_por_id     BIGINT         REFERENCES usuario (usuario_id),
  fecha_anulacion    TIMESTAMPTZ,
  motivo_anulacion   VARCHAR(400),
  CONSTRAINT ck_venta_estado    CHECK (estado IN ('COMPLETADA', 'ANULADA')),
  CONSTRAINT ck_venta_valores   CHECK (subtotal >= 0 AND total_cortes >= 0 AND total >= 0),
  CONSTRAINT ck_venta_total     CHECK (total = subtotal + total_cortes - descuento),
  CONSTRAINT ck_venta_descuento CHECK (descuento >= 0 AND descuento <= subtotal + total_cortes),
  CONSTRAINT ck_venta_desc_pct  CHECK (descuento_pct BETWEEN 0 AND 100),
  -- Descuento y crédito solo a clientes registrados.
  CONSTRAINT ck_venta_descuento_cliente CHECK (descuento = 0 OR cliente_id IS NOT NULL),
  CONSTRAINT ck_venta_credito   CHECK (forma_pago_codigo <> 'CREDITO' OR cliente_id IS NOT NULL),
  CONSTRAINT ck_venta_efectivo  CHECK (
    forma_pago_codigo <> 'EFECTIVO' OR (valor_recibido >= total AND cambio = valor_recibido - total)),
  CONSTRAINT ck_venta_anulacion CHECK (
       (estado = 'COMPLETADA' AND fecha_anulacion IS NULL AND anulada_por_id IS NULL)
    OR (estado = 'ANULADA' AND fecha_anulacion IS NOT NULL AND anulada_por_id IS NOT NULL
        AND motivo_anulacion IS NOT NULL))
);

-- Líneas de la venta (relación muchos a muchos entre venta y presentación).
--   MATERIAL por unidad: cantidad; precio_unitario = precio de la unidad.
--   MATERIAL cortable:   pieza_id cortada, longitud vendida y sobrante;
--                        pieza_resultante_id si el sobrante es retazo, o
--                        es_desperdicio si quedó bajo el mínimo (100 cm).
--   CORTE:               tarifa del calibre como línea propia del ticket
--                        (RF04-3); detalle_material_id apunta a su material.
CREATE TABLE venta_detalle (
  detalle_id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  venta_id             BIGINT         NOT NULL REFERENCES venta (venta_id),
  linea                SMALLINT       NOT NULL,
  tipo_linea           VARCHAR(8)     NOT NULL,
  presentacion_id      BIGINT         NOT NULL REFERENCES presentacion (presentacion_id),
  descripcion          VARCHAR(200)   NOT NULL,
  cantidad             INTEGER,
  pieza_id             BIGINT         REFERENCES pieza_inventario (pieza_id),
  longitud_pieza_cm    INTEGER,
  longitud_cm          INTEGER,
  sobrante_cm          INTEGER,
  es_desperdicio       BOOLEAN        NOT NULL DEFAULT false,
  pieza_resultante_id  BIGINT         REFERENCES pieza_inventario (pieza_id),
  detalle_material_id  BIGINT         REFERENCES venta_detalle (detalle_id),
  precio_unitario      NUMERIC(14,2)  NOT NULL,
  valor                NUMERIC(14,2)  NOT NULL,
  CONSTRAINT uk_venta_detalle_linea UNIQUE (venta_id, linea),
  CONSTRAINT ck_detalle_tipo     CHECK (tipo_linea IN ('MATERIAL', 'CORTE')),
  CONSTRAINT ck_detalle_cantidad CHECK (cantidad IS NULL OR cantidad > 0),
  CONSTRAINT ck_detalle_longitud CHECK (longitud_cm IS NULL OR longitud_cm > 0),
  CONSTRAINT ck_detalle_sobrante CHECK (sobrante_cm IS NULL OR sobrante_cm >= 0),
  CONSTRAINT ck_detalle_valor    CHECK (valor >= 0 AND precio_unitario >= 0),
  CONSTRAINT ck_detalle_material CHECK (
       (tipo_linea = 'MATERIAL' AND (cantidad IS NOT NULL OR longitud_cm IS NOT NULL))
    OR (tipo_linea = 'CORTE' AND detalle_material_id IS NOT NULL))
);


-- ---------------------------------------------------------------------
-- 7. Cartera (crédito a cerrajeros)
-- ---------------------------------------------------------------------

-- Libro de la deuda de cada cliente. El saldo no se guarda: se calcula
-- sumando movimientos (vista v_cartera_cliente).
--   CARGO: venta a crédito.   SALDO_INICIAL: deuda previa al sistema.
--   ABONO: pago del cliente.  REVERSO: anulación de una venta a crédito.
CREATE TABLE movimiento_cartera (
  movimiento_id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cliente_id         BIGINT         NOT NULL REFERENCES cliente (cliente_id),
  tipo               VARCHAR(13)    NOT NULL,
  valor              NUMERIC(14,2)  NOT NULL,
  forma_pago_codigo  VARCHAR(13)    REFERENCES forma_pago (forma_pago_codigo),
  venta_id           BIGINT         REFERENCES venta (venta_id),
  usuario_id         BIGINT         NOT NULL REFERENCES usuario (usuario_id),
  fecha              TIMESTAMPTZ    NOT NULL DEFAULT now(),
  observacion        VARCHAR(400),
  CONSTRAINT ck_cartera_tipo  CHECK (tipo IN ('CARGO', 'SALDO_INICIAL', 'ABONO', 'REVERSO')),
  CONSTRAINT ck_cartera_valor CHECK (valor > 0),
  CONSTRAINT ck_cartera_abono CHECK ((tipo = 'ABONO') = (forma_pago_codigo IS NOT NULL)),
  CONSTRAINT ck_cartera_venta CHECK (tipo NOT IN ('CARGO', 'REVERSO') OR venta_id IS NOT NULL)
);

-- Ingresos y egresos de efectivo del turno (RF06-3). Las ventas en
-- efectivo no se repiten aquí: el arqueo las suma desde venta.
CREATE TABLE movimiento_caja (
  movimiento_id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  caja_id                BIGINT         NOT NULL REFERENCES caja (caja_id),
  tipo                   VARCHAR(10)    NOT NULL,
  monto                  NUMERIC(14,2)  NOT NULL,
  motivo                 VARCHAR(400)   NOT NULL,
  usuario_id             BIGINT         NOT NULL REFERENCES usuario (usuario_id),
  fecha                  TIMESTAMPTZ    NOT NULL DEFAULT now(),
  venta_id               BIGINT         REFERENCES venta (venta_id),
  movimiento_cartera_id  BIGINT         REFERENCES movimiento_cartera (movimiento_id),
  CONSTRAINT ck_mov_caja_tipo       CHECK (tipo IN ('INGRESO', 'EGRESO', 'ABONO', 'DEVOLUCION')),
  CONSTRAINT ck_mov_caja_monto      CHECK (monto > 0),
  CONSTRAINT ck_mov_caja_abono      CHECK (tipo <> 'ABONO' OR movimiento_cartera_id IS NOT NULL),
  CONSTRAINT ck_mov_caja_devolucion CHECK (tipo <> 'DEVOLUCION' OR venta_id IS NOT NULL)
);


-- ---------------------------------------------------------------------
-- 8. Compras a proveedores
-- ---------------------------------------------------------------------

CREATE TABLE proveedor (
  proveedor_id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  razon_social      VARCHAR(120)  NOT NULL,
  nit               VARCHAR(20)   NOT NULL UNIQUE,
  contacto          VARCHAR(100),
  telefono          VARCHAR(30),
  correo            VARCHAR(120),
  direccion         VARCHAR(200),
  condiciones_pago  VARCHAR(200),
  activo            BOOLEAN       NOT NULL DEFAULT true
);

CREATE TABLE orden_compra (
  orden_id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  numero_orden  BIGINT        NOT NULL UNIQUE,
  proveedor_id  BIGINT        NOT NULL REFERENCES proveedor (proveedor_id),
  fecha         TIMESTAMPTZ   NOT NULL DEFAULT now(),
  estado        VARCHAR(10)   NOT NULL DEFAULT 'PENDIENTE',
  usuario_id    BIGINT        NOT NULL REFERENCES usuario (usuario_id),
  observacion   VARCHAR(400),
  CONSTRAINT ck_orden_estado CHECK (estado IN ('PENDIENTE', 'PARCIAL', 'RECIBIDA', 'ANULADA'))
);

-- Relación muchos a muchos entre orden de compra y presentación.
CREATE TABLE orden_compra_detalle (
  orden_detalle_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  orden_id             BIGINT         NOT NULL REFERENCES orden_compra (orden_id),
  presentacion_id      BIGINT         NOT NULL REFERENCES presentacion (presentacion_id),
  cantidad_solicitada  INTEGER        NOT NULL,
  cantidad_recibida    INTEGER        NOT NULL DEFAULT 0,
  costo_unitario       NUMERIC(14,2)  NOT NULL,
  CONSTRAINT uk_orden_detalle_presentacion UNIQUE (orden_id, presentacion_id),
  CONSTRAINT ck_orden_detalle_cantidades CHECK (cantidad_solicitada > 0 AND cantidad_recibida >= 0),
  CONSTRAINT ck_orden_detalle_costo      CHECK (costo_unitario >= 0)
);

-- Cada entrega del proveedor; admite recepciones parciales (RF08-3).
CREATE TABLE recepcion (
  recepcion_id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  orden_id             BIGINT        NOT NULL REFERENCES orden_compra (orden_id),
  fecha                TIMESTAMPTZ   NOT NULL DEFAULT now(),
  usuario_id           BIGINT        NOT NULL REFERENCES usuario (usuario_id),
  documento_proveedor  VARCHAR(60)   NOT NULL,
  observacion          VARCHAR(400)
);

CREATE TABLE recepcion_detalle (
  recepcion_detalle_id  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  recepcion_id          BIGINT        NOT NULL REFERENCES recepcion (recepcion_id),
  orden_detalle_id      BIGINT        NOT NULL REFERENCES orden_compra_detalle (orden_detalle_id),
  cantidad              INTEGER       NOT NULL,
  motivo_exceso         VARCHAR(400),
  CONSTRAINT ck_rec_detalle_cantidad CHECK (cantidad > 0)
);


-- ---------------------------------------------------------------------
-- 9. Movimientos de inventario
-- ---------------------------------------------------------------------

-- Cada entrada o salida con responsable, motivo y documento (RF09-4).
-- cantidad cuenta unidades; longitud_cm, centímetros de una pieza.
-- Positivo entra, negativo sale.
CREATE TABLE movimiento_inventario (
  movimiento_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fecha            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  tipo             VARCHAR(10)   NOT NULL,
  presentacion_id  BIGINT        NOT NULL REFERENCES presentacion (presentacion_id),
  pieza_id         BIGINT        REFERENCES pieza_inventario (pieza_id),
  cantidad         INTEGER,
  longitud_cm      INTEGER,
  usuario_id       BIGINT        NOT NULL REFERENCES usuario (usuario_id),
  motivo           VARCHAR(400)  NOT NULL,
  venta_id         BIGINT        REFERENCES venta (venta_id),
  recepcion_id     BIGINT        REFERENCES recepcion (recepcion_id),
  CONSTRAINT ck_mov_inv_tipo  CHECK (tipo IN ('COMPRA', 'VENTA', 'RETAZO', 'MERMA', 'AJUSTE', 'ANULACION')),
  CONSTRAINT ck_mov_inv_valor CHECK (COALESCE(cantidad, 0) <> 0 OR COALESCE(longitud_cm, 0) <> 0),
  CONSTRAINT ck_mov_inv_documento CHECK (
       (tipo IN ('VENTA', 'ANULACION') AND venta_id IS NOT NULL)
    OR (tipo = 'COMPRA' AND recepcion_id IS NOT NULL)
    OR  tipo IN ('RETAZO', 'MERMA', 'AJUSTE'))
);


-- ---------------------------------------------------------------------
-- 10. Índices sobre llaves foráneas y búsquedas frecuentes (RNF02, RNF08)
--     PostgreSQL no indexa las llaves foráneas por sí solo.
-- ---------------------------------------------------------------------

CREATE INDEX ix_usuario_rol               ON usuario (rol_codigo);
CREATE INDEX ix_producto_categoria        ON producto (categoria_id);
CREATE INDEX ix_presentacion_producto     ON presentacion (producto_id);
CREATE INDEX ix_presentacion_calibre      ON presentacion (calibre_id);
CREATE INDEX ix_historial_presentacion    ON historial_precio (presentacion_id, fecha);
CREATE INDEX ix_pieza_presentacion_estado ON pieza_inventario (presentacion_id, estado);
CREATE INDEX ix_pieza_origen              ON pieza_inventario (pieza_origen_id);
CREATE INDEX ix_venta_fecha               ON venta (fecha);
CREATE INDEX ix_venta_cliente             ON venta (cliente_id);
CREATE INDEX ix_venta_caja                ON venta (caja_id);
CREATE INDEX ix_detalle_presentacion      ON venta_detalle (presentacion_id);
CREATE INDEX ix_detalle_pieza             ON venta_detalle (pieza_id);
CREATE INDEX ix_cartera_cliente_fecha     ON movimiento_cartera (cliente_id, fecha);
CREATE INDEX ix_cartera_venta             ON movimiento_cartera (venta_id);
CREATE INDEX ix_mov_caja_caja             ON movimiento_caja (caja_id);
CREATE INDEX ix_mov_inv_presentacion      ON movimiento_inventario (presentacion_id, fecha);
CREATE INDEX ix_mov_inv_venta             ON movimiento_inventario (venta_id);
CREATE INDEX ix_autorizacion_estado       ON autorizacion (estado, cliente_id);
CREATE INDEX ix_orden_proveedor           ON orden_compra (proveedor_id);
CREATE INDEX ix_recepcion_orden           ON recepcion (orden_id);
CREATE INDEX ix_bitacora_fecha            ON bitacora (fecha);


-- ---------------------------------------------------------------------
-- 11. Vista de cartera: saldo y cupo disponible por cliente (RF07).
--     La usan el cajero, el administrador y el portal del cliente.
-- ---------------------------------------------------------------------

CREATE VIEW v_cartera_cliente AS
SELECT c.cliente_id,
       c.nombre,
       c.clasificacion,
       c.cupo_credito,
       COALESCE(SUM(CASE WHEN m.tipo IN ('CARGO', 'SALDO_INICIAL') THEN m.valor
                         ELSE -m.valor END), 0)                        AS saldo,
       c.cupo_credito
         - COALESCE(SUM(CASE WHEN m.tipo IN ('CARGO', 'SALDO_INICIAL') THEN m.valor
                             ELSE -m.valor END), 0)                    AS cupo_disponible,
       -- Aproximación inicial: fecha del primer cargo. Calcular la deuda
       -- pendiente más vieja (cruzando abonos) queda para el backend.
       MIN(m.fecha) FILTER (WHERE m.tipo IN ('CARGO', 'SALDO_INICIAL')) AS primer_cargo
FROM cliente c
LEFT JOIN movimiento_cartera m ON m.cliente_id = c.cliente_id
GROUP BY c.cliente_id;

COMMIT;
