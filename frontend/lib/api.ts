import { borrarSesion, guardarSesion, leerSesion, type Sesion } from "./sesion";

// URL del backend Express. Solo se lee de la variable de entorno (archivo .env.local);
// no hay ninguna dirección escrita en el código.
const API_URL = process.env.NEXT_PUBLIC_API_URL;

type Metodo = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
// auth: false para las rutas públicas (login, refresh, logout).
type Opciones = { method?: Metodo; body?: unknown; auth?: boolean };

// Error con el código HTTP, para distinguir 401 (sin sesión) de 403 (sin permiso).
export class ErrorApi extends Error {
  constructor(
    mensaje: string,
    public status: number,
  ) {
    super(mensaje);
  }
}

async function enviar(ruta: string, { method = "GET", body }: Opciones, token?: string) {
  if (!API_URL) {
    throw new ErrorApi(
      "Falta configurar NEXT_PUBLIC_API_URL. Copie .env.example como .env.local y vuelva a ejecutar npm run dev.",
      0,
    );
  }
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    return await fetch(`${API_URL}${ruta}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ErrorApi(`No se pudo conectar con el backend en ${API_URL}. ¿Está encendido?`, 0);
  }
}

// El backend responde { ok, data, mensaje } o { ok: false, error: { mensaje, detalle } }.
async function leer<T>(respuesta: Response) {
  const json = await respuesta.json().catch(() => null);
  if (!respuesta.ok || !json?.ok) {
    const mensaje: string = json?.error?.mensaje ?? `Error ${respuesta.status} del servidor`;
    const detalle = json?.error?.detalle;
    // El detalle puede ser una lista de errores de validación o un texto de PostgreSQL.
    const lineas: string[] = Array.isArray(detalle) ? detalle.filter((d) => typeof d === "string") : typeof detalle === "string" ? [detalle] : [];
    throw new ErrorApi([mensaje, ...lineas.map((linea) => `• ${linea}`)].join("\n"), respuesta.status);
  }
  return { data: json.data as T, mensaje: json.mensaje as string | undefined };
}

// Renovación del access token con el refresh. Solo una a la vez: dentro de la
// pestaña con una promesa compartida y entre pestañas con un candado del
// navegador (Web Locks). Si al entrar al candado otra pestaña ya renovó,
// se usa ese token en lugar de gastar el refresh otra vez.
let renovacionEnCurso: Promise<string | null> | null = null;

const esperar = (ms: number) => new Promise((listo) => setTimeout(listo, ms));

async function renovarConCandado(tokenVencido: string): Promise<string | null> {
  let actual = leerSesion();
  if (!actual) return null;
  if (actual.accessToken !== tokenVencido) return actual.accessToken;
  // El candado y el cambio de localStorage de otra pestaña llegan por caminos
  // distintos: se da un momento para que llegue la sesión que esa pestaña
  // acaba de guardar antes de gastar el refresh (el riesgo que queda es mínimo).
  await esperar(150);
  actual = leerSesion();
  if (!actual) return null;
  if (actual.accessToken !== tokenVencido) return actual.accessToken;

  try {
    const { data } = await leer<Sesion>(
      await enviar("/auth/refresh", { method: "POST", body: { refreshToken: actual.refreshToken } }),
    );
    // Si mientras tanto se cerró la sesión (o entró otro usuario), la respuesta se descarta.
    const vigente = leerSesion();
    if (!vigente || vigente.refreshToken !== actual.refreshToken) return vigente?.accessToken ?? null;
    guardarSesion({ accessToken: data.accessToken, refreshToken: data.refreshToken, usuario: data.usuario });
    return data.accessToken;
  } catch (e) {
    // Refresh vencido, revocado o reusado: la sesión terminó.
    if (e instanceof ErrorApi && e.status === 401) {
      borrarSesion();
      return null;
    }
    throw e;
  }
}

function renovar(tokenVencido: string) {
  if (!renovacionEnCurso) {
    const tarea = () => renovarConCandado(tokenVencido);
    const conCandado = async (): Promise<string | null> =>
      typeof navigator !== "undefined" && navigator.locks
        ? await navigator.locks.request("eltubo-renovar", tarea)
        : tarea();
    renovacionEnCurso = conCandado().finally(() => {
      renovacionEnCurso = null;
    });
  }
  return renovacionEnCurso;
}

// Llama al backend. Con auth (por defecto) envía el access token; si responde
// 401, renueva la sesión una vez y repite la petición. Si no se puede renovar,
// la sesión se cierra y la interfaz manda a /login.
export async function api<T>(ruta: string, opciones: Opciones = {}) {
  const { auth = true } = opciones;
  if (!auth) return leer<T>(await enviar(ruta, opciones));

  const token = leerSesion()?.accessToken;
  if (!token) throw new ErrorApi("Debe iniciar sesión", 401);

  let respuesta = await enviar(ruta, opciones, token);
  if (respuesta.status === 401) {
    const nuevo = await renovar(token);
    if (!nuevo) throw new ErrorApi("La sesión expiró. Inicie sesión de nuevo.", 401);
    respuesta = await enviar(ruta, opciones, nuevo);
    if (respuesta.status === 401) {
      borrarSesion();
      throw new ErrorApi("La sesión expiró. Inicie sesión de nuevo.", 401);
    }
  }
  return leer<T>(respuesta);
}

// Inicio y cierre de sesión (rutas públicas del backend).
export async function iniciarSesion(usuario: string, clave: string) {
  const { data } = await api<Sesion>("/auth/login", { method: "POST", body: { usuario, clave }, auth: false });
  const sesion = { accessToken: data.accessToken, refreshToken: data.refreshToken, usuario: data.usuario };
  guardarSesion(sesion);
  return sesion;
}

export async function cerrarSesionEnServidor() {
  const sesion = leerSesion();
  borrarSesion();
  if (!sesion) return;
  // Revoca el refresh en el backend; si falla (backend apagado), igual se
  // borró la sesión del navegador.
  await api("/auth/logout", { method: "POST", body: { refreshToken: sesion.refreshToken }, auth: false }).catch(() => {});
}
