// TC-M09-G31 V4 — TC-M09-66/67/68: clasificacion semaforica contra los niveles RF-17
// (NORMAL/VERDE, PRECAUCION/AMARILLO, CRITICO/ROJO).
//
// POR QUE EXISTE ESTE RUNNER (seccion 38 del paquete)
// ---------------------------------------------------
// La fase `oficial` de EvaluacionV3/run-newman.cjs escribe dentro de EvaluacionV3/RESULTADOS/ y
// reescribe su propia coleccion. Reutilizarla tal cual modificaria V3, que debe quedar intacta.
// Este runner conserva la logica funcional de V3 —mismos casos, mismo orden, mismo fixture, mismo
// oraculo, mismas assertions— y solo cambia la carpeta de salida y el RUN_ID.
//
// Lo que NO cambia respecto de V3: los tres casos, el actor TEST, el endpoint de ingesta, la
// compensacion de calibracion, los targets efectivos 15/25/35, la cadena lectura -> activo ->
// especie -> umbral RF-17 -> nivel -> color, y la verificacion API + UI.
//
// Regla de parada (seccion 24-D): si la ingesta de TC-M09-66 no produce ninguna fila de
// vinculacion, el RUN se detiene y NO se envian TC-67 ni TC-68, para no repetir la misma causa.
//
// Fases:
//   G31_FASE=oficial  requiere G31_V4_RUN_ID: ejecuta los casos en orden y escribe la evidencia
//   G31_FASE=cierre   anade seguridad y estado final de Git a la misma evidencia
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const BASE_TEST = 'https://api.inmero.co/back-sigab-test';
const CORREO_TEST = 'administador.dev@gmail.com';

// Fixture V3, revalidado en el preflight de V4 (seccion 13).
const FIXTURE = {
  id_sensor: 1,
  nombre_sensor: 'Sensor temperatura estanque-01',
  id_dispositivo_iot: 1,
  id_infraestructura: 1,
  id_activo_biologico: 616,
  id_especie: 2,
  especie: 'Trucha Arcoiris',
  id_umbral_ambiental: 46,
  id_variable: 9,
  codigo_ingesta: 'TEMPERATURA_AMBIENTAL',
  unidad: '°C',
};

// Expected inalterable (secciones 1, 13 y 14): valores deliberadamente interiores a cada banda.
const CASOS = [
  { caso: 'TC-M09-66', nivel: 'normal', clase: 'NORMAL', esperado: 'VERDE', objetivo: '15.00' },
  { caso: 'TC-M09-67', nivel: 'precaucion', clase: 'PRECAUCION', esperado: 'AMARILLO', objetivo: '25.00' },
  { caso: 'TC-M09-68', nivel: 'critico', clase: 'CRITICO', esperado: 'ROJO', objetivo: '35.00' },
];

const AQUI = __dirname;
const PRUEBAS = path.resolve(AQUI, '..', '..', '..', '..', '..', '..', '..');
const FRONT = path.join(PRUEBAS, 'SGPMP-FRONT-END-PWA');
const BACK = path.join(PRUEBAS, 'sgpmp-backend');

// --- Sanitizado: contrasenas, JWT, Authorization y access_key del dispositivo ---
const secretos = new Set();
const registrarSecreto = (v) => { if (v && String(v).length > 3) secretos.add(String(v)); };
for (const v of ['TEST_ADMIN_PASSWORD', 'DEV_ADMIN_PASSWORD']) registrarSecreto(process.env[v]);
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

async function http(url, { metodo = 'GET', token, cuerpo } = {}) {
  const t0 = Date.now();
  try {
    const r = await fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
      redirect: 'manual',
      signal: AbortSignal.timeout(45000),
    });
    let body = null; try { body = await r.json(); } catch { /* sin JSON */ }
    return { status: r.status, body, ms: Date.now() - t0 };
  } catch (e) { return { status: 'ERR', error: clean(e.message), ms: Date.now() - t0 }; }
}

// El trigger RF-53 `fn_validar_timestamp_telemetria` rechaza timestamp_captura > now() del
// servidor, y el reloj de este equipo va 1-2 s adelantado. El timestamp se ancla al reloj del
// servidor (cabecera Date de /health) con margen, para que la captura siempre quede en su pasado.
const MARGEN_RELOJ_MS = 30000;
async function relojServidor() {
  const r = await fetch(BASE_TEST + '/health', { signal: AbortSignal.timeout(30000) });
  const d = r.headers.get('date');
  const servidor = d ? new Date(d).getTime() : Date.now();
  return { servidor, cliente: Date.now(), desfaseMs: Date.now() - servidor, fuente: d ? 'cabecera Date de /health' : 'reloj local (sin cabecera Date)' };
}

// GET /iot/monitoreo/historial exige fecha_inicio y fecha_fin, y filtra por `sensor_id`;
// fecha_fin no puede ser futura respecto del servidor (error FECHA_FIN_FUTURA).
function rutaHistorial(reloj) {
  const hoy = new Date(reloj.servidor).toISOString().slice(0, 10);
  return `/iot/monitoreo/historial?fecha_inicio=2026-09-01&fecha_fin=${hoy}`
    + `&sensor_id=${FIXTURE.id_sensor}&pagina=1&por_pagina=50&orden=desc`;
}

function git(repo, ...args) {
  try { return execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim(); }
  catch (e) { return 'ERROR: ' + String(e.message).slice(0, 120); }
}

function estadoGit() {
  const out = {};
  for (const [nombre, repo] of [['frontend', FRONT], ['backend', BACK]]) {
    out[nombre] = {
      rama: git(repo, 'branch', '--show-current'),
      head: git(repo, 'rev-parse', 'HEAD'),
      status: git(repo, 'status', '--short') || '(limpio)',
      indice: git(repo, 'diff', '--cached', '--stat') || '(vacio)',
      diff: git(repo, 'diff', '--stat') || '(vacio)',
      head_vs_origin_test: git(repo, 'rev-list', '--left-right', '--count', 'HEAD...origin/test'),
    };
  }
  return out;
}

// --------------------------------------------------------------------------------- ORACULO
// Assertion con registro: cada comprobacion funcional queda contada y trazada.
function crearOraculo() {
  const items = [];
  return {
    items,
    ok(caso, condicion, descripcion, observado) {
      items.push({ caso, descripcion, cumple: Boolean(condicion), observado: observado ?? null });
      return Boolean(condicion);
    },
    resumen() {
      return {
        total: items.length,
        superadas: items.filter((x) => x.cumple).length,
        fallidas: items.filter((x) => !x.cumple).length,
      };
    },
  };
}

// --------------------------------------------------------------------------------- OFICIAL
async function oficial() {
  const runId = process.env.G31_V4_RUN_ID;
  if (!runId) throw Error('Falta G31_V4_RUN_ID');
  const R = path.join(AQUI, 'RESULTADOS', runId);
  fs.mkdirSync(R, { recursive: true });

  const gitInicial = estadoGit();

  // --- Actor TEST (seccion 7: credencial autorizada ya configurada, nunca adivinada) ---
  if (!process.env.TEST_ADMIN_PASSWORD) throw Error('PRECONDICION DE CREDENCIAL TEST NO DISPONIBLE');
  const lg = await http(BASE_TEST + '/sesiones/', { metodo: 'POST', cuerpo: { correo_electronico: CORREO_TEST, contrasena: process.env.TEST_ADMIN_PASSWORD } });
  const token = lg.body?.token;
  if (!token) throw Error('El actor TEST no autentico: ' + lg.status);
  const me = await http(BASE_TEST + '/usuarios/me', { token });
  const actor = {
    correo: me.body?.correo_electronico, id_usuario: me.body?.id_usuario,
    rol: me.body?.nombre_rol, estado: me.body?.estado_cuenta,
    tokenPersistido: false,
  };

  // --- Umbral RF-17 vigente y sus niveles ---
  const um = await http(BASE_TEST + `/configuracion/umbrales?id_especie=${FIXTURE.id_especie}`, { token });
  const umbral = (um.body?.items || []).find((u) => u.id_umbral_ambiental === FIXTURE.id_umbral_ambiental);
  if (!umbral) throw Error('El umbral del fixture no esta disponible');
  const banda = (nivel) => (umbral.niveles || []).find((n) => n.nivel === nivel);

  // --- Calibracion vigente: la mas reciente por fecha (igual que CalibracionM09Adapter) ---
  const cal = await http(BASE_TEST + `/configuracion/sensores/${FIXTURE.id_sensor}/calibraciones`, { token });
  const vigente = (cal.body?.items || [])
    .filter((c) => c.id_dispositivo_iot === FIXTURE.id_dispositivo_iot)
    .sort((a, b) => (a.fecha_calibracion < b.fecha_calibracion ? 1 : -1))[0] || null;
  const g = vigente ? d2(vigente.ganancia) : 100n;
  const off = vigente ? d2(vigente.offset) : 0n;

  // --- access_key: serial del dispositivo, leido por la API oficial. No se persiste. ---
  const disp = await http(BASE_TEST + `/configuracion/dispositivos-iot/${FIXTURE.id_dispositivo_iot}`, { token });
  const accessKey = disp.body?.serial;
  if (!accessKey) throw Error('No se pudo obtener el access_key del dispositivo por la via autorizada');
  registrarSecreto(accessKey);

  // --- Alertas M03 sobre el sensor (seccion 19): no deben enmascarar la clasificacion ---
  const dashPrev = await http(BASE_TEST + `/iot/monitoreo/dashboard/${FIXTURE.id_infraestructura}`, { token });
  const sensorPrev = (dashPrev.body?.sensores || []).find((s) => s.id_sensor === FIXTURE.id_sensor) || null;
  const alertasM03 = {
    id_alerta: sensorPrev?.id_alerta ?? null,
    severidad_alerta: sensorPrev?.severidad_alerta ?? null,
    alertas_activas_count: (dashPrev.body?.resumen_unidades || []).reduce((a, u) => a + (u.alertas_activas_count || 0), 0),
    oraculoContaminado: Boolean(sensorPrev?.id_alerta),
  };

  const reloj = await relojServidor();

  const oraculo = crearOraculo();
  const escrituras = [];
  const casos = {};
  let detener = null;
  let orden = 0;

  for (const plan of CASOS) {
    orden += 1;
    const b = banda(plan.nivel);
    // crudo = (objetivo - offset) / ganancia  (modelo RF-24: ajustado = ganancia*crudo + offset)
    const crudo = g === 0n ? plan.objetivo : t2(((d2(plan.objetivo) - off) * 100n) / g);
    const ajustadoEsperado = vigente ? t2((d2(crudo) * g) / 100n + off) : null;
    // Captura anclada al reloj del servidor, siempre en su pasado y unica por caso.
    const captura = new Date(reloj.servidor - MARGEN_RELOJ_MS + orden * 1000).toISOString();

    const reg = {
      caso: plan.caso, clase: plan.clase, nivel_rf17: plan.nivel, color_esperado: plan.esperado,
      banda_rf17: b ? { limite_inferior: b.limite_inferior, limite_superior: b.limite_superior } : null,
      valor_efectivo_objetivo: plan.objetivo,
      calibracion_aplicada: vigente ? { id_calibracion: vigente.id_calibracion, ganancia: vigente.ganancia, offset: vigente.offset, fecha_calibracion: vigente.fecha_calibracion } : null,
      valor_crudo_enviado: crudo,
      valor_ajustado_esperado: ajustadoEsperado,
      timestamp_captura: captura,
    };

    oraculo.ok(plan.caso, b && interior(plan.objetivo, b.limite_inferior, b.limite_superior),
      `el valor efectivo ${plan.objetivo} es interior a la banda ${plan.nivel} del umbral RF-17`,
      b ? `${b.limite_inferior}..${b.limite_superior}` : null);

    // --- UNA sola ingesta por caso (seccion 25) ---
    reg.request = {
      endpoint: 'POST /iot/telemetria', device_id: FIXTURE.id_dispositivo_iot, sensor_id: FIXTURE.id_sensor,
      tipo_variable: FIXTURE.codigo_ingesta, valor: crudo, unidad: FIXTURE.unidad,
      timestamp_captura: captura, origen: 'TIEMPO_REAL', access_key: '[REDACTED_ACCESS_KEY]',
    };
    const ing = await http(BASE_TEST + '/iot/telemetria', { metodo: 'POST', cuerpo: {
      device_id: FIXTURE.id_dispositivo_iot, sensor_id: FIXTURE.id_sensor, tipo_variable: FIXTURE.codigo_ingesta,
      valor: crudo, unidad: FIXTURE.unidad, timestamp_captura: captura,
      access_key: accessKey, origen: 'TIEMPO_REAL',
    } });
    escrituras.push({ caso: plan.caso, endpoint: 'POST /iot/telemetria', status: ing.status, reintento: false });
    reg.response = { status: ing.status, ms: ing.ms, body: ing.body ? JSON.parse(clean(JSON.stringify(ing.body))) : null };
    oraculo.ok(plan.caso, ing.status === 201, 'la ingesta de la medicion responde HTTP 201', ing.status);

    // Reconciliacion por GET si la respuesta no trae el id (seccion 25: nunca reintentar la escritura)
    let idTelemetria = ing.body?.id_telemetria ?? null;
    if (!idTelemetria) {
      const hist = await http(BASE_TEST + rutaHistorial(reloj), { token });
      const m = (hist.body?.items || []).find((x) => x.timestamp_captura && x.timestamp_captura.slice(0, 19) === captura.slice(0, 19));
      idTelemetria = m?.id_telemetria ?? null;
      reg.reconciliacion = {
        via: 'GET /iot/monitoreo/historial', statusConsulta: hist.status,
        lecturasDevueltas: (hist.body?.items || []).length,
        encontrado: Boolean(idTelemetria),
        conclusion: idTelemetria ? 'la escritura si persistio' : 'la escritura no persistio',
      };
    }
    reg.id_telemetria = idTelemetria;
    reg.estado_calidad = ing.body?.estado_calidad ?? null;
    reg.valor_ajustado_observado = ing.body?.valor_ajustado ?? null;

    // --- Vinculacion de ESTA lectura (seccion 24) ---
    const v = idTelemetria
      ? await http(BASE_TEST + `/iot/vinculaciones?id_telemetria=${idTelemetria}`, { token })
      : { status: 'NO_CONSULTADA', body: null };
    const filas = (v.body?.items || []).filter((x) => x.id_telemetria === idTelemetria);
    reg.vinculacion = {
      consulta: `GET /iot/vinculaciones?id_telemetria=${idTelemetria}`,
      status: v.status, total_devuelto: v.body?.total ?? null, filas_de_esta_lectura: filas.length,
      estado_inicial: filas.length ? filas.map((x) => x.estado_vinculacion) : null,
      items: filas.map((x) => ({ id_vinculacion_lectura: x.id_vinculacion_lectura, estado_vinculacion: x.estado_vinculacion, mecanismo_vinculacion: x.mecanismo_vinculacion, id_activo_biologico: x.id_activo_biologico, modelo_manejo: x.modelo_manejo })),
    };

    const vigenteFila = filas.find((x) => x.estado_vinculacion !== 'CORREGIDA') || null;

    if (!vigenteFila) {
      // Seccion 24-D: no existe registro de vinculacion -> DETENER el RUN.
      reg.accion_vinculacion = {
        endpoint: null, status: 'NO_APLICABLE',
        motivo: 'La ingesta no creo ninguna fila de vinculacion para esta lectura (ni SIN_VINCULAR ni AMBIGUA): no hay nada que resolver ni corregir.',
      };
      reg.resultado = {
        clasificacion_api_dashboard: null, clasificacion_api_historial: null,
        id_activo_biologico: null, id_especie: null, id_umbral_ambiental: null,
        veredicto: 'BLOQUEADO / NO VERIFICABLE',
        motivo: 'Sin vinculacion lectura->activo no hay especie, por lo que el clasificador RF-17 no llega a ejecutarse.',
      };
      oraculo.ok(plan.caso, false, 'la ingesta genera un registro de vinculacion para la lectura', 'ninguna fila');
      casos[plan.caso] = reg;
      detener = {
        enCaso: plan.caso,
        motivo: 'La lectura ingerida no genero registro de vinculacion. Seccion 24-D: se detiene el RUN y no se envian los casos restantes para no repetir la misma causa.',
        casosNoEjecutados: CASOS.slice(CASOS.indexOf(plan) + 1).map((c) => c.caso),
      };
      break;
    }

    // A/B/C: una sola accion de vinculacion por caso (seccion 25)
    if (vigenteFila.estado_vinculacion === 'VINCULADA' && vigenteFila.id_activo_biologico === FIXTURE.id_activo_biologico) {
      reg.accion_vinculacion = { endpoint: null, status: 'NO_NECESARIA', motivo: 'La lectura ya quedo VINCULADA al activo correcto.' };
    } else if (vigenteFila.estado_vinculacion === 'AMBIGUA') {
      const r = await http(BASE_TEST + `/iot/vinculaciones/${vigenteFila.id_vinculacion_lectura}/resolver`, { metodo: 'PATCH', token, cuerpo: {
        id_activo_biologico: FIXTURE.id_activo_biologico, modelo_manejo: 'INDIVIDUAL',
        motivo: 'Precondicion tecnica QA TC-M09-G31 V4: resolver vinculacion ambigua hacia el activo de la especie del umbral',
      } });
      reg.accion_vinculacion = { endpoint: 'PATCH /iot/vinculaciones/{id}/resolver', status: r.status, body: r.body ? JSON.parse(clean(JSON.stringify(r.body))) : null };
      escrituras.push({ caso: plan.caso, endpoint: 'PATCH /iot/vinculaciones/{id}/resolver', status: r.status, reintento: false });
    } else {
      const r = await http(BASE_TEST + `/iot/vinculaciones/${vigenteFila.id_vinculacion_lectura}/corregir`, { metodo: 'POST', token, cuerpo: {
        id_activo_biologico: FIXTURE.id_activo_biologico, modelo_manejo: 'INDIVIDUAL',
        motivo: 'Precondicion tecnica QA TC-M09-G31 V4: vincular la lectura al activo biologico de la especie del umbral',
      } });
      reg.accion_vinculacion = { endpoint: 'POST /iot/vinculaciones/{id}/corregir', status: r.status, body: r.body ? JSON.parse(clean(JSON.stringify(r.body))) : null };
      escrituras.push({ caso: plan.caso, endpoint: 'POST /iot/vinculaciones/{id}/corregir', status: r.status, reintento: false });
    }

    // Estado final de la vinculacion, por GET
    const v2 = await http(BASE_TEST + `/iot/vinculaciones?id_telemetria=${idTelemetria}`, { token });
    const filas2 = (v2.body?.items || []).filter((x) => x.id_telemetria === idTelemetria);
    const final = filas2.find((x) => x.estado_vinculacion === 'VINCULADA') || filas2.find((x) => x.estado_vinculacion !== 'CORREGIDA') || null;
    reg.vinculacion.estado_final = final?.estado_vinculacion ?? null;
    reg.vinculacion.id_activo_final = final?.id_activo_biologico ?? null;
    oraculo.ok(plan.caso, final?.estado_vinculacion === 'VINCULADA', 'la lectura queda VINCULADA', final?.estado_vinculacion ?? null);
    oraculo.ok(plan.caso, final?.id_activo_biologico === FIXTURE.id_activo_biologico, 'la lectura queda vinculada al activo del fixture', final?.id_activo_biologico ?? null);

    // --- Oraculo API: dashboard + historial (secciones 29, 30, 31) ---
    const dash = await http(BASE_TEST + `/iot/monitoreo/dashboard/${FIXTURE.id_infraestructura}`, { token });
    const s = (dash.body?.sensores || []).find((x) => x.id_sensor === FIXTURE.id_sensor) || null;
    reg.dashboard = s ? {
      ultimo_valor: s.ultimo_valor, ultima_unidad: s.ultima_unidad,
      ultimo_timestamp_captura: s.ultimo_timestamp_captura, estado_semaforo: s.estado_semaforo,
      estado_calidad: s.estado_calidad, id_alerta: s.id_alerta, severidad_alerta: s.severidad_alerta,
    } : null;

    const hist = await http(BASE_TEST + rutaHistorial(reloj), { token });
    const l = (hist.body?.items || []).find((x) => x.id_telemetria === idTelemetria) || null;
    reg.historial = l ? {
      id_telemetria: l.id_telemetria, valor: l.valor, valor_ajustado: l.valor_ajustado,
      unidad_medida: l.unidad_medida, timestamp_captura: l.timestamp_captura,
      estado_calidad: l.estado_calidad, estado_semaforo_historico: l.estado_semaforo_historico,
      id_activo_biologico: l.id_activo_biologico, id_especie: l.id_especie, especie: l.especie,
      id_umbral_ambiental: l.id_umbral_ambiental, valor_min_umbral: l.valor_min_umbral,
      valor_max_umbral: l.valor_max_umbral, id_alerta: l.id_alerta,
    } : null;

    const valorClasificado = l?.valor_ajustado ?? l?.valor ?? reg.valor_ajustado_observado ?? null;
    oraculo.ok(plan.caso, l != null, 'la lectura de esta ejecucion aparece en el historial', l?.id_telemetria ?? null);
    oraculo.ok(plan.caso, valorClasificado != null && iguales(valorClasificado, plan.objetivo),
      `el valor evaluado es ${plan.objetivo}`, valorClasificado);
    oraculo.ok(plan.caso, l?.id_especie != null, 'el historial expone la especie de la lectura (cadena activo->especie)', l?.id_especie ?? null);
    oraculo.ok(plan.caso, l?.id_especie === FIXTURE.id_especie, 'la especie es la del fixture', l?.id_especie ?? null);
    oraculo.ok(plan.caso, l?.id_umbral_ambiental != null, 'el historial expone el umbral RF-17 aplicado', l?.id_umbral_ambiental ?? null);
    oraculo.ok(plan.caso, l?.id_umbral_ambiental === FIXTURE.id_umbral_ambiental, 'el umbral aplicado es el del fixture', l?.id_umbral_ambiental ?? null);
    oraculo.ok(plan.caso, l?.estado_semaforo_historico === plan.esperado, `el historial clasifica ${plan.esperado}`, l?.estado_semaforo_historico ?? null);
    oraculo.ok(plan.caso, s?.estado_semaforo === plan.esperado, `el dashboard clasifica ${plan.esperado}`, s?.estado_semaforo ?? null);
    oraculo.ok(plan.caso, s?.ultimo_timestamp_captura && s.ultimo_timestamp_captura.slice(0, 19) === captura.slice(0, 19),
      'el dashboard refleja la lectura de esta ejecucion', s?.ultimo_timestamp_captura ?? null);

    reg.resultado = {
      clasificacion_api_dashboard: s?.estado_semaforo ?? null,
      clasificacion_api_historial: l?.estado_semaforo_historico ?? null,
      valor_clasificado: valorClasificado,
      id_activo_biologico: l?.id_activo_biologico ?? null,
      id_especie: l?.id_especie ?? null,
      id_umbral_ambiental: l?.id_umbral_ambiental ?? null,
      cadena_rf17_demostrada: Boolean(l?.id_especie && l?.id_umbral_ambiental),
      aprobado_api: l?.estado_semaforo_historico === plan.esperado && s?.estado_semaforo === plan.esperado
        && l?.id_especie === FIXTURE.id_especie && l?.id_umbral_ambiental === FIXTURE.id_umbral_ambiental,
    };

    casos[plan.caso] = reg;
    console.log(plan.caso, '| ingesta', ing.status, 'id', idTelemetria,
      '| crudo', crudo, '-> evaluado', valorClasificado,
      '| vinc', reg.vinculacion.estado_inicial, '->', reg.vinculacion.estado_final,
      '| esp', reg.resultado.id_especie, 'umbral', reg.resultado.id_umbral_ambiental,
      '| dash', reg.resultado.clasificacion_api_dashboard, 'hist', reg.resultado.clasificacion_api_historial,
      '| esperado', plan.esperado, '| apiOk', reg.resultado.aprobado_api);
  }

  const evidencia = {
    grupo: 'TC-M09-G31', tipo: 'CUARTA EVALUACION (V4)', runId,
    rf: 'RF-17', cu: 'CU-03', responsableQa: 'Juan Esteban',
    fecha: new Date().toISOString(), ambienteDecisorio: 'TEST', baseUrl: BASE_TEST,
    git: { inicial: gitInicial },
    actor,
    fixture: {
      ...FIXTURE,
      revalidadoDeV3: true,
      umbral_rf17: { id_umbral_ambiental: umbral.id_umbral_ambiental, id_variable_ambiental: umbral.id_variable_ambiental,
        unidad_medida: umbral.unidad_medida, valor_min: umbral.valor_min, valor_max: umbral.valor_max,
        es_activo: umbral.es_activo, niveles: umbral.niveles },
      calibracion_vigente: vigente ? { id_calibracion: vigente.id_calibracion, ganancia: vigente.ganancia, offset: vigente.offset, fecha_calibracion: vigente.fecha_calibracion } : null,
      access_key: '[REDACTED_ACCESS_KEY]',
    },
    relojServidor: {
      ...reloj,
      margenAplicadoMs: MARGEN_RELOJ_MS,
      nota: 'El trigger RF-53 fn_validar_timestamp_telemetria rechaza timestamp_captura > now() del '
          + 'servidor. La captura se ancla al reloj del servidor con margen para que quede en su pasado.',
    },
    intentoDescartadoPorDesfaseDeReloj: {
      caso: 'TC-M09-66',
      endpoint: 'POST /iot/telemetria',
      timestamp_captura_enviado: '2026-10-05T07:08:34.558Z',
      http: 500,
      error_code: 'ERROR_INTERNO',
      mensaje: 'Error inesperado en base de datos',
      causa: 'El timestamp_captura se derivo del reloj de este equipo, que iba 1-2 s adelantado '
           + 'respecto del servidor; el trigger RF-53 fn_validar_timestamp_telemetria lo rechazo por '
           + 'ser posterior a now() y el error afloro como 500 generico.',
      reconciliacion: 'GET /iot/monitoreo/historial (sensor 1, 2026-09-01 a 2026-10-05): la lectura no '
                    + 'aparece. El historial solo contiene las telemetrias 49-54 de V3. 0 filas persistidas.',
      persistio: false,
      reintentoDeLaMismaEscritura: false,
      nota: 'Defecto de la automatizacion, no del producto ni de la clasificacion RF-17. Se corrigio el '
          + 'anclaje del reloj dentro del mismo RUN; no se abrio un segundo RUN.',
    },
    alertasM03: alertasM03,
    dashboardPrevio: sensorPrev ? { ultimo_valor: sensorPrev.ultimo_valor, ultimo_timestamp_captura: sensorPrev.ultimo_timestamp_captura, estado_semaforo: sensorPrev.estado_semaforo } : null,
    targets: CASOS.map((c) => ({ caso: c.caso, clase: c.clase, objetivo: c.objetivo, esperado: c.esperado })),
    casos,
    detencion: detener,
    escrituras: {
      detalle: escrituras,
      ingestas: escrituras.filter((x) => x.endpoint === 'POST /iot/telemetria').length,
      vinculacionesManuales: escrituras.filter((x) => x.endpoint !== 'POST /iot/telemetria').length,
      total: escrituras.length,
      sqlWrite: 0, reintentos: 0,
    },
    oraculo: { ...oraculo.resumen(), items: oraculo.items },
  };

  fs.writeFileSync(path.join(R, 'evidencia-g31-v4.json'), clean(JSON.stringify(evidencia, null, 2)));
  console.log('\nescrituras', evidencia.escrituras.total, '| assertions', evidencia.oraculo.total,
    'superadas', evidencia.oraculo.superadas, 'fallidas', evidencia.oraculo.fallidas);
  if (detener) console.log('DETENCION:', JSON.stringify(detener));
  console.log('evidencia ->', path.join(R, 'evidencia-g31-v4.json'));
}

// ---------------------------------------------------------------------------------- CIERRE
async function cierre() {
  const runId = process.env.G31_V4_RUN_ID;
  const R = path.join(AQUI, 'RESULTADOS', runId);
  const archivo = path.join(R, 'evidencia-g31-v4.json');
  const evidencia = JSON.parse(fs.readFileSync(archivo, 'utf8'));

  // Reconciliacion de SOLO LECTURA del caso detenido: deja constancia de que el color del
  // dashboard proviene del trigger de ingesta y no de RF-17, porque especie y umbral son nulos.
  if (evidencia.detencion && process.env.TEST_ADMIN_PASSWORD) {
    const lg = await http(BASE_TEST + '/sesiones/', { metodo: 'POST', cuerpo: { correo_electronico: CORREO_TEST, contrasena: process.env.TEST_ADMIN_PASSWORD } });
    const token = lg.body?.token;
    const idTel = evidencia.casos[evidencia.detencion.enCaso]?.id_telemetria ?? null;
    if (token && idTel) {
      const reloj = await relojServidor();
      const hist = await http(BASE_TEST + rutaHistorial(reloj), { token });
      const l = (hist.body?.items || []).find((x) => x.id_telemetria === idTel) || null;
      const dash = await http(BASE_TEST + `/iot/monitoreo/dashboard/${FIXTURE.id_infraestructura}`, { token });
      const s = (dash.body?.sensores || []).find((x) => x.id_sensor === FIXTURE.id_sensor) || null;
      const vinc = await http(BASE_TEST + '/iot/vinculaciones?pagina=1&por_pagina=100', { token });
      evidencia.reconciliacionPosteriorALaDetencion = {
        nota: 'Comprobaciones de solo lectura hechas despues de la parada, sin escrituras adicionales.',
        id_telemetria: idTel,
        historial: l ? {
          valor: l.valor, valor_ajustado: l.valor_ajustado, unidad_medida: l.unidad_medida,
          timestamp_captura: l.timestamp_captura, estado_calidad: l.estado_calidad,
          estado_semaforo_historico: l.estado_semaforo_historico,
          id_activo_biologico: l.id_activo_biologico, id_especie: l.id_especie, especie: l.especie,
          id_umbral_ambiental: l.id_umbral_ambiental, valor_min_umbral: l.valor_min_umbral,
          valor_max_umbral: l.valor_max_umbral, version_umbral: l.version_umbral, id_alerta: l.id_alerta,
        } : null,
        dashboard: s ? {
          ultimo_valor: s.ultimo_valor, ultimo_timestamp_captura: s.ultimo_timestamp_captura,
          estado_semaforo: s.estado_semaforo, estado_calidad: s.estado_calidad, id_alerta: s.id_alerta,
        } : null,
        vinculaciones: {
          total: vinc.body?.total ?? null,
          ids_telemetria: (vinc.body?.items || []).map((x) => x.id_telemetria).sort((a, b) => a - b),
          incluyeLaLecturaDeEsteRun: (vinc.body?.items || []).some((x) => x.id_telemetria === idTel),
        },
        lectura: {
          valorEfectivoAlcanzado: l?.valor ?? null,
          compensacionDeCalibracionCorrecta: l?.valor === '15.0000',
          especieResuelta: l?.id_especie != null,
          umbralAplicado: l?.id_umbral_ambiental != null,
          colorDelDashboard: s?.estado_semaforo ?? null,
          colorDelHistorial: l?.estado_semaforo_historico ?? null,
          coincidenciaAccidental: s?.estado_semaforo === 'VERDE' && l?.id_especie == null && l?.id_umbral_ambiental == null,
          interpretacion: 'El VERDE del dashboard lo fija el trigger de ingesta fn_actualizar_estado_sensor, '
                        + 'no la clasificacion RF-17: la lectura no tiene especie ni umbral aplicado y el '
                        + 'historial la deja en GRIS. Coincide con el color esperado de TC-M09-66 por azar, '
                        + 'de modo que no constituye aprobacion (seccion 26 del paquete).',
        },
      };
    }
  }

  const patrones = [
    ['contrasena literal', (t) => [...secretos].some((s) => t.includes(s))],
    ['JWT', (t) => /eyJ[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}/.test(t)],
    ['Bearer con valor', (t) => /Bearer\s+(?!\[REDACTED\])[A-Za-z0-9_.\-]{12,}/.test(t)],
    ['refresh_token con valor', (t) => /refresh_token"?\s*[:=]\s*"?(?!\[)[A-Za-z0-9_.\-]{12,}/.test(t)],
    ['access_token con valor', (t) => /access_token"?\s*[:=]\s*"?(?!\[)[A-Za-z0-9_.\-]{12,}/.test(t)],
  ];
  const hallazgos = [];
  const archivos = [];
  const recorrer = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { recorrer(p); continue; }
      archivos.push(path.relative(AQUI, p).split(path.sep).join('/'));
      if (/\.(png|jpg|jpeg|gif)$/i.test(e.name)) continue;
      const t = fs.readFileSync(p, 'utf8');
      for (const [nombre, fn] of patrones) if (fn(t)) hallazgos.push({ archivo: e.name, patron: nombre });
    }
  };
  recorrer(AQUI);

  evidencia.git.final = estadoGit();
  evidencia.seguridad = {
    archivosEscaneados: archivos.length,
    archivos,
    hallazgos,
    secretosPersistidos: hallazgos.length > 0,
    nota: 'La contrasena del actor y el access_key del dispositivo se tomaron de variables de proceso '
        + 'o de una lectura autorizada y se sustituyeron por marcadores antes de escribir la evidencia.',
  };
  const soloV4 = (estadoGit().frontend.status.split('\n').filter((l) => l.trim()) || [])
    .every((l) => l.includes('TC-M09-G31/EvaluacionV4'));
  evidencia.cierre = {
    v1Intacta: !estadoGit().frontend.status.includes('TC-M09-G31/RESULTADOS/'),
    v2Intacta: !estadoGit().frontend.status.includes('TC-M09-G31/EvaluacionV2'),
    v3Intacta: !estadoGit().frontend.status.includes('TC-M09-G31/EvaluacionV3'),
    indiceIntactoEnAmbos: estadoGit().frontend.indice === '(vacio)' && estadoGit().backend.indice === '(vacio)',
    soloCambiosEnEvaluacionV4DelFrontend: soloV4,
    gitAdd: false, commit: false, push: false, deploy: false,
  };
  fs.writeFileSync(archivo, clean(JSON.stringify(evidencia, null, 2)));
  console.log('Seguridad:', archivos.length, 'archivos,', hallazgos.length, 'hallazgos');
  console.log('Cierre:', JSON.stringify(evidencia.cierre, null, 1));
}

const FASE = (process.env.G31_FASE || 'oficial').toLowerCase();
(async () => {
  if (FASE === 'oficial') await oficial();
  else if (FASE === 'cierre') await cierre();
  else throw Error('G31_FASE debe ser oficial | cierre');
})().catch((e) => { console.log('ERROR:', clean(e.message)); process.exitCode = 1; });
