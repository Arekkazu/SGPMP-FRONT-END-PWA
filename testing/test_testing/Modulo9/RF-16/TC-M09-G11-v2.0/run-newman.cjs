const newman = require('newman');
const { resolve } = require('path');
const { mkdirSync, existsSync, readFileSync, writeFileSync, unlinkSync, readdirSync } = require('fs');

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
let defaultApiUrl = 'https://api.inmero.co/back-sigab-test';
if (target === 'DEV') {
  defaultApiUrl = 'https://api.inmero.co/back-sigab-dev';
}

const apiUrl = process.env.API_BASE_URL || defaultApiUrl;
const adminEmail = process.env.ADMIN_EMAIL || '';
const adminPassword = process.env.TEST_ADMIN_PASSWORD || '';

if (!adminEmail || !adminPassword) {
  console.error('[run-newman] Error: Faltan variables de entorno ADMIN_EMAIL o TEST_ADMIN_PASSWORD.');
  process.exit(1);
}

const evidenciasDir = resolve(__dirname, 'evidencias');
mkdirSync(evidenciasDir, { recursive: true });

// Generar run_id.txt fresco (solo letras mayúsculas) para evitar colisiones
const runIdFile = resolve(evidenciasDir, 'run_id.txt');
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
let runId = '';
for (let i = 0; i < 6; i++) {
  runId += chars.charAt(Math.floor(Math.random() * chars.length));
}
writeFileSync(runIdFile, runId, 'utf8');

const collectionPath = resolve(__dirname, 'tc-m09-g11-v2.0.postman_collection.json');
const rawJsonPath = resolve(evidenciasDir, 'newman_raw.json');
const htmlReportPath = resolve(evidenciasDir, 'newman_report.html');

console.log('[run-newman] Ejecutando colección Postman para TC-M09-G11-v2.0...');
console.log(`  API Target: ${apiUrl}`);
console.log(`  Usuario:    ${adminEmail}`);
console.log(`  Run ID:     ${runId}`);

newman.run(
  {
    collection: collectionPath,
    environment: {
      id: 'env-sgpmp',
      name: 'Entorno TC-M09-G11-v2.0',
      values: [
        { key: 'api_url', value: apiUrl, enabled: true },
        { key: 'admin_email', value: adminEmail, enabled: true },
        { key: 'admin_password', value: adminPassword, enabled: true },
        { key: 'run_id', value: runId, enabled: true },
      ],
    },
    reporters: ['cli', 'htmlextra'],
    reporter: {
      htmlextra: {
        export: htmlReportPath,
        skipSensitiveData: true,
        skipEnvironmentVars: true,
        skipGlobalVars: true,
        showOnlyFails: false,
      },
    },
  },
  function (err, summary) {
    if (err) {
      console.error('[run-newman] Error de ejecución en Newman:', err);
      process.exit(1);
    }

    const minimalExecutions = [];
    const executions = summary.run?.executions || [];

    for (const exec of executions) {
      const itemName = exec.item?.name || 'Request sin nombre';
      const statusCode = exec.response?.code || 0;
      const assertions = (exec.assertions || []).map((a) => ({
        assertion: a.assertion,
        error: a.error ? (a.error.message || String(a.error)) : null,
      }));

      minimalExecutions.push({
        item: itemName,
        codigo: statusCode,
        assertions,
      });
    }

    const minimalOutput = {
      executions: minimalExecutions,
    };

    writeFileSync(rawJsonPath, JSON.stringify(minimalOutput, null, 2), 'utf8');
    console.log(`  [run-newman] newman_raw.json generado en: ${rawJsonPath}`);

    // Auditoría de seguridad sobre evidencias y resultados
    try {
      for (const dir of [evidenciasDir, resolve(__dirname, 'resultados')]) {
        if (!existsSync(dir)) continue;
        for (const archivo of readdirSync(dir)) {
          const fullPath = resolve(dir, archivo);
          if (!/\.(json|txt|html)$/i.test(archivo)) continue;
          const contenido = readFileSync(fullPath, 'utf8');
          const tienePassword = adminPassword && contenido.includes(adminPassword);
          const tieneEyJ = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/.test(contenido);
          const tieneBearerReal = /Bearer\s+(?!\{\{)[A-Za-z0-9._-]{20,}/.test(contenido);

          if (tienePassword || tieneEyJ || tieneBearerReal) {
            unlinkSync(fullPath);
            console.error(`[run-newman] ALERTA: fuga real en ${fullPath}. Archivo eliminado.`);
          }
        }
      }
    } catch (e) {
      console.error('[run-newman] Error en auditoría de seguridad post-ejecución:', e);
    }

    console.log('[run-newman] Finalizado exitosamente.');
  }
);
