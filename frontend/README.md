# Frontend

Interfaz del catálogo de El Tubo La 14 en Next.js y Tailwind. Consume el backend de `../backend` y tiene el CRUD completo de `categorias`, `calibres`, `productos` y `presentaciones`.

## Cómo correrlo

1. Encender el backend (`cd ../backend` y `npm start`, queda en el puerto 5000).
2. Copiar `.env.example` como `.env.local`. La URL del backend solo se lee de ahí; si falta, la página avisa.
3. `npm install`
4. `npm run dev` y abrir `http://localhost:3000`.

## Rutas

| Ruta | Qué hace |
|---|---|
| `/` | Área de trabajo: registros por tabla y existencia baja |
| `/categorias` | Lista con búsqueda |
| `/categorias/nueva` | Crear |
| `/categorias/[id]` | Detalle de un registro |
| `/categorias/[id]/editar` | Editar |

Las otras tablas siguen el mismo patrón (`/calibres/nuevo`, `/productos/nuevo`, `/presentaciones/nueva`). Eliminar se hace desde la lista o el detalle, con un modal de confirmación.

## Estructura

- `app/`: una carpeta por ruta.
- `components/`: piezas reutilizables (`Header`, `Menu`, `Footer`, `Card`, `Tabla`, `Boton`, `Modal`, `Mensaje`, `Formulario`, `Detalle`), los formularios de cada tabla (`formularios/`) y sus vistas de detalle (`detalles/`).
- `lib/`: llamadas al backend con `fetch` (`api.ts`), hooks para consultar (`useDatos.ts`) y eliminar (`useEliminar.ts`), tipos y formato de pesos.
