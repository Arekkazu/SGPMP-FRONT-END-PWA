const { defineConfig } = require('cypress');
const fs = require('fs');
const path = require('path');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'https://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io',
    specPattern: '**/*.cy.ts',
    supportFile: false,
    screenshotsFolder: 'RESULTADOS/screenshots',
    videosFolder: 'RESULTADOS/videos',
    video: true,
    viewportWidth: 1280,
    viewportHeight: 900,
    defaultCommandTimeout: 15000,
    env: {
      API_BASE_URL: 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test',
      PRODUCTOR_EMAIL: 'productor@pecuaria.co',
      PRODUCTOR_PASSWORD: 'Test1234!',
    },
    setupNodeEvents(on, config) {
      on('task', {
        writeResult({ file, content }) {
          const fullPath = path.isAbsolute(file) ? file : path.join(config.projectRoot, file);
          fs.mkdirSync(path.dirname(fullPath), { recursive: true });
          fs.writeFileSync(fullPath, content, 'utf8');
          console.log(`[writeResult] -> ${fullPath}`);
          return null;
        },
      });
      return config;
    },
  },
});
