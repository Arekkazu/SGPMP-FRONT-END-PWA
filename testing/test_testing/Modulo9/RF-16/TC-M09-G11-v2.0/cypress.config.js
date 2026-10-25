const { defineConfig } = require('cypress');
const { writeFileSync, mkdirSync, existsSync, readFileSync } = require('fs');
const { dirname, resolve } = require('path');

function cargarEnvTest() {
  const rutas = [
    resolve(__dirname, '.env.test'),
    resolve(__dirname, '../../../../.env.test'),
    resolve(__dirname, '../../../../../.env.test'),
  ];
  for (const envPath of rutas) {
    if (existsSync(envPath)) {
      try {
        const lineas = readFileSync(envPath, 'utf8').split(/\r?\n/);
        for (const l of lineas) {
          const linea = l.trim();
          if (linea && !linea.startsWith('#')) {
            const idx = linea.indexOf('=');
            if (idx !== -1) {
              const key = linea.substring(0, idx).trim();
              const val = linea.substring(idx + 1).trim();
              if (!process.env[key]) {
                process.env[key] = val;
              }
            }
          }
        }
      } catch (_) {}
    }
  }
}

cargarEnvTest();

const target = (process.env.ENV_TARGET || 'TEST').toUpperCase();
const defaultBaseUrl = target === 'DEV' ? 'https://dev.inmero.co' : 'https://api.inmero.co';
const defaultApiUrl = target === 'DEV' ? 'https://api.inmero.co/back-sigab-dev' : 'https://api.inmero.co/back-sigab-test';

module.exports = defineConfig({
  e2e: {
    baseUrl: process.env.BASE_URL || process.env.CYPRESS_BASE_URL || defaultBaseUrl,
    env: {
      API_BASE_URL: process.env.API_BASE_URL || process.env.CYPRESS_API_BASE_URL || defaultApiUrl,
      ADMIN_EMAIL: process.env.ADMIN_EMAIL,
      TEST_ADMIN_PASSWORD: process.env.TEST_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD,
    },
    workers: 1,
    specPattern: resolve(__dirname, '*.cy.ts'),
    supportFile: resolve(__dirname, 'commands.ts'),
    fixturesFolder: false,
    viewportWidth: 1280,
    viewportHeight: 900,
    defaultCommandTimeout: 15000,
    pageLoadTimeout: 120000,
    retries: { runMode: 0, openMode: 0 },
    blockHosts: ['*.googleapis.com', '*.gstatic.com', '*.firebaseio.com'],
    video: false,
    screenshotsFolder: resolve(__dirname, 'evidencias/screenshots'),
    trashAssetsBeforeRuns: true,
    setupNodeEvents(on, config) {
      on('task', {
        writeResult({ file, content }) {
          const abs = resolve(__dirname, file);
          mkdirSync(dirname(abs), { recursive: true });
          writeFileSync(abs, content, 'utf8');
          return abs;
        },
        readResult({ file }) {
          const abs = resolve(__dirname, file);
          if (existsSync(abs)) {
            return readFileSync(abs, 'utf8');
          }
          return null;
        },
      });
      return config;
    },
  },
});
