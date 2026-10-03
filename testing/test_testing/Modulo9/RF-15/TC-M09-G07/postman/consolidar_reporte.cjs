const fs = require('fs');
const path = require('path');

// Rutas relativas al TC
const dirEvidencias = path.resolve(__dirname, '..', 'evidencias');
const dirResultados = path.resolve(__dirname, '..', 'resultados');

// Encontrar la carpeta de evidencias V4 no descartada (v4-reeval-YYYYMMDD)
let subcarpetaV4 = null;
if (fs.existsSync(dirEvidencias)) {
  const dirs = fs
    .readdirSync(dirEvidencias)
    .filter((d) => d.startsWith('v4-reeval-') && !d.includes('descartada'));
  if (dirs.length > 0) {
    dirs.sort();
    subcarpetaV4 = dirs[dirs.length - 1];
  }
}

if (!subcarpetaV4) {
  console.error('BLOQUEADO: No se encontró carpeta de evidencias V4 válida en ' + dirEvidencias);
  process.exit(1);
}

const archivoPostman = path.join(dirEvidencias, subcarpetaV4, 'TC-M09-G07_postman_resultado.json');
const archivoCypress = path.join(dirEvidencias, subcarpetaV4, 'cypress_checkpoints.json');
const archivoSalida = path.join(dirResultados, 'resultado_TC-M09-G07_reintento3.json');

console.log('=== CONSOLIDADOR DE RESULTADOS TC-M09-G07 (V4 / REINTENTO 3) ===');
console.log('Postman JSON:', archivoPostman);
console.log('Cypress JSON:', archivoCypress);
console.log('Salida destino:', archivoSalida);

if (!fs.existsSync(archivoPostman)) {
  console.error(`BLOQUEADO: Archivo Postman no encontrado en ${archivoPostman}`);
  process.exit(1);
}

if (!fs.existsSync(archivoCypress)) {
  console.error(`BLOQUEADO: Archivo Cypress no encontrado en ${archivoCypress}`);
  process.exit(1);
}

const dataPostman = JSON.parse(fs.readFileSync(archivoPostman, 'utf8'));
const dataCypress = JSON.parse(fs.readFileSync(archivoCypress, 'utf8'));

// Validar que ambas salidas tengan checkpoints
const postmanExecs = dataPostman.run?.executions || [];
const cypressCPs = dataCypress.checkpoints || [];

if (postmanExecs.length === 0) {
  console.error('BLOQUEADO: Salida de Newman no contiene ejecuciones válidas.');
  process.exit(1);
}

if (cypressCPs.length === 0) {
  console.error('BLOQUEADO: Salida de Cypress no contiene checkpoints registrados.');
  process.exit(1);
}

// Validar que cypress_checkpoints contenga CP-0 y no esté en FALLA sin registrar precondición
const cp0 = cypressCPs.find((c) => c.paso.startsWith('CP-0'));
if (!cp0) {
  console.error('BLOQUEADO: CP-0 "Sesión autenticada en la UI" ausente en cypress_checkpoints.json.');
  process.exit(1);
}

// Lista requerida de pasos en Cypress
const pasosRequeridos = ['CP-0', 'CP-1', 'CP-2', 'CP-3a', 'CP-4', 'CP-4b', 'CP-5'];
for (const reqPaso of pasosRequeridos) {
  const existe = cypressCPs.some((c) => c.paso.startsWith(reqPaso));
  if (!existe) {
    console.error(`BLOQUEADO: Paso obligatorio ${reqPaso} ausente en los checkpoints de Cypress.`);
    process.exit(1);
  }
}

const checkpointsConsolidados = [];

// 1. Parsear ejecuciones de Postman / Newman
let reqIndex = 1;
for (const exec of postmanExecs) {
  const reqName = exec.item ? exec.item.name : `Request ${reqIndex}`;
  if (Array.isArray(exec.assertions)) {
    for (const assertion of exec.assertions) {
      const fallada = !!assertion.error;
      checkpointsConsolidados.push({
        paso: `NW-${reqIndex}: ${reqName} -> ${assertion.assertion}`,
        esperado: assertion.assertion || 'Aserción de API HTTP exitosa',
        obtenido: fallada ? `FALLA: ${assertion.error.message || 'Error de aserción'}` : 'Aserción evaluada OK en backend',
        estado: fallada ? 'FALLA' : 'OK',
      });
    }
  }
  reqIndex++;
}

// 2. Incorporar checkpoints de Cypress
for (const cp of cypressCPs) {
  checkpointsConsolidados.push({
    paso: cp.paso,
    esperado: cp.esperado,
    obtenido: cp.obtenido,
    estado: cp.estado === 'OK' ? 'OK' : 'FALLA',
  });
}

const hayFallas = checkpointsConsolidados.some((c) => c.estado === 'FALLA');
const totalOK = checkpointsConsolidados.filter((c) => c.estado === 'OK').length;
const veredictoCalculado = (checkpointsConsolidados.length === 0 || hayFallas) ? 'RECHAZADO' : 'APROBADO';

const resultadoFinal = {
  tc: 'TC-M09-G07',
  rf: 'RF-15',
  issue: 'INC-M09-54-G07',
  fecha: new Date().toISOString().slice(0, 10),
  entorno: 'TEST',
  caso: 'TC-M09-G07',
  titulo: 'CU-01 - Sincronización offline y conflicto de nombres de especie (RF-15)',
  cu: 'CU-01 - Gestionar Catálogo de Especies Productivas',
  tipo: 'Funcional (UI, PWA y API)',
  equipo: 'Frontend y QA',
  ambiente: dataCypress.ambiente || 'https://api.inmero.co',
  backend: dataCypress.backend || 'https://api.inmero.co/back-sigab-test',
  navegador: dataCypress.navegador || 'Electron',
  build_declarado: 'v1.0.0-rc.34+ (ff4fafc)',
  contexto: dataCypress.contexto || {},
  checkpoints: checkpointsConsolidados,
  veredicto: veredictoCalculado,
  hallazgos: checkpointsConsolidados.map((c) => `${c.paso} -> ${c.obtenido} (${c.estado})`),
};

if (!fs.existsSync(dirResultados)) {
  fs.mkdirSync(dirResultados, { recursive: true });
}

fs.writeFileSync(archivoSalida, JSON.stringify(resultadoFinal, null, 2), 'utf8');
console.log(`\nReporte consolidado generado con éxito en ${archivoSalida}`);
console.log(`Total checkpoints: ${checkpointsConsolidados.length} (OK: ${totalOK}, FALLA: ${checkpointsConsolidados.length - totalOK})`);
console.log(`Veredicto final computado: ${veredictoCalculado}`);
