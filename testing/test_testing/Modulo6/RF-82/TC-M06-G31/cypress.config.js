// | Fecha      | Nombre      | Que se hizo                                                                   |
// |------------|-------------|-------------------------------------------------------------------------------|
// | 2026-11-09 | Laura032005 | TC-M06-G31 RF-82..85: configuración de Cypress para la bandeja de notificaciones |
// | 2026-11-12 | Daniela Castillo | M06 reprueba V2.0: el reporte HTML pasa a llamarse resultado_TC-M06-G31-V2.0.html |
const { defineConfig } = require('cypress');
const { tareas } = require('./m06-api');

// TC-M06-G31 · RF-82, RF-83, RF-84, RF-85 · Frontend (Cypress). Ambiente TEST; MAIN (/sigab) no se prueba.
// Credenciales y secreto del sandbox SOLO por variable de entorno (ver el encabezado del spec).

const BASE_URL = (process.env.CYPRESS_BASE_URL || 'https://api.inmero.co/sigab-test').replace(/\/$/, '');
if (BASE_URL.endsWith('/sigab')) {
  throw new Error('CYPRESS_BASE_URL apunta a MAIN (/sigab): ese ambiente nunca se prueba.');
}

module.exports = defineConfig({
  reporter: 'mochawesome',
  reporterOptions: {
    reportDir: 'RESULTADOS',
    reportFilename: 'resultado_TC-M06-G31-V2.0',
    html: true,
    json: false,
    overwrite: true,
    inlineAssets: true,
  },
  e2e: {
    baseUrl: BASE_URL,
    specPattern: '*.cy.ts',
    supportFile: 'commands.ts',
    fixturesFolder: false,
    testIsolation: false,
    viewportWidth: 1280,
    viewportHeight: 900,
    defaultCommandTimeout: 15000,
    pageLoadTimeout: 60000,
    requestTimeout: 60000,
    responseTimeout: 60000,
    taskTimeout: 170000, // un run del sandbox dura 170 s como máximo
    retries: { runMode: 0, openMode: 0 },
    blockHosts: ['*.googleapis.com', '*.gstatic.com', '*.firebaseio.com'],
    video: false,
    screenshotsFolder: 'RESULTADOS/capturas',
    trashAssetsBeforeRuns: true,
    setupNodeEvents(on) {
      on('task', {
        ...tareas,
        log(m) { console.log(m); return null; },
      });
    },
  },
});
