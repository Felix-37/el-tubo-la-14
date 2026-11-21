type CasillaProps = {
  texto: string;
  ayuda?: string;
  marcada: boolean;
  onCambio: (marcada: boolean) => void;
};

// Checkbox con su texto, para los campos booleanos (activo, es_cortable).
export default function Casilla({ texto, ayuda, marcada, onCambio }: CasillaProps) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={marcada}
        onChange={(e) => onCambio(e.target.checked)}
        className="mt-0.5 size-4 accent-primary"
      />
      <span>
        <span className="block text-sm font-medium">{texto}</span>
        {ayuda && <span className="block text-xs text-muted">{ayuda}</span>}
      </span>
    </label>
  );
}
