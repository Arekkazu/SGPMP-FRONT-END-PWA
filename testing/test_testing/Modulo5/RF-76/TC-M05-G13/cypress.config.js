// | Fecha      | Nombre                    | Que se hizo                                                   |
// |------------|---------------------------|---------------------------------------------------------------|
// | 2026-11-06 | Juan Sebastian Gutierrez  | TC-M05-G13 RF-76: config Cypress con sandbox y .env.test       |
// | 2026-11-06 | Juan Sebastian Gutierrez  | TC-M05-G13 RF-76: host unico resuelto (CYPRESS_API_BASE_URL)  |
// | 2026-11-06 | Juan Sebastian Gutierrez  | TC-M05-G13 RF-76: soporte CYPRESS_APP_BASE_PATH y prefijo app |
// | 2026-11-12 | Juan Sebastian Gutierrez  | TC-M05-G13 RF-76: task appendTrace para trazas_http.jsonl (A6) |
// | 2026-11-12 | Juan Sebastian Gutierrez  | D1-D2: retries 0 en el archivo y carpetas de capturas/videos al staging desde setupNodeEvents |
// TC-M05-G13 · RF-76 · CU03 – Registro de aplicación de medicamento según modalidad.
//
// Reglas de este archivo:
// - Credenciales, secreto del sandbox y URLs salen SOLO de variables de entorno
//   (.env.test de la raíz del repo, cargado con dotenv como testing/playwright.config.ts).
//   No hay valores por defecto: si falta algo, la corrida aborta aquí, antes de cualquier login.
// - Zona horaria fija America/Bogota (también en el script npm) para que la fecha por
//   defecto del formulario, X-Zona-Horaria y el cálculo de hoy+N coincidan.
const { defineConfig } = require('cypress');
const { writeFileSync, appendFileSync, mkdirSync, existsSync } = require('fs');
const { dirname, resolve } = require('path');

const ZONA_HORARIA = 'America/Bogota';
process.env.TZ = ZONA_HORARIA;

// Variable de proceso directa (tiene prioridad máxima y no puede ser pisada por dotenv):
const envApiUrlProc = (process.env.CYPRESS_API_BASE_URL || '').trim();

// Variable de proceso para ruta base de la app (por defecto vacía; ej. "/sigab-test"):
let appBasePath = (process.env.CYPRESS_APP_BASE_PATH || '').trim();
if (appBasePath) {
  if (!appBasePath.startsWith('/')) appBasePath = '/' + appBasePath;
  appBasePath = appBasePath.replace(/\/+$/, '');
}

// Mecanismo existente en el repo: dotenv sobre .env.test. Primero el .env.test local del
// caso (si alguien lo crea), luego el de la raíz del repo. dotenv no pisa variables ya
// definidas en el entorno, así que lo que venga del shell/CI manda.
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
const VET_EMAIL = leer('VET_EMAIL');
const VET_PASSWORD = leer('VET_PASSWORD');
const SANDBOX_SECRET = leer('TEST_SANDBOX_SECRET');

let apiHost = '';
try {
  apiHost = new URL(API_URL).host;
} catch {
  apiHost = API_URL;
}
console.log(`[TC-M05-G13] API HOST resuelto: ${apiHost}`);
console.log(`[TC-M05-G13] APP BASE PATH: ${appBasePath}`);

const faltantes = [];
if (!FRONT_URL) faltantes.push('CYPRESS_BASE_URL (o FRONT_BASE_URL / BASE_URL)');
if (!API_URL) faltantes.push('CYPRESS_API_BASE_URL (o VITE_API_BASE_URL)');
if (!VET_EMAIL) faltantes.push('VET_EMAIL');
if (!VET_PASSWORD) faltantes.push('VET_PASSWORD');
if (!SANDBOX_SECRET) faltantes.push('TEST_SANDBOX_SECRET');
if (faltantes.length) {
  throw new Error(
    `[TC-M05-G13] Faltan variables de entorno: ${faltantes.join(', ')}. ` +
      'Defínelas en .env.test (raíz del repo) o en el entorno. La corrida se aborta antes del login.',
  );
}

const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(:|\/|$)/i;
if (LOCAL.test(FRONT_URL) || LOCAL.test(API_URL)) {
  throw new Error('[TC-M05-G13] Las URLs apuntan a localhost: este caso solo corre contra el ambiente TEST oficial.');
}

module.exports = defineConfig({
  e2e: {
    baseUrl: FRONT_URL,
    env: {
      API_BASE_URL: API_URL,
      APP_BASE_PATH: appBasePath,
      VET_EMAIL,
      VET_PASSWORD,
      TEST_SANDBOX_SECRET: SANDBOX_SECRET,
      ZONA_HORARIA,
    },

    specPattern: '*.cy.ts',
    supportFile: 'commands.ts',
    fixturesFolder: false,

    viewportWidth: 1280,
    viewportHeight: 900,
    defaultCommandTimeout: 15000,
    requestTimeout: 30000,
    responseTimeout: 60000,
    pageLoadTimeout: 120000,

    // Un solo navegador y una sola sesión: los it() comparten la página y el JWT
    // en memoria (la SPA no lo persiste), así que no se aísla entre pruebas.
    testIsolation: false,
    retries: { runMode: 0, openMode: 0 },
    numTestsKeptInMemory: 0,

    modifyObstructiveCode: false,
    blockHosts: ['*.googleapis.com', '*.gstatic.com', '*.firebaseio.com', '*.google.com'],

    video: false,
    videosFolder: 'evidencias/videos',
    screenshotsFolder: 'evidencias/screenshots',
    // Las capturas automáticas al fallar podrían retratar la pantalla de login con el
    // correo escrito; las evidencias se toman de forma explícita después del login.
    screenshotOnRunFailure: false,
    trashAssetsBeforeRuns: true,

    setupNodeEvents(on, config) {
      on('before:browser:launch', (browser, launchOptions) => {
        // Linux/Docker respeta TZ; en Windows el spec fuerza la zona por CDP.
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
        appendTrace({ file, line }) {
          const abs = resolve(config.projectRoot || __dirname, file);
          mkdirSync(dirname(abs), { recursive: true });
          appendFileSync(abs, line + '\n', 'utf8');
          return null;
        },
      });
      if (process.env.CYPRESS_STAGING_DIR && process.env.CYPRESS_STAGING_DIR.trim()) {
        const stg = process.env.CYPRESS_STAGING_DIR.trim();
        config.screenshotsFolder = resolve(stg, 'screenshots');
        config.videosFolder = resolve(stg, 'videos');
      }
      return config;
    },
  },
});
