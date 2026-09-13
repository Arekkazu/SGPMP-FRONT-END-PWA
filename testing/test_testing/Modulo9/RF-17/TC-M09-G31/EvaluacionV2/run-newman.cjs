// TC-M09-G31 V2 — TC-M09-66/67/68. Verificacion SOLO LECTURA (login + GET) del clasificador
// semaforico basado en umbrales RF-17, en G31_ENV (TEST | DEV), mas evidencia de codigo de ambos
// repositorios. No genera mediciones: el checklist previo (§156) exige un clasificador RF-17
// identificado, y la revision tecnica demuestra que no existe.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const newman = require('newman');
require.resolve('newman-reporter-htmlextra');

const ENVS = {
  TEST: { base: 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test', suministrada: 'http://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test',
    actores: [['administador.dev@gmail.com', 'TEST_ADMIN_PASSWORD']] },
  DEV: { base: 'https://sigab-backenddev-jpuya4-ea3a74-158-69-200-27.sslip.io/api-sgpmp', suministrada: 'https://sigab-backenddev-jpuya4-ea3a74-158-69-200-27.sslip.io/api-sgpmp',
    actores: [['administador.dev@gmail.com', 'TEST_ADMIN_PASSWORD'], ['admin.general@pecuaria.co', 'DEV_ADMIN_PASSWORD']] },
};
const runId = process.env.G31_REEVAL_V2_RUN_ID;
const envName = process.env.G31_ENV;
if (!runId || !/^[\w-]+$/.test(runId)) throw Error('G31_REEVAL_V2_RUN_ID requerido');
if (!ENVS[envName]) throw Error('G31_ENV debe ser TEST o DEV');
const E = ENVS[envName];
const R = path.join(__dirname, 'RESULTADOS', runId);
fs.mkdirSync(path.join(R, 'newman'), { recursive: true });
const PRUEBAS = path.resolve(__dirname, '..', '..', '..', '..', '..', '..', '..');
const FRONT = path.join(PRUEBAS, 'SGPMP-FRONT-END-PWA');
const BACK = path.join(PRUEBAS, 'sgpmp-backend');
const clean = (s) => { s = String(s); for (const x of [process.env.TEST_ADMIN_PASSWORD, process.env.DEV_ADMIN_PASSWORD].filter(Boolean)) s = s.split(x).join('[REDACTED]');
  return s.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[JWT REDACTED]').replace(/Bearer\s+(?!\{\{)[A-Za-z0-9_.\-]+/g, 'Bearer [REDACTED]'); };
const save = (name, obj) => { const p = path.join(R, name); if (fs.existsSync(p)) throw Error('No sobrescribir: ' + name);
  fs.writeFileSync(p, clean(JSON.stringify({ grupo: 'TC-M09-G31', casos: ['TC-M09-66', 'TC-M09-67', 'TC-M09-68'], rf: 'RF-17', tipo: 'REEVALUACION V2', runId, environment: envName, fecha: new Date().toISOString(), ...obj }, null, 2))); };
const git = (cwd, ...a) => { try { return execFileSync('git', a, { cwd, encoding: 'utf8' }); } catch (e) { if (a[0] === 'grep' && e.status === 1) return ''; throw e; } };
const lineas = (t) => t.split('\n').map((l) => l.trim()).filter(Boolean);

async function http(url, { metodo = 'GET', token, cuerpo } = {}) {
  const r = await fetch(url, { method: metodo, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined, redirect: 'manual', signal: AbortSignal.timeout(30000) });
  let body = null; try { body = await r.json(); } catch { /* sin JSON */ }
  return { status: r.status, body };
}
// Decimales exactos: punto medio de cada nivel (valor interior, lejos de fronteras).
const d2 = (v) => { const [e, d = ''] = String(v).split('.'); const n = e.startsWith('-'); return (n ? -1n : 1n) * BigInt((n ? e.slice(1) : e) + (d + '00').slice(0, 2)); };
const t2 = (c) => { const n = c < 0n; const a = (n ? -c : c).toString().padStart(3, '0'); return (n ? '-' : '') + a.slice(0, -2) + '.' + a.slice(-2); };

(async () => {
  const preflight = [];
  for (const u of [...new Set([E.suministrada, E.base])]) { const h = await http(u + '/health').catch((e) => ({ status: 'ERR ' + e.message })); preflight.push({ url: u + '/health', status: h.status }); }
  if (!preflight.some((p) => p.status === 200)) throw Error('ENVIRONMENT_ERROR: backend no accesible');

  let token = null; const intentosLogin = [];
  for (const [correo, v] of E.actores) {
    if (!process.env[v]) { intentosLogin.push({ correo, status: 'SIN_VARIABLE' }); continue; }
    const r = await http(E.base + '/sesiones/', { metodo: 'POST', cuerpo: { correo_electronico: correo, contrasena: process.env[v] } });
    intentosLogin.push({ correo, status: r.status });
    if (r.status === 200 && r.body?.token) { token = r.body.token; break; }
  }
  if (!token) throw Error('BLOCKED: ningun actor autorizado autentico ' + JSON.stringify(intentosLogin));
  const me = (await http(E.base + '/usuarios/me', { token })).body;
  const actor = { correo: me.correo_electronico, id_usuario: me.id_usuario, rol: me.nombre_rol, estado: me.estado_cuenta, fincas: (me.fincas || []).length, intentosLogin };

  // Configuracion RF-17 activa con los tres niveles y la mayor amplitud minima entre niveles.
  const especies = (await http(E.base + '/configuracion/especies', { token })).body.items.filter((s) => s.es_activo);
  const variables = (await http(E.base + '/configuracion/variables-ambientales', { token })).body.items;
  let mejor = null;
  for (const s of especies) {
    for (const u of (await http(E.base + `/configuracion/umbrales?id_especie=${s.id_especie}`, { token })).body.items.filter((x) => x.es_activo && x.niveles?.length === 3)) {
      const amp = Math.min(...u.niveles.map((n) => Number(n.limite_superior) - Number(n.limite_inferior)));
      const rel = amp / (Number(u.valor_max) - Number(u.valor_min));
      if (!mejor || rel > mejor.rel) mejor = { u, s, rel };
    }
  }
  if (!mejor) throw Error('BLOCKED: sin configuracion RF-17 activa con tres niveles');
  const { u, s } = mejor;
  const v = variables.find((x) => x.id_variable_ambiental === u.id_variable_ambiental);
  const nivel = (n) => u.niveles.find((x) => x.nivel === n);
  const medio = (n) => t2((d2(nivel(n).limite_inferior) + d2(nivel(n).limite_superior)) / 2n);
  const thresholdConfig = { id_umbral_ambiental: u.id_umbral_ambiental, especie: { id: s.id_especie, nombre: s.nombre, es_activo: s.es_activo }, variable: { id: v?.id_variable_ambiental, nombre: v?.nombre, unidad: v?.unidad },
    general: { min: u.valor_min, max: u.valor_max }, normal: nivel('normal'), precaucion: nivel('precaucion'), critico: nivel('critico'), es_activo: u.es_activo, fecha_actualizacion: u.fecha_actualizacion };
  const valoresPlanificados = {
    'TC-M09-66': { esperado: 'NORMAL / VERDE', valor: medio('normal'), zona: [nivel('normal').limite_inferior, nivel('normal').limite_superior] },
    'TC-M09-67': { esperado: 'PRECAUCION / AMARILLO', valor: medio('precaucion'), zona: [nivel('precaucion').limite_inferior, nivel('precaucion').limite_superior] },
    'TC-M09-68': { esperado: 'CRITICO / ROJO', valor: medio('critico'), zona: [nivel('critico').limite_inferior, nivel('critico').limite_superior] },
  };

  const hoy = new Date(); const desde = new Date(hoy.getTime() - 30 * 86400e3); const f = (d) => d.toISOString().slice(0, 10);
  const dash = await http(E.base + '/iot/monitoreo/dashboard?pagina=1&por_pagina=50', { token });
  const hist = await http(E.base + `/iot/monitoreo/historial?fecha_inicio=${f(desde)}&fecha_fin=${f(hoy)}&pagina=1&por_pagina=50&orden=DESC`, { token });
  const api = await http(E.base + '/openapi.json');
  const rutasClasificacion = Object.keys(api.body?.paths || {}).filter((p) => /clasific|semaforo|evaluar|umbral.*(evalu|clasif)|monitoreo/i.test(p));
  const sensores = dash.body?.sensores || []; const lecturas = hist.body?.items || [];
  const monitoreo = {
    dashboard: { status: dash.status, total: dash.body?.total ?? null, campos: sensores[0] ? Object.keys(sensores[0]) : [],
      sensores: sensores.map((x) => ({ id_sensor: x.id_sensor, tipo_variable: x.tipo_variable, ultimo_valor: x.ultimo_valor, estado_semaforo: x.estado_semaforo, dato_desactualizado: x.dato_desactualizado, id_alerta: x.id_alerta, severidad_alerta: x.severidad_alerta })) },
    historial: { status: hist.status, ventana: [f(desde), f(hoy)], total: hist.body?.total ?? null, semaforos: [...new Set(lecturas.map((x) => x.estado_semaforo_historico))], lecturasConEspecie: lecturas.filter((x) => x.especie).length },
    rutasOpenApiRelacionadas: rutasClasificacion,
  };

  // Newman con precondiciones y oraculo.
  const html = path.join(R, 'newman', `newman-TC-M09-66-67-68-v2-${envName}.html`);
  if (fs.existsSync(html)) throw Error('No sobrescribir HTML');
  const collection = JSON.parse(fs.readFileSync(path.join(__dirname, 'TC-M09-G31-reevaluacion-v2.postman_collection.json'), 'utf8'));
  const summary = await new Promise((res, rej) => newman.run({
    collection, reporters: ['htmlextra'], timeoutRequest: 30000,
    reporter: { htmlextra: { export: html, omitHeaders: true, showEnvironmentData: false, showGlobalData: false, skipEnvironmentVars: ['token'], logs: false, silentProgressBar: true, title: `TC-M09-66/67/68 — G31 V2 — ${envName} (solo lectura)` } },
    environment: { values: Object.entries({ base_url: E.base, token, id_especie: s.id_especie, id_umbral: u.id_umbral_ambiental, fecha_inicio: f(desde), fecha_fin: f(hoy) }).map(([key, value]) => ({ key, value: String(value), enabled: true })) },
  }, (err, sm) => (err ? rej(Error('Newman execution error')) : res(sm))));
  fs.writeFileSync(html, clean(fs.readFileSync(html, 'utf8')));
  const aserciones = [];
  for (const ex of summary.run.executions) for (const a of ex.assertions || []) aserciones.push({ request: ex.item.name, test: a.assertion, ok: !a.error, detalle: a.error ? clean(a.error.message).slice(0, 300) : undefined });

  // Configuracion AFTER: debe ser identica (no hubo escrituras).
  const after = (await http(E.base + `/configuracion/umbrales?id_especie=${s.id_especie}`, { token })).body.items.find((x) => x.id_umbral_ambiental === u.id_umbral_ambiental);
  const configIgual = JSON.stringify({ a: after?.valor_min, b: after?.valor_max, n: after?.niveles, f: after?.fecha_actualizacion }) === JSON.stringify({ a: u.valor_min, b: u.valor_max, n: u.niveles, f: u.fecha_actualizacion });

  const codigo = envName === 'TEST' ? {
    backend: { rama: git(BACK, 'branch', '--show-current').trim(), head: git(BACK, 'rev-parse', 'HEAD').trim(), originDev: git(BACK, 'rev-parse', 'origin/dev').trim(),
      diffSrcHeadVsOriginDev: git(BACK, 'diff', '--stat', 'HEAD', 'origin/dev', '--', 'src', 'alembic').trim() || '(sin diferencias)',
      triggerIngestaSemaforo: lineas(git(BACK, 'grep', '-n', '-E', "CREATE TRIGGER trg_rf58_01_cache_estado_sensor|'VERDE', NEW.estado_calidad", 'origin/dev', '--', 'alembic/baseline/esquema_baseline.sql')),
      triggerAlertaSemaforo: lineas(git(BACK, 'grep', '-n', '-E', "CREATE TRIGGER trg_aux_03_alerta_en_sensor|WHEN 'CRITICO'  THEN 'ROJO'", 'origin/dev', '--', 'alembic/baseline/esquema_baseline.sql')),
      umbralHistoricoStub: lineas(git(BACK, 'show', 'origin/dev:src/telemetry/infrastructure/adapters/umbral_historico_m09_adapter.py')).filter((l) => /class|Stub|GRIS|return/.test(l)),
      semaforoCalculator: lineas(git(BACK, 'show', 'origin/dev:src/telemetry/domain/entities/monitoreo.py')).filter((l) => /def calcular|umbral_min <= valor|AMARILLO|tolerancia_pct: float/.test(l)).slice(0, 6),
      lecturaNivelesRF17FueraDeConfiguration: lineas(git(BACK, 'grep', '-n', '-i', '-E', 'niveles_alerta_ambientales|NivelAlertaAmbiental|limite_inferior', 'origin/dev', '--', 'src/telemetry', 'src/prediction', 'src/shared')),
      migracionesRedefinenTrigger: lineas(git(BACK, 'grep', '-n', '-i', 'fn_actualizar_estado_sensor', 'origin/dev', '--', 'alembic/versions')) },
    frontend: { rama: git(FRONT, 'branch', '--show-current').trim(), head: git(FRONT, 'rev-parse', 'HEAD').trim(),
      semaforoUI: lineas(git(FRONT, 'grep', '-n', '-E', 'SemaforoPill estado=\\{sensor.estado_semaforo\\}|semaforoToGauge\\(sensor.estado_semaforo\\)', 'HEAD', '--', 'src/telemetry/components/SensorCard.tsx')),
      usoNivelesRF17EnTelemetriaUI: lineas(git(FRONT, 'grep', '-n', '-i', '-E', 'limite_inferior|niveles', 'HEAD', '--', 'src/telemetry')) },
  } : undefined;

  const correlacion = { clasificadorBasadoEnNivelesRF17: false, motivo: 'La ingesta fija VERDE; AMARILLO/ROJO provienen de alertas M03 por severidad; el historial usa stub (GRIS); ningun componente lee niveles RF-17',
    semaforosDashboard: [...new Set(sensores.map((x) => x.estado_semaforo))], semaforosHistorial: monitoreo.historial.semaforos, configuracionSinCambios: configIgual };
  save(`TC-M09-G31-evidencia-${envName}.json`, {
    preflight, actor, threshold_config_before: thresholdConfig, valores_planificados_no_enviados: valoresPlanificados, monitoreo, correlacion,
    threshold_config_after: { igualABefore: configIgual }, medicionesGeneradas: 0,
    motivoSinMediciones: 'Checklist §156: item 6 (clasificador RF-17 identificado) = No. Enviar mediciones no produciria una clasificacion basada en RF-17 y escribiria telemetria sin oraculo.',
    por_caso: Object.fromEntries(Object.entries(valoresPlanificados).map(([c, x]) => [c, { threshold_config_id: u.id_umbral_ambiental, especie: s.nombre, variable: v?.nombre, measurement_id: null, measurement_value: x.valor, expected_classification: x.esperado,
      api_classification: null, ui_classification: null, persistence_correlation: 'No aplica: medicion no generada', result: 'DESAPROBADO — FUNCIONALIDAD NO IMPLEMENTADA' }])),
    codigo, newman: { html: path.relative(R, html).split(path.sep).join('/'), assertions: summary.run.stats.assertions, aserciones },
  });
  console.log(envName, '| actor', actor.correo, actor.rol, actor.estado, 'fincas', actor.fincas, '| logins', JSON.stringify(intentosLogin));
  console.log('Config', u.id_umbral_ambiental, s.nombre, v?.nombre, `general ${u.valor_min}-${u.valor_max}`, 'N', JSON.stringify(nivel('normal')), 'P', JSON.stringify(nivel('precaucion')), 'C', JSON.stringify(nivel('critico')));
  console.log('Valores interiores planificados', JSON.stringify(Object.fromEntries(Object.entries(valoresPlanificados).map(([c, x]) => [c, x.valor]))));
  console.log('Dashboard', dash.status, JSON.stringify(correlacion.semaforosDashboard), '| historial', hist.status, JSON.stringify(monitoreo.historial.semaforos), '| rutas relacionadas', JSON.stringify(rutasClasificacion), '| config igual', configIgual);
  aserciones.forEach((a) => console.log(a.ok ? '  PASS' : '  FAIL', a.request, '::', a.test, a.ok ? '' : '-> ' + (a.detalle || '').slice(0, 130)));
  if (codigo) console.log('Codigo:', JSON.stringify({ ingesta: codigo.backend.triggerIngestaSemaforo.length, alerta: codigo.backend.triggerAlertaSemaforo.length, lecturaNiveles: codigo.backend.lecturaNivelesRF17FueraDeConfiguration.length, migraciones: codigo.backend.migracionesRedefinenTrigger.length, nivelesUI: codigo.frontend.usoNivelesRF17EnTelemetriaUI.length }));
})().catch((e) => { console.log('ERROR:', clean(e.message)); process.exitCode = 1; });
