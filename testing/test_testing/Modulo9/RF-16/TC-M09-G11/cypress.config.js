const { defineConfig } = require('cypress');
const fs = require('fs');
const path = require('path');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'https://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io',
    env: {
      API_BASE_URL: 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test',
      ADMIN_EMAIL: 'admin@pecuaria.co',
      ADMIN_PASSWORD: 'Test1234!',
    },
    specPattern: '**/*.cy.ts',
    supportFile: false,
    video: true,
    videosFolder: 'RESULTADOS/videos',
    screenshotsFolder: 'RESULTADOS/screenshots',
    setupNodeEvents(on, config) {
      on('task', {
        writeResult({ file, content }) {
          const dir = path.dirname(file);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(file, content, 'utf8');
          console.log(`[writeResult] -> ${file}`);
          return null;
        },
      });
      return config;
    },
  },
});
