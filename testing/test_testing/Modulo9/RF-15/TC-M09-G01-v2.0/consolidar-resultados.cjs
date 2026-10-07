const { resolve } = require('path');
const { existsSync, readFileSync, writeFileSync, mkdirSync } = require('fs');

const evidenciasDir = resolve(__dirname, 'evidencias');
const resultadosDir = resolve(__dirname, 'resultados');
const cypressCheckpointsPath = resolve(evidenciasDir, 'cypress_checkpoints.json');
const newmanRawPath = resolve(evidenciasDir, 'newman_raw.json');
const salidaResultadosPath = resolve(resultadosDir, 'resultado_TC-M09-G01-v2.0.json');

console.log('[consolidar] Iniciando consolidación de reportes...');

if (!existsSync(cypressCheckpointsPath)) {
  console.error(`[consolidar] Error: No existe el archivo de checkpoints de Cypress: ${cypressCheckpointsPath}`);
  console.error('[consolidar] Abortando consolidación sin escribir nada.');
  process.exit(1);
}

if (!existsSync(newmanRawPath)) {
  console.error(`[consolidar] Error: No existe el reporte crudo de Newman: ${newmanRawPath}`);
  console.error('[consolidar] Abortando consolidación sin escribir nada.');
  process.exit(1);
}

let cypressChecks = [];
try {
  cypressChecks = JSON.parse(readFileSync(cypressCheckpointsPath, 'utf8'));
} catch (e) {
  console.error('[consolidar] Error al parsear cypress_checkpoints.json:', e);
  process.exit(1);
}

let newmanRaw = {};
try {
  newmanRaw = JSON.parse(readFileSync(newmanRawPath, 'utf8'));
} catch (e) {
  console.error('[consolidar] Error al parsear newman_raw.json:', e);
  process.exit(1);
}

// Procesar aserciones de Newman convirtiéndolas en formato checkpoint NW-0X
// Ignorar aserciones que no inicien con NW-0X (p. ej., "TD:") y registrarlas en evidencias/teardown_newman.json
const newmanChecks = [];
const teardownNewmanAssertions = [];
const executions = newmanRaw.executions || [];

for (const exec of executions) {
  const assertions = exec.assertions || [];
  for (const a of assertions) {
    const testName = a.assertion || '';

    // Si es teardown (TD:)
    if (testName.startsWith('TD:') || testName.startsWith('TD -')) {
      teardownNewmanAssertions.push({
        assertion: testName,
        error: a.error,
        estado: a.error ? 'FALLA' : 'OK',
      });
      continue;
    }

    // Extraer identificador NW-0X
    const match = testName.match(/^(NW-\d+):\s*(.*)/i);
    if (match) {
      const pasoId = match[1].toUpperCase();
      const desc = match[2];
      const error = a.error;
      const estado = error ? 'FALLA' : 'OK';
      const obtenido = error ? (typeof error === 'string' ? error : JSON.stringify(error)) : 'Aserción cumplida satisfactoriamente';

      newmanChecks.push({
        paso: pasoId,
        esperado: desc,
        obtenido,
        estado,
      });
    }
  }
}

// Si hubo aserciones TD:, actualizar evidencias/teardown_newman.json
if (teardownNewmanAssertions.length > 0) {
  try {
    const tdPath = resolve(evidenciasDir, 'teardown_newman.json');
    let tdPrevio = {};
    if (existsSync(tdPath)) {
      try { tdPrevio = JSON.parse(readFileSync(tdPath, 'utf8')); } catch (_) {}
    }
    tdPrevio.aserciones_teardown = teardownNewmanAssertions;
    writeFileSync(tdPath, JSON.stringify(tdPrevio, null, 2), 'utf8');
  } catch (e) {
    console.warn('[consolidar] No se pudo guardar aserciones en teardown_newman.json:', e.message);
  }
}

const allCheckpoints = [...cypressChecks, ...newmanChecks];

// A3b: Exigir exactamente CP-01..CP-10 y NW-01..NW-04
const requeridos = [
  'CP-01', 'CP-02', 'CP-03', 'CP-04', 'CP-05', 'CP-06', 'CP-07', 'CP-08', 'CP-09', 'CP-10',
  'NW-01', 'NW-02', 'NW-03', 'NW-04'
];

const presentes = allCheckpoints.map(c => c.paso.toUpperCase());
const faltantes = requeridos.filter(req => !presentes.includes(req));

if (faltantes.length > 0) {
  console.error(`[consolidar] ERROR FATAL: Faltan checkpoints requeridos: ${faltantes.join(', ')}`);
  console.error('[consolidar] Abortando consolidación sin escribir resultados/ para no generar reportes incompletos.');
  process.exit(1);
}

// Validación rigurosa de estados: SOLO 'OK' o 'FALLA'
for (const c of allCheckpoints) {
  if (c.estado !== 'OK' && c.estado !== 'FALLA') {
    console.error(`[consolidar] Estado inválido "${c.estado}" en checkpoint "${c.paso}". Solo se permite OK o FALLA.`);
    process.exit(1);
  }
}

mkdirSync(resultadosDir, { recursive: true });

const target = (process.env.ENV_TARGET || 'TEST').toUpperCase();
const ambiente = target === 'DEV' ? 'https://dev.inmero.co' : 'https://api.inmero.co';

const reporteFinal = {
  tc: 'TC-M09-G01-v2.0',
  ambiente,
  fecha: new Date().toISOString(),
  checkpoints: allCheckpoints,
};

writeFileSync(salidaResultadosPath, JSON.stringify(reporteFinal, null, 2), 'utf8');
console.log(`[consolidar] Éxito: Reporte consolidado generado en: ${salidaResultadosPath}`);
console.log(`  Total checkpoints Cypress: ${cypressChecks.length}`);
console.log(`  Total checkpoints Newman:  ${newmanChecks.length}`);
console.log(`  Total checkpoints final:   ${allCheckpoints.length}`);
