"use client";

import { useEffect, useState } from "react";
import { api } from "./api";

// Hace un GET al backend al montar el componente y guarda el resultado.
function useConsulta<T>(ruta: string, inicial: T) {
  const [dato, setDato] = useState<T>(inicial);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Si el componente se desmonta antes de que llegue la respuesta, no se toca el estado.
    let vigente = true;
    api<T>(ruta)
      .then(({ data }) => {
        if (vigente) setDato(data);
      })
      .catch((e: Error) => {
        if (vigente) setError(e.message);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [ruta]);

  return { dato, setDato, cargando, error };
}

// Lista completa de una tabla (GET /tabla).
export function useDatos<T>(ruta: string) {
  const { dato, setDato, cargando, error } = useConsulta<T[]>(ruta, []);
  return { datos: dato, setDatos: setDato, cargando, error };
}

// Un solo registro (GET /tabla/:id).
export function useRegistro<T>(ruta: string) {
  const { dato, cargando, error } = useConsulta<T | null>(ruta, null);
  return { registro: dato, cargando, error };
}
