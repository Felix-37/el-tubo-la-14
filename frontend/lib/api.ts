// URL del backend Express. Solo se lee de la variable de entorno (archivo .env.local);
// no hay ninguna dirección escrita en el código.
const API_URL = process.env.NEXT_PUBLIC_API_URL;

type Opciones = { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: unknown };

// Llama al backend con fetch. El backend responde { ok, data, mensaje } o
// { ok: false, error: { mensaje, detalle } }; si falla se lanza un Error con ese texto.
export async function api<T>(ruta: string, { method = "GET", body }: Opciones = {}) {
  if (!API_URL) {
    throw new Error(
      "Falta configurar NEXT_PUBLIC_API_URL. Copie .env.example como .env.local y vuelva a ejecutar npm run dev.",
    );
  }

  let respuesta: Response;
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(`No se pudo conectar con el backend en ${API_URL}. ¿Está encendido?`);
  }

  const json = await respuesta.json().catch(() => null);
  if (!respuesta.ok || !json?.ok) {
    const mensaje: string = json?.error?.mensaje ?? `Error ${respuesta.status} del servidor`;
    const detalle = json?.error?.detalle;
    // El detalle puede ser una lista de errores de validación o un texto de PostgreSQL.
    const lineas: string[] = Array.isArray(detalle) ? detalle : typeof detalle === "string" ? [detalle] : [];
    throw new Error([mensaje, ...lineas.map((linea) => `• ${linea}`)].join("\n"));
  }

  return { data: json.data as T, mensaje: json.mensaje as string | undefined };
}
