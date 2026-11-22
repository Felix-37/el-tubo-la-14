# Backend

API REST de El Tubo La 14 (Express + PostgreSQL). Desde la Tarea 4 exige sesión: JWT con access token y refresh token, claves con bcrypt y permisos por rol (ADMIN, CAJERO, CLIENTE).

## Cómo correrlo

1. Crear la base `el_tubo_la_14` en PostgreSQL y ejecutar, en orden:
   `../database/01_esquema.sql`, `../database/02_datos_iniciales.sql` y `../database/03_seguridad_tarea4.sql`.
2. Copiar `.env.example` como `.env` y llenar los datos de conexión, los dos secretos JWT (el comando para generarlos está en el archivo) y la clave del primer administrador (`ADMIN_INICIAL_CLAVE`).
3. `npm install`
4. `npm run seed:admin` crea el primer administrador con los datos `ADMIN_INICIAL_*` del `.env`. Si ya existe, le pone esa clave y lo reactiva.
5. `npm start` (queda en `http://localhost:5000/api`; el puerto 3000 es del frontend).

Si falta una variable del `.env`, el servidor no arranca y dice cuál falta.

## Autenticación

- `POST /api/auth/login` con `{ "usuario", "clave" }` (usuario o correo). Devuelve `accessToken`, `refreshToken` y los datos del usuario.
- Las rutas protegidas piden el encabezado `Authorization: Bearer <accessToken>`.
- `POST /api/auth/refresh` con `{ "refreshToken" }` entrega un par nuevo. Cada refresh sirve una sola vez.
- `POST /api/auth/logout` con `{ "refreshToken" }` cierra la sesión.
- Sin token, token inválido o vencido: 401. Con sesión pero sin permiso: 403.

## Pruebas

Con el servidor encendido, `npm test` corre la prueba del catálogo (entra como el administrador del `.env`) y la de autenticación (`npm run test:auth`).
