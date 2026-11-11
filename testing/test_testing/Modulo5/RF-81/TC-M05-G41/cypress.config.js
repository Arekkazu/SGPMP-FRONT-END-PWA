// TC-M05-G41 · RF-81 · Consulta del historial de suministros por activo.
//
// Copiado del patrón de TC-M05-G13:
// - Credenciales (GESTOR_GRANJA_EMAIL / GESTOR_GRANJA_PASSWORD), secreto del sandbox y URLs
//   salen SOLO de variables de entorno (.env.test de la raíz del repo, cargado con dotenv).
// - Zona horaria fija America/Bogota.
const { defineConfig } = require('cypress');
const { writeFileSync, mkdirSync, existsSync } = require('fs');
const { dirname, resolve } = require('path');

const ZONA_HORARIA = 'America/Bogota';
process.env.TZ = ZONA_HORARIA;

// Variable de proceso directa (tiene prioridad máxima y no puede ser pisada por dotenv):
const envApiUrlProc = (process.env.CYPRESS_API_BASE_URL || '').trim();

// Variable de proceso para ruta base de la app (por ejemplo "/sigab-test"):
let appBasePath = (process.env.CYPRESS_APP_BASE_PATH || '').trim();
if (appBasePath) {
  if (!appBasePath.startsWith('/')) appBasePath = '/' + appBasePath;
  appBasePath = appBasePath.replace(/\/+$/, '');
}

const ENV_LOCAL = resolve(__dirname, '.env.test');
const ENV_RAIZ = resolve(__dirname, '../../../../../.env.test');
const dotenv = require('dotenv');
for (const ruta of [ENV_LOCAL, ENV_RAIZ]) {
  if (existsSync(ruta)) dotenv.config({ path: ruta, quiet: true });
}

/** Primer valor no vacío entre los nombres de variable que ya usa el repo. */
function leer(...nombres) {
  for (const n of nombres) {
    const v = (process.env[n] || '').trim();
    if (v) return v;
  }
  return '';
}

const FRONT_URL = leer('CYPRESS_BASE_URL', 'FRONT_BASE_URL', 'BASE_URL');
const API_URL = (envApiUrlProc || leer('CYPRESS_API_BASE_URL', 'VITE_API_BASE_URL')).replace(/\/+$/, '');
const GESTOR_GRANJA_EMAIL = leer('GESTOR_GRANJA_EMAIL');
const GESTOR_GRANJA_PASSWORD = leer('GESTOR_GRANJA_PASSWORD');
const SANDBOX_SECRET = leer('TEST_SANDBOX_SECRET');
const G41_MODO_RAW = (process.env.G41_MODO || 'ensayo').trim().toLowerCase();
const G41_MODO = G41_MODO_RAW === 'oficial' ? 'oficial' : 'ensayo';

let apiHost = '';
try {
  apiHost = new URL(API_URL).host;
} catch {
  apiHost = API_URL;
}
console.log(`[TC-M05-G41] MODO: ${G41_MODO}`);
console.log(`[TC-M05-G41] API HOST resuelto: ${apiHost}`);
console.log(`[TC-M05-G41] APP BASE PATH: ${appBasePath}`);
console.log(`[TC-M05-G41] GESTOR_GRANJA_EMAIL definida=${Boolean(GESTOR_GRANJA_EMAIL)} (len=${GESTOR_GRANJA_EMAIL.length})`);
console.log(`[TC-M05-G41] GESTOR_GRANJA_PASSWORD definida=${Boolean(GESTOR_GRANJA_PASSWORD)} (len=${GESTOR_GRANJA_PASSWORD.length})`);
console.log(`[TC-M05-G41] TEST_SANDBOX_SECRET definida=${Boolean(SANDBOX_SECRET)} (len=${SANDBOX_SECRET.length})`);

const faltantes = [];
if (!FRONT_URL) faltantes.push('CYPRESS_BASE_URL (o FRONT_BASE_URL / BASE_URL)');
if (!API_URL) faltantes.push('CYPRESS_API_BASE_URL (o VITE_API_BASE_URL)');
if (!GESTOR_GRANJA_EMAIL) faltantes.push('GESTOR_GRANJA_EMAIL');
if (!GESTOR_GRANJA_PASSWORD) faltantes.push('GESTOR_GRANJA_PASSWORD');
if (!SANDBOX_SECRET) faltantes.push('TEST_SANDBOX_SECRET');
if (faltantes.length) {
  throw new Error(
    `[TC-M05-G41] Faltan variables de entorno: ${faltantes.join(', ')}. ` +
      'Defínelas en .env.test (raíz del repo) o en el entorno. La corrida se aborta antes del login.',
  );
}

const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(:|\/|$)/i;
if (LOCAL.test(FRONT_URL) || LOCAL.test(API_URL)) {
  throw new Error('[TC-M05-G41] Las URLs apuntan a localhost: este caso solo corre contra el ambiente TEST oficial.');
}

module.exports = defineConfig({
  e2e: {
    baseUrl: FRONT_URL,
    env: {
      API_BASE_URL: API_URL,
      APP_BASE_PATH: appBasePath,
      GESTOR_GRANJA_EMAIL,
      GESTOR_GRANJA_PASSWORD,
      TEST_SANDBOX_SECRET: SANDBOX_SECRET,
      ZONA_HORARIA,
      G41_MODO,
    },

    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    fixturesFolder: false,

    viewportWidth: 1280,
    viewportHeight: 900,
    defaultCommandTimeout: 15000,
    requestTimeout: 30000,
    responseTimeout: 60000,
    pageLoadTimeout: 120000,

    // Un solo navegador y una sola sesión para conservar la sesión entre pruebas.
    testIsolation: false,
    retries: { runMode: 0, openMode: 0 },
    numTestsKeptInMemory: 0,

    modifyObstructiveCode: false,
    blockHosts: ['*.googleapis.com', '*.gstatic.com', '*.firebaseio.com', '*.google.com'],

    video: false,
    videosFolder: 'evidencias/videos',
    screenshotsFolder: 'evidencias/screenshots',
    screenshotOnRunFailure: false,
    trashAssetsBeforeRuns: true,

    setupNodeEvents(on, config) {
      on('before:browser:launch', (browser, launchOptions) => {
        launchOptions.env = { ...(launchOptions.env || {}), TZ: ZONA_HORARIA };
        return launchOptions;
      });
      on('task', {
        writeResult({ file, content }) {
          const abs = resolve(config.projectRoot || __dirname, file);
          mkdirSync(dirname(abs), { recursive: true });
          writeFileSync(abs, content, 'utf8');
          console.log('  [writeResult] ->', abs);
          return abs;
        },
        fileExists(file) {
          const abs = resolve(config.projectRoot || __dirname, file);
          return existsSync(abs);
        },
        nextEnsayoFile() {
          const dir = resolve(config.projectRoot || __dirname, 'evidencias/ensayo');
          mkdirSync(dir, { recursive: true });
          for (let n = 1; n <= 99; n += 1) {
            const rel = `evidencias/ensayo/resultado_ensayo_run${n}.json`;
            if (!existsSync(resolve(config.projectRoot || __dirname, rel))) {
              return rel;
            }
          }
          return `evidencias/ensayo/resultado_ensayo_run${Date.now()}.json`;
        },
      });
      return config;
    },
  },
});
