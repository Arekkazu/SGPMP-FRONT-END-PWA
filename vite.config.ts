/// <reference types="vitest" />

import legacy from "@vitejs/plugin-legacy";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), legacy()],
  build: {
    // El unico chunk por encima de 500 kB es el de Ionic (~1.13 MB, 1.16 MB en el
    // build legacy; ~235 kB gzip), casi todo @ionic/core:
    // @ionic/react registra los ~90 web components al importarse y no admite
    // tree-shaking, aunque la app solo use IonApp/IonRouterOutlet. Se necesita
    // en la primera carga de todos modos. El limite queda justo encima para que
    // cualquier otro chunk que crezca vuelva a avisar.
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // Librerias de terceros en chunks propios: cambian menos que el codigo
        // de la app, asi que el navegador las conserva en cache entre releases.
        // Los graficos solo los usan telemetria y prediccion (cargadas con lazy).
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (/[\\/](@ionic|ionicons|@stencil)[\\/]/.test(id)) return "ionic";
          if (/[\\/](@firebase|firebase)[\\/]/.test(id)) return "firebase";
          if (/[\\/](recharts|d3-[\w-]+|victory-vendor)[\\/]/.test(id)) return "charts";
          // Solo los paquetes de React sin dependencias externas: si entra algo
          // que importa de "vendor" (react-router, por ejemplo) se forma un ciclo
          // entre chunks y la app arranca con React sin inicializar.
          if (/[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return "react";
          return "vendor";
        },
      },
    },
  },
  server: {
    allowedHosts: [
      "77fc-181-235-172-54.ngrok-free.app",
      "8b34-186-102-55-102.ngrok-free.app",
      "localhost",
      "127.0.0.1",
      "10.121.21.101:8100",
    ],
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/setupTests.ts",
  },
});
