const { defineConfig } = require('cypress');
const { writeFileSync, mkdirSync } = require('fs');
const { dirname, resolve } = require('path');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'https://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io',
    specPattern: '*.cy.ts',
    supportFile: false,
    fixturesFolder: false,
    video: true,
    videosFolder: 'EvaluacionV2/RESULTADOS/videos',
    screenshotsFolder: 'EvaluacionV2/RESULTADOS/screenshots',
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
