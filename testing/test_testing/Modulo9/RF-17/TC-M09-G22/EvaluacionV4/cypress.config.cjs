// TC-M09-G22 V3 — Cypress verifica en la UI de TEST el umbral REAL creado por Newman.
// Nunca crea configuraciones. Toda salida queda en RESULTADOS/<run>/cypress/.
// ELECTRON_RUN_AS_NODE debe estar AUSENTE al invocar Cypress.
const { defineConfig } = require('cypress');
const path = require('path');
const fs = require('fs');
const { FRONT, BASE, ACTOR, CASOS, clean } = require('./helpers.cjs');

const caso = process.env.G22_CASE;
const runId = process.env.G22_REEVAL_V4_RUN_ID;
const recorrido = process.env.G22_RECORRIDO;
if (!CASOS.includes(caso)) throw Error('G22_CASE requerido');
if (!runId || !/^[\w-]+$/.test(runId)) throw Error('G22_REEVAL_V4_RUN_ID requerido');
if (!recorrido || !/^recorrido[12]$/.test(recorrido)) throw Error('G22_RECORRIDO debe ser recorrido1 o recorrido2');
if (!process.env.TEST_ADMIN_PASSWORD) throw Error('TEST_ADMIN_PASSWORD requerida');

const evid = path.join(__dirname, 'Resultados', runId);
const cyDir = path.join(evid, 'cypress', caso, recorrido);
if (fs.existsSync(cyDir)) throw Error('Recorrido ya utilizado para este caso: no se sobrescribe');
const intentos = fs.existsSync(evid) ? fs.readdirSync(evid).filter((f) => new RegExp(`^${caso}-v4-intento1\\.json$`).test(f)).sort() : [];
if (!intentos.length) throw Error(`Falta la evidencia Newman de ${caso}`);
const ultimo = JSON.parse(fs.readFileSync(path.join(evid, intentos[intentos.length - 1]), 'utf8'));

module.exports = defineConfig({
  video: false, screenshotOnRunFailure: true, trashAssetsBeforeRuns: false,
  screenshotsFolder: path.join(cyDir, 'screenshots'), downloadsFolder: path.join(cyDir, 'downloads'), fixturesFolder: false,
  viewportWidth: 1920, viewportHeight: 1200, retries: 0,
  defaultCommandTimeout: 15000, requestTimeout: 25000, responseTimeout: 30000,
  env: {
    caso, runId, recorrido, api: BASE, email: ACTOR, password: process.env.TEST_ADMIN_PASSWORD,
    // El backend respondio 500 por el flujo alterno de sincronizacion Edge habiendo guardado
    // el registro, asi que la respuesta no trae id. Cypress verifica el umbral REALMENTE
    // persistido, localizado por GET: no se relaja nada, se apunta al dato correcto.
    evidencia: (() => {
      const complemento = (() => {
        const f = path.join(evid, `${caso}-v4-persistencia-pese-a-500.json`);
        return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null;
      })();
      const persistido = ultimo.persistencia?.detalle || complemento?.detalle || null;
      const id = ultimo.idCreado ?? ultimo.persistencia?.idPersistido ?? complemento?.idPersistido ?? null;
      if (!persistido || typeof id !== 'number') throw Error(`Falta el umbral persistido de ${caso}`);
      return { especie: ultimo.especie, variable: ultimo.variable, idCreado: id, status: ultimo.status,
        errorCode: ultimo.errorCode, persistido };
    })(),
  },
  e2e: {
    baseUrl: FRONT, specPattern: 'tc-m09-g22-reevaluacion-v4.cy.ts', supportFile: false,
    setupNodeEvents(on) {
      on('task', {
        evidenciaUi(datos) {
          fs.mkdirSync(cyDir, { recursive: true });
          fs.writeFileSync(path.join(cyDir, `ui-${caso}.json`), clean(JSON.stringify({ grupo: 'TC-M09-G22', tipo: 'REEVALUACION V4', caso, recorrido, fecha: new Date().toISOString(), ...datos }, null, 2)));
          return null;
        },
      });
      on('after:run', (r) => {
        fs.mkdirSync(cyDir, { recursive: true });
        fs.writeFileSync(path.join(cyDir, `cypress-${caso}.json`), clean(JSON.stringify({
          caso, recorrido, estado: r.totalFailed === 0 && r.totalPassed === 1 ? 'PASS' : 'FAIL',
          tests: r.totalTests, passed: r.totalPassed, failed: r.totalFailed,
          browser: r.browserName, browserVersion: r.browserVersion, cypressVersion: r.cypressVersion,
          runs: r.runs?.map((x) => ({ spec: x.spec.name,
            screenshots: x.screenshots.map((s) => ({ path: path.relative(evid, s.path).split(path.sep).join('/'), testFailure: s.testFailure })),
            tests: x.tests.map((t) => ({ title: t.title, state: t.state, errors: [t.displayError, ...t.attempts.map((a) => a.error?.message)].filter(Boolean) })) })),
        }, null, 2)));
      });
    },
  },
});
