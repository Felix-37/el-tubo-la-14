-- =====================================================================
-- Cerrajería El Tubo La 14: seguridad de la Tarea 4 (JWT)
-- ---------------------------------------------------------------------
-- Agrega lo que necesita la autenticación con access y refresh token:
--   * tabla refresh_token: un registro por refresh emitido. Se guarda
--     solo su hash (SHA-256), nunca el token en claro.
--   * usuario.eliminado_en: borrado lógico de usuarios.
--   * dos eventos nuevos en la bitácora: CIERRE_SESION y REUSO_TOKEN.
--   * claves de los usuarios de prueba con costo bcrypt 12.
-- Ejecutar después de 01_esquema.sql y 02_datos_iniciales.sql:
--   psql -U postgres -d el_tubo_la_14 -f 03_seguridad_tarea4.sql
-- =====================================================================

BEGIN;

-- Cada login abre una familia nueva. Cada renovación revoca el refresh
-- usado y crea otro de la misma familia (rotación). Si llega un refresh
-- ya revocado, alguien lo reutilizó y se revoca toda la familia.
CREATE TABLE refresh_token (
  jti              UUID          PRIMARY KEY,
  usuario_id       BIGINT        NOT NULL REFERENCES usuario (usuario_id),
  familia_id       UUID          NOT NULL,
  token_hash       CHAR(64)      NOT NULL UNIQUE,
  expira_en        TIMESTAMPTZ   NOT NULL,
  revocado_en      TIMESTAMPTZ,
  reemplazado_por  UUID          REFERENCES refresh_token (jti),
  creado_en        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  direccion_ip     VARCHAR(45),
  user_agent       VARCHAR(300),
  CONSTRAINT ck_refresh_reemplazo CHECK (reemplazado_por IS NULL OR revocado_en IS NOT NULL),
  CONSTRAINT ck_refresh_vigencia  CHECK (expira_en > creado_en)
);

CREATE INDEX ix_refresh_usuario_vigente ON refresh_token (usuario_id) WHERE revocado_en IS NULL;
CREATE INDEX ix_refresh_familia ON refresh_token (familia_id);

-- Borrado lógico: el usuario eliminado conserva su historial (ventas,
-- bitácora) pero no puede iniciar sesión.
ALTER TABLE usuario ADD COLUMN eliminado_en TIMESTAMPTZ;
ALTER TABLE usuario ADD CONSTRAINT ck_usuario_eliminado
  CHECK (eliminado_en IS NULL OR activo = false);

-- Al cambiar la clave, los access token emitidos antes dejan de servir
-- (el middleware compara su fecha de emisión con esta columna).
ALTER TABLE usuario ADD COLUMN clave_cambiada_en TIMESTAMPTZ;

ALTER TABLE bitacora DROP CONSTRAINT ck_bitacora_evento;
ALTER TABLE bitacora ADD CONSTRAINT ck_bitacora_evento CHECK (evento IN (
  'INGRESO', 'INGRESO_FALLIDO', 'BLOQUEO', 'ACCESO_DENEGADO',
  'USUARIO_CREADO', 'CAMBIO_CLAVE', 'CAMBIO_ROL', 'USUARIO_ESTADO',
  'CIERRE_SESION', 'REUSO_TOKEN', 'USUARIO_DATOS'));

-- El login acepta nombre de usuario o correo: el correo no puede
-- repetirse sin importar mayúsculas, y el nombre de usuario no lleva '@'
-- para que nunca choque con el correo de otra cuenta.
CREATE UNIQUE INDEX ux_usuario_correo_lower ON usuario (lower(correo));
ALTER TABLE usuario ADD CONSTRAINT ck_usuario_nombre_sin_arroba
  CHECK (position('@' in nombre_usuario) = 0);

-- 02_datos_iniciales.sql creó los usuarios de prueba con costo 10. El
-- backend exige costo 12 como mínimo, así que se vuelven a cifrar.
UPDATE usuario SET hash_clave = crypt('Cajero123*', gen_salt('bf', 12))
 WHERE nombre_usuario = 'cajero' AND hash_clave LIKE '$2_$10$%';
UPDATE usuario SET hash_clave = crypt('Cliente123*', gen_salt('bf', 12))
 WHERE nombre_usuario = 'ramirez' AND hash_clave LIKE '$2_$10$%';

-- La clave del administrador no queda en ningún script: se reemplaza
-- por una aleatoria que nadie conoce, y la clave real la fija
-- npm run seed:admin leyendo el archivo .env.
UPDATE usuario SET hash_clave = crypt(gen_random_uuid()::text, gen_salt('bf', 12))
 WHERE nombre_usuario = 'admin' AND hash_clave LIKE '$2_$10$%';

COMMIT;
