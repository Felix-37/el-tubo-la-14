# El Tubo La 14

Proyecto del curso Programación 5 (grupo 6303A, UNIAJC).

Es la aplicación web de la Cerrajería El Tubo La 14. Desde la Tarea 4 tiene inicio de sesión con JWT y tres roles: el administrador maneja el catálogo y los usuarios, el cajero registra ventas en el mostrador y el cliente (un cerrajero con crédito) consulta su saldo y sus compras desde el celular.

## Tecnologías

- PostgreSQL
- Express, `jsonwebtoken` y `bcrypt` (backend, puerto 5000)
- Next.js + Tailwind (frontend, puerto 3000)

## Estructura

- `database/`: scripts de la base. Se corren en orden: `01_esquema.sql`, `02_datos_iniciales.sql` y `03_seguridad_tarea4.sql`. `tarea2_catalogo.sql` es de la Tarea 2 y ya no hace falta.
- `backend/`: API REST con autenticación y permisos por rol.
- `frontend/`: interfaz que consume el backend.

## Instalación

1. Crear la base en PostgreSQL y cargar los tres scripts:

   ```
   createdb -U postgres el_tubo_la_14
   psql -U postgres -d el_tubo_la_14 -f database/01_esquema.sql
   psql -U postgres -d el_tubo_la_14 -f database/02_datos_iniciales.sql
   psql -U postgres -d el_tubo_la_14 -f database/03_seguridad_tarea4.sql
   ```

2. En `backend/`, copiar `.env.example` como `.env` y llenarlo (conexión, los dos secretos JWT y la clave del primer administrador). Después:

   ```
   npm install
   npm run seed:admin
   npm start
   ```

3. En `frontend/`, copiar `.env.example` como `.env.local`. Después:

   ```
   npm install
   npm run dev
   ```

4. Abrir `http://localhost:3000` y entrar con el administrador del `.env`.

Los pasos de cada parte están más detallados en `backend/README.md` y `frontend/README.md`.

## Integrantes

- Juan Felipe Chilito Hoyos
- Jhonny Stiven Cárdenas
- Valentina Ceballos
