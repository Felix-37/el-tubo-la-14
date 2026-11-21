// Etiqueta de color para mostrar si un registro está activo.
export default function Estado({ activo }: { activo: boolean }) {
  return activo ? (
    <span className="rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-medium text-success">Activo</span>
  ) : (
    <span className="rounded-full bg-background px-2.5 py-0.5 text-xs font-medium text-muted">Inactivo</span>
  );
}
