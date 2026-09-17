-- =====================================================================
-- Cerrajería El Tubo La 14 — Datos iniciales
-- ---------------------------------------------------------------------
-- Carga las tablas fijas (roles, permisos, formas de pago, parámetros)
-- y un juego mínimo de datos de ejemplo para probar la aplicación.
-- Ejecutar después de 01_esquema.sql:
--   psql -U postgres -d el_tubo_la_14 -f 02_datos_iniciales.sql
--
-- Usuarios de prueba (cambiar las claves antes de usarlo en serio):
--   admin   / Admin123*    rol ADMIN
--   cajero  / Cajero123*   rol CAJERO
--   ramirez / Cliente123*  rol CLIENTE (cerrajero Carlos Ramírez)
-- Las claves se guardan con bcrypt (pgcrypto), el mismo formato que
-- verifica la librería bcrypt del backend en Express.
-- =====================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------
-- Configuración
-- ---------------------------------------------------------------------

INSERT INTO empresa (razon_social, nombre_corto, nit, direccion, ciudad, telefono, leyenda_iva, pie_comprobante)
VALUES ('Cerrajería El Tubo La 14', 'El Tubo La 14', '900.123.456-7', 'Calle 14 # 20-35', 'Cali', NULL,
        'Precios con IVA incluido', 'Gracias por su compra');

INSERT INTO parametro (clave, valor_numero, descripcion) VALUES
  ('RETAZO_MINIMO_CM',      100,  'Sobrante menor que este valor es desperdicio; igual o mayor es retazo'),
  ('LARGO_BARRA_CM',        600,  'Largo de fábrica de tubos, ángulos, platinas y varillas'),
  ('DIFERENCIA_CAJA_MAX',   5000, 'Diferencia de cierre de caja a partir de la cual se exige observación'),
  ('SESION_MINUTOS',        30,   'Minutos de inactividad antes de cerrar la sesión'),
  ('INTENTOS_BLOQUEO',      5,    'Intentos fallidos seguidos antes de bloquear el usuario'),
  ('BLOQUEO_MINUTOS',       10,   'Minutos que dura el bloqueo por intentos fallidos');

INSERT INTO consecutivo (nombre, ultimo_numero) VALUES
  ('VENTA', 0),
  ('ORDEN_COMPRA', 0);

-- ---------------------------------------------------------------------
-- Tablas fijas
-- ---------------------------------------------------------------------

INSERT INTO rol (rol_codigo, nombre, descripcion) VALUES
  ('ADMIN',   'Administrador', 'Propietario. Acceso total: precios, cupos, topes, usuarios, compras y reportes'),
  ('CAJERO',  'Cajero',        'Atiende el mostrador: ventas con corte, caja, clientes y consulta de inventario'),
  ('CLIENTE', 'Cliente',       'Cerrajero o cliente frecuente: consulta sus compras, abonos, saldo y cupo');

INSERT INTO permiso (permiso_codigo, modulo, descripcion) VALUES
  ('USUARIO_GESTIONAR',     'Seguridad',   'Crear usuarios, cambiar rol, activar y desactivar'),
  ('BITACORA_VER',          'Seguridad',   'Consultar ingresos y accesos denegados'),
  ('PRODUCTO_VER',          'Catálogo',    'Consultar productos, presentaciones y existencias'),
  ('PRODUCTO_GESTIONAR',    'Catálogo',    'Crear, editar y desactivar productos'),
  ('PRECIO_EDITAR',         'Catálogo',    'Cambiar precio o costo (queda en el historial)'),
  ('CALIBRE_GESTIONAR',     'Catálogo',    'Cambiar la tarifa de corte por calibre'),
  ('INVENTARIO_VER',        'Inventario',  'Consultar inventario y retazos'),
  ('INVENTARIO_AJUSTAR',    'Inventario',  'Ajustes manuales de inventario con motivo'),
  ('VENTA_CREAR',           'Ventas',      'Registrar ventas, cortes y descuentos dentro del tope'),
  ('VENTA_ANULAR',          'Ventas',      'Anular una venta y revertir inventario, retazo y caja'),
  ('CAJA_OPERAR',           'Caja',        'Abrir, registrar ingresos y egresos, y cerrar la caja'),
  ('CAJA_AJUSTAR',          'Caja',        'Ajuste sobre una caja ya cerrada'),
  ('CLIENTE_GESTIONAR',     'Clientes',    'Registrar clientes y abonos'),
  ('CUPO_EDITAR',           'Clientes',    'Asignar cupo de crédito y tope de descuento'),
  ('AUTORIZACION_RESOLVER', 'Clientes',    'Aprobar o rechazar ventas que superan el cupo'),
  ('PROVEEDOR_GESTIONAR',   'Compras',     'Proveedores, órdenes de compra y recepciones'),
  ('REPORTE_VER',           'Reportes',    'Reportes de ventas, cortes, formas de pago y cartera'),
  ('PORTAL_MIS_COMPRAS',    'Portal',      'Ver sus propias compras y comprobantes'),
  ('PORTAL_MI_CARTERA',     'Portal',      'Ver su saldo, abonos y cupo disponible');

INSERT INTO rol_permiso (rol_codigo, permiso_codigo)
SELECT 'ADMIN', permiso_codigo FROM permiso WHERE modulo <> 'Portal';

INSERT INTO rol_permiso (rol_codigo, permiso_codigo) VALUES
  ('CAJERO',  'PRODUCTO_VER'),
  ('CAJERO',  'INVENTARIO_VER'),
  ('CAJERO',  'VENTA_CREAR'),
  ('CAJERO',  'CAJA_OPERAR'),
  ('CAJERO',  'CLIENTE_GESTIONAR'),
  ('CLIENTE', 'PRODUCTO_VER'),
  ('CLIENTE', 'PORTAL_MIS_COMPRAS'),
  ('CLIENTE', 'PORTAL_MI_CARTERA');

INSERT INTO forma_pago (forma_pago_codigo, nombre, mueve_efectivo, admite_abono) VALUES
  ('EFECTIVO',      'Efectivo',      true,  true),
  ('TRANSFERENCIA', 'Transferencia', false, true),
  ('CREDITO',       'Crédito',       false, false);

-- ---------------------------------------------------------------------
-- Catálogo de ejemplo
-- ---------------------------------------------------------------------

INSERT INTO categoria (nombre) VALUES
  ('Tubos'), ('Perfiles'), ('Tejas'), ('Chapas y cerraduras'), ('Soldadura'), ('Accesorios');

-- Tarifas de ejemplo: el corte vale desde $2.000 según el calibre.
INSERT INTO calibre (nombre, descripcion, tarifa_corte) VALUES
  ('Calibre 18', 'Lámina delgada', 2000),
  ('Calibre 16', 'Lámina media',   2500),
  ('Calibre 14', 'Lámina gruesa',  3000);

INSERT INTO tope_descuento_monto (monto_desde, pct_maximo) VALUES
  (0,       3),
  (500000,  5),
  (1500000, 8);

INSERT INTO producto (nombre, categoria_id, es_cortable) VALUES
  ('Tubo cold rolled cuadrado 1"',   (SELECT categoria_id FROM categoria WHERE nombre = 'Tubos'),     true),
  ('Ángulo de 1" x 1/8"',            (SELECT categoria_id FROM categoria WHERE nombre = 'Perfiles'),  true),
  ('Teja trapezoidal galvanizada',   (SELECT categoria_id FROM categoria WHERE nombre = 'Tejas'),     false),
  ('Bisagra de cazoleta 3"',         (SELECT categoria_id FROM categoria WHERE nombre = 'Accesorios'), false);

INSERT INTO presentacion (producto_id, referencia, medida, calibre_id, largo_fabrica_cm, precio_venta, costo, existencia, existencia_minima)
VALUES
  ((SELECT producto_id FROM producto WHERE nombre = 'Tubo cold rolled cuadrado 1"'),
   'TCR-1-C18', '1" x 6 m', (SELECT calibre_id FROM calibre WHERE nombre = 'Calibre 18'), 600, 60000, 45000, 0, 5),
  ((SELECT producto_id FROM producto WHERE nombre = 'Ángulo de 1" x 1/8"'),
   'ANG-1-18', '1" x 1/8" x 6 m', (SELECT calibre_id FROM calibre WHERE nombre = 'Calibre 14'), 600, 65000, 50000, 0, 3),
  ((SELECT producto_id FROM producto WHERE nombre = 'Teja trapezoidal galvanizada'),
   'TEJ-TRAP-244', '2,44 m', NULL, NULL, 48000, 38000, 20, 5),
  ((SELECT producto_id FROM producto WHERE nombre = 'Bisagra de cazoleta 3"'),
   'BIS-CAZ-3', '3"', NULL, NULL, 3500, 2200, 60, 10);

-- Dos barras de tubo y una de ángulo en bodega.
INSERT INTO pieza_inventario (presentacion_id, tipo, longitud_cm)
SELECT presentacion_id, 'BARRA', 600 FROM presentacion, generate_series(1, 2) WHERE referencia = 'TCR-1-C18'
UNION ALL
SELECT presentacion_id, 'BARRA', 600 FROM presentacion WHERE referencia = 'ANG-1-18';

-- ---------------------------------------------------------------------
-- Clientes y usuarios de prueba
-- ---------------------------------------------------------------------

INSERT INTO cliente (nombre, documento, telefono, clasificacion, cupo_credito, tope_descuento_pct) VALUES
  ('Carlos Ramírez', '1144000111', '3100000001', 'CERRAJERO', 1000000, 5),
  ('María López',    '1144000222', '3100000002', 'FRECUENTE', 0,       3),
  ('Cliente ocasional de prueba', NULL, NULL,  'OCASIONAL', 0,       0);

INSERT INTO usuario (nombre_usuario, nombre_completo, rol_codigo, cliente_id, hash_clave) VALUES
  ('admin',   'Administrador El Tubo La 14', 'ADMIN',   NULL, crypt('Admin123*',   gen_salt('bf', 10))),
  ('cajero',  'Cajero de mostrador',         'CAJERO',  NULL, crypt('Cajero123*',  gen_salt('bf', 10))),
  ('ramirez', 'Carlos Ramírez',              'CLIENTE',
     (SELECT cliente_id FROM cliente WHERE documento = '1144000111'),
     crypt('Cliente123*', gen_salt('bf', 10)));

-- Deuda previa del cerrajero al empezar a usar el sistema.
INSERT INTO movimiento_cartera (cliente_id, tipo, valor, usuario_id, observacion)
VALUES ((SELECT cliente_id FROM cliente WHERE documento = '1144000111'), 'SALDO_INICIAL', 180000,
        (SELECT usuario_id FROM usuario WHERE nombre_usuario = 'admin'), 'Saldo del cuaderno al 20 sep 2026');

INSERT INTO proveedor (razon_social, nit, contacto, telefono, condiciones_pago) VALUES
  ('Distribuidora de Aceros de ejemplo S.A.S.', '900.000.000-1', 'Asesor comercial', '6020000000', 'Crédito a 30 días');

COMMIT;
