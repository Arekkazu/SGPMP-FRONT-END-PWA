const { defineConfig } = require('cypress');
const { writeFileSync, mkdirSync } = require('fs');
const { dirname, resolve } = require('path');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5174',
    specPattern: '*.cy.ts',
    supportFile: false,
    fixturesFolder: false,
    video: true,
    videosFolder: 'RESULTADOS/videos',
    screenshotsFolder: 'RESULTADOS/screenshots',
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
