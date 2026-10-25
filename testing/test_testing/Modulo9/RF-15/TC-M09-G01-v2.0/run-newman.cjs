const newman = require('newman');
const { resolve, dirname } = require('path');
const { mkdirSync, existsSync, readFileSync, writeFileSync, unlinkSync, readdirSync } = require('fs');

// Carga opcional de .env.test si existe en la raíz
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

const apiUrl = process.env.CYPRESS_API_BASE_URL || defaultApiUrl;
const adminEmail = process.env.ADMIN_EMAIL || '';
const adminPassword = process.env.TEST_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || '';

if (!adminEmail || !adminPassword) {
  console.error('[run-newman] Error: Faltan variables de entorno ADMIN_EMAIL o TEST_ADMIN_PASSWORD.');
  process.exit(1);
}

const collectionPath = resolve(__dirname, 'tc-m09-g01-v2.0.postman_collection.json');
const evidenciasDir = resolve(__dirname, 'evidencias');
mkdirSync(evidenciasDir, { recursive: true });

const rawJsonPath = resolve(evidenciasDir, 'newman_raw.json');
const htmlReportPath = resolve(evidenciasDir, 'newman_report.html');

console.log('[run-newman] Ejecutando colección Postman...');
console.log(`  API Target: ${apiUrl}`);
console.log(`  Usuario:    ${adminEmail}`);

newman.run(
  {
    collection: collectionPath,
    environment: {
      id: 'env-sgpmp',
      name: 'Entorno Temporal',
      values: [
        { key: 'api_url', value: apiUrl, enabled: true },
        { key: 'admin_email', value: adminEmail, enabled: true },
        { key: 'admin_password', value: adminPassword, enabled: true },
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

    // A2d: Construir evidencias/newman_raw.json con SOLO la forma mínima estipulada:
    // { executions: [ { item: nombre, codigo: statusCode, assertions: [{ assertion, error: mensaje|null }] } ] }
    // Prohibido incluir request, response, headers, body, environment, globals o cookies.
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
    console.log(`  [run-newman] newman_raw.json mínimo generado en: ${rawJsonPath}`);

    // Registrar teardown id residual si existe (solo ID, nunca tokens)
    try {
      const createdId = summary.environment.get('created_especie_id');
      if (createdId) {
        const teardownData = {
          id_residual: createdId,
          fecha: new Date().toISOString(),
          herramienta: 'newman',
        };
        writeFileSync(
          resolve(evidenciasDir, 'teardown_newman.json'),
          JSON.stringify(teardownData, null, 2),
          'utf8'
        );
      }
    } catch (_) {}

    // Auditoría de seguridad obligatoria sobre evidencias/
    // Si encuentra contraseña, patrón eyJ o "Bearer ", borrar el archivo y reportar
    try {
      const archivos = readdirSync(evidenciasDir);
      for (const archivo of archivos) {
        const fullPath = resolve(evidenciasDir, archivo);
        if (archivo.endsWith('.json') || archivo.endsWith('.txt') || archivo.endsWith('.html')) {
          const contenido = readFileSync(fullPath, 'utf8');
          const tienePassword = adminPassword && contenido.includes(adminPassword);
          const tieneEyJ = /eyJ[a-zA-Z0-9_-]+\.eyJ/i.test(contenido);
          const tieneBearer = /Bearer\s+/i.test(contenido);

          if (tienePassword || tieneEyJ || tieneBearer) {
            unlinkSync(fullPath);
            console.error(`[run-newman] ALERTA DE SEGURIDAD: Fuga detectada en ${archivo}. Archivo eliminado.`);
          }
        }
      }
    } catch (e) {
      console.error('[run-newman] Error en auditoría de seguridad post-ejecución:', e);
    }

    console.log(`[run-newman] Finalizado exitosamente.`);
    if (summary.run.failures && summary.run.failures.length > 0) {
      console.warn(`[run-newman] Se registraron ${summary.run.failures.length} fallos en aserciones.`);
    }
  }
);
