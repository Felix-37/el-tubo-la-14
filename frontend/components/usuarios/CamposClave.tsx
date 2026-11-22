type CamposClaveProps = {
  clave: string;
  confirmacion: string;
  onClave: (valor: string) => void;
  onConfirmacion: (valor: string) => void;
  obligatoria: boolean;
  etiqueta?: string;
};

// Clave y su confirmación, con la regla del backend como ayuda.
export default function CamposClave({
  clave,
  confirmacion,
  onClave,
  onConfirmacion,
  obligatoria,
  etiqueta = "Clave",
}: CamposClaveProps) {
  const marca = obligatoria ? " *" : "";
  return (
    <>
      <div>
        <label htmlFor="clave" className="etiqueta">
          {etiqueta}
          {marca}
        </label>
        <input
          id="clave"
          type="password"
          autoComplete="new-password"
          className="campo"
          value={clave}
          onChange={(e) => onClave(e.target.value)}
        />
        <p className="mt-1 text-xs text-muted">
          Mínimo 8 caracteres, con al menos una letra y un número.
          {!obligatoria && " Déjela vacía para no cambiarla."}
        </p>
      </div>
      <div>
        <label htmlFor="confirmacion" className="etiqueta">
          Confirmar {etiqueta.toLowerCase()}
          {marca}
        </label>
        <input
          id="confirmacion"
          type="password"
          autoComplete="new-password"
          className="campo"
          value={confirmacion}
          onChange={(e) => onConfirmacion(e.target.value)}
        />
      </div>
    </>
  );
}
