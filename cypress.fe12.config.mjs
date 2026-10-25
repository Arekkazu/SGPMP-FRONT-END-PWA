// | Fecha      | Nombre  | Que se hizo |
// |------------|---------|-------------|
// | 2026-10-22 | Leandro | FE-12 RF-57: configura verificación de navegador aislada |
import { defineConfig } from 'cypress';

export default defineConfig({
  video: false,
  screenshotsFolder: 'do-it/fe12/screenshots',
  e2e: {
    baseUrl: 'http://127.0.0.1:5174',
    specPattern: 'cypress/e2e/fe12.cy.ts',
    supportFile: false,
    defaultCommandTimeout: 20000,
  },
});
