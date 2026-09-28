const fs = require('fs');
const path = require('path');

const globalNodeModules = path.join(path.dirname(process.execPath), 'node_modules');
const newman = require(path.join(globalNodeModules, 'newman'));

const CASES = new Set(['TC-M09-66', 'TC-M09-67', 'TC-M09-68']);
const testCase = process.env.G31_CASE;
const runId = process.env.G31_RUN_ID;
const adminSecret = process.env.TEST_ADMIN_PASSWORD;
const attempt = Number(process.env.G31_ATTEMPT || '1');
if (!CASES.has(testCase) || !runId || !adminSecret || ![1, 2].includes(attempt)) {
  throw new Error('G31_CASE, G31_RUN_ID, G31_ATTEMPT y TEST_ADMIN_PASSWORD deben existir solo durante la ejecucion.');
}

const root = __dirname;
const baseUrl = 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test';
const adminEmail = 'admin@pecuaria.co';
const outputDir = path.join(root, 'RESULTADOS', runId);
const htmlPath = path.join(outputDir, 'newman', `newman-${testCase}-intento${attempt}.html`);
const jsonPath = path.join(outputDir, `newman-${testCase}-intento${attempt}.json`);
fs.mkdirSync(path.dirname(htmlPath), { recursive: true });

const isFiniteNumber = (value) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
const isInteriorRange = (level) => isFiniteNumber(level?.limite_inferior) && isFiniteNumber(level?.limite_superior) && Number(level.limite_inferior) < Number(level.limite_superior);
const isUsable = (item) => {
  const levels = Object.fromEntries((item.niveles || []).map((level) => [String(level.nivel || '').toLowerCase(), level]));
  return ['normal', 'precaucion', 'critico'].every((name) => isInteriorRange(levels[name]));
};
const statusFor = (executions, name) => {
  const entry = executions.find((execution) => execution.item?.name === name);
  return entry?.response?.code ?? null;
};
const bodyFor = (executions, name) => {
  const entry = executions.find((execution) => execution.item?.name === name);
  if (!entry?.response) return null;
  try { return JSON.parse(entry.response.stream.toString()); } catch { return null; }
};
const redact = (content, secret, token) => content
  .split(secret).join('[REDACTED]')
  .split(token || '').join(token ? '[REDACTED]' : '')
  .replace(/Authorization/gi, '[REDACTED_HEADER]')
  .replace(/Bearer\s+[^\s<"']+/gi, '[REDACTED_HEADER]')
  .replace(/Bearer/gi, '[REDACTED_HEADER]')
  .replace(/access_token/gi, '[REDACTED]')
  .replace(/refresh_token/gi, '[REDACTED]')
  .replace(/password/gi, '[REDACTED]')
  .replace(/cookie/gi, '[REDACTED]')
  .replace(/jwt/gi, '[REDACTED]');

async function apiGet(route, token) {
  const response = await fetch(`${baseUrl}${route}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Discovery GET ${route} respondio HTTP ${response.status}.`);
  return response.json();
}

async function discover() {
  const login = await fetch(`${baseUrl}/sesiones/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo_electronico: adminEmail, contrasena: adminSecret }),
  });
  if (!login.ok) throw new Error(`Discovery login respondio HTTP ${login.status}.`);
  const loginBody = await login.json();
  if (!loginBody.token) throw new Error('Discovery login no devolvio sesion utilizable.');
  const species = await apiGet('/configuracion/especies?solo_activas=true', loginBody.token);
  const thresholdResponses = await Promise.all((species.items || []).map(async (speciesItem) => ({
    species: { id_especie: speciesItem.id_especie, nombre: speciesItem.nombre },
    body: await apiGet(`/configuracion/umbrales?id_especie=${encodeURIComponent(speciesItem.id_especie)}&solo_activas=true`, loginBody.token),
  })));
  return { species: species.items || [], thresholdResponses };
}

function buildCollection(discovery) {
  const collection = JSON.parse(fs.readFileSync(path.join(root, 'TC-M09-G31.postman_collection.json'), 'utf8'));
  const authorization = [{ key: 'Authorization', value: 'Bearer {{session_token}}' }];
  collection.item = [
    {
      name: 'Login Administrador',
      request: {
        method: 'POST',
        header: [{ key: 'Content-Type', value: 'application/json' }],
        body: { mode: 'raw', raw: '{\n  "correo_electronico": "{{admin_email}}",\n  "contrasena": "{{admin_secret}}"\n}' },
        url: '{{base_url}}/sesiones/',
      },
      event: [{ listen: 'test', script: { type: 'text', exec: [
        'const body = pm.response.json();',
        "pm.test('Login Administrador responde 200', () => pm.response.to.have.status(200));",
        "pm.expect(body.token).to.be.a('string').and.not.empty;",
        "pm.environment.set('session_token', body.token);",
      ] } }],
    },
    {
      name: 'Especies activas',
      request: { method: 'GET', header: authorization, url: '{{base_url}}/configuracion/especies?solo_activas=true' },
      event: [{ listen: 'test', script: { type: 'text', exec: [
        "pm.test('Especies activas responde 200', () => pm.response.to.have.status(200));",
        "pm.expect(pm.response.json().items).to.be.an('array').and.not.empty;",
      ] } }],
    },
  ];
  for (const response of discovery.thresholdResponses) {
    const id = response.species.id_especie;
    collection.item.push({
      name: `Umbrales activos especie ${id}`,
      request: { method: 'GET', header: authorization, url: `{{base_url}}/configuracion/umbrales?id_especie=${id}&solo_activas=true` },
      event: [{ listen: 'test', script: { type: 'text', exec: [
        `pm.test('Umbrales activos especie ${id} responde 200', () => pm.response.to.have.status(200));`,
        'const body = pm.response.json();',
        'const numeric = (v) => v !== null && v !== undefined && v !== "" && Number.isFinite(Number(v));',
        'const interior = (level) => numeric(level && level.limite_inferior) && numeric(level && level.limite_superior) && Number(level.limite_inferior) < Number(level.limite_superior);',
        'const usable = (body.items || []).filter((item) => { const levels = Object.fromEntries((item.niveles || []).map((level) => [String(level.nivel || "").toLowerCase(), level])); return ["normal", "precaucion", "critico"].every((name) => interior(levels[name])); });',
        'const previous = Number(pm.environment.get("usable_configuration_count") || "0");',
        'pm.environment.set("usable_configuration_count", String(previous + usable.length));',
      ] } }],
    });
  }
  collection.item.push({
    name: 'Dashboard de monitoreo',
    request: { method: 'GET', header: authorization, url: '{{base_url}}/iot/monitoreo/dashboard?pagina=1&por_pagina=50' },
    event: [{ listen: 'test', script: { type: 'text', exec: [
      "pm.test('Dashboard responde 200', () => pm.response.to.have.status(200));",
      "pm.expect(pm.response.json().sensores).to.be.an('array');",
      'pm.test("Conteo de configuraciones semaforicas disponible", () => pm.expect(Number(pm.environment.get("usable_configuration_count") || "0")).to.be.at.least(0));',
    ] } }],
  });
  return collection;
}

(async () => {
  const discovery = await discover();
  const collection = buildCollection(discovery);
  const result = await new Promise((resolve, reject) => {
    newman.run({
      collection,
      reporters: ['htmlextra'],
      reporter: { htmlextra: { export: htmlPath, showEnvironmentData: false, showMarkdownLinks: false } },
      envVar: [
        { key: 'base_url', value: baseUrl },
        { key: 'admin_email', value: adminEmail },
        { key: 'admin_secret', value: adminSecret },
        { key: 'session_token', value: '' },
        { key: 'usable_configuration_count', value: '0' },
      ],
    }, (error, summary) => error ? reject(error) : resolve(summary));
  });
  const executions = result.run.executions || [];
  const login = bodyFor(executions, 'Login Administrador');
  const configurations = discovery.thresholdResponses.flatMap(({ species, body }) => (body.items || []).map((item) => ({
    especie: species.nombre,
    id_especie: species.id_especie,
    id_umbral_ambiental: item.id_umbral_ambiental,
    id_variable_ambiental: item.id_variable_ambiental,
    unidad_medida: item.unidad_medida,
    valor_min: item.valor_min,
    valor_max: item.valor_max,
    es_activo: item.es_activo,
    niveles: (item.niveles || []).map((level) => ({ nivel: level.nivel, limite_inferior: level.limite_inferior, limite_superior: level.limite_superior })),
  })));
  const usable = configurations.filter(isUsable);
  const failures = (result.run.failures || []).map((failure) => ({
    source: failure.source?.name || null,
    error: failure.error?.message || null,
  })).filter((failure) => failure.error);
  if (fs.existsSync(htmlPath)) fs.writeFileSync(htmlPath, redact(fs.readFileSync(htmlPath, 'utf8'), adminSecret, login?.token));
  fs.writeFileSync(jsonPath, JSON.stringify({
    caso: testCase,
    grupo: 'TC-M09-G31',
    intento: attempt,
    ejecucion: 'discovery-read-only',
    actor: { correo: adminEmail, autenticacion: 'HTTP 200' },
    endpoint_ingesta_descubierto: 'POST /iot/telemetria (no ejecutado)',
    configuraciones_activas: configurations,
    configuraciones_semaforicas_utilizables: usable.length,
    dashboard: {
      status: statusFor(executions, 'Dashboard de monitoreo'),
      sensores_total: bodyFor(executions, 'Dashboard de monitoreo')?.total ?? null,
      estados: (bodyFor(executions, 'Dashboard de monitoreo')?.sensores || []).map((sensor) => ({ id_sensor: sensor.id_sensor, estado_semaforo: sensor.estado_semaforo, dato_desactualizado: sensor.dato_desactualizado })),
    },
    assertions: { total: result.run.stats.assertions.total, failed: failures.length, failures },
    operacion_funcional_ejecutada: false,
    resultado_discovery: failures.length === 0
      ? (usable.length > 0 ? 'PRECONDICION_SEMAFORICA_DISPONIBLE' : 'BLOCKER_CONFIRMADO')
      : 'REVISION_REQUERIDA',
  }, null, 2));
  if (failures.length) process.exitCode = 2;
})().catch((error) => {
  if (fs.existsSync(htmlPath)) fs.writeFileSync(htmlPath, redact(fs.readFileSync(htmlPath, 'utf8'), adminSecret, ''));
  process.stderr.write(`G31 Newman finalizo sin exponer secretos: ${error.message}\n`);
  process.exitCode = 1;
});
