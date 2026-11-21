import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Oculta el botón flotante de Next.js en modo desarrollo (tapaba contenido en el celular).
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
