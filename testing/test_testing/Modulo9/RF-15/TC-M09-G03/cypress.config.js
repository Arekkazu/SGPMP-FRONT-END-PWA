const { defineConfig } = require('cypress');
const { writeFileSync, mkdirSync, existsSync, readFileSync } = require('fs');
const { dirname, resolve } = require('path');

// TC-M09-G03 · CU-01 – Gestionar Catálogo de Especies Productivas (RF-15 · Frontend & QA)

function cargarEnvTest() {
  const rutas = [
    resolve(__dirname, '.env.test'),
    resolve(__dirname, '../../../../.env.test'),
    resolve(__dirname, '../../../../../.env.test'),
  ];
  for (const envPath of rutas) {
    if (existsSync(envPath)) {
      try {
        const lineas = readFileSync(envPath, 'utf8').split('\n');
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
let defaultBaseUrl = 'https://api.inmero.co';
let defaultApiUrl = 'https://api.inmero.co/back-sigab-test';

if (target === 'DEV') {
  defaultBaseUrl = 'https://dev.inmero.co';
  defaultApiUrl = 'https://api.inmero.co/back-sigab-dev';
}

const baseUrl = process.env.CYPRESS_BASE_URL || defaultBaseUrl;
const apiUrl = process.env.CYPRESS_API_BASE_URL || defaultApiUrl;
const adminEmail = process.env.ADMIN_EMAIL || 'administador.dev@gmail.com';
const adminPassword = process.env.TEST_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'Test1234!';

module.exports = defineConfig({
  e2e: {
    baseUrl,
    env: {
      ENV_TARGET: target,
      API_BASE_URL: apiUrl,
      ADMIN_EMAIL: adminEmail,
      TEST_ADMIN_PASSWORD: adminPassword,
    },

    specPattern: '*.cy.ts',
    supportFile: resolve(__dirname, 'commands.ts'),
    fixturesFolder: false,

    viewportWidth: 1280,
    viewportHeight: 900,
    defaultCommandTimeout: 12000,
    pageLoadTimeout: 120000,
    modifyObstructiveCode: false,

    numTestsKeptInMemory: 1,
    retries: { runMode: 0, openMode: 0 },
    workers: 1,

    blockHosts: ['*.googleapis.com', '*.gstatic.com', '*.firebaseio.com'],

    video: true,
    videosFolder: 'evidencias/videos',
    screenshotsFolder: 'evidencias/screenshots',
    trashAssetsBeforeRuns: true,

    setupNodeEvents(on, config) {
      on('task', {
        writeResult({ file, content }) {
          const abs = resolve(config.projectRoot ?? process.cwd(), file);
          mkdirSync(dirname(abs), { recursive: true });
          writeFileSync(abs, content, 'utf8');
          console.log('  [writeResult] ->', abs);
          return abs;
        },
      });
      return config;
    },
  },
});
