import newman from 'newman';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const collectionPath = path.join(__dirname, 'TC-M02-G24.postman_collection.json');
const resultadosDir = path.join(__dirname, '..', 'RESULTADOS', 'TC-M02-G24');

if (!fs.existsSync(resultadosDir)) {
  fs.mkdirSync(resultadosDir, { recursive: true });
}

console.log('=== EJECUTANDO COLECCIÓN POSTMAN TC-M02-G24 VÍA NEWMAN CLI ===');

newman.run({
  collection: collectionPath,
  reporters: 'cli'
}, function (err, summary) {
  if (err) {
    console.error('Newman error execution:', err);
  }

  const executions = summary ? (summary.run.executions || []) : [];
  const logRequests = [];
  const checkpoints = [];

  executions.forEach(exec => {
    const name = exec.item.name;
    const response = exec.response;
    const statusCode = response ? response.code : 0;
    const statusText = response ? response.status : 'NO_RESPONSE';
    const responseBody = response ? response.stream.toString() : '';

    logRequests.push(`${name} -> HTTP ${statusCode} (${statusText})\nResponse: ${responseBody.substring(0, 300)}`);

    const assertions = exec.assertions || [];
    assertions.forEach(assertion => {
      const assertionName = assertion.assertion;
      const error = assertion.error;
      const isOk = !error;

      checkpoints.push({
        paso: `${name} — ${assertionName}`,
        esperado: 'Comprobación de contrato / regla de negocio',
        obtenido: isOk ? `HTTP ${statusCode} ${statusText}` : `Falla: ${error ? (error.message || error) : 'Sin error'}`,
        estado: isOk ? 'OK' : 'FALLA'
      });
    });
  });

  const hayFallas = checkpoints.some(c => c.estado === 'FALLA');
  const veredicto = hayFallas ? '⚠️ CON FALLAS (Verificar hallazgos de backend)' : '✅ SIN FALLAS';

  const resultadoData = {
    caso: 'TC-M02-G24',
    titulo: 'Gestión Poblacional - Ficha UI (Cypress), Crecimiento, Baja, Inmutabilidad (Postman/Newman)',
    cu: 'CU03',
    rf: 'RF-36 / RF-33 / RF-37 / RF-39',
    ambiente: 'https://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io',
    backend: 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test',
    navegador: 'chrome 152.0.7977.76 / Newman CLI',
    fecha: new Date().toISOString(),
    peticionInfo: logRequests.join('\n\n'),
    checkpoints: checkpoints,
    veredicto: veredicto
  };

  const jsonResultPath = path.join(resultadosDir, 'TC-M02-G24_postman_resultado.json');
  fs.writeFileSync(jsonResultPath, JSON.stringify(resultadoData, null, 2), 'utf8');
  console.log(`\nResultados Postman JSON guardados en: ${jsonResultPath}`);
});
