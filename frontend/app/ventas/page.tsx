import ListaVentas from "@/components/ventas/ListaVentas";

// Ruta /ventas: el cajero ve las suyas y el admin todas (lo filtra el backend).
export default function Page() {
  return <ListaVentas />;
}
