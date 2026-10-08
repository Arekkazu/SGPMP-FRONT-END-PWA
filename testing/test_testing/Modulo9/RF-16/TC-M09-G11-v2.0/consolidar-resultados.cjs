const { resolve } = require('path');
const { existsSync, readFileSync, writeFileSync, mkdirSync } = require('fs');

function cargarEnvTest() {
  const rutas = [
    resolve(__dirname, '.env.test'),
    resolve(__dirname, '../../../../.env.test'),
    resolve(__dirname, '../../../../../.env.test'),
  ];
  for (const envPath of rutas) {
    if (existsSync(envPath)) {
      try {
        const lineas = readFileSync(envPath, 'utf8').split(/\r?\n/);
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

const CHECKPOINTS_OBLIGATORIOS = [
  'CP-01', 'CP-02', 'CP-03', 'CP-04', 'CP-05',
  'CP-06', 'CP-07', 'CP-08', 'CP-09', 'CP-10',
  'CP-11', 'CP-12', 'CP-13',
  'NW-01', 'NW-02', 'NW-03', 'NW-04', 'NW-05',
  'NW-06', 'NW-07', 'NW-08', 'NW-09a', 'NW-09b', 'NW-09c'
];

function consolidar() {
  const evidenciasDir = resolve(__dirname, 'evidencias');
  const resultadosDir = resolve(__dirname, 'resultados');
  mkdirSync(resultadosDir, { recursive: true });

  const cypressRawPath = resolve(evidenciasDir, 'cypress_raw.json');
  const newmanRawPath = resolve(evidenciasDir, 'newman_raw.json');

  if (!existsSync(cypressRawPath)) {
    console.error(`[consolidar] ERROR: No existe ${cypressRawPath}. Ejecuta Cypress primero.`);
    process.exit(1);
  }
  if (!existsSync(newmanRawPath)) {
    console.error(`[consolidar] ERROR: No existe ${newmanRawPath}. Ejecuta Newman primero.`);
    process.exit(1);
  }

  const cyRawContent = readFileSync(cypressRawPath, 'utf8').replace(/^\uFEFF/, '');
  const nwRawContent = readFileSync(newmanRawPath, 'utf8').replace(/^\uFEFF/, '');
  const cyData = JSON.parse(cyRawContent);
  const nwData = JSON.parse(nwRawContent);

  const cpList = [];

  // 1. Cargar Cypress checkpoints
  for (const c of (cyData.checkpoints || [])) {
    if (c.paso && !c.paso.startsWith('TD:')) {
      const estado = c.estado === 'OK' ? 'OK' : 'FALLA';
      cpList.push({
        paso: c.paso,
        esperado: String(c.esperado || ''),
        obtenido: String(c.obtenido || ''),
        estado: estado,
      });
    }
  }

  // 2. Extraer Newman checkpoints
  const nwAgrupado = {};

  for (const exec of (nwData.executions || [])) {
    const match = (exec.item || '').match(/^(NW-\d{2}[a-c]?)/);
    if (!match) continue;
    let id = match[1];
    if (id.startsWith('NW-03')) {
      id = 'NW-03';
    }

    if (!nwAgrupado[id]) {
      nwAgrupado[id] = {
        item: exec.item,
        codigo: exec.codigo,
        fallas: [],
      };
    }

    if (!exec.assertions || exec.assertions.length === 0) {
      nwAgrupado[id].fallas.push(`${exec.item}: Sin aserciones registradas`);
    } else {
      for (const a of exec.assertions) {
        if (a.error) {
          nwAgrupado[id].fallas.push(`${exec.item} -> ${a.assertion}: ${a.error}`);
        }
      }
    }
  }

  const newmanIds = [
    'NW-01', 'NW-02', 'NW-03', 'NW-04', 'NW-05',
    'NW-06', 'NW-07', 'NW-08', 'NW-09a', 'NW-09b', 'NW-09c'
  ];

  for (const id of newmanIds) {
    const data = nwAgrupado[id];
    if (data) {
      const estado = data.fallas.length === 0 ? 'OK' : 'FALLA';
      cpList.push({
        paso: id,
        esperado: `HTTP exitoso con contrato y aserciones para ${id}`,
        obtenido: estado === 'OK' ? `Aserciones cumplidas satisfactoriamente (HTTP ${data.codigo})` : data.fallas.join('; '),
        estado: estado,
      });
    }
  }

  // 3. Validar presencia de todos los checkpoints obligatorios
  const encontrados = new Set(cpList.map((c) => c.paso));
  const faltantes = CHECKPOINTS_OBLIGATORIOS.filter((id) => !encontrados.has(id));

  if (faltantes.length > 0) {
    console.error(`[consolidar] ABORTADO: Faltan los siguientes checkpoints obligatorios: ${faltantes.join(', ')}`);
    process.exit(1);
  }

  // Ordenar lista de checkpoints
  cpList.sort((a, b) => {
    return CHECKPOINTS_OBLIGATORIOS.indexOf(a.paso) - CHECKPOINTS_OBLIGATORIOS.indexOf(b.paso);
  });

  const targetEnv = (process.env.ENV_TARGET || 'TEST').toUpperCase();

  const consolidadoFinal = {
    tc: 'TC-M09-G11-v2.0',
    ambiente: targetEnv,
    fecha: new Date().toISOString(),
    checkpoints: cpList,
  };

  const salidaPath = resolve(resultadosDir, 'resultado_TC-M09-G11-v2.0.json');
  writeFileSync(salidaPath, JSON.stringify(consolidadoFinal, null, 2), 'utf8');
  console.log(`[consolidar] Éxito: reporte consolidado generado en ${salidaPath} con ${cpList.length} checkpoints y ambiente ${targetEnv}.`);
}

consolidar();
