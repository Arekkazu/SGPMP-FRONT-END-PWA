// TC-M09-G31 V3 — TC-M09-66/67/68: clasificacion semaforica de mediciones contra los niveles
// RF-17 (NORMAL/VERDE, PRECAUCION/AMARILLO, CRITICO/ROJO).
//
// ADAPTACION MINIMA RESPECTO A EvaluacionV2/run-newman.cjs (paquete minimo, seccion 2)
// ------------------------------------------------------------------------------------
// V2 era deliberadamente de SOLO LECTURA: el checklist previo determino que no existia
// clasificador RF-17, asi que no genero mediciones. Tras PR #382/#383 el clasificador si
// existe (ReclasificarSemaforoUseCase + SemaforoCalculator.calcular_por_niveles), de modo
// que el flujo que antes estaba bloqueado ahora se puede ejecutar. La unica adaptacion es
// habilitar ese flujo: ingesta real por caso + precondicion tecnica de vinculacion RF-61-C.
// Todo lo demas se conserva de V2: seleccion del umbral, decimales exactos en centesimas,
// sanitizado, actores, oraculo de dashboard/historial y estructura de evidencia.
//
// Las assertions funcionales NO cambian: NORMAL->VERDE, PRECAUCION->AMARILLO, CRITICO->ROJO.
//
// Fases (seccion 3: los pasos previos NO crean carpeta de resultados):
//   G31_FASE=preflight  health + credenciales TEST/DEV + discovery + fixture -> scratchpad
//   G31_FASE=oficial    requiere G31_V3_RUN_ID: crea la UNICA carpeta y ejecuta la prueba
//   G31_FASE=ui         Cypress sobre el mismo RUN_ID (evidencia visual tc66/67/68)
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// La precondicion tecnica de G31 (RF-61-C) exige recurso 37 con accion leer(2) y actualizar(3).
// Segun los permisos sembrados, solo los tienen el rol 1 (Administrador) y el rol 4
// (Ingeniero de Campo). El Supervisor autentica pero recibe 403 en /iot/vinculaciones.
const ROLES_CON_RECURSO_37 = ['Administrador', 'Ingeniero de Campo'];

const ENVS = {
  TEST: {
    base: 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test',
    // Cuentas suministradas por el responsable QA (seccion 7). administador.dev@gmail.com es el
    // correo historico: se usa porque el login de este preflight demuestra que sigue siendo una
    // cuenta real y activa con rol Administrador. admin.dev@gmail.com NO existe en TEST (401
    // CREDENCIALES_INVALIDAS) y se excluye para no acercar la cuenta al bloqueo por 5 intentos.
    correos: ['administador.dev@gmail.com', 'administrador.dev@gmail.com'],
    passVar: 'TEST_ADMIN_PASSWORD',
  },
  DEV: {
    base: 'https://sigab-backenddev-jpuya4-ea3a74-158-69-200-27.sslip.io/api-sgpmp',
    correos: ['admin.dev@gmail.com', 'administrador.dev@gmail.com'],
    passVar: 'DEV_ADMIN_PASSWORD',
  },
};

// Catalogo I3P-1: unicas variables de temperatura ingeribles por la API de telemetria.
const I3P1_TEMPERATURA = {
  9: { codigo: 'TEMPERATURA_AMBIENTAL', unidad: '°C' },
  13: { codigo: 'TEMPERATURA_CORPORAL', unidad: '°C' },
};

// Expected inalterable (seccion 12).
const CASOS = {
  'TC-M09-66': { nivel: 'normal', clase: 'NORMAL', esperado: 'VERDE', preferido: '36.00' },
  'TC-M09-67': { nivel: 'precaucion', clase: 'PRECAUCION', esperado: 'AMARILLO', preferido: '38.00' },
  'TC-M09-68': { nivel: 'critico', clase: 'CRITICO', esperado: 'ROJO', preferido: '40.00' },
};

const PRUEBAS = path.resolve(__dirname, '..', '..', '..', '..', '..', '..', '..');
const FRONT = path.join(PRUEBAS, 'SGPMP-FRONT-END-PWA');
const BACK = path.join(PRUEBAS, 'sgpmp-backend');

// --- Sanitizado: contrasenas, JWT, Authorization y access_key (serial del dispositivo) ---
const secretos = new Set();
const registrarSecreto = (v) => { if (v && String(v).length > 3) secretos.add(String(v)); };
for (const v of ['TEST_ADMIN_PASSWORD', 'DEV_ADMIN_PASSWORD', 'TEST_FIELD_ENGINEER_PASSWORD', 'DEV_FIELD_ENGINEER_PASSWORD']) registrarSecreto(process.env[v]);
const clean = (s) => {
  s = String(s);
  for (const x of secretos) s = s.split(x).join('[REDACTED]');
  return s
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[JWT REDACTED]')
    .replace(/Bearer\s+(?!\[|\{\{)[A-Za-z0-9_.\-]+/g, 'Bearer [REDACTED]');
};

// --- Decimales exactos en centesimas (BigInt). Nunca float para comparar valores. ---
const d2 = (v) => { const [e, d = ''] = String(v).split('.'); const n = e.startsWith('-'); return (n ? -1n : 1n) * BigInt((n ? e.slice(1) : e) + (d + '00').slice(0, 2)); };
const t2 = (c) => { const n = c < 0n; const a = (n ? -c : c).toString().padStart(3, '0'); return (n ? '-' : '') + a.slice(0, -2) + '.' + a.slice(-2); };
const interior = (v, lo, hi) => d2(v) > d2(lo) && d2(v) < d2(hi);
const iguales = (a, b) => d2(a) === d2(b);

async function http(url, { metodo = 'GET', token, cuerpo, headers = {} } = {}) {
  try {
    const r = await fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
      redirect: 'manual',
      signal: AbortSignal.timeout(45000),
    });
    let body = null; try { body = await r.json(); } catch { /* sin JSON */ }
    return { status: r.status, body };
  } catch (e) { return { status: 'ERR', error: clean(e.message) }; }
}

async function autenticar(E) {
  const intentos = [];
  let alternativa = null;
  for (const correo of E.correos) {
    if (!process.env[E.passVar]) { intentos.push({ correo, status: 'SIN_VARIABLE' }); continue; }
    const r = await http(E.base + '/sesiones/', { metodo: 'POST', cuerpo: { correo_electronico: correo, contrasena: process.env[E.passVar] } });
    if (r.status === 200 && r.body?.token) {
      const me = await http(E.base + '/usuarios/me', { token: r.body.token });
      const actor = { correo: me.body?.correo_electronico, id_usuario: me.body?.id_usuario, rol: me.body?.nombre_rol, id_rol: me.body?.id_rol, estado: me.body?.estado_cuenta, fincas: (me.body?.fincas || []).length };
      const habilitado = ROLES_CON_RECURSO_37.includes(actor.rol);
      intentos.push({ correo, status: r.status, rol: actor.rol, recurso_37: habilitado });
      if (habilitado) return { token: r.body.token, actor, intentos };
      // Autentica pero no puede leer/actualizar vinculaciones: se guarda como ultimo recurso.
      if (!alternativa) alternativa = { token: r.body.token, actor, rbacInsuficiente: true };
    } else {
      intentos.push({ correo, status: r.status, error_code: r.body?.error_code });
    }
    // Nunca se reintenta la misma cuenta: el bloqueo ocurre al quinto fallo.
  }
  if (alternativa) return { ...alternativa, intentos };
  return { token: null, actor: null, intentos };
}

const f10 = (d) => d.toISOString().slice(0, 10);

async function descubrir(base, token) {
  const variables = (await http(base + '/configuracion/variables-ambientales', { token })).body?.items || [];
  const especies = ((await http(base + '/configuracion/especies', { token })).body?.items || []).filter((s) => s.es_activo);
  const activosResp = await http(base + '/activos-biologicos?pagina=1&por_pagina=200', { token });
  const activos = activosResp.body?.registros || activosResp.body?.items || [];

  const candidatos = [];
  for (const s of especies) {
    const r = await http(base + `/configuracion/umbrales?id_especie=${s.id_especie}`, { token });
    for (const u of (r.body?.items || [])) {
      const ingerible = I3P1_TEMPERATURA[u.id_variable_ambiental];
      if (!u.es_activo || u.niveles?.length !== 3 || !ingerible) continue;
      const nivel = (n) => u.niveles.find((x) => x.nivel === n);
      if (!nivel('normal') || !nivel('precaucion') || !nivel('critico')) continue;
      const activosEspecie = activos.filter((a) => a.id_especie === s.id_especie);
      const prioridad = Object.values(CASOS).every((c) => interior(c.preferido, nivel(c.nivel).limite_inferior, nivel(c.nivel).limite_superior)) ? 1 : 2;
      candidatos.push({
        id_umbral_ambiental: u.id_umbral_ambiental, id_especie: s.id_especie, especie: s.nombre,
        id_variable_ambiental: u.id_variable_ambiental, variable: variables.find((v) => v.id_variable_ambiental === u.id_variable_ambiental)?.nombre,
        codigo_ingesta: ingerible.codigo, unidad: ingerible.unidad, valor_min: u.valor_min, valor_max: u.valor_max,
        fecha_actualizacion: u.fecha_actualizacion,
        niveles: ['normal', 'precaucion', 'critico'].map((n) => ({ nivel: n, limite_inferior: nivel(n).limite_inferior, limite_superior: nivel(n).limite_superior })),
        activosDisponibles: activosEspecie.length, prioridad,
        activo: activosEspecie.length
          ? (() => { const a = [...activosEspecie].sort((x, y) => x.id_activo_biologico - y.id_activo_biologico)[0];
              return { id_activo_biologico: a.id_activo_biologico, identificador: a.identificador || a.codigo_identificador || null, modelo_manejo: a.modelo_manejo || null }; })()
          : null,
      });
    }
  }
  // La cadena RF-61 exige un activo biologico real de la especie; sin el no hay especie que
  // resolver y el umbral no es utilizable como fixture de G31.
  const conActivo = candidatos.filter((c) => c.activo);
  const orden = (a, b) => (a.prioridad - b.prioridad) || (b.activosDisponibles - a.activosDisponibles) || (a.id_umbral_ambiental - b.id_umbral_ambiental);
  const elegido = [...conActivo].sort(orden)[0] || null;

  // Dispositivo + sensor + calibracion vigente
  let dispositivos = [];
  const lista = await http(base + '/configuracion/dispositivos-iot?pagina=1&por_pagina=50', { token });
  if (lista.status === 200) dispositivos = (lista.body?.items || lista.body?.registros || []);
  else for (const id of [1, 2, 3, 4, 5]) { const d = await http(base + `/configuracion/dispositivos-iot/${id}`, { token }); if (d.status === 200) dispositivos.push(d.body); }

  let cadena = null;
  for (const d of dispositivos.filter((x) => x.es_activo && x.id_infraestructura)) {
    const sr = await http(base + `/configuracion/dispositivos-iot/${d.id_dispositivo_iot}/sensores`, { token });
    const sensores = (sr.body?.items || sr.body?.registros || []).filter((x) => x.es_activo);
    const preferido = sensores.find((x) => /temperatur/i.test(x.nombre || '')) || sensores[0];
    if (!preferido) continue;
    const idSensor = preferido.id_sensor ?? preferido.id_sensores;
    const cr = await http(base + `/configuracion/sensores/${idSensor}/calibraciones?pagina=1&por_pagina=5`, { token });
    const calibraciones = (cr.body?.items || cr.body?.registros || []);
    const vigente = calibraciones.length
      ? [...calibraciones].sort((a, b) => new Date(b.fecha_calibracion) - new Date(a.fecha_calibracion))[0]
      : null;
    registrarSecreto(d.serial || d.numero_serie);
    cadena = {
      id_dispositivo_iot: d.id_dispositivo_iot, id_infraestructura: d.id_infraestructura,
      serial: d.serial || d.numero_serie, // solo en memoria; nunca se escribe sin sanitizar
      id_sensor: idSensor, nombre_sensor: preferido.nombre,
      calibracion: vigente ? { id_calibracion: vigente.id_calibracion, ganancia: String(vigente.ganancia), offset: String(vigente.offset), fecha_calibracion: vigente.fecha_calibracion } : null,
    };
    break;
  }

  let fixture = null;
  if (elegido && cadena) {
    const g = cadena.calibracion ? d2(cadena.calibracion.ganancia) : 100n;
    const off = cadena.calibracion ? d2(cadena.calibracion.offset) : 0n;
    fixture = { prioridad: elegido.prioridad, casos: {} };
    for (const [caso, c] of Object.entries(CASOS)) {
      const n = elegido.niveles.find((x) => x.nivel === c.nivel);
      const usaPreferido = interior(c.preferido, n.limite_inferior, n.limite_superior);
      // Valor objetivo = el que debe clasificarse (es el valor_ajustado que evalua el backend).
      const objetivo = usaPreferido ? c.preferido : t2((d2(n.limite_inferior) + d2(n.limite_superior)) / 2n);
      // Compensacion de calibracion RF-24: valor_ajustado = crudo*ganancia + offset
      //   => crudo = (objetivo - offset) / ganancia
      const crudo = g === 0n ? objetivo : t2(((d2(objetivo) - off) * 100n) / g);
      fixture.casos[caso] = {
        ...c, banda: [n.limite_inferior, n.limite_superior], usaValorPreferido: usaPreferido,
        valor_objetivo_clasificado: objetivo, valor_crudo_a_enviar: crudo,
        valor_ajustado_esperado: cadena.calibracion ? t2((d2(crudo) * g) / 100n + off) : null,
      };
    }
  }
  return { variables: variables.map((v) => ({ id: v.id_variable_ambiental, nombre: v.nombre, unidad: v.unidad })), candidatos, elegido, cadena, fixture };
}

// ---------------------------------------------------------------------------- PREFLIGHT
async function preflight() {
  const salida = { fase: 'preflight', fecha: new Date().toISOString(), entornos: {}, rama: {} };
  for (const repo of [['frontend', FRONT], ['backend', BACK]]) {
    const g = (...a) => execFileSync('git', a, { cwd: repo[1], encoding: 'utf8' }).trim();
    salida.rama[repo[0]] = { rama: g('branch', '--show-current'), head: g('rev-parse', 'HEAD'), status: g('status', '--short') || '(limpio)', indice: g('diff', '--cached', '--stat') || '(vacio)' };
  }
  for (const [nombre, E] of Object.entries(ENVS)) {
    const h = await http(E.base + '/health');
    const auth = await autenticar(E);
    const info = { base: E.base, health: h.status, logins: auth.intentos, autenticado: Boolean(auth.token), actor: auth.actor };
    if (auth.token && nombre === 'TEST') {
      const d = await descubrir(E.base, auth.token);
      info.discovery = { variables: d.variables.length, candidatos: d.candidatos, elegido: d.elegido, cadena: d.cadena ? { ...d.cadena, serial: '[REDACTED_ACCESS_KEY]' } : null, fixture: d.fixture };
    }
    salida.entornos[nombre] = info;
  }
  const destino = process.env.G31_PREFLIGHT_OUT || path.join(require('os').tmpdir(), 'g31-v3-preflight.json');
  fs.writeFileSync(destino, clean(JSON.stringify(salida, null, 2)));
  console.log('PREFLIGHT ->', destino);
  for (const [n, i] of Object.entries(salida.entornos)) console.log(' ', n, 'health', i.health, '| autenticado', i.autenticado, '| actor', i.actor ? `${i.actor.correo} rol=${i.actor.rol}` : '-', '| logins', JSON.stringify(i.logins));
  const disc = salida.entornos.TEST?.discovery;
  if (disc) {
    console.log('  umbral elegido', JSON.stringify(disc.elegido && { id: disc.elegido.id_umbral_ambiental, especie: disc.elegido.especie, variable: disc.elegido.variable, prioridad: disc.elegido.prioridad, activos: disc.elegido.activosDisponibles, niveles: disc.elegido.niveles }));
    console.log('  cadena', JSON.stringify(disc.cadena));
    console.log('  fixture', JSON.stringify(disc.fixture, null, 1));
  }
  console.log('\nPASO 7: crear RUN_ID solo si lo anterior es correcto.');
}

// ------------------------------------------------------------------------------ OFICIAL
async function oficial() {
  const runId = process.env.G31_V3_RUN_ID;
  if (!runId || !/^G31-REEVAL-V3-\d{8}-\d{6}$/.test(runId)) throw Error('G31_V3_RUN_ID con formato G31-REEVAL-V3-YYYYMMDD-HHMMSS es obligatorio');
  const E = ENVS.TEST;

  const auth = await autenticar(E);
  if (!auth.token) throw Error('BLOCKED: ninguna cuenta suministrada autentico en TEST ' + JSON.stringify(auth.intentos));
  const d = await descubrir(E.base, auth.token);
  if (!d.elegido || !d.cadena || !d.fixture) throw Error('BLOCKED: sin fixture RF-17 utilizable (umbral activo de 3 niveles sobre variable ingerible con activo biologico de la especie)');

  // UNICA carpeta de resultados (seccion 3 y 4).
  const R = path.join(__dirname, 'RESULTADOS', runId);
  if (fs.existsSync(R)) throw Error('El RUN_ID ya existe; conservar la evidencia: ' + runId);
  fs.mkdirSync(R, { recursive: true });

  const token = auth.token;
  const hoy = new Date(); const desde = new Date(hoy.getTime() - 2 * 86400e3);
  const ventana = { fecha_inicio: f10(desde), fecha_fin: f10(hoy) };
  const urlDash = E.base + '/iot/monitoreo/dashboard?pagina=1&por_pagina=50';
  const urlHist = `${E.base}/iot/monitoreo/historial?fecha_inicio=${ventana.fecha_inicio}&fecha_fin=${ventana.fecha_fin}&sensor_id=${d.cadena.id_sensor}&pagina=1&por_pagina=200&orden=DESC`;

  const sensorEn = (dash) => (dash.body?.sensores || []).find((s) => s.id_sensor === d.cadena.id_sensor) || null;
  const resumenSensor = (s) => s && ({ id_sensor: s.id_sensor, tipo_variable: s.tipo_variable, ultimo_valor: s.ultimo_valor, ultimo_timestamp_captura: s.ultimo_timestamp_captura, estado_semaforo: s.estado_semaforo, dato_desactualizado: s.dato_desactualizado, id_alerta: s.id_alerta, severidad_alerta: s.severidad_alerta });
  const lecturaEn = (hist, id) => (hist.body?.items || []).find((x) => x.id_telemetria === id) || null;
  const resumenLectura = (l) => l && ({ id_telemetria: l.id_telemetria, valor: l.valor, valor_ajustado: l.valor_ajustado, unidad_medida: l.unidad_medida, timestamp_captura: l.timestamp_captura, estado_calidad: l.estado_calidad, estado_semaforo_historico: l.estado_semaforo_historico, id_activo_biologico: l.id_activo_biologico, id_especie: l.id_especie, especie: l.especie, id_umbral_ambiental: l.id_umbral_ambiental, valor_min_umbral: l.valor_min_umbral, valor_max_umbral: l.valor_max_umbral, id_alerta: l.id_alerta });

  const umbralAntes = (await http(E.base + `/configuracion/umbrales?id_especie=${d.elegido.id_especie}`, { token })).body?.items?.find((x) => x.id_umbral_ambiental === d.elegido.id_umbral_ambiental);
  const dashPre = await http(urlDash, { token });
  const histPre = await http(urlHist, { token });
  const pre = { dashboard: { status: dashPre.status, sensor: resumenSensor(sensorEn(dashPre)) }, historial: { status: histPre.status, total: histPre.body?.total, semaforos: [...new Set((histPre.body?.items || []).map((x) => x.estado_semaforo_historico))] } };

  const porCaso = {};
  const escrituras = [];
  for (const [caso, plan] of Object.entries(d.fixture.casos)) {
    const reg = { caso, plan, orden: Object.keys(porCaso).length + 1 };
    // timestamp_captura en el pasado: chk_timestamp_coherencia exige captura <= procesamiento,
    // y el cache del dashboard solo se actualiza si la captura es la mas reciente del sensor.
    const captura = new Date(Date.now() - 90_000).toISOString();
    reg.request = { endpoint: 'POST /iot/telemetria', device_id: d.cadena.id_dispositivo_iot, sensor_id: d.cadena.id_sensor, tipo_variable: d.elegido.codigo_ingesta, valor: plan.valor_crudo_a_enviar, unidad: d.elegido.unidad, timestamp_captura: captura, access_key: '[REDACTED_ACCESS_KEY]', origen: 'TIEMPO_REAL' };
    const ing = await http(E.base + '/iot/telemetria', { metodo: 'POST', cuerpo: {
      device_id: d.cadena.id_dispositivo_iot, sensor_id: d.cadena.id_sensor, tipo_variable: d.elegido.codigo_ingesta,
      valor: plan.valor_crudo_a_enviar, unidad: d.elegido.unidad, timestamp_captura: captura,
      access_key: d.cadena.serial, origen: 'TIEMPO_REAL',
    } });
    reg.response = { status: ing.status, body: ing.body ? JSON.parse(clean(JSON.stringify(ing.body))) : null };
    escrituras.push({ caso, endpoint: 'POST /iot/telemetria', status: ing.status, reintento: false });

    // Sin reintento automatico: si no hay 201 se reconcilia por GET (seccion 10).
    let idTelemetria = ing.body?.id_telemetria ?? null;
    if (ing.status !== 201) {
      const rec = await http(urlHist, { token });
      const match = (rec.body?.items || []).find((x) => x.timestamp_captura?.startsWith(captura.slice(0, 19)));
      reg.reconciliacion = { motivo: 'status != 201', persistio: Boolean(match), lectura: resumenLectura(match) };
      idTelemetria = match?.id_telemetria ?? null;
    }
    reg.id_telemetria = idTelemetria;

    // Precondicion tecnica RF-61 (NO es el oraculo de G31, seccion 11).
    if (idTelemetria) {
      const v = await http(E.base + `/iot/vinculaciones?id_telemetria=${idTelemetria}`, { token });
      reg.vinculacion = { status: v.status, total: v.body?.total ?? null, items: (v.body?.items || []).map((x) => ({ id_vinculacion_lectura: x.id_vinculacion_lectura, estado_vinculacion: x.estado_vinculacion, mecanismo_vinculacion: x.mecanismo_vinculacion, id_activo_biologico: x.id_activo_biologico, modelo_manejo: x.modelo_manejo })) };
      const fila = (v.body?.items || []).find((x) => x.estado_vinculacion !== 'CORREGIDA');
      if (fila && fila.estado_vinculacion === 'AMBIGUA') {
        const r = await http(E.base + `/iot/vinculaciones/${fila.id_vinculacion_lectura}/resolver`, { metodo: 'PATCH', token, cuerpo: { id_activo_biologico: d.elegido.activo.id_activo_biologico, modelo_manejo: 'INDIVIDUAL', motivo: 'Precondicion tecnica QA TC-M09-G31 V3: resolver vinculacion ambigua' } });
        reg.precondicion = { endpoint: 'PATCH /iot/vinculaciones/{id}/resolver', status: r.status, body: r.body ? JSON.parse(clean(JSON.stringify(r.body))) : null };
        escrituras.push({ caso, endpoint: 'PATCH /iot/vinculaciones/{id}/resolver', status: r.status, reintento: false });
      } else if (fila && !fila.id_activo_biologico) {
        const r = await http(E.base + `/iot/vinculaciones/${fila.id_vinculacion_lectura}/corregir`, { metodo: 'POST', token, cuerpo: { id_activo_biologico: d.elegido.activo.id_activo_biologico, modelo_manejo: 'INDIVIDUAL', motivo: 'Precondicion tecnica QA TC-M09-G31 V3: vincular lectura a activo biologico de la especie del umbral' } });
        reg.precondicion = { endpoint: 'POST /iot/vinculaciones/{id}/corregir', status: r.status, body: r.body ? JSON.parse(clean(JSON.stringify(r.body))) : null };
        escrituras.push({ caso, endpoint: 'POST /iot/vinculaciones/{id}/corregir', status: r.status, reintento: false });
      } else if (!fila) {
        reg.precondicion = { endpoint: null, status: 'NO_APLICABLE', motivo: 'La ingesta no creo ninguna fila de vinculacion (ni SIN_VINCULAR): no hay nada que resolver ni corregir' };
      }
    }

    // Oraculo: dashboard inmediato (CA-5 vuelve GRIS si el dato deja de ser reciente) e historial.
    const dashPost = await http(urlDash, { token });
    const histPost = await http(urlHist, { token });
    reg.dashboard = { status: dashPost.status, sensor: resumenSensor(sensorEn(dashPost)) };
    reg.historial = { status: histPost.status, lectura: resumenLectura(lecturaEn(histPost, idTelemetria)) };
    reg.resultado = {
      clasificacion_esperada: plan.esperado,
      clasificacion_api_dashboard: reg.dashboard.sensor?.estado_semaforo ?? null,
      clasificacion_api_historial: reg.historial.lectura?.estado_semaforo_historico ?? null,
      valor_clasificado: reg.historial.lectura?.valor ?? null,
      valor_dentro_de_banda: reg.historial.lectura?.valor != null && interior(reg.historial.lectura.valor, plan.banda[0], plan.banda[1]),
      id_umbral_ambiental_usado: reg.historial.lectura?.id_umbral_ambiental ?? null,
      aprobado: reg.historial.lectura?.estado_semaforo_historico === plan.esperado && reg.dashboard.sensor?.estado_semaforo === plan.esperado,
    };
    porCaso[caso] = reg;
    console.log(caso, '| ingesta', reg.response.status, 'id', idTelemetria, '| crudo', plan.valor_crudo_a_enviar, '-> clasificado', reg.resultado.valor_clasificado,
      '| vinculacion total', reg.vinculacion?.total, '| esperado', plan.esperado, '| dashboard', reg.resultado.clasificacion_api_dashboard, '| historial', reg.resultado.clasificacion_api_historial, '| aprobado', reg.resultado.aprobado);
  }

  // La configuracion RF-17 no debe cambiar: G31 no escribe umbrales.
  const umbralDespues = (await http(E.base + `/configuracion/umbrales?id_especie=${d.elegido.id_especie}`, { token })).body?.items?.find((x) => x.id_umbral_ambiental === d.elegido.id_umbral_ambiental);
  const claveUmbral = (u) => u && JSON.stringify({ min: u.valor_min, max: u.valor_max, act: u.es_activo, niv: u.niveles, fecha: u.fecha_actualizacion });
  const configuracionSinCambios = claveUmbral(umbralAntes) === claveUmbral(umbralDespues);

  // ---------------------------------------------------------------- Newman (oraculo formal)
  const newman = require('newman');
  require.resolve('newman-reporter-htmlextra');
  const html = path.join(R, 'newman-g31-v3.html');
  const collection = JSON.parse(fs.readFileSync(path.join(__dirname, 'TC-M09-G31-reevaluacion-v3.postman_collection.json'), 'utf8'));
  const vars = {
    base_url: E.base, token, id_especie: d.elegido.id_especie, id_umbral: d.elegido.id_umbral_ambiental,
    id_sensor: d.cadena.id_sensor, fecha_inicio: ventana.fecha_inicio, fecha_fin: ventana.fecha_fin,
    ultimo_caso_semaforo: d.fixture.casos['TC-M09-68'].esperado,
  };
  for (const [caso, plan] of Object.entries(d.fixture.casos)) {
    const k = caso.replace('TC-M09-', 'tc');
    vars[`${k}_id_telemetria`] = porCaso[caso]?.id_telemetria ?? 0;
    vars[`${k}_valor`] = plan.valor_objetivo_clasificado;
    vars[`${k}_clase`] = plan.clase;
    vars[`${k}_semaforo`] = plan.esperado;
  }
  const summary = await new Promise((res, rej) => newman.run({
    collection, reporters: ['htmlextra', 'json'], timeoutRequest: 45000,
    reporter: {
      htmlextra: { export: html, omitHeaders: true, showEnvironmentData: false, showGlobalData: false, skipEnvironmentVars: ['token'], logs: false, silentProgressBar: true, title: 'TC-M09-66/67/68 — G31 REEVALUACION V3 — TEST' },
      json: { export: path.join(R, 'newman-g31-v3.json') },
    },
    environment: { values: Object.entries(vars).map(([key, value]) => ({ key, value: String(value), enabled: true })) },
  }, (err, sm) => (err ? rej(Error('Newman execution error: ' + clean(err.message))) : res(sm))));
  for (const f of ['newman-g31-v3.html', 'newman-g31-v3.json']) { const p = path.join(R, f); if (fs.existsSync(p)) fs.writeFileSync(p, clean(fs.readFileSync(p, 'utf8'))); }
  const aserciones = [];
  for (const ex of summary.run.executions) for (const a of ex.assertions || []) aserciones.push({ request: ex.item.name, test: a.assertion, ok: !a.error, detalle: a.error ? clean(a.error.message).slice(0, 300) : undefined });

  // -------------------------------------------------------- Contraste DEV (seccion 6, si TEST falla)
  const testAprobado = Object.values(porCaso).every((c) => c.resultado.aprobado);
  let dev = { ejecutado: false, motivo: 'TEST aprobo: el contraste DEV no es necesario' };
  if (!testAprobado) {
    const authDev = await autenticar(ENVS.DEV);
    if (!authDev.token) {
      dev = { ejecutado: false, estado: 'DEV_NO_VERIFICABLE_POR_CREDENCIAL', logins: authDev.intentos };
    } else {
      // Contraste de SOLO LECTURA: no se generan mediciones en DEV.
      const dd = await descubrir(ENVS.DEV.base, authDev.token);
      const dash = await http(ENVS.DEV.base + '/iot/monitoreo/dashboard?pagina=1&por_pagina=50', { token: authDev.token });
      const hist = await http(`${ENVS.DEV.base}/iot/monitoreo/historial?fecha_inicio=${ventana.fecha_inicio}&fecha_fin=${ventana.fecha_fin}&pagina=1&por_pagina=200&orden=DESC`, { token: authDev.token });
      const vinc = await http(ENVS.DEV.base + '/iot/vinculaciones?pagina=1&por_pagina=50', { token: authDev.token });
      dev = {
        ejecutado: true, tipo: 'SOLO_LECTURA', actor: authDev.actor, logins: authDev.intentos,
        umbralesCandidatos: dd.candidatos.map((c) => ({ id: c.id_umbral_ambiental, especie: c.especie, variable: c.variable, niveles: c.niveles, activos: c.activosDisponibles })),
        dashboard: { status: dash.status, semaforos: [...new Set((dash.body?.sensores || []).map((s) => s.estado_semaforo))] },
        historial: { status: hist.status, total: hist.body?.total, semaforos: [...new Set((hist.body?.items || []).map((x) => x.estado_semaforo_historico))], conEspecie: (hist.body?.items || []).filter((x) => x.id_especie).length },
        vinculaciones: { status: vinc.status, total: vinc.body?.total ?? null, porEstado: (vinc.body?.items || []).reduce((acc, x) => { acc[x.estado_vinculacion] = (acc[x.estado_vinculacion] || 0) + 1; return acc; }, {}), porMecanismo: (vinc.body?.items || []).reduce((acc, x) => { acc[x.mecanismo_vinculacion] = (acc[x.mecanismo_vinculacion] || 0) + 1; return acc; }, {}) },
      };
    }
  }

  // ------------------------------------------------------- Evidencia de codigo (causa raiz)
  const git = (cwd, ...a) => { try { return execFileSync('git', a, { cwd, encoding: 'utf8' }); } catch (e) { if (a[0] === 'grep' && e.status === 1) return ''; return 'ERROR: ' + clean(e.message).slice(0, 200); } };
  const lineas = (t) => String(t).split('\n').map((l) => l.trim()).filter(Boolean);
  const codigo = {
    clasificadorPresente: lineas(git(BACK, 'grep', '-n', 'calcular_por_niveles', 'HEAD', '--', 'src')),
    invocacionesReclasificar: lineas(git(BACK, 'grep', '-n', 'reclasificar_semaforo_use_case.execute', 'HEAD', '--', 'src')),
    stubActivoBiologico: lineas(git(BACK, 'show', 'HEAD:src/telemetry/infrastructure/adapters/activo_biologico_stub_adapter.py')).filter((l) => /class|return|Retorna/.test(l)),
    ramaVinculacionSinActivos: lineas(git(BACK, 'grep', '-n', '-A', '3', "estado = 'SIN_VINCULAR'", 'HEAD', '--', 'src/telemetry/application/use_cases/infraestructura/vincular_lectura_activo_use_case.py')),
    restriccionTablaVinculaciones: lineas(git(BACK, 'grep', '-n', 'chk_vinculacion_modelo', 'HEAD', '--', 'alembic/baseline/esquema_baseline.sql')).slice(0, 2),
    fallaSilenciosa: lineas(git(BACK, 'grep', '-n', 'RF-61: fallo en vinculación automática', 'HEAD', '--', 'src')),
  };

  // ------------------------------------------------------------------ Evidencia consolidada
  const evidencia = {
    grupo: 'TC-M09-G31', rf: 'RF-17', cu: 'CU-03', casos: Object.keys(CASOS), tipo: 'REEVALUACION V3',
    runId, environment: 'TEST', fecha: new Date().toISOString(),
    preflight: { health: (await http(E.base + '/health')).status, logins: auth.intentos },
    actor: auth.actor,
    discovery: {
      umbralesCandidatos: d.candidatos.map((c) => ({ id: c.id_umbral_ambiental, especie: c.especie, variable: c.variable, codigo_ingesta: c.codigo_ingesta, niveles: c.niveles, activos: c.activosDisponibles, prioridad: c.prioridad })),
      catalogoIngesta: { nota: 'Solo TEMPERATURA_AMBIENTAL (variable 9) y TEMPERATURA_CORPORAL (variable 13) son ingeribles (CATALOGO_I3P1). La variable 1 "Temperatura del agua" no tiene codigo de ingesta.', variables: I3P1_TEMPERATURA },
    },
    cadena: {
      sensor: { id: d.cadena.id_sensor, nombre: d.cadena.nombre_sensor },
      dispositivo: { id: d.cadena.id_dispositivo_iot, access_key: '[REDACTED_ACCESS_KEY]' },
      infraestructura: d.cadena.id_infraestructura,
      activo_biologico: d.elegido.activo, especie: { id: d.elegido.id_especie, nombre: d.elegido.especie },
      umbral: { id_umbral_ambiental: d.elegido.id_umbral_ambiental, variable: d.elegido.variable, id_variable_ambiental: d.elegido.id_variable_ambiental, general: [d.elegido.valor_min, d.elegido.valor_max], niveles: d.elegido.niveles, fecha_actualizacion: d.elegido.fecha_actualizacion },
      calibracion: d.cadena.calibracion,
    },
    fixture: {
      prioridad: d.fixture.prioridad,
      justificacion: d.fixture.prioridad === 1
        ? 'PRIORIDAD 1: 36/38/40 son interiores a las bandas vigentes.'
        : 'PRIORIDAD 2: 36/38/40 no son interiores a las bandas vigentes del umbral seleccionado, asi que se usan valores interiores equivalentes (parametrizacion del fixture, no una prueba nueva).',
      compensacionCalibracion: d.cadena.calibracion
        ? `El backend clasifica COALESCE(valor_ajustado, valor_crudo) y valor_ajustado = crudo*${d.cadena.calibracion.ganancia} + ${d.cadena.calibracion.offset}, por lo que el valor enviado se compensa para que el valor clasificado caiga dentro de la banda.`
        : 'Sensor sin calibracion vigente: se clasifica el valor crudo.',
      casos: d.fixture.casos,
    },
    pre, por_caso: porCaso, escrituras,
    threshold_config_after: { igualAntes: configuracionSinCambios },
    test_vs_dev: dev,
    codigo_causa_raiz: codigo,
    newman: { html: 'newman-g31-v3.html', json: 'newman-g31-v3.json', stats: summary.run.stats.assertions, aserciones },
    veredicto_por_caso: Object.fromEntries(Object.entries(porCaso).map(([c, r]) => [c, {
      threshold_config_id: d.elegido.id_umbral_ambiental, especie: d.elegido.especie, variable: d.elegido.variable,
      measurement_id: r.id_telemetria, measurement_value: r.resultado.valor_clasificado,
      expected_classification: `${r.plan.clase} / ${r.plan.esperado}`,
      api_classification_dashboard: r.resultado.clasificacion_api_dashboard,
      api_classification_historial: r.resultado.clasificacion_api_historial,
      result: r.resultado.aprobado ? 'APROBADO' : 'NO APROBADO',
    }])),
  };
  fs.writeFileSync(path.join(R, 'evidencia-g31-v3.json'), clean(JSON.stringify(evidencia, null, 2)));

  // record.json para Cypress (misma carpeta, sin secretos)
  fs.writeFileSync(path.join(R, 'record.json'), clean(JSON.stringify({
    id_sensor: d.cadena.id_sensor, nombre_sensor: d.cadena.nombre_sensor, id_umbral_ambiental: d.elegido.id_umbral_ambiental,
    especie: d.elegido.especie, variable: d.elegido.variable, casos: Object.fromEntries(Object.entries(porCaso).map(([c, r]) => [c, { id_telemetria: r.id_telemetria, esperado: r.plan.esperado, valor_clasificado: r.resultado.valor_clasificado, api_dashboard: r.resultado.clasificacion_api_dashboard, api_historial: r.resultado.clasificacion_api_historial }])),
  }, null, 2)));

  console.log('\nConfiguracion sin cambios:', configuracionSinCambios, '| TEST aprobado:', testAprobado);
  aserciones.forEach((a) => console.log(a.ok ? '  PASS' : '  FAIL', a.request, '::', a.test, a.ok ? '' : '-> ' + (a.detalle || '').slice(0, 140)));
  console.log('Evidencia consolidada:', path.join(R, 'evidencia-g31-v3.json'));
}

// --------------------------------------------------------------------------------------- UI
async function ui() {
  const runId = process.env.G31_V3_RUN_ID;
  const R = path.join(__dirname, 'RESULTADOS', runId);
  if (!fs.existsSync(path.join(R, 'record.json'))) throw Error('Falta record.json: ejecutar primero G31_FASE=oficial');
  // El entorno del editor define ELECTRON_RUN_AS_NODE=1, lo que hace que Cypress.exe arranque
  // como Node puro y rechace sus propias opciones (cachedDataRejected / bad option: --smoke-test).
  delete process.env.ELECTRON_RUN_AS_NODE;
  fs.mkdirSync(path.join(R, 'ui'), { recursive: true });
  const r = await require('cypress').run({ project: __dirname, browser: 'electron', configFile: path.join(__dirname, 'cypress.config.cjs') });
  const resultado = {
    status: r.status, totalTests: r.totalTests, totalPassed: r.totalPassed, totalFailed: r.totalFailed,
    browser: r.browserName, browserVersion: r.browserVersion, cypressVersion: r.cypressVersion, message: r.message,
    runs: r.runs?.map((x) => ({ spec: x.spec.name, screenshots: (x.screenshots || []).map((s) => path.relative(R, s.path).split(path.sep).join('/')), tests: x.tests.map((t) => ({ title: t.title, state: t.state, error: t.displayError })) })),
  };
  fs.writeFileSync(path.join(R, 'ui', 'result.json'), clean(JSON.stringify(resultado, null, 2)));
  console.log(clean(JSON.stringify(resultado, null, 2)));
  process.exitCode = r.totalFailed === 0 ? 0 : 1;
}

// --------------------------------------------- Complemento de SOLO LECTURA (mismo RUN_ID)
// Distingue defecto de producto de desfase de datos: si TEST y DEV comparten el mismo codigo,
// las filas de vinculacion que existan en cada ambiente deben provenir de siembra, no de la API.
async function complemento() {
  const runId = process.env.G31_V3_RUN_ID;
  const R = path.join(__dirname, 'RESULTADOS', runId);
  const archivo = path.join(R, 'evidencia-g31-v3.json');
  const evidencia = JSON.parse(fs.readFileSync(archivo, 'utf8'));
  const salida = {};
  for (const [nombre, E] of Object.entries(ENVS)) {
    const auth = await autenticar(E);
    if (!auth.token) { salida[nombre] = { estado: 'NO_VERIFICABLE_POR_CREDENCIAL', logins: auth.intentos }; continue; }
    const v = await http(E.base + '/iot/vinculaciones?pagina=1&por_pagina=200', { token: auth.token });
    const items = v.body?.items || [];
    salida[nombre] = {
      actor: auth.actor.correo, rol: auth.actor.rol, status: v.status, total: v.body?.total ?? null,
      porEstado: items.reduce((a, x) => { a[x.estado_vinculacion] = (a[x.estado_vinculacion] || 0) + 1; return a; }, {}),
      porMecanismo: items.reduce((a, x) => { a[x.mecanismo_vinculacion] = (a[x.mecanismo_vinculacion] || 0) + 1; return a; }, {}),
      rangoIdTelemetria: items.length ? [Math.min(...items.map((x) => x.id_telemetria)), Math.max(...items.map((x) => x.id_telemetria))] : null,
      rangoFechaCreacion: items.length ? [items.map((x) => x.fecha_creacion).sort()[0], items.map((x) => x.fecha_creacion).sort().slice(-1)[0]] : null,
      filas: items.map((x) => ({ id_vinculacion_lectura: x.id_vinculacion_lectura, id_telemetria: x.id_telemetria, estado_vinculacion: x.estado_vinculacion, mecanismo_vinculacion: x.mecanismo_vinculacion, id_activo_biologico: x.id_activo_biologico, modelo_manejo: x.modelo_manejo, fecha_creacion: x.fecha_creacion })),
    };
  }
  evidencia.complemento_solo_lectura = {
    fecha: new Date().toISOString(),
    proposito: 'Consultas GET agregadas al cierre, dentro del MISMO RUN_ID: censo de vinculaciones en TEST y DEV para determinar si alguna fila fue creada por la API de ingesta o si todas provienen de siembra.',
    vinculaciones: salida,
    lecturas_de_este_run: Object.fromEntries(Object.entries(evidencia.por_caso).map(([c, r]) => [c, r.id_telemetria])),
  };
  fs.writeFileSync(archivo, clean(JSON.stringify(evidencia, null, 2)));
  console.log(clean(JSON.stringify(evidencia.complemento_solo_lectura, null, 2)));
}

// ----------------------------------------------------------------------------------- CIERRE
function cierre() {
  const runId = process.env.G31_V3_RUN_ID;
  const R = path.join(__dirname, 'RESULTADOS', runId);
  if (!fs.existsSync(R)) throw Error('RUN_ID inexistente: ' + runId);
  const patrones = [
    ['password', /"?(contrasena|password|contraseña)"?\s*[:=]\s*"[^"\[]{3,}"/i],
    ['jwt', /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./],
    ['authorization', /"?authorization"?\s*[:=]\s*"(?!\[)[^"]*"/i],
    ['bearer', /Bearer\s+(?!\[)[A-Za-z0-9_.\-]{10,}/],
    ['refresh_token', /"refresh_token"\s*:\s*"[^"\[]{3,}"/],
    ['access_key', /"access_key"\s*:\s*"(?!\[)[^"]{3,}"/],
    ['cookie', /"?set-cookie"?\s*[:=]\s*"[^"\[]{3,}"/i],
    ['connstring', /postgres(ql)?:\/\/[^\s"]+/i],
  ];
  const archivos = [];
  const caminar = (dir) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) caminar(p); else archivos.push(p); } };
  caminar(R);
  const hallazgos = [];
  for (const p of archivos) {
    if (/\.(png|jpg|jpeg|gif|pdf|zip|mp4)$/i.test(p)) continue;
    const txt = fs.readFileSync(p, 'utf8');
    for (const [nombre, re] of patrones) if (re.test(txt)) hallazgos.push({ archivo: path.relative(R, p).split(path.sep).join('/'), patron: nombre, muestra: clean(String(txt.match(re)[0])).slice(0, 120) });
  }
  const seg = { runId, fecha: new Date().toISOString(), archivosEscaneados: archivos.length, archivosComprometidos: [...new Set(hallazgos.map((h) => h.archivo))].length, hallazgos };
  fs.writeFileSync(path.join(R, 'seguridad-evidencias.json'), JSON.stringify(seg, null, 2));

  const lineas = [];
  for (const [nombre, cwd] of [['FRONTEND', FRONT], ['BACKEND', BACK]]) {
    const g = (...a) => { try { return execFileSync('git', a, { cwd, encoding: 'utf8' }).trim(); } catch (e) { return 'ERROR: ' + e.message.slice(0, 120); } };
    g('fetch', 'origin');
    lineas.push(`=== ${nombre} ===`, 'rama: ' + g('branch', '--show-current'), 'HEAD: ' + g('rev-parse', 'HEAD'),
      'status --short:', g('status', '--short') || '(limpio)', 'diff --stat: ' + (g('diff', '--stat') || '(vacio)'),
      'diff --cached --stat (indice): ' + (g('diff', '--cached', '--stat') || '(vacio)'),
      'HEAD vs origin/test (left right): ' + g('rev-list', '--left-right', '--count', 'HEAD...origin/test'), '');
  }
  fs.writeFileSync(path.join(R, 'git-final.txt'), lineas.join('\n'));
  console.log('Seguridad:', seg.archivosEscaneados, 'archivos,', seg.archivosComprometidos, 'comprometidos');
  if (hallazgos.length) console.log(JSON.stringify(hallazgos, null, 1));
  console.log(lineas.join('\n'));
}

const FASE = (process.env.G31_FASE || 'oficial').toLowerCase();
(async () => {
  if (FASE === 'preflight') await preflight();
  else if (FASE === 'oficial') await oficial();
  else if (FASE === 'ui') await ui();
  else if (FASE === 'complemento') await complemento();
  else if (FASE === 'cierre') cierre();
  else throw Error('G31_FASE debe ser preflight | oficial | ui | complemento | cierre');
})().catch((e) => { console.log('ERROR:', clean(e.message)); process.exitCode = 1; });
