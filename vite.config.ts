/// <reference types="vitest" />

import legacy from "@vitejs/plugin-legacy";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), legacy()],
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
