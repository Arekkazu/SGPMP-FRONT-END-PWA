const { defineConfig } = require('cypress');
const { writeFileSync, mkdirSync } = require('fs');
const { dirname, resolve } = require('path');

// TC-M01-011 · Validación de rechazo de registro por CAPTCHA no resuelto en ambiente TEST (CU01 · RF-01 · Frontend & QA)
// Proyecto Cypress autocontenido. Spec + resultados viven en esta carpeta.

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
