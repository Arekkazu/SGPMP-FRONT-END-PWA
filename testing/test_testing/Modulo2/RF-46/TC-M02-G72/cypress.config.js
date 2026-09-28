const { defineConfig } = require('cypress');
const fs = require('fs');
const path = require('path');

module.exports = defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io',
    specPattern: path.join(__dirname, '*.cy.ts'),
    supportFile: path.join(__dirname, 'commands.ts'),
    fixturesFolder: false,
    screenshotsFolder: path.join(__dirname, 'RESULTADOS/screenshots'),
    videosFolder: path.join(__dirname, 'RESULTADOS/videos'),
    video: true,
    viewportWidth: 1280,
    viewportHeight: 900,
    defaultCommandTimeout: 15000,
    pageLoadTimeout: 60000,
    modifyObstructiveCode: false,
    env: {
      API_BASE_URL: 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test',
      ADMIN_EMAIL: 'admin@pecuaria.co',
      ADMIN_PASSWORD: 'Test1234!',
    },
    setupNodeEvents(on, config) {
      on('task', {
        writeResult({ file, content }) {
          const fullPath = path.isAbsolute(file) ? file : path.resolve(__dirname, file);
          fs.mkdirSync(path.dirname(fullPath), { recursive: true });
          fs.writeFileSync(fullPath, content, 'utf8');
          console.log(`[writeResult] -> ${fullPath}`);
          return fullPath;
        },
      });
      return config;
    },
  },
});
