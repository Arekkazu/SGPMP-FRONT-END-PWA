const { defineConfig } = require('cypress');
const { writeFileSync, mkdirSync } = require('fs');
const { dirname, resolve } = require('path');

// TC-M01-101 · Verificar comportamiento de notificaciones cuando el sistema está offline
// (CU08 · RF-14 · Frontend). Proyecto Cypress autocontenido, mismo patrón que TC-M01-074
// y TC-M01-107 de esta misma sesión (supportFile -> commands.ts, retries en 0, resultado
// escrito desde dentro del it() vía cy.task en vez de un hook).
//
// Ejecutar (navegador Chromium obligatorio):
//   cd SGPMP-FRONT-END-PWA/testing/test_testing/Modulo1/RF-14/TC-M01-101
//   npm install      # la primera vez
//   npm test

module.exports = defineConfig({
  e2e: {
    baseUrl:
      process.env.CYPRESS_BASE_URL ||
      'http://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io',

    specPattern: '*.cy.ts',
    supportFile: 'commands.ts',
    fixturesFolder: false,

    viewportWidth: 1280,
    viewportHeight: 900,
    defaultCommandTimeout: 12000,
    pageLoadTimeout: 180000,
    modifyObstructiveCode: false,

    // Ver nota en TC-M01-074/cypress.config.js: un retry resetea la pagina a
    // about:blank antes del segundo intento (before() no se repite), y esta
    // prueba reportaria ese estado en blanco como si fuera el comportamiento
    // real de la app offline.
    retries: { runMode: 0, openMode: 0 },

    blockHosts: ['*.googleapis.com', '*.gstatic.com', '*.firebaseio.com'],

    video: true,
    videosFolder: 'RESULTADOS/videos',
    screenshotsFolder: 'RESULTADOS/screenshots',
    trashAssetsBeforeRuns: true,

    setupNodeEvents(on, config) {
      on('task', {
        writeResult({ file, content }) {
          const abs = resolve(config.projectRoot ?? process.cwd(), file);
          mkdirSync(dirname(abs), { recursive: true });
          writeFileSync(abs, content, 'utf8');
          console.log('  [writeResult] ->', abs);
          return abs;
        },
      });
      return config;
    },
  },
});
