const { defineConfig } = require('cypress');
const { writeFileSync, mkdirSync } = require('fs');
const { dirname, resolve } = require('path');

// TC-M09-G01 · CU-01 – Gestionar Catálogo de Especies Productivas (RF-15 · Frontend & Backend QA)
// Incidente de infraestructura activo: INC-M09-01-G01 (Fecha de detección: 03/09/2026) - Mixed Content (HTTPS -> HTTP).
// TODO: confirmar endpoint real de creación de especie (RF-15) y rol/cuenta de ejecución antes de correr este caso — actualmente sin verificar contra el backend.

module.exports = defineConfig({
  e2e: {
    baseUrl:
      process.env.CYPRESS_BASE_URL ||
      'https://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io',

    specPattern: '*.cy.ts',
    supportFile: 'commands.ts',
    fixturesFolder: false,

    viewportWidth: 1280,
    viewportHeight: 900,
    defaultCommandTimeout: 12000,

    pageLoadTimeout: 180000,
    modifyObstructiveCode: false,
    retries: { runMode: 1, openMode: 0 },

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
          // eslint-disable-next-line no-console
          console.log('  [writeResult] ->', abs);
          return abs;
        },
      });
      return config;
    },
  },
});
