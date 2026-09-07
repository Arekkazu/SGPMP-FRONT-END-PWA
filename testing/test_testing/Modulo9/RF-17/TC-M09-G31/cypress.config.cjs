const path = require('path');
const { defineConfig } = require('cypress');

const runId = process.env.G31_RUN_ID;
if (!runId) throw new Error('G31_RUN_ID debe existir solo durante la ejecucion de Cypress.');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'https://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io',
    specPattern: path.join(__dirname, 'tc-m09-g31-bloqueo.cy.ts'),
    supportFile: false,
    screenshotsFolder: path.join(__dirname, 'RESULTADOS', runId, 'screenshots'),
    screenshotOnRunFailure: true,
    video: false,
    retries: 0,
    trashAssetsBeforeRuns: false,
  },
});
