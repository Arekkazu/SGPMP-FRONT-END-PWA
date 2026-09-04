const { defineConfig } = require('cypress');
const { writeFileSync, mkdirSync } = require('fs');
const { dirname, resolve } = require('path');

// TC-M01-074 · Intentar exportar auditoría sin conexión (CU07 · RF-10 · Frontend)
// Proyecto Cypress autocontenido. Spec + resultados viven en esta carpeta.
//
// CORREGIDO: convertido de cypress.config.ts a cypress.config.js.
// Con typescript@5.9.3 instalado, Node 20.20.2 empezó a interceptar el require()
// del config vía su soporte nativo de "require(esm)" (el archivo usa import/export),
// parseándolo como ESM real ANTES de que Cypress pudiera transpilarlo con TypeScript,
// y tronaba con "SyntaxError: Unexpected token ':'" justo en la anotación de tipo del
// callback de la tarea `writeResult`. El spec sigue siendo .cy.ts sin problema, porque
// ese se compila aparte (en el navegador), no vía require() de Node.
//
// supportFile apunta a commands.ts (loginUI, setNetwork) en vez de false: sin esto
// Cypress nunca registra esos comandos personalizados y el spec falla con
// "cy.loginUI is not a function".
//
// Ejecutar (navegador Chromium OBLIGATORIO para el modo offline):
//   cd SGPMP-FRONT-END-PWA/testing/test_testing/Modulo1/RF-10/TC-M01-074
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

    // El bundle desplegado pesa ~2.4 MB y el HTML pide los assets como `crossorigin`
    // sin cabecera CORS -> bajo el proxy de Cypress el <script module> se queda
    // colgado y el `load` nunca dispara. Damos margen y desactivamos la reescritura
    // de JS de Cypress (lenta en bundles grandes). El fix real ya está en el spec:
    // intercept que agrega Access-Control-Allow-Origin a /assets/**.
    pageLoadTimeout: 180000,
    modifyObstructiveCode: false,
    // CORREGIDO: retries: 1 hacía que, ante cualquier fallo en el intento 1, Cypress
    // reseteara la página a about:blank antes del intento 2 (parte de su mecanismo de
    // test isolation entre reintentos) -- antes de reintentar el propio it(). Como
    // before() no se repite por retry, el intento 2 corría contra una página en blanco
    // y esta prueba (que ya maneja sus propios fallos sin lanzar excepciones, para no
    // perder evidencia) terminaba reportando el estado de esa página en blanco como si
    // fuera el comportamiento real de la app offline. Para un negativo exploratorio
    // como este, un solo intento real vale más que un retry que puede enmascararlo.
    retries: { runMode: 0, openMode: 0 },

    // Ruido de terceros que puede colgar peticiones (no se usa en esta prueba)
    blockHosts: ['*.googleapis.com', '*.gstatic.com', '*.firebaseio.com'],

    // Evidencia -> ./RESULTADOS/
    video: true,
    videosFolder: 'RESULTADOS/videos',
    screenshotsFolder: 'RESULTADOS/screenshots',
    trashAssetsBeforeRuns: true,

    setupNodeEvents(on, config) {
      on('task', {
        // Escribe el informe de resultados (se puede llamar desde hooks, a diferencia de cy.writeFile)
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
