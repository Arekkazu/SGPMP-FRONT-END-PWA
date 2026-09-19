import { defineConfig } from 'cypress';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'https://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'commands.ts',
    fixturesFolder: false,
    viewportWidth: 1280,
    viewportHeight: 900,
    defaultCommandTimeout: 12000,
    pageLoadTimeout: 180000,
    modifyObstructiveCode: false,
    retries: { runMode: 2, openMode: 0 },
    // Al crear EvaluacionV<n+1>, actualizar estas rutas a la nueva carpeta 
    // con su RUN_ID correspondiente.
    videosFolder: 'EvaluacionV2/RESULTADOS/G24-REEVAL-V2-20260914-010334/cypress_video',
    screenshotsFolder: 'EvaluacionV2/RESULTADOS/G24-REEVAL-V2-20260914-010334/cypress_screenshots',
    trashAssetsBeforeRuns: false,
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
