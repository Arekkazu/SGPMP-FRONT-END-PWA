// Cypress de la EvaluacionV5 de TC-M09-G31. Apunta al frontend TEST desplegado
// (https://api.inmero.co/), nunca a un frontend local ni a dominios sslip.io.
// Las capturas se dejan planas en RESULTADOS/<RUN_ID>/ui/ como tc66.png, tc67.png y tc68.png.
const { defineConfig } = require('cypress');
const fs = require('fs');
const path = require('path');

const rootOut = path.join(__dirname, 'RESULTADOS', process.env.G31_V5_RUN_ID);
const ui = path.join(rootOut, 'ui');
const record = JSON.parse(fs.readFileSync(path.join(rootOut, 'record.json'), 'utf8'));

module.exports = defineConfig({
  video: false,
  screenshotOnRunFailure: true,
  trashAssetsBeforeRuns: false,
  retries: 0,
  screenshotsFolder: ui,
  downloadsFolder: path.join(ui, 'downloads'),
  viewportWidth: 1920,
  viewportHeight: 1200,
  defaultCommandTimeout: 25000,
  responseTimeout: 40000,
  pageLoadTimeout: 90000,
  env: {
    record,
    email: process.env.TEST_ADMIN_EMAIL,
    password: process.env.TEST_ADMIN_PASSWORD,
    api: 'https://api.inmero.co/back-sigab-test',
  },
  e2e: {
    baseUrl: 'https://api.inmero.co/',
    specPattern: 'tc-m09-g31-semaforo-v5.cy.js',
    supportFile: false,
    setupNodeEvents(on) {
      on('after:screenshot', (details) => {
        fs.mkdirSync(ui, { recursive: true });
        const destino = path.join(ui, path.basename(details.path));
        if (path.resolve(details.path) !== path.resolve(destino)) fs.renameSync(details.path, destino);
        return { path: destino };
      });
      on('task', {
        evidence(data) {
          fs.mkdirSync(ui, { recursive: true });
          fs.writeFileSync(path.join(ui, 'ui-evidence.json'), JSON.stringify(data, null, 2) + '\n');
          return null;
        },
      });
    },
  },
});
