const { defineConfig } = require('cypress');
const { writeFileSync, mkdirSync } = require('fs');
const { dirname, resolve } = require('path');

// TC-M01-042 · Rechazo de correo con formato inválido en recuperación de contraseña (RF-08 · Frontend)
// Proyecto Cypress autocontenido. Spec + resultados viven en esta carpeta.
//
// .js (no .ts): mismo motivo que TC-M01-074/TC-M01-023 — con typescript@5.9.3,
// Node intercepta el require() del config vía su soporte nativo de "require(esm)"
// antes de que Cypress pueda transpilarlo, y truena en la anotación de tipo del
// callback de writeResult. El spec sigue siendo .cy.ts (se compila en el navegador).
//
// supportFile apunta a commands.ts: sin esto Cypress no registra los comandos
// personalizados y el spec falla con "cy.loginUI is not a function" (aunque este
// spec no hace login, se mantiene por consistencia con el resto del proyecto).
//
// Ejecutar:
//   cd SGPMP-FRONT-END-PWA/testing/test_testing/Modulo1/RF-08/TC-M01-042
//   npm install      # la primera vez
//   npm test         # = cypress run --browser chrome

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

    // Mismo problema de CORS con el bundle Vite bajo el proxy de Cypress que en
    // TC-M01-074/TC-M01-023: se intercepta /assets/** para agregar el header.
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
