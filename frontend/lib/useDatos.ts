"use client";

import { useCallback, useEffect, useState, type SetStateAction } from "react";
import { api } from "./api";

type Resultado<T> = { ruta: string; dato: T; error: string | null };

// Hace un GET al backend al montar el componente (y cada vez que cambia la
// ruta) y guarda el resultado. Mientras llega la respuesta de la ruta nueva,
// "cargando" es true y no se muestra el error ni los datos de la anterior.
function useConsulta<T>(ruta: string, inicial: T) {
  const [resultado, setResultado] = useState<Resultado<T> | null>(null);

  useEffect(() => {
    // Si el componente se desmonta o cambia la ruta antes de que llegue la respuesta, no se toca el estado.
    let vigente = true;
    api<T>(ruta)
      .then(({ data }) => {
        if (vigente) setResultado({ ruta, dato: data, error: null });
      })
      .catch((e: Error) => {
        if (vigente) setResultado({ ruta, dato: inicial, error: e.message });
      });
    return () => {
      vigente = false;
    };
    // "inicial" es un valor fijo de cada llamada ([] o null); no debe repetir la consulta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruta]);

  const actual = resultado?.ruta === ruta ? resultado : null;

  // Permite cambiar los datos en pantalla (por ejemplo, quitar una fila borrada).
  const setDato = useCallback(
    (valor: SetStateAction<T>) =>
      setResultado((r) =>
        r && r.ruta === ruta
          ? { ...r, dato: typeof valor === "function" ? (valor as (previo: T) => T)(r.dato) : valor }
          : r,
      ),
    [ruta],
  );

  return { dato: actual ? actual.dato : inicial, setDato, cargando: !actual, error: actual?.error ?? null };
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
