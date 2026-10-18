# Backend

API REST del catálogo de El Tubo La 14 (Express + PostgreSQL). CRUD de `categorias`, `calibres`, `productos` y `presentaciones`.

## Cómo correrlo

1. Crear una base en PostgreSQL y ejecutar `../database/tarea2_catalogo.sql`.
2. Copiar `.env.example` como `.env` y poner los datos de conexión.
3. `npm install`
4. `npm start` (queda en `http://localhost:3000/api`).

Con el servidor encendido, `npm test` prueba los 20 endpoints.
