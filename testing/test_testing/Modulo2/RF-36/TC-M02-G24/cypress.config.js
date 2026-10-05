import { defineConfig } from 'cypress';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    videosFolder: 'EvaluacionV2/RESULTADOS/G24-REEVAL-V3-20260924-231800/cypress_video',
    screenshotsFolder: 'EvaluacionV2/RESULTADOS/G24-REEVAL-V3-20260924-231800/cypress_screenshots',
    trashAssetsBeforeRuns: false,
    setupNodeEvents(on, config) {
      on('task', {
        writeResult({ file, content }) {
          const full = path.resolve(__dirname, file);
          fs.mkdirSync(path.dirname(full), { recursive: true });
          fs.writeFileSync(full, content, 'utf-8');
          console.log('  [writeResult] ->', full);
          return null;
        },
      });
      return config;
    },
  },
});

