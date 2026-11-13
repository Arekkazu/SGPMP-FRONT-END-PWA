// | Fecha      | Nombre                    | Que se hizo                                                   |
// |------------|---------------------------|---------------------------------------------------------------|
// | 2026-11-06 | Juan Sebastian Gutierrez  | TC-M05-G23 RF-77: config Cypress con sandbox, PDF task y descargas |
// TC-M05-G23 · RF-77 · Reporte de gastos acumulados por activo y exportación PDF/CSV.
//
// Reglas de este archivo:
// - Credenciales de Administrador, secreto del sandbox y URLs salen SOLO de variables de entorno
//   (.env.test de la raíz del repo, cargado con dotenv).
//   No hay valores por defecto: si falta algo, la corrida aborta aquí, antes de cualquier login.
// - Zona horaria fija America/Bogota para sincronización de fechas.
const { defineConfig } = require('cypress');
const { writeFileSync, readFileSync, mkdirSync, existsSync, statSync } = require('fs');
const { dirname, resolve } = require('path');
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

const ZONA_HORARIA = 'America/Bogota';
process.env.TZ = ZONA_HORARIA;

// Variable de proceso directa (prioridad máxima):
const envApiUrlProc = (process.env.CYPRESS_API_BASE_URL || '').trim();

// Variable de proceso para ruta base de la app (ej. "/sigab-test"):
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

/** Primer valor no vacío entre los nombres de variable que usa el repo. */
function leer(...nombres) {
  for (const n of nombres) {
    const v = (process.env[n] || '').trim();
    if (v) return v;
  }
  return '';
}

const FRONT_URL = leer('CYPRESS_BASE_URL', 'FRONT_BASE_URL', 'BASE_URL');
const API_URL = (envApiUrlProc || leer('CYPRESS_API_BASE_URL', 'VITE_API_BASE_URL')).replace(/\/+$/, '');
const ADMIN_EMAIL = leer('CYPRESS_ADMIN_EMAIL', 'TEST_ADMIN_EMAIL', 'ADMIN_EMAIL');
const ADMIN_PASSWORD = leer('CYPRESS_ADMIN_PASSWORD', 'TEST_ADMIN_PASSWORD', 'ADMIN_PASSWORD');
const SANDBOX_SECRET = leer('TEST_SANDBOX_SECRET');

let apiHost = '';
try {
  apiHost = new URL(API_URL).host;
} catch {
  apiHost = API_URL;
}
console.log(`[TC-M05-G23] API HOST resuelto: ${apiHost}`);
console.log(`[TC-M05-G23] APP BASE PATH: ${appBasePath}`);

const faltantes = [];
if (!FRONT_URL) faltantes.push('CYPRESS_BASE_URL (o FRONT_BASE_URL / BASE_URL)');
if (!API_URL) faltantes.push('CYPRESS_API_BASE_URL (o VITE_API_BASE_URL)');
if (!ADMIN_EMAIL) faltantes.push('CYPRESS_ADMIN_EMAIL (o TEST_ADMIN_EMAIL / ADMIN_EMAIL)');
if (!ADMIN_PASSWORD) faltantes.push('CYPRESS_ADMIN_PASSWORD (o TEST_ADMIN_PASSWORD / ADMIN_PASSWORD)');
if (!SANDBOX_SECRET) faltantes.push('TEST_SANDBOX_SECRET');
if (faltantes.length) {
  throw new Error(
    `[TC-M05-G23] Faltan variables de entorno: ${faltantes.join(', ')}. ` +
      'Defínelas en .env.test o en el entorno. La corrida se aborta antes del login.',
  );
}

const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(:|\/|$)/i;
if (LOCAL.test(FRONT_URL) || LOCAL.test(API_URL)) {
  throw new Error('[TC-M05-G23] Las URLs apuntan a localhost: este caso solo corre contra el ambiente TEST oficial.');
}

const descargasDir = resolve(__dirname, 'evidencias/descargas');
if (!existsSync(descargasDir)) {
  mkdirSync(descargasDir, { recursive: true });
}

module.exports = defineConfig({
  e2e: {
    baseUrl: FRONT_URL,
    env: {
      API_BASE_URL: API_URL,
      APP_BASE_PATH: appBasePath,
      ADMIN_EMAIL,
      ADMIN_PASSWORD,
      TEST_SANDBOX_SECRET: SANDBOX_SECRET,
      ZONA_HORARIA,
    },

    specPattern: '*.cy.ts',
    supportFile: 'commands.ts',
    fixturesFolder: false,

    downloadsFolder: 'evidencias/descargas',
    viewportWidth: 1280,
    viewportHeight: 900,
    defaultCommandTimeout: 15000,
    requestTimeout: 30000,
    responseTimeout: 60000,
    pageLoadTimeout: 120000,

    testIsolation: false,
    retries: { runMode: 0, openMode: 0 },
    numTestsKeptInMemory: 0,

    modifyObstructiveCode: false,
    blockHosts: ['*.googleapis.com', '*.gstatic.com', '*.firebaseio.com', '*.google.com'],

    video: false,
    videosFolder: 'evidencias/videos',
    screenshotsFolder: 'evidencias/capturas',
    screenshotOnRunFailure: false,
    trashAssetsBeforeRuns: false,

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

        escribirReporte({ file, content }) {
          const abs = resolve(config.projectRoot || __dirname, file);
          mkdirSync(dirname(abs), { recursive: true });
          writeFileSync(abs, content, 'utf8');
          console.log('  [escribirReporte] ->', abs);
          return abs;
        },

        async esperarArchivo({ rutaArchivo, timeoutMs = 15000 }) {
          const abs = resolve(config.projectRoot || __dirname, rutaArchivo);
          const inicio = Date.now();
          while (Date.now() - inicio < timeoutMs) {
            if (existsSync(abs)) {
              try {
                const stat = statSync(abs);
                if (stat.size > 0) return { existe: true, tamano: stat.size, ruta: abs };
              } catch {}
            }
            await new Promise((r) => setTimeout(r, 200));
          }
          const existe = existsSync(abs);
          let tamano = 0;
          if (existe) {
            try { tamano = statSync(abs).size; } catch {}
          }
          return { existe, tamano, ruta: abs };
        },

        async leerPdf(rutaArchivo) {
          const abs = resolve(config.projectRoot || __dirname, rutaArchivo);
          if (!existsSync(abs)) {
            throw new Error(`[leerPdf] El archivo PDF no existe en la ruta: ${abs}`);
          }
          const buffer = readFileSync(abs);
          const data = await pdfParse(new Uint8Array(buffer));
          const bufferStr = buffer.toString('binary');
          const tieneImagen = bufferStr.includes('/Subtype /Image') || bufferStr.includes('/Subtype/Image');
          return {
            texto: data.text,
            paginas: data.numpages,
            tieneImagen,
            tamanoBytes: buffer.length,
          };
        },
      });

      return config;
    },
  },
});

