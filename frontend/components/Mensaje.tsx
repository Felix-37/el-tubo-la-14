import { CircleAlert, CircleCheck } from "lucide-react";

export type MensajeEstado = { tipo: "exito" | "error"; texto: string } | null;

// Aviso de éxito o de error debajo de un formulario o encima de una tabla.
export default function Mensaje({ mensaje }: { mensaje: MensajeEstado }) {
  if (!mensaje) return null;
  const exito = mensaje.tipo === "exito";
  const Icono = exito ? CircleCheck : CircleAlert;
  return (
    <div
      role={exito ? "status" : "alert"}
      className={`mb-4 flex items-start gap-2 rounded-md border px-4 py-3 text-sm whitespace-pre-line ${
        exito ? "border-success/30 bg-success-soft text-success" : "border-primary/30 bg-primary-soft text-primary-dark"
      }`}
    >
      <Icono size={18} className="mt-0.5 shrink-0" />
      <span>{mensaje.texto}</span>
    </div>
  );
}
