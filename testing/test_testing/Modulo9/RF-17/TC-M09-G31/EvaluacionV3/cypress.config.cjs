const { defineConfig } = require('cypress');
const fs = require('fs');
const path = require('path');

const rootOut = path.join(__dirname, 'RESULTADOS', process.env.G31_V3_RUN_ID);
const ui = path.join(rootOut, 'ui');
const record = JSON.parse(fs.readFileSync(path.join(rootOut, 'record.json'), 'utf8'));

module.exports = defineConfig({
  video: false, screenshotOnRunFailure: false, trashAssetsBeforeRuns: false, retries: 0,
  screenshotsFolder: ui, downloadsFolder: path.join(ui, 'downloads'),
  viewportWidth: 1920, viewportHeight: 1200, defaultCommandTimeout: 20000, responseTimeout: 30000,
  env: {
    record,
    email: process.env.TEST_ADMIN_EMAIL,
    password: process.env.TEST_ADMIN_PASSWORD,
    api: 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test',
  },
  e2e: {
    baseUrl: 'https://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io',
    specPattern: 'tc-m09-g31-semaforo.cy.js', supportFile: false,
    setupNodeEvents(on) {
      // Capturas planas en ui/: tc66.png, tc67.png, tc68.png (seccion 5).
      on('after:screenshot', (details) => {
        fs.mkdirSync(ui, { recursive: true });
        const destino = path.join(ui, path.basename(details.path));
        if (path.resolve(details.path) !== path.resolve(destino)) fs.renameSync(details.path, destino);
        return { path: destino };
      });
      on('task', {
        evidence(data) {
          fs.mkdirSync(ui, { recursive: true });
          fs.writeFileSync(path.join(ui, 'ui-evidence.json'), JSON.stringify(data, null, 2));
          return null;
        },
      });
    },
  },
});
