const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5174', // ← cambia esto si tu app corre en otro puerto
    specPattern: '*.cy.ts',
    supportFile: false,
    screenshotsFolder: 'RESULTADOS/screenshots',
    videosFolder: 'RESULTADOS/videos',
    video: true,
    screenshotOnRunFailure: true,
  },
});