const { defineConfig } = require('cypress');
const { writeFileSync, mkdirSync, existsSync, readFileSync } = require('fs');
const { dirname, resolve } = require('path');

// Carga resiliente de variables de entorno desde .env.test local
const envPath = resolve(__dirname, '.env.test');
if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const value = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

// Opcional: si dotenv está presente en el ecosistema, sincronizar también
try {
  require('dotenv').config({ path: envPath });
} catch (_) {
  // Parser nativo previo ya aplicó las variables
}

// TC-M09-G07 · CU-01 – Sincronización offline y conflicto de nombres de especie (RF-15 · Frontend & Backend QA)
module.exports = defineConfig({
  e2e: {
    baseUrl:
      process.env.BASE_URL ||
      process.env.CYPRESS_BASE_URL ||
      'https://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io',

    env: {
      API_BASE_URL:
        process.env.API_BASE_URL ||
        process.env.CYPRESS_API_BASE_URL ||
        'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test',
      ADMIN_EMAIL: process.env.ADMIN_EMAIL,
      TEST_ADMIN_PASSWORD: process.env.TEST_ADMIN_PASSWORD,
    },

    specPattern: 'cypress/**/*.cy.ts',
    supportFile: 'commands.ts',
    fixturesFolder: false,

    viewportWidth: 1280,
    viewportHeight: 900,
    defaultCommandTimeout: 15000,

    pageLoadTimeout: 180000,
    modifyObstructiveCode: false,
    // retries: 2 — máximo permitido por R14.3
    retries: { runMode: 2, openMode: 0 },

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
