import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import Menu from "@/components/Menu";
import Footer from "@/components/Footer";
import ProveedorSesion from "@/components/auth/ProveedorSesion";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "El Tubo La 14",
  description: "Catálogo, ventas y cuentas de clientes de la Cerrajería El Tubo La 14",
};

// Estructura común a todas las páginas: encabezado, menú lateral, contenido y pie.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        {/* La sesión (usuario, login y logout) está disponible en toda la aplicación. */}
        <ProveedorSesion>
          <Header />
          <div className="flex flex-1 flex-col md:flex-row">
            {/* El menú usa usePathname: con cacheComponents necesita Suspense. */}
            <Suspense fallback={<Menu rutaActual="" rol={null} />}>
              <Sidebar />
            </Suspense>
            {/* min-w-0: una tabla ancha hace scroll dentro de su caja en vez de estirar la página. */}
            <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
          </div>
          <Footer />
        </ProveedorSesion>
      </body>
    </html>
  );
}
