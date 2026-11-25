# Frontend

Interfaz de El Tubo La 14 en Next.js y Tailwind. Consume el backend de `../backend` y desde la Tarea 4 pide iniciar sesión: cada rol ve su propio menú y sus propias pantallas.

## Cómo correrlo

1. Encender el backend (`cd ../backend` y `npm start`, queda en el puerto 5000).
2. Copiar `.env.example` como `.env.local`. La URL del backend solo se lee de ahí; si falta, la página avisa.
3. `npm install`
4. `npm run dev` y abrir `http://localhost:3000`. Sin sesión, la página manda a `/login`.

## Rutas por rol

| Ruta | Qué hace | Roles |
|---|---|---|
| `/login` | Inicio de sesión | Todos |
| `/` | Área de trabajo: registros por tabla y existencia baja | ADMIN |
| `/usuarios` | Lista, creación, edición, cambio de rol, activar y eliminar usuarios | ADMIN |
| `/categorias`, `/calibres`, `/productos`, `/presentaciones` | Consulta del catálogo | ADMIN y CAJERO (el CLIENTE ve productos y presentaciones) |
| `.../nueva`, `.../nuevo`, `.../[id]/editar` | Crear y editar el catálogo | ADMIN |
| `/ventas/nueva` | Punto de venta | CAJERO |
| `/caja` | Abrir y cerrar la caja del turno | CAJERO (el ADMIN solo consulta) |
| `/ventas` y `/ventas/[id]` | Ventas registradas: el cajero ve las suyas y el administrador todas | CAJERO y ADMIN |
| `/mi-cuenta` | Saldo, cupo, movimientos y datos de contacto | CLIENTE |
| `/mi-cuenta/compras` | Compras del cliente y su detalle | CLIENTE |
| `/perfil` | Nombre, correo y cambio de clave | Todos |

Si alguien escribe a mano una ruta de otro rol, ve la pantalla "Acceso denegado" con un botón a su inicio; sin sesión, va a `/login` y después vuelve a la ruta que pidió. Esto es solo comodidad: el backend responde 401 o 403 de todas formas.

## Sesión

- El access token y el refresh token se guardan en `localStorage` (clave `eltubo-auth`).
- Cuando el backend responde 401, `lib/api.ts` pide un par nuevo con el refresh y repite la petición una vez. Si el refresh también falla, la sesión se cierra y la página vuelve a `/login`.
- Cerrar sesión borra el almacenamiento y revoca el refresh en el backend.

## Estructura

- `app/`: una carpeta por ruta, con un `layout.tsx` que revisa el rol (`RequiereRol`).
- `components/`: piezas reutilizables (`Header`, `Menu`, `Tabla`, `Boton`, `Modal`, `Mensaje`, `Formulario`, `Detalle`), la sesión (`auth/`), los formularios y detalles del catálogo, y las pantallas de usuarios, ventas y Mi cuenta.
- `lib/`: llamadas al backend (`api.ts`), sesión (`sesion.ts`), roles y permisos de cada ruta (`roles.ts`), hooks de consulta y eliminación, tipos y formato de pesos.
