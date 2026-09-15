const { defineConfig } = require('cypress');
const { mkdirSync, writeFileSync } = require('fs');
const { dirname, resolve } = require('path');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'https://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io',
    specPattern: '*.cy.ts',
    supportFile: false,
    fixturesFolder: false,
    video: true,
    videosFolder: 'EvaluacionV2/RESULTADOS/TC-M01-091/videos',
    screenshotsFolder: 'EvaluacionV2/RESULTADOS/TC-M01-091/screenshots',
    env: {
      API_URL: 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test',
      USER_EMAIL: 'u20212200102@usco.edu.co',
      USER_PASSWORD: 'Actualizada#46',
    },
    setupNodeEvents(on, config) {
      on('task', {
        writeResult({ file, content }) {
          const absolutePath = resolve(config.projectRoot ?? process.cwd(), file);
          mkdirSync(dirname(absolutePath), { recursive: true });
          writeFileSync(absolutePath, content, 'utf8');
          return absolutePath;
        },
      });
      return config;
    },
  },
});
