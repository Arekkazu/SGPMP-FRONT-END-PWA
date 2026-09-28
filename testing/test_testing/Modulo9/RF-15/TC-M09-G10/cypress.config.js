const { defineConfig } = require('cypress');
const { writeFileSync, mkdirSync } = require('fs');
const { dirname, resolve } = require('path');

// TC-M09-G10 · CU-01 – Búsqueda y Paginación de Especies Productivas (RF-15 · Frontend & Backend QA)

module.exports = defineConfig({
  e2e: {
    baseUrl:
      process.env.CYPRESS_BASE_URL ||
      'https://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io',

    env: {
      API_BASE_URL:
        process.env.CYPRESS_API_BASE_URL ||
        'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test',
    },

    specPattern: '*.cy.ts',
    supportFile: 'commands.ts',
    fixturesFolder: false,

    viewportWidth: 1280,
    viewportHeight: 900,
    defaultCommandTimeout: 12000,

    pageLoadTimeout: 180000,
    modifyObstructiveCode: false,
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
