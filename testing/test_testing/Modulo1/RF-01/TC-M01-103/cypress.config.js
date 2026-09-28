const { defineConfig } = require('cypress');
const fs = require('fs');
const path = require('path');

module.exports = defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io',
    specPattern: '**/*.cy.ts',
    supportFile: './commands.ts',
    video: true,
    videosFolder: 'RESULTADOS/videos',
    screenshotsFolder: 'RESULTADOS/screenshots',
    viewportWidth: 1280,
    viewportHeight: 900,
    retries: {
      runMode: 1,
      openMode: 0,
    },
    setupNodeEvents(on, config) {
      on('task', {
        writeResult({ file, content }) {
          const absolutePath = path.isAbsolute(file)
            ? file
            : path.join(config.projectRoot, file);
          fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
          fs.writeFileSync(absolutePath, content, 'utf8');
          console.log(`[writeResult] -> ${absolutePath}`);
          return null;
        },
      });
      return config;
    },
  },
});
