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
    retries: { runMode: 0, openMode: 0 },
    video: true,
    videosFolder: 'RESULTADOS/TC-M02-G24/videos',
    screenshotsFolder: 'RESULTADOS/TC-M02-G24/screenshots',
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
