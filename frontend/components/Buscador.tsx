import { Search } from "lucide-react";

type BuscadorProps = {
  valor: string;
  onCambio: (valor: string) => void;
  placeholder: string;
};

// Caja de búsqueda que filtra la tabla en el navegador.
export default function Buscador({ valor, onCambio, placeholder }: BuscadorProps) {
  return (
    <label className="relative mb-4 block max-w-md">
      <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
      <input
        type="search"
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="campo pl-9"
      />
    </label>
  );
}
