const { defineConfig } = require('cypress');

// TC-M03-G118 · RF-59 · Frontend (Cypress). Ambiente TEST; MAIN no se prueba.
// Credenciales de la cuenta Productor por variable de entorno: CYPRESS_email, CYPRESS_password.

module.exports = defineConfig({
  reporter: 'mochawesome',
  reporterOptions: {
    reportDir: 'RESULTADOS',
    reportFilename: 'resultado_TC-M03-G118',
    html: true,
    json: false,
    overwrite: true,
    inlineAssets: true,
  },
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'https://api.inmero.co/sigab-test',
    specPattern: '*.cy.ts',
    supportFile: 'commands.ts',
    fixturesFolder: false,
    testIsolation: false,
    viewportWidth: 1280,
    viewportHeight: 900,
    defaultCommandTimeout: 12000,
    pageLoadTimeout: 120000,
    retries: { runMode: 0, openMode: 0 },
    blockHosts: ['*.googleapis.com', '*.gstatic.com', '*.firebaseio.com'],
    video: false,
    screenshotsFolder: 'RESULTADOS/capturas',
    trashAssetsBeforeRuns: true,
    setupNodeEvents(on) {
      on('task', { log(m) { console.log(m); return null; } });
    },
  },
});
