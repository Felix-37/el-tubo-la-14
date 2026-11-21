const PESOS = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

// 60000 -> "$ 60.000"
export function pesos(valor: number) {
  return PESOS.format(valor);
}

// Texto de un input o de un <select> a número; el campo vacío se envía como null.
export function numeroONulo(texto: string) {
  return texto.trim() === "" ? null : Number(texto);
}

// Para buscar sin importar mayúsculas ni tildes.
export function normalizar(texto: string | null | undefined) {
  return (texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}
