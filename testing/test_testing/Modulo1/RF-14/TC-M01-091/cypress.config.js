const { defineConfig } = require('cypress');
const { mkdirSync, writeFileSync } = require('fs');
const { dirname, resolve } = require('path');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://127.0.0.1:5176',
    specPattern: '*.cy.ts',
    supportFile: false,
    fixturesFolder: false,
    video: true,
    videosFolder: 'RESULTADOS/TC-M01-091/videos',
    screenshotsFolder: 'RESULTADOS/TC-M01-091/screenshots',
    env: {
      API_URL: 'http://localhost:8000',
      USER_EMAIL: 'ingeniero@pecuaria.co',
      USER_PASSWORD: '',
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
