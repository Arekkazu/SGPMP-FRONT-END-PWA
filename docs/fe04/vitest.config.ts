import { defineConfig } from 'vitest/config';

// Mismos entorno, globals y setup del proyecto. Se omiten únicamente plugins
// de build (PWA/legacy), que no participan en estas pruebas de React/HTTP.
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    pool: 'threads',
    maxWorkers: 1,
  },
});
