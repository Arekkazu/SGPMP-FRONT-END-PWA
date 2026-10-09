// TC-M09-G31 V5 — TC-M09-66/67/68: clasificacion semaforica RF-17 (36 NORMAL/VERDE,
// 38 PRECAUCION/AMARILLO, 40 CRITICO/ROJO) sobre un fixture provisionado por API oficial.
//
// POR QUE ESTE RUNNER EXISTE
// --------------------------
// V4 se detuvo porque ninguna lectura nueva obtenia activo biologico. El paquete V5 cambia la
// regla: la ausencia de datos ya no bloquea el grupo mientras exista una via publica soportada
// por la API para preparar el fixture. Este runner implementa esa secuencia:
//   discovery de solo lectura -> provision minima por endpoints publicos -> verificacion por GET
//   -> congelacion de IDs -> TC-66/67/68 -> limpieza por endpoints oficiales.
// No se usa SQL para preparar datos y no se reutiliza ningun runner anterior: V2/V3/V4 quedan
// intactos porque cada uno escribe en su propia carpeta.
//
// Fases (G31_FASE):
//   preflight  runtime TEST + Git + actor + discovery de solo lectura
//   fixture    provision del fixture por API + verificacion por GET + congelacion de IDs
//   oficial    TC-66 / TC-67 / TC-68 (1 ingesta + a lo sumo 1 resolucion por caso)
//   cleanup    reversion del fixture por endpoints oficiales
//   cierre     Git final + barrido de secretos en las evidencias
// Todas requieren G31_V5_RUN_ID y la contrasena del actor en TEST_ADMIN_PASSWORD.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const AQUI = __dirname;
const FRONT = path.resolve(AQUI, '../../../../../..');
const BACK = path.resolve(FRONT, '../sgpmp-backend');

const BASE = { test: 'https://api.inmero.co/back-sigab-test', dev: 'https://api.inmero.co/back-sigab-dev' };
const FRONTEND = { test: 'https://api.inmero.co/', dev: 'https://dev.inmero.co/' };
const CORREO = { test: 'administador.dev@gmail.com', dev: 'admin.dev@gmail.com' };

// Objetivos oficiales del grupo (secciones 0 y 14-16). No se recalculan durante el RUN.
const OBJETIVOS = [
  { caso: 'TC-M09-66', objetivo: '36.00', nivel: 'normal', color: 'VERDE' },
  { caso: 'TC-M09-67', objetivo: '38.00', nivel: 'precaucion', color: 'AMARILLO' },
  { caso: 'TC-M09-68', objetivo: '40.00', nivel: 'critico', color: 'ROJO' },
];
// Bandas objetivo (seccion 10.1). Contiguas y cubriendo [valor_min, valor_max] porque RF-17
// rechaza huecos y solapamientos; 36/38/40 quedan interiores y las fronteras son 37 y 39.
const BANDAS = {
  valor_min: '35.00', valor_max: '41.00',
  niveles: [
    { nivel: 'normal', limite_inferior: '35.00', limite_superior: '37.00' },
    { nivel: 'precaucion', limite_inferior: '37.00', limite_superior: '39.00' },
    { nivel: 'critico', limite_inferior: '39.00', limite_superior: '41.00' },
  ],
};
const ID_VARIABLE_TEMPERATURA = 9;      // TEMPERATURA_AMBIENTAL en el catalogo I3P-1
const CODIGO_INGESTA = 'TEMPERATURA_AMBIENTAL';
const UNIDAD = '°C';
const FINCA = 1;

// --- Sanitizado: contrasenas, JWT, Authorization y access_key del dispositivo ---
const secretos = new Set();
const registrarSecreto = (v) => { if (v && String(v).length > 3) secretos.add(String(v)); };
for (const v of ['TEST_ADMIN_PASSWORD', 'DEV_ADMIN_PASSWORD']) registrarSecreto(process.env[v]);
const clean = (s) => {
  if (s === null || s === undefined) return s;
  s = String(s);
  for (const x of secretos) s = s.split(x).join('[REDACTED_PASSWORD]');
  return s.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED_TOKEN]')
    .replace(/Bearer\s+(?!\[)[A-Za-z0-9_.\-]+/g, 'Bearer [REDACTED_TOKEN]');
};
const san = (o) => (o === null || o === undefined ? o : JSON.parse(clean(JSON.stringify(o))));

// --- Decimales exactos en centesimas (BigInt). Nunca float para comparar valores. ---
const d2 = (v) => { const [e, d = ''] = String(v).split('.'); const n = e.startsWith('-'); return (n ? -1n : 1n) * BigInt((n ? e.slice(1) : e) + (d + '00').slice(0, 2)); };
const t2 = (c) => { const n = c < 0n; const a = (n ? -c : c).toString().padStart(3, '0'); return (n ? '-' : '') + a.slice(0, -2) + '.' + a.slice(-2); };
const iguales = (a, b) => d2(a) === d2(b);
const dentro = (v, lo, hi) => d2(v) >= d2(lo) && d2(v) <= d2(hi);
const esFrontera = (v, lo, hi) => d2(v) === d2(lo) || d2(v) === d2(hi);
// Mismo recorrido que SemaforoCalculator.calcular_por_niveles: primer nivel cuyo
// [inferior, superior] contiene el valor; fuera de todas las bandas -> ROJO.
const COLOR = { normal: 'VERDE', precaucion: 'AMARILLO', critico: 'ROJO' };
const clasificar = (valor, niveles) => {
  for (const n of niveles) if (dentro(valor, n.limite_inferior, n.limite_superior)) return COLOR[n.nivel] || 'ROJO';
  return 'ROJO';
};

async function http(url, { metodo = 'GET', token, cuerpo } = {}) {
  const t0 = Date.now();
  try {
    const r = await fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
      redirect: 'manual', signal: AbortSignal.timeout(60000),
    });
    let body = null; try { body = await r.json(); } catch { /* sin JSON */ }
    return { status: r.status, body, ms: Date.now() - t0 };
  } catch (e) { return { status: 'ERR', error: clean(e.message), ms: Date.now() - t0 }; }
}

async function login(amb) {
  const pw = process.env[amb === 'test' ? 'TEST_ADMIN_PASSWORD' : 'DEV_ADMIN_PASSWORD'];
  if (!pw) throw Error('PRECONDICION DE CREDENCIAL NO DISPONIBLE: ' + amb);
  const r = await http(BASE[amb] + '/sesiones/', { metodo: 'POST', cuerpo: { correo_electronico: CORREO[amb], contrasena: pw } });
  const token = r.body?.access_token || r.body?.token;
  if (!token) throw Error('LOGIN FALLIDO ' + amb + ' status=' + r.status);
  registrarSecreto(token);
  return { token, status: r.status };
}

// El trigger RF-53 `fn_validar_timestamp_telemetria` rechaza timestamp_captura > now() del
// servidor. El timestamp se ancla al reloj del servidor (cabecera Date de /health) con margen.
const MARGEN_RELOJ_MS = 30000;
async function relojServidor(amb) {
  const r = await fetch(BASE[amb] + '/health', { signal: AbortSignal.timeout(30000) });
  const d = r.headers.get('date');
  const servidor = d ? new Date(d).getTime() : Date.now();
  return { servidor_iso: new Date(servidor).toISOString(), servidor, cliente: Date.now(), desfase_ms: Date.now() - servidor, fuente: d ? 'cabecera Date de /health' : 'reloj local (sin cabecera Date)' };
}

function git(repo, ...args) {
  try { return execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim(); }
  catch (e) { return 'ERROR: ' + String(e.message).slice(0, 160); }
}
function estadoGit() {
  const out = {};
  for (const [nombre, repo] of [['frontend', FRONT], ['backend', BACK]]) {
    out[nombre] = {
      rama: git(repo, 'branch', '--show-current'), head: git(repo, 'rev-parse', 'HEAD'),
      status: git(repo, 'status', '--short') || '(limpio)',
      indice: git(repo, 'diff', '--cached', '--stat') || '(vacio)',
      diff: git(repo, 'diff', '--stat') || '(vacio)',
      origin_test: git(repo, 'rev-parse', 'origin/test'), origin_dev: git(repo, 'rev-parse', 'origin/dev'),
      head_vs_origin_test: git(repo, 'rev-list', '--left-right', '--count', 'HEAD...origin/test'),
    };
  }
  return out;
}

// --------------------------------------------------------------------------------- ORACULO
// `page_size` de /activos-biologicos admite como maximo 100: el censo de un area se recorre
// pagina a pagina para no perder activos operativos por truncamiento.
async function censoActivos(token, idInfra) {
  const todos = [];
  let pagina = 1, paginas = 1, total = null, status = null;
  do {
    const r = await http(BASE.test + `/activos-biologicos?id_infraestructura=${idInfra}&pagina=${pagina}&page_size=100`, { token });
    status = r.status;
    if (r.status !== 200) return { status, total, registros: todos, completo: false };
    total = r.body?.total_registros ?? null;
    paginas = r.body?.total_paginas ?? 1;
    todos.push(...(r.body?.registros || []));
    pagina += 1;
  } while (pagina <= paginas && pagina <= 20);
  return { status, total, registros: todos, completo: total === null || todos.length >= total };
}

function crearOraculo() {
  const items = [];
  return {
    items,
    ok(caso, condicion, descripcion, observado) {
      items.push({ caso, descripcion, cumple: Boolean(condicion), observado: observado === undefined ? null : observado });
      return Boolean(condicion);
    },
    resumen() {
      return { total: items.length, superadas: items.filter((i) => i.cumple).length, fallidas: items.filter((i) => !i.cumple).length };
    },
  };
}

// --------------------------------------------------------------------------------- IO
const RUN_ID = process.env.G31_V5_RUN_ID;
if (!RUN_ID) throw Error('Falta G31_V5_RUN_ID');
const OUT = path.join(AQUI, 'RESULTADOS', RUN_ID);
const UI = path.join(OUT, 'ui');
fs.mkdirSync(UI, { recursive: true });
const escribir = (nombre, datos) => fs.writeFileSync(path.join(OUT, nombre), clean(JSON.stringify(datos, null, 2)) + '\n');
const leer = (nombre) => JSON.parse(fs.readFileSync(path.join(OUT, nombre), 'utf8'));
const existe = (nombre) => fs.existsSync(path.join(OUT, nombre));

// --------------------------------------------------------------------------------- FASE preflight
async function fasePreflight() {
  const ev = { run_id: RUN_ID, fase: 'preflight', paquete: 'TC-M09-G31 REEVALUACION V5 (RUN limpio + provision de fixture por API)', iniciado: new Date().toISOString() };
  ev.git_inicial = estadoGit();

  // Runtime TEST (seccion 7)
  const frontal = await fetch(FRONTEND.test, { signal: AbortSignal.timeout(45000) }).then((r) => ({ status: r.status })).catch((e) => ({ status: 'ERR', error: clean(e.message) }));
  const health = await http(BASE.test + '/health');
  const openapi = await http(BASE.test + '/openapi.json');
  ev.runtime_test = {
    frontend: { url: FRONTEND.test, status: frontal.status },
    health: { url: BASE.test + '/health', status: health.status, body: san(health.body) },
    openapi: { url: BASE.test + '/openapi.json', status: openapi.status, version: openapi.body?.info?.version ?? null, rutas: Object.keys(openapi.body?.paths || {}).length },
  };
  ev.reloj = await relojServidor('test');

  const lg = await login('test');
  const token = lg.token;
  const me = await http(BASE.test + '/usuarios/me', { token });
  ev.actor = { correo: CORREO.test, contrasena: '[REDACTED_PASSWORD]', login_status: lg.status, id_usuario: me.body?.id_usuario ?? null, rol: me.body?.rol ?? me.body?.nombre_rol ?? null, es_activo: me.body?.es_activo ?? null };

  // Endpoints que se usaran, confirmados contra OpenAPI (seccion 9.1)
  const rutas = openapi.body?.paths || {};
  const plan = [
    ['GET', '/configuracion/variables-ambientales', 'discovery de la variable de temperatura'],
    ['GET', '/configuracion/especies', 'discovery de especies activas'],
    ['GET', '/configuracion/umbrales', 'discovery de umbrales RF-17 por especie'],
    ['GET', '/configuracion/infraestructuras', 'discovery de areas de la finca'],
    ['GET', '/configuracion/dispositivos-iot', 'discovery de dispositivos IoT'],
    ['GET', '/activos-biologicos', 'censo de activos por area'],
    ['POST', '/configuracion/especies', 'crear especie QA si no hay una adecuada'],
    ['POST', '/configuracion/umbrales', 'crear el umbral RF-17 de la especie QA'],
    ['POST', '/configuracion/infraestructuras', 'crear el area QA si ninguna area con dispositivo tiene un solo activo operativo'],
    ['POST', '/configuracion/dispositivos-iot', 'crear el dispositivo IoT QA del area'],
    ['POST', '/configuracion/dispositivos-iot/{id_dispositivo_iot}/sensores', 'crear el sensor de temperatura QA'],
    ['POST', '/infraestructuras/{id_infraestructura}/sensores', 'asociar el sensor al area'],
    ['POST', '/configuracion/sensores/{id_sensor}/calibrar', 'calibrar el sensor QA'],
    ['POST', '/activos-biologicos', 'crear el activo biologico QA'],
    ['POST', '/iot/telemetria', 'ingesta oficial de cada caso'],
    ['GET', '/iot/vinculaciones', 'vinculacion de cada lectura'],
    ['PATCH', '/iot/vinculaciones/{id_vinculacion_lectura}/resolver', 'resolucion unica si la vinculacion queda AMBIGUA'],
    ['GET', '/iot/monitoreo/historial', 'oraculo de clasificacion por lectura'],
    ['GET', '/iot/monitoreo/dashboard/{id_infraestructura}', 'oraculo de color del sensor'],
    ['PATCH', '/configuracion/umbrales/{id_umbral_ambiental}/desactivar', 'reversion del umbral QA'],
    ['POST', '/activos-biologicos/{id_activo}/cierre', 'reversion del activo QA'],
    ['PATCH', '/configuracion/especies/{id_especie}/desactivar', 'reversion de la especie QA'],
    ['PATCH', '/configuracion/dispositivos-iot/{id_dispositivo_iot}/desactivar', 'reversion del dispositivo QA'],
    ['PATCH', '/configuracion/infraestructuras/{id_infraestructura}/desactivar', 'reversion del area QA'],
  ];
  ev.endpoints_previstos = plan.map(([m, p, para]) => ({ metodo: m, ruta: p, para, en_openapi: Boolean(rutas[p]?.[m.toLowerCase()]) }));
  ev.endpoints_faltantes = ev.endpoints_previstos.filter((e) => !e.en_openapi).map((e) => `${e.metodo} ${e.ruta}`);

  // --- Discovery de solo lectura (seccion 8) ---
  const g = async (u) => http(BASE.test + u, { token });
  const vars = await g('/configuracion/variables-ambientales');
  const variable = (vars.body?.items || []).find((v) => v.id_variable_ambiental === ID_VARIABLE_TEMPERATURA) || null;
  const rangos = await g('/configuracion/sensores/rangos-calibracion');
  const especies = (await g('/configuracion/especies?solo_activas=true')).body?.items || [];
  const dispositivos = (await g('/configuracion/dispositivos-iot')).body?.items || [];
  const infras = (await g(`/configuracion/infraestructuras?finca_id=${FINCA}&solo_activas=true`)).body?.items || [];

  // Solo las areas con dispositivo IoT activo pueden recibir una ingesta, porque
  // VincularLecturaActivoUseCase recibe la infraestructura DEL DISPOSITIVO.
  const areasConDispositivo = [...new Set(dispositivos.filter((d) => d.es_activo).map((d) => d.id_infraestructura))].filter(Boolean).sort((a, b) => a - b);
  const censo = [];
  for (const idInfra of areasConDispositivo) {
    const a = await censoActivos(token, idInfra);
    const regs = a.registros;
    const operativos = regs.filter((x) => [1, 3, 4].includes(x.id_estado));
    censo.push({
      id_infraestructura: idInfra, total_registros: a.total, censo_completo: a.completo, operativos: operativos.length,
      especies_operativas: [...new Set(operativos.map((x) => x.id_especie))],
      muestra: operativos.slice(0, 5).map((x) => ({ id: x.id_activo_biologico, tipo: x.tipo, estado: x.nombre_estado, id_especie: x.id_especie })),
    });
  }

  // Un fixture natural solo sirve si el area tiene EXACTAMENTE un activo operativo —con varios la
  // vinculacion queda AMBIGUA con id_activo NULL y modelo INDIVIDUAL, combinacion que la
  // restriccion chk_vinculacion_modelo rechaza, de modo que no se crearia ninguna fila— y si el
  // umbral RF-17 de su especie para la variable 9 clasifica 36/38/40 como NORMAL/PRECAUCION/CRITICO
  // sin que ninguno caiga en frontera.
  const candidatos = [];
  for (const c of censo.filter((x) => x.operativos === 1)) {
    const idEspecie = c.especies_operativas[0];
    const u = (await g(`/configuracion/umbrales?id_especie=${idEspecie}&solo_activas=true`)).body?.items || [];
    const umbral = u.find((x) => x.id_variable_ambiental === ID_VARIABLE_TEMPERATURA && x.es_activo) || null;
    const clasifica = umbral ? OBJETIVOS.map((o) => ({ caso: o.caso, objetivo: o.objetivo, color_calculado: clasificar(o.objetivo, umbral.niveles), esperado: o.color, en_frontera: umbral.niveles.some((n) => esFrontera(o.objetivo, n.limite_inferior, n.limite_superior)) })) : null;
    candidatos.push({
      id_infraestructura: c.id_infraestructura, id_especie: idEspecie, id_activo_biologico: c.muestra[0]?.id ?? null,
      umbral: umbral ? { id: umbral.id_umbral_ambiental, min: umbral.valor_min, max: umbral.valor_max, niveles: umbral.niveles } : null,
      clasifica, sirve: Boolean(clasifica && clasifica.every((x) => x.color_calculado === x.esperado && !x.en_frontera)),
    });
  }
  ev.discovery = {
    variable_temperatura: san(variable),
    rango_calibracion_temperatura: san((rangos.body?.items || []).find((x) => x.categoria === 'TEMPERATURA') || null),
    especies_activas: especies.length,
    dispositivos_activos: dispositivos.filter((d) => d.es_activo).length,
    areas_activas_finca_1: infras.map((i) => ({ id: i.id_infraestructura, nombre: i.nombre_infraestructura, tipo_area: i.tipo_area, especie_id: i.especie_id })),
    areas_con_dispositivo_activo: censo,
    candidatos_fixture_natural: candidatos,
    fixture_natural_encontrado: candidatos.some((c) => c.sirve),
    conclusion: candidatos.some((c) => c.sirve)
      ? 'existe una combinacion natural que satisface el caso: se reutiliza sin crear nada'
      : 'no existe combinacion natural: se provisiona el fixture minimo por endpoints publicos (seccion 9)',
  };
  ev.terminado = new Date().toISOString();
  escribir('preflight.json', ev);
  console.log('preflight OK  fixture_natural=' + ev.discovery.fixture_natural_encontrado + '  endpoints_faltantes=' + ev.endpoints_faltantes.length);
  for (const c of censo) console.log('  area ' + c.id_infraestructura + ' activos_operativos=' + c.operativos);
}

// --------------------------------------------------------------------------------- FASE fixture
async function faseFixture() {
  const pre = leer('preflight.json');
  const { token } = await login('test');
  const reloj = await relojServidor('test');
  const g = async (u) => http(BASE.test + u, { token });
  const p = async (u, cuerpo, metodo = 'POST') => http(BASE.test + u, { metodo, token, cuerpo });

  // El manifiesto se conserva entre intentos: si un paso de la provision falla, lo ya creado queda
  // registrado (y por tanto es reversible por la fase cleanup) y al reintentar se reutiliza en vez
  // de duplicarse. Ningun paso se ejecuta dos veces sobre el mismo RUN_ID.
  const man = (existe('fixture-created.json') && leer('fixture-created.json').run_id === RUN_ID)
    ? leer('fixture-created.json')
    : { run_id: RUN_ID, fase: 'fixture', iniciado: new Date().toISOString(), estrategia: null, creados: [], escrituras_preparacion: 0 };
  man.reintentos = (man.reintentos || 0) + (man.creados.length ? 1 : 0);
  const ya = (tipo) => man.creados.find((c) => c.tipo === tipo) || null;
  const registrar = (tipo, id, endpoint, payload, reversion, estadoPre) => {
    man.creados.push({ tipo, id, endpoint_creacion: endpoint, payload_saneado: san(payload), endpoint_reversion: reversion, estado_PRE: estadoPre, estado_POST: null });
    man.escrituras_preparacion += 1;
    escribir('fixture-created.json', man);   // persistir en cada paso: nada queda huerfano
    return id;
  };

  const natural = (pre.discovery.candidatos_fixture_natural || []).find((c) => c.sirve) || null;
  let fx;

  if (natural) {
    man.estrategia = 'REUTILIZACION: el discovery encontro un fixture natural que satisface todas las precondiciones; no se crea ningun dato';
    fx = { id_infraestructura: natural.id_infraestructura, id_especie: natural.id_especie, id_activo_biologico: natural.id_activo_biologico, id_umbral_ambiental: natural.umbral.id, creado_por_qa: false };
  } else {
    man.estrategia = 'PROVISION MINIMA POR API: ninguna area con dispositivo activo tiene exactamente un activo operativo cuyo umbral RF-17 clasifique 36/38/40, de modo que se crea el conjunto minimo coherente (especie QA, umbral QA, area QA, dispositivo QA, sensor QA, calibracion QA, activo QA) solo con endpoints publicos';
    const sufijo = RUN_ID.replace(/[^0-9]/g, '').slice(-10);
    // El nombre de especie solo admite letras y espacios (regex NOMBRE de RF-15), asi que el
    // RUN_ID va en la descripcion; el resto de los nombres si lo llevan literal.
    const nombreEspecie = 'Qa Semaforo Geuno ' + sufijo.split('').map((d) => 'abcdefghij'[Number(d)]).join('');
    const nota = `Fixture temporal QA TC-M09-G31 ${RUN_ID}`;

    // 1. Especie QA dedicada (no se toca ninguna especie de negocio)
    const cuerpoEsp = { nombre: nombreEspecie, descripcion: nota, tipo_modelo: 'MODELO_ACUICULTURA' };
    let idEspecie = ya('especie')?.id ?? null;
    if (!idEspecie) {
      const esp = await p('/configuracion/especies', cuerpoEsp);
      if (![200, 201].includes(esp.status)) throw Error('FIXTURE POST /configuracion/especies -> ' + esp.status + ' ' + clean(JSON.stringify(esp.body)).slice(0, 400));
      idEspecie = registrar('especie', esp.body.id_especie, 'POST /configuracion/especies', cuerpoEsp, `PATCH /configuracion/especies/${esp.body.id_especie}/desactivar`, 'no existia');
    }

    // 2. Umbral RF-17 de la especie QA para la variable de temperatura
    const cuerpoUmbral = { id_especie: idEspecie, id_variable_ambiental: ID_VARIABLE_TEMPERATURA, valor_min: BANDAS.valor_min, valor_max: BANDAS.valor_max, niveles: BANDAS.niveles };
    let idUmbral = ya('umbral_rf17')?.id ?? null;
    if (!idUmbral) {
      const um = await p('/configuracion/umbrales', cuerpoUmbral);
      // RF-17 persiste el umbral antes de propagarlo al Nodo Edge: un 500 de propagacion dejaria
      // el umbral guardado, asi que se reconcilia por GET antes de decidir.
      idUmbral = um.body?.id_umbral_ambiental ?? null;
      if (!idUmbral) {
        const r = await g(`/configuracion/umbrales?id_especie=${idEspecie}&solo_activas=true`);
        idUmbral = (r.body?.items || []).find((x) => x.id_variable_ambiental === ID_VARIABLE_TEMPERATURA)?.id_umbral_ambiental ?? null;
        man.umbral_reconciliado = { status_creacion: um.status, body: san(um.body), encontrado_por_get: Boolean(idUmbral) };
      }
      if (!idUmbral) throw Error('FIXTURE POST /configuracion/umbrales -> ' + um.status + ' ' + clean(JSON.stringify(um.body)).slice(0, 400));
      registrar('umbral_rf17', idUmbral, 'POST /configuracion/umbrales', cuerpoUmbral, `PATCH /configuracion/umbrales/${idUmbral}/desactivar`, 'no existia');
    }

    // 3. Area QA vacia: garantiza UN solo activo operativo y por tanto vinculacion VINCULADA
    const cuerpoInfra = { nombre_infraestructura: `QA-G31-AREA-${sufijo}`, tipo_area: 'Estanque', superficie: '100.00', finca_id: FINCA, descripcion_infraestructura: nota.slice(0, 100), especie_id: idEspecie, tipo_modelo_asignado: 'MODELO_ACUICULTURA' };
    let idInfra = ya('infraestructura')?.id ?? null;
    if (!idInfra) {
      const inf = await p('/configuracion/infraestructuras', cuerpoInfra);
      if (![200, 201].includes(inf.status)) throw Error('FIXTURE POST /configuracion/infraestructuras -> ' + inf.status + ' ' + clean(JSON.stringify(inf.body)).slice(0, 400));
      idInfra = registrar('infraestructura', inf.body.id_infraestructura, 'POST /configuracion/infraestructuras', cuerpoInfra, `PATCH /configuracion/infraestructuras/${inf.body.id_infraestructura}/desactivar`, 'no existia');
    }

    // 4. Dispositivo IoT QA del area (la ingesta resuelve el area por el dispositivo)
    const serial = `QA-G31-V5-${sufijo}`;
    registrarSecreto(serial);
    const cuerpoDisp = { serial, descripcion: nota.slice(0, 100), id_infraestructura: idInfra, id_tipo_dispositivo: 1, es_activo: true };
    let idDisp = ya('dispositivo_iot')?.id ?? null;
    if (!idDisp) {
      const dis = await p('/configuracion/dispositivos-iot', cuerpoDisp);
      if (![200, 201].includes(dis.status)) throw Error('FIXTURE POST /configuracion/dispositivos-iot -> ' + dis.status + ' ' + clean(JSON.stringify(dis.body)).slice(0, 400));
      idDisp = registrar('dispositivo_iot', dis.body.id_dispositivo_iot, 'POST /configuracion/dispositivos-iot', { ...cuerpoDisp, serial: '[REDACTED_ACCESS_KEY]' }, `PATCH /configuracion/dispositivos-iot/${dis.body.id_dispositivo_iot}/desactivar`, 'no existia');
    }

    // 5. Sensor de temperatura QA sobre ese dispositivo
    const cuerpoSensor = { nombre: `Sensor QA G31 V5 ${sufijo}`, categoria: 'TEMPERATURA' };
    let idSensor = ya('sensor')?.id ?? null;
    if (!idSensor) {
      const sen = await p(`/configuracion/dispositivos-iot/${idDisp}/sensores`, cuerpoSensor);
      if (![200, 201].includes(sen.status)) throw Error('FIXTURE POST sensores -> ' + sen.status + ' ' + clean(JSON.stringify(sen.body)).slice(0, 400));
      idSensor = registrar('sensor', sen.body.id_sensores ?? sen.body.id_sensor, `POST /configuracion/dispositivos-iot/${idDisp}/sensores`, cuerpoSensor, 'sin endpoint publico de reversion directa: se revierte al desactivar el dispositivo', 'no existia');
    }

    // 6. Asociacion sensor-area por RF-22. (POST /infraestructuras/{id}/sensores es RF-49 Tipo B
    //    y exige que el sensor YA tenga asociacion de area, de modo que no sirve para crearla.)
    const cuerpoAsoc = { id_dispositivo_iot: idDisp, id_infraestructura: idInfra, punto_instalacion: `QA G31 V5 ${sufijo}` };
    let idAsoc = ya('asociacion_sensor_area')?.id ?? null;
    if (!idAsoc) {
      const aso = await p(`/configuracion/sensores/${idSensor}/asociar`, cuerpoAsoc);
      if (![200, 201].includes(aso.status)) throw Error('FIXTURE POST asociar -> ' + aso.status + ' ' + clean(JSON.stringify(aso.body)).slice(0, 400));
      idAsoc = registrar('asociacion_sensor_area', aso.body.id_sensores_area_asociada ?? null, `POST /configuracion/sensores/${idSensor}/asociar`, cuerpoAsoc, `PATCH /infraestructuras/${idInfra}/sensores/{id_asociacion}`, 'el sensor no tenia asociacion');
    }

    // 7. Calibracion identidad: ganancia 1 y offset 0, de modo que el valor crudo enviado es el
    //    efectivo. Sin calibracion vigente la ingesta marca ERROR_CALIBRACION en vez de
    //    LECTURA_VALIDA (fase 6 de IngerirTelemetriaUseCase).
    //    `valor_referencia` es obligatorio en RF-24 (es la lectura del patron) y debe caer en el
    //    rango de seguridad de la categoria TEMPERATURA (0-45); no interviene en valor_ajustado.
    const cuerpoCal = { id_dispositivo_iot: idDisp, id_infraestructura: idInfra, valor_referencia: '36.00', ganancia: '1.0000', offset: '0.0000', fecha_calibracion: new Date(reloj.servidor - 60000).toISOString(), observaciones: nota, modo_calibracion: 'SENSOR' };
    let idCal = ya('calibracion')?.id ?? null;
    if (!idCal) {
      const cal = await p(`/configuracion/sensores/${idSensor}/calibrar`, cuerpoCal);
      if (![200, 201].includes(cal.status)) throw Error('FIXTURE POST calibrar -> ' + cal.status + ' ' + clean(JSON.stringify(cal.body)).slice(0, 400));
      idCal = registrar('calibracion', cal.body.id_calibracion ?? null, `POST /configuracion/sensores/${idSensor}/calibrar`, cuerpoCal, 'sin reversion: la calibracion es un registro historico; se revierte al desactivar el dispositivo', 'el sensor no tenia calibracion');
    }

    // 8. Activo biologico QA: UNO solo en el area, de la especie del umbral
    const cuerpoActivo = { tipo_activo: 'INDIVIDUAL', id_especie: idEspecie, fecha_inicio_ciclo: new Date(reloj.servidor).toISOString().slice(0, 10), origen_financiero: 'nacimiento', id_infraestructura: idInfra, identificador: `QA-G31-ACTIVO-${sufijo}`, raza: 'QA G31 V5', sexo: 'Hembra', fecha_nacimiento: new Date(reloj.servidor - 180 * 86400000).toISOString(), peso_inicial: '0.250' };
    let idActivo = ya('activo_biologico')?.id ?? null;
    if (!idActivo) {
      const act = await p('/activos-biologicos', cuerpoActivo);
      if (![200, 201].includes(act.status)) throw Error('FIXTURE POST /activos-biologicos -> ' + act.status + ' ' + clean(JSON.stringify(act.body)).slice(0, 400));
      idActivo = registrar('activo_biologico', act.body.id_activo_biologico, 'POST /activos-biologicos', cuerpoActivo, `POST /activos-biologicos/${act.body.id_activo_biologico}/cierre`, 'no existia');
    }

    fx = { id_infraestructura: idInfra, id_especie: idEspecie, id_activo_biologico: idActivo, id_umbral_ambiental: idUmbral, id_dispositivo_iot: idDisp, id_sensor: idSensor, id_asociacion: idAsoc, creado_por_qa: true };
  }

  // --------------------------------------------------- Verificacion por GET (seccion 11)
  const oraculo = crearOraculo();
  const ver = { consultas: {} };

  if (!fx.id_dispositivo_iot) {
    const ds = (await g('/configuracion/dispositivos-iot')).body?.items || [];
    fx.id_dispositivo_iot = (ds.find((x) => x.id_infraestructura === fx.id_infraestructura && x.es_activo) || {}).id_dispositivo_iot ?? null;
    if (fx.id_dispositivo_iot) {
      const ss = (await g(`/configuracion/dispositivos-iot/${fx.id_dispositivo_iot}/sensores`)).body?.items || [];
      fx.id_sensor = (ss.find((x) => x.categoria === 'TEMPERATURA' && x.es_activo) || {}).id_sensores ?? null;
    }
  }

  const esp = await g('/configuracion/especies?solo_activas=true');
  const especie = (esp.body?.items || []).find((x) => x.id_especie === fx.id_especie) || null;
  ver.consultas.especie = san(especie);
  oraculo.ok('FIXTURE', especie && especie.es_activo, 'la especie del fixture existe y esta activa', especie ? `${especie.id_especie} activa=${especie.es_activo}` : 'no encontrada');

  const ac = await g(`/activos-biologicos/${fx.id_activo_biologico}`);
  const activo = ac.body || null;
  ver.consultas.activo = san(activo);
  oraculo.ok('FIXTURE', activo && [1, 3, 4].includes(activo.id_estado), 'el activo biologico esta en estado operativo', activo ? `${activo.id_activo_biologico} estado=${activo.nombre_estado}` : 'no encontrado');
  oraculo.ok('FIXTURE', activo && activo.id_infraestructura === fx.id_infraestructura, 'el activo pertenece a la infraestructura del fixture', activo?.id_infraestructura);
  oraculo.ok('FIXTURE', activo && activo.id_especie === fx.id_especie, 'el activo es de la especie del umbral', activo?.id_especie);

  const censo = await censoActivos(token, fx.id_infraestructura);
  const operativos = censo.registros.filter((x) => [1, 3, 4].includes(x.id_estado));
  ver.consultas.censo_area = { total_registros: censo.total, censo_completo: censo.completo, operativos: operativos.map((x) => ({ id: x.id_activo_biologico, tipo: x.tipo, estado: x.nombre_estado, id_especie: x.id_especie })) };
  oraculo.ok('FIXTURE', censo.completo && operativos.length === 1 && operativos[0].id_activo_biologico === fx.id_activo_biologico, 'el area tiene exactamente un activo operativo y es el objetivo (la vinculacion automatica quedara VINCULADA, no AMBIGUA)', `${operativos.length} operativos de ${censo.total} registros`);

  const dis = await g(`/configuracion/dispositivos-iot/${fx.id_dispositivo_iot}`);
  ver.consultas.dispositivo = { id: dis.body?.id_dispositivo_iot ?? null, id_infraestructura: dis.body?.id_infraestructura ?? null, es_activo: dis.body?.es_activo ?? null, serial: '[REDACTED_ACCESS_KEY]' };
  oraculo.ok('FIXTURE', dis.body?.es_activo === true, 'el dispositivo IoT esta activo', dis.body?.es_activo);
  oraculo.ok('FIXTURE', dis.body?.id_infraestructura === fx.id_infraestructura, 'el dispositivo pertenece al area del fixture (de ahi toma el area la vinculacion)', dis.body?.id_infraestructura);
  const accessKey = dis.body?.serial;
  if (!accessKey) throw Error('No se pudo obtener el access_key del dispositivo por la via autorizada');
  registrarSecreto(accessKey);

  const sens = await g(`/configuracion/dispositivos-iot/${fx.id_dispositivo_iot}/sensores`);
  const sensor = (sens.body?.items || []).find((x) => x.id_sensores === fx.id_sensor) || null;
  ver.consultas.sensor = san(sensor);
  oraculo.ok('FIXTURE', sensor && sensor.es_activo && sensor.categoria === 'TEMPERATURA', 'el sensor de temperatura esta activo', sensor ? `${sensor.id_sensores} ${sensor.categoria} activo=${sensor.es_activo}` : 'no encontrado');

  const aso = await g(`/configuracion/sensores/${fx.id_sensor}/asociaciones`);
  const asocs = Array.isArray(aso.body?.items) ? aso.body.items : (Array.isArray(aso.body) ? aso.body : []);
  ver.consultas.asociaciones = san(asocs);
  const asocVigente = asocs.find((x) => !x.fecha_finalizacion && x.id_infraestructura === fx.id_infraestructura && x.id_dispositivo_iot === fx.id_dispositivo_iot) || null;
  oraculo.ok('FIXTURE', Boolean(asocVigente), 'existe una asociacion vigente del sensor con el area', asocVigente ? 'vigente' : `${asocs.length} asociaciones devueltas`);

  const cal = await g(`/configuracion/sensores/${fx.id_sensor}/calibraciones`);
  const cals = cal.body?.items || [];
  const vigente = cals.slice().sort((a, b) => String(b.fecha_calibracion).localeCompare(String(a.fecha_calibracion)))[0] || null;
  ver.consultas.calibracion_vigente = san(vigente);
  oraculo.ok('FIXTURE', Boolean(vigente), 'el sensor tiene calibracion vigente', vigente ? `id=${vigente.id_calibracion} ganancia=${vigente.ganancia} offset=${vigente.offset}` : 'ninguna');

  const umb = await g(`/configuracion/umbrales?id_especie=${fx.id_especie}&solo_activas=true`);
  const umbral = (umb.body?.items || []).find((x) => x.id_umbral_ambiental === fx.id_umbral_ambiental) || null;
  ver.consultas.umbral = san(umbral);
  oraculo.ok('FIXTURE', umbral && umbral.es_activo, 'el umbral RF-17 del fixture esta activo', umbral ? `id=${umbral.id_umbral_ambiental} ${umbral.valor_min}..${umbral.valor_max} sync=${umbral.estado_sincronizacion}` : 'no encontrado');
  oraculo.ok('FIXTURE', umbral && umbral.id_variable_ambiental === ID_VARIABLE_TEMPERATURA, 'el umbral es de la variable alcanzable por la ingesta (TEMPERATURA_AMBIENTAL -> variable 9)', umbral?.id_variable_ambiental);

  // 36/38/40 contra las bandas reales que devuelve la API
  const comprobacion = OBJETIVOS.map((o) => {
    const banda = (umbral?.niveles || []).find((n) => dentro(o.objetivo, n.limite_inferior, n.limite_superior)) || null;
    return { caso: o.caso, objetivo: o.objetivo, nivel_esperado: o.nivel, color_esperado: o.color, banda: banda ? `${banda.nivel} ${banda.limite_inferior}..${banda.limite_superior}` : null, color_calculado: umbral ? clasificar(o.objetivo, umbral.niveles) : null, en_frontera: (umbral?.niveles || []).some((n) => esFrontera(o.objetivo, n.limite_inferior, n.limite_superior)) };
  });
  ver.clasificacion_esperada = comprobacion;
  for (const c of comprobacion) {
    oraculo.ok('FIXTURE', c.color_calculado === c.color_esperado, `${c.objetivo} °C clasifica ${c.nivel_esperado.toUpperCase()}/${c.color_esperado} contra las bandas del umbral`, `banda=${c.banda} color=${c.color_calculado}`);
    oraculo.ok('FIXTURE', c.en_frontera === false, `${c.objetivo} °C no cae en una frontera de banda`, c.en_frontera ? 'en frontera' : 'interior');
  }

  // Calibracion: los tres valores crudos, calculados antes del primer POST (seccion 12)
  const ganancia = vigente ? String(vigente.ganancia) : null;
  const offset = vigente ? String(vigente.offset ?? '0') : null;
  const crudos = {};
  if (ganancia && d2(ganancia) !== 0n) for (const o of OBJETIVOS) crudos[o.caso] = t2((d2(o.objetivo) - d2(offset)) * 100n / d2(ganancia));
  ver.calibracion = { id_calibracion: vigente?.id_calibracion ?? null, ganancia, offset, formula: 'valor_crudo = (objetivo - offset) / ganancia', crudos };
  oraculo.ok('FIXTURE', Object.keys(crudos).length === 3, 'los tres valores crudos quedan calculados antes del primer POST', JSON.stringify(crudos));

  const dash = await g(`/iot/monitoreo/dashboard/${fx.id_infraestructura}`);
  const sdash = (dash.body?.sensores || []).find((x) => x.id_sensor === fx.id_sensor) || null;
  ver.dashboard_previo = san({ status: dash.status, sensor: sdash, alertas_activas_count: dash.body?.alertas_activas_count ?? null });
  oraculo.ok('FIXTURE', !sdash || !sdash.id_alerta, 'el sensor no tiene alerta M03 activa que pueda enmascarar el color del dashboard', sdash?.id_alerta ?? 'sin alerta');

  const r = oraculo.resumen();
  const congelado = {
    FIXTURE_READY: r.fallidas === 0,
    SENSOR_ID: fx.id_sensor, DEVICE_ID: fx.id_dispositivo_iot, INFRA_ID: fx.id_infraestructura,
    ACTIVO_OBJETIVO: fx.id_activo_biologico, ESPECIE_ID: fx.id_especie, UMBRAL_ID: fx.id_umbral_ambiental,
    VARIABLE_ID: ID_VARIABLE_TEMPERATURA, CALIBRACION_ID: vigente?.id_calibracion ?? null,
    codigo_ingesta: CODIGO_INGESTA, unidad: UNIDAD, ganancia, offset, crudos,
    nombre_sensor: sensor?.nombre ?? null, creado_por_qa: fx.creado_por_qa,
  };
  man.verificacion = ver;
  man.oraculo_fixture = oraculo.items;
  man.resumen_oraculo_fixture = r;
  man.congelado = congelado;
  man.terminado = new Date().toISOString();
  escribir('fixture-created.json', man);
  escribir('fixture-congelado.json', congelado);
  console.log('fixture ' + (congelado.FIXTURE_READY ? 'READY' : 'NO LISTO') + '  ' + JSON.stringify(r));
  console.log(JSON.stringify(congelado));
  if (!congelado.FIXTURE_READY) { for (const i of oraculo.items.filter((x) => !x.cumple)) console.log('  FALLA -', i.descripcion, '->', i.observado); process.exitCode = 2; }
}

// --------------------------------------------------------------------------------- FASE oficial
async function faseOficial() {
  const fxc = leer('fixture-congelado.json');
  if (!fxc.FIXTURE_READY) throw Error('FIXTURE_READY=false: el RUN oficial no debe ejecutarse');
  const { token } = await login('test');
  const g = async (u) => http(BASE.test + u, { token });

  const dis = await g(`/configuracion/dispositivos-iot/${fxc.DEVICE_ID}`);
  const accessKey = dis.body?.serial;
  if (!accessKey) throw Error('No se pudo obtener el access_key del dispositivo');
  registrarSecreto(accessKey);

  const rutaHistorial = (reloj) => `/iot/monitoreo/historial?fecha_inicio=${new Date(reloj.servidor - 7 * 86400000).toISOString().slice(0, 10)}&fecha_fin=${new Date(reloj.servidor).toISOString().slice(0, 10)}&sensor_id=${fxc.SENSOR_ID}&pagina=1&por_pagina=50&orden=desc`;

  const umb = await g(`/configuracion/umbrales?id_especie=${fxc.ESPECIE_ID}&solo_activas=true`);
  const umbral = (umb.body?.items || []).find((x) => x.id_umbral_ambiental === fxc.UMBRAL_ID) || null;

  const oraculo = crearOraculo();
  const escrituras = [];
  const record = { run_id: RUN_ID, id_sensor: fxc.SENSOR_ID, id_infraestructura: fxc.INFRA_ID, nombre_sensor: fxc.nombre_sensor, casos: {} };
  let detencion = null;
  const transiciones = [];

  // G31_SOLO_CASO reejecuta un caso concreto dentro del MISMO RUN cuando su intento anterior
  // fallo por la automatizacion y quedo demostrado que no persistio nada (seccion 12). Los demas
  // casos no se vuelven a escribir: su evidencia ya registrada se reutiliza tal cual.
  const soloCasos = (process.env.G31_SOLO_CASO || '').split(',').map((s) => s.trim()).filter(Boolean);
  const archivoDe = (caso) => caso.replace('TC-M09-', 'tc') + '.json';
  const previoRecord = existe('record.json') ? leer('record.json') : null;

  // `timestamp_captura` es parte de la clave de duplicado (sensor, variable, timestamp, origen) y
  // la cabecera Date del servidor solo tiene resolucion de segundo: se garantiza que cada caso
  // use un segundo propio, tambien frente a las capturas ya usadas en este RUN.
  const capturasUsadas = new Set();
  for (const oo of OBJETIVOS) if (existe(archivoDe(oo.caso))) { const t = leer(archivoDe(oo.caso))?.request?.timestamp_captura; if (t) capturasUsadas.add(t); }

  for (const o of OBJETIVOS) {
    if (soloCasos.length && !soloCasos.includes(o.caso)) {
      const prev = leer(archivoDe(o.caso));
      oraculo.items.push(...(prev.oraculo || []));
      transiciones.push({ caso: o.caso, color_historial: prev.historial?.estado_semaforo_historico ?? null, color_dashboard: prev.dashboard?.estado_semaforo ?? null });
      if (previoRecord?.casos?.[o.caso]) record.casos[o.caso] = previoRecord.casos[o.caso];
      const previas = prev.escrituras_del_caso || (existe('oficial.json') ? (leer('oficial.json').escrituras_oficiales || []).filter((e) => e.caso === o.caso) : []);
      for (const e of previas) escrituras.push(e);
      console.log(o.caso + ': reutilizado de esta misma ejecucion (' + prev.resultado + ')');
      continue;
    }
    const reg = { caso: o.caso, run_id: RUN_ID, ambiente: 'TEST', objetivo_efectivo: o.objetivo, nivel_esperado: o.nivel, color_esperado: o.color, fixture: fxc };
    // Un intento anterior del mismo caso en este RUN se conserva integro como evidencia.
    if (soloCasos.includes(o.caso) && existe(archivoDe(o.caso))) reg.intento_descartado = leer(archivoDe(o.caso));
    if (detencion) {
      reg.resultado = 'NO EJECUTADO';
      reg.motivo = `RUN detenido en ${detencion.caso}: ${detencion.motivo}`;
      escribir(o.caso.replace('TC-M09-', 'tc') + '.json', reg);
      console.log(o.caso + ': NO EJECUTADO');
      continue;
    }
    const reloj = await relojServidor('test');
    let ms = reloj.servidor - MARGEN_RELOJ_MS;
    while (capturasUsadas.has(new Date(ms).toISOString())) ms -= 1000;
    const captura = new Date(ms).toISOString();
    capturasUsadas.add(captura);
    const crudo = fxc.crudos[o.caso];
    reg.reloj = reloj;
    reg.calibracion = { ganancia: fxc.ganancia, offset: fxc.offset, valor_crudo: crudo, formula: 'valor_crudo = (objetivo - offset) / ganancia' };

    // --- Una sola ingesta por caso (seccion 21-B); nunca se reintenta la escritura ---
    reg.request = { endpoint: 'POST /iot/telemetria', device_id: fxc.DEVICE_ID, sensor_id: fxc.SENSOR_ID, tipo_variable: CODIGO_INGESTA, valor: crudo, unidad: UNIDAD, timestamp_captura: captura, origen: 'TIEMPO_REAL', access_key: '[REDACTED_ACCESS_KEY]' };
    const ing = await http(BASE.test + '/iot/telemetria', { metodo: 'POST', cuerpo: { device_id: fxc.DEVICE_ID, sensor_id: fxc.SENSOR_ID, tipo_variable: CODIGO_INGESTA, valor: crudo, unidad: UNIDAD, timestamp_captura: captura, access_key: accessKey, origen: 'TIEMPO_REAL' } });
    escrituras.push({ caso: o.caso, endpoint: 'POST /iot/telemetria', status: ing.status, reintento: false });
    reg.response = { status: ing.status, ms: ing.ms, body: san(ing.body) };
    oraculo.ok(o.caso, ing.status === 201, 'la ingesta de la medicion responde HTTP 201', ing.status);

    let idTelemetria = ing.body?.id_telemetria ?? null;
    if (!idTelemetria) {
      const hist = await g(rutaHistorial(reloj));
      idTelemetria = (hist.body?.items || []).find((x) => x.timestamp_captura && x.timestamp_captura.slice(0, 19) === captura.slice(0, 19))?.id_telemetria ?? null;
      reg.reconciliacion = { via: 'GET /iot/monitoreo/historial', status: hist.status, encontrado: Boolean(idTelemetria), conclusion: idTelemetria ? 'la escritura si persistio' : 'la escritura no persistio' };
    }
    reg.id_telemetria = idTelemetria;
    reg.estado_calidad = ing.body?.estado_calidad ?? null;
    reg.valor_ajustado_respuesta = ing.body?.valor_ajustado ?? null;
    oraculo.ok(o.caso, reg.estado_calidad === 'LECTURA_VALIDA', 'la lectura queda LECTURA_VALIDA', reg.estado_calidad);

    if (!idTelemetria) {
      reg.resultado = 'BLOQUEADO';
      detencion = { caso: o.caso, motivo: 'la ingesta no dejo telemetria persistida' };
      escribir(o.caso.replace('TC-M09-', 'tc') + '.json', reg);
      continue;
    }

    // --- Vinculacion de ESTA lectura (seccion 13) ---
    const v = await g(`/iot/vinculaciones?id_telemetria=${idTelemetria}`);
    const filas = (v.body?.items || []).filter((x) => x.id_telemetria === idTelemetria);
    reg.vinculacion = { consulta: `GET /iot/vinculaciones?id_telemetria=${idTelemetria}`, status: v.status, total: v.body?.total ?? null, filas: filas.map((x) => ({ id_vinculacion_lectura: x.id_vinculacion_lectura, estado_vinculacion: x.estado_vinculacion, mecanismo_vinculacion: x.mecanismo_vinculacion, id_activo_biologico: x.id_activo_biologico, modelo_manejo: x.modelo_manejo })) };
    oraculo.ok(o.caso, filas.length > 0, 'la ingesta genera un registro de vinculacion para la lectura', `total=${v.body?.total ?? 0}`);

    if (filas.length === 0) {
      reg.resultado = 'BLOQUEADO';
      detencion = { caso: o.caso, motivo: 'la ingesta no genero ningun registro de vinculacion (total=0)' };
      escribir(o.caso.replace('TC-M09-', 'tc') + '.json', reg);
      continue;
    }

    let fila = filas.find((x) => x.estado_vinculacion !== 'CORREGIDA') || filas[0];
    // Una sola resolucion por lectura, y solo si no quedo VINCULADA (seccion 13)
    if (fila.estado_vinculacion !== 'VINCULADA') {
      const res = await http(BASE.test + `/iot/vinculaciones/${fila.id_vinculacion_lectura}/resolver`, { metodo: 'PATCH', token, cuerpo: { id_activo_biologico: fxc.ACTIVO_OBJETIVO, modelo_manejo: 'INDIVIDUAL' } });
      escrituras.push({ caso: o.caso, endpoint: `PATCH /iot/vinculaciones/${fila.id_vinculacion_lectura}/resolver`, status: res.status, reintento: false });
      reg.resolucion = { aplicada: true, estado_previo: fila.estado_vinculacion, status: res.status, body: san(res.body) };
      const v2 = await g(`/iot/vinculaciones?id_telemetria=${idTelemetria}`);
      const f2 = (v2.body?.items || []).filter((x) => x.id_telemetria === idTelemetria);
      fila = f2.find((x) => x.estado_vinculacion === 'VINCULADA') || f2[0] || fila;
      reg.vinculacion.filas_tras_resolucion = f2.map((x) => ({ id_vinculacion_lectura: x.id_vinculacion_lectura, estado_vinculacion: x.estado_vinculacion, id_activo_biologico: x.id_activo_biologico }));
    } else {
      reg.resolucion = { aplicada: false, motivo: 'la vinculacion automatica quedo VINCULADA: no hay nada que resolver' };
    }
    reg.vinculacion.estado_final = fila.estado_vinculacion;
    reg.vinculacion.id_activo_final = fila.id_activo_biologico;
    oraculo.ok(o.caso, fila.estado_vinculacion === 'VINCULADA', 'la lectura queda VINCULADA', fila.estado_vinculacion);
    oraculo.ok(o.caso, fila.id_activo_biologico === fxc.ACTIVO_OBJETIVO, 'la lectura queda vinculada al ACTIVO_OBJETIVO congelado', fila.id_activo_biologico);

    // --- Oraculo API: historial (clasificacion por lectura) y dashboard (color del sensor) ---
    const hist = await g(rutaHistorial(reloj));
    const l = (hist.body?.items || []).find((x) => x.id_telemetria === idTelemetria) || null;
    reg.historial = san(l ? { id_telemetria: l.id_telemetria, valor: l.valor, valor_ajustado: l.valor_ajustado, unidad_medida: l.unidad_medida, estado_calidad: l.estado_calidad, estado_semaforo_historico: l.estado_semaforo_historico, id_activo_biologico: l.id_activo_biologico, id_especie: l.id_especie, especie: l.especie, id_umbral_ambiental: l.id_umbral_ambiental, valor_min_umbral: l.valor_min_umbral, valor_max_umbral: l.valor_max_umbral, version_umbral: l.version_umbral, id_alerta: l.id_alerta } : null);
    const efectivo = l?.valor_ajustado ?? l?.valor ?? null;
    oraculo.ok(o.caso, efectivo !== null && iguales(efectivo, o.objetivo), `el valor efectivo de la lectura es ${o.objetivo}`, efectivo);
    oraculo.ok(o.caso, l && l.id_activo_biologico === fxc.ACTIVO_OBJETIVO, 'el historial atribuye la lectura al ACTIVO_OBJETIVO', l?.id_activo_biologico);
    oraculo.ok(o.caso, l && l.id_especie === fxc.ESPECIE_ID, 'el historial resuelve la ESPECIE_ID congelada', l?.id_especie);
    oraculo.ok(o.caso, l && l.id_umbral_ambiental === fxc.UMBRAL_ID, 'el historial aplica el UMBRAL_ID congelado', l?.id_umbral_ambiental);
    oraculo.ok(o.caso, l && l.estado_semaforo_historico === o.color, `el historial clasifica la lectura como ${o.nivel.toUpperCase()}/${o.color}`, l?.estado_semaforo_historico);

    const dash = await g(`/iot/monitoreo/dashboard/${fxc.INFRA_ID}`);
    const s = (dash.body?.sensores || []).find((x) => x.id_sensor === fxc.SENSOR_ID) || null;
    reg.dashboard = san(s ? { id_sensor: s.id_sensor, ultimo_valor: s.ultimo_valor, ultimo_timestamp_captura: s.ultimo_timestamp_captura, estado_semaforo: s.estado_semaforo, id_alerta: s.id_alerta, severidad_alerta: s.severidad_alerta } : null);
    oraculo.ok(o.caso, s && s.ultimo_timestamp_captura && s.ultimo_timestamp_captura.slice(0, 19) === captura.slice(0, 19), 'el dashboard refleja la lectura de este caso (correlacion por timestamp)', s?.ultimo_timestamp_captura);
    oraculo.ok(o.caso, s && s.estado_semaforo === o.color, `el dashboard muestra ${o.color} para el sensor`, s?.estado_semaforo);
    oraculo.ok(o.caso, !s || !s.id_alerta, 'el color del dashboard no proviene de una alerta M03', s?.id_alerta ?? 'sin alerta');

    transiciones.push({ caso: o.caso, color_historial: l?.estado_semaforo_historico ?? null, color_dashboard: s?.estado_semaforo ?? null });
    reg.umbral_aplicado = san(umbral ? { id: umbral.id_umbral_ambiental, min: umbral.valor_min, max: umbral.valor_max, niveles: umbral.niveles } : null);
    reg.escrituras_del_caso = escrituras.filter((e) => e.caso === o.caso);
    reg.oraculo = oraculo.items.filter((x) => x.caso === o.caso);
    reg.resumen_oraculo = { total: reg.oraculo.length, superadas: reg.oraculo.filter((x) => x.cumple).length, fallidas: reg.oraculo.filter((x) => !x.cumple).length };
    reg.resultado = reg.resumen_oraculo.fallidas === 0 ? 'APROBADO' : 'RECHAZADO';
    if (reg.resultado === 'RECHAZADO') detencion = { caso: o.caso, motivo: 'fallo funcional: ' + reg.oraculo.filter((x) => !x.cumple).map((x) => x.descripcion).join('; ') };
    escribir(o.caso.replace('TC-M09-', 'tc') + '.json', reg);
    record.casos[o.caso] = { id_telemetria: idTelemetria, valor: l?.valor ?? crudo, valor_ajustado: l?.valor_ajustado ?? null, esperado: o.color, api_historial: l?.estado_semaforo_historico ?? null, api_dashboard: s?.estado_semaforo ?? null };
    console.log(`${o.caso}: ${reg.resultado}  telemetria=${idTelemetria}  historial=${l?.estado_semaforo_historico}  dashboard=${s?.estado_semaforo}`);
  }

  // Transiciones VERDE -> AMARILLO -> ROJO (secciones 15 y 16)
  const sec = transiciones.map((t) => t.color_dashboard);
  const trans = { secuencia_dashboard: sec, secuencia_historial: transiciones.map((t) => t.color_historial), esperada: ['VERDE', 'AMARILLO', 'ROJO'], cumple: JSON.stringify(sec) === JSON.stringify(['VERDE', 'AMARILLO', 'ROJO']) };
  oraculo.ok('TC-M09-G31', trans.cumple, 'el dashboard recorre VERDE -> AMARILLO -> ROJO en los tres casos', sec.join(' -> '));

  const resumen = oraculo.resumen();
  escribir('oficial.json', { run_id: RUN_ID, fase: 'oficial', ambiente: 'TEST', fixture: fxc, casos_reejecutados_en_este_run: soloCasos, escrituras_oficiales: escrituras, transiciones: trans, oraculo: oraculo.items, resumen_oraculo: resumen, detencion, resultado_grupo: resumen.fallidas === 0 ? 'APROBADO' : 'RECHAZADO', terminado: new Date().toISOString() });
  escribir('record.json', record);
  console.log('oficial ' + JSON.stringify(resumen) + '  grupo=' + (resumen.fallidas === 0 ? 'APROBADO' : 'RECHAZADO'));
  for (const i of oraculo.items.filter((x) => !x.cumple)) console.log('  FALLA', i.caso, '-', i.descripcion, '->', i.observado);
}

// --------------------------------------------------------------------------------- FASE cleanup
async function faseCleanup() {
  if (!existe('fixture-created.json')) throw Error('no hay fixture-created.json');
  const man = leer('fixture-created.json');
  if (!man.creados.length) { escribir('cleanup.json', { run_id: RUN_ID, nota: 'no se creo ningun dato: nada que revertir' }); return; }
  const { token } = await login('test');
  const reloj = await relojServidor('test');
  const g = async (u) => http(BASE.test + u, { token });
  const fxc = leer('fixture-congelado.json');
  const rutaHistorial = `/iot/monitoreo/historial?fecha_inicio=${new Date(reloj.servidor - 7 * 86400000).toISOString().slice(0, 10)}&fecha_fin=${new Date(reloj.servidor).toISOString().slice(0, 10)}&sensor_id=${fxc.SENSOR_ID}&pagina=1&por_pagina=50&orden=desc`;
  const clasificacionActual = async () => {
    const h = await g(rutaHistorial);
    const rec = leer('record.json').casos;
    return Object.fromEntries(Object.entries(rec).map(([caso, d]) => {
      const l = (h.body?.items || []).find((x) => x.id_telemetria === d.id_telemetria) || null;
      return [caso, { id_telemetria: d.id_telemetria, esperado: d.esperado, observado: l?.estado_semaforo_historico ?? null, id_umbral_ambiental: l?.id_umbral_ambiental ?? null, id_especie: l?.id_especie ?? null }];
    }));
  };
  const antes = await clasificacionActual();

  // El historial NO guarda el color: `ConsultarHistorialUseCase` lo recalcula en cada consulta
  // contra el umbral RF-17 **vigente** de la especie de la lectura. Desactivar el umbral QA o su
  // especie convertiria las tres lecturas oficiales en GRIS y dejaria la evidencia del RUN sin
  // posibilidad de reverificacion. La seccion 20 pide no destruir la evidencia de los tres casos,
  // asi que esos elementos quedan DIFERIDOS y documentados con su endpoint de reversion; el resto
  // del fixture si se revierte. Tampoco se cierra la asociacion sensor-area, porque es la que
  // resuelve las columnas de area y finca de esas mismas lecturas.
  const DIFERIDOS = {
    umbral_rf17: 'desactivarlo reclasificaria las tres lecturas oficiales como GRIS',
    especie: 'desactivarla afecta al umbral QA y, con el, a la clasificacion de las tres lecturas',
    asociacion_sensor_area: 'cerrarla dejaria sin area ni finca a las tres lecturas del historial',
    sensor: 'no existe endpoint publico de baja de sensor; queda cubierto por la baja del dispositivo',
    calibracion: 'registro historico de RF-24, sin endpoint de reversion y sin efecto fuera del dispositivo dado de baja',
  };
  const acciones = [];
  // Orden inverso a las dependencias (seccion 20)
  for (const tipo of ['activo_biologico', 'dispositivo_iot', 'infraestructura']) {   // el area se da de baja al final: exige que no le queden dispositivos ni activos operativos
    for (const c of man.creados.filter((x) => x.tipo === tipo)) {
      // La fase es idempotente: si un intento anterior ya dejo el recurso fuera de servicio no se
      // vuelve a escribir sobre el, y se registra el estado comprobado por GET.
      if (tipo === 'activo_biologico') {
        const est = await g(`/activos-biologicos/${c.id}`);
        if (est.body && est.body.id_estado !== 1) {
          acciones.push({ tipo, id: c.id, endpoint: `GET /activos-biologicos/${c.id}`, status: est.status, estado_comprobado: est.body.nombre_estado ?? est.body.id_estado, revertido: true, nota: 'ya estaba fuera de servicio por un intento anterior de esta misma fase' });
          console.log(`cleanup ${tipo} ${c.id} -> ya ${est.body.nombre_estado ?? est.body.id_estado}`);
          continue;
        }
      }
      if (tipo === 'dispositivo_iot') {
        const est = await g(`/configuracion/dispositivos-iot/${c.id}`);
        if (est.body && est.body.es_activo === false) {
          acciones.push({ tipo, id: c.id, endpoint: `GET /configuracion/dispositivos-iot/${c.id}`, status: est.status, estado_comprobado: 'es_activo=false', revertido: true, nota: 'ya estaba inactivo por un intento anterior de esta misma fase' });
          console.log(`cleanup ${tipo} ${c.id} -> ya inactivo`);
          continue;
        }
      }
      let ruta = null, metodo = 'PATCH', cuerpo;
      if (tipo === 'activo_biologico') { ruta = `/activos-biologicos/${c.id}/cierre`; metodo = 'POST'; cuerpo = { fecha_cierre: new Date(reloj.servidor).toISOString().slice(0, 10), motivo_cierre: 'Fin de fixture temporal QA TC-M09-G31', descripcion_cierre: `Reversion del fixture QA ${RUN_ID}` }; }
      else if (tipo === 'dispositivo_iot') ruta = `/configuracion/dispositivos-iot/${c.id}/desactivar`;
      else if (tipo === 'infraestructura') ruta = `/configuracion/infraestructuras/${c.id}/desactivar`;
      let r = await http(BASE.test + ruta, { metodo, token, cuerpo });
      let endpoint = `${metodo} ${ruta}`;
      // RF-38 solo cierra el ciclo de un activo que tenga fase productiva activa, y el activo QA
      // se creo sin fases. La via oficial equivalente para retirarlo del area es el cambio de
      // estado de RF-44 (ACTIVO -> INACTIVO), que es una transicion valida y no crea datos nuevos.
      if (tipo === 'activo_biologico' && r.status === 422 && r.body?.error_code === 'SIN_FASE_ACTIVA') {
        const alterna = `/activos-biologicos/${c.id}/estado`;
        const r2 = await http(BASE.test + alterna, { metodo: 'PATCH', token, cuerpo: { estado_nuevo: 'INACTIVO', fecha_cambio_estado: new Date(reloj.servidor).toISOString().slice(0, 10), motivo_cambio: `Reversion del fixture temporal QA TC-M09-G31 ${RUN_ID}` } });
        acciones.push({ tipo, id: c.id, endpoint, status: r.status, body: san(r.body), revertido: false, nota: 'RF-38 exige fase productiva activa; se usa la via alterna RF-44' });
        r = r2; endpoint = `PATCH ${alterna}`;
      }
      acciones.push({ tipo, id: c.id, endpoint, status: r.status, body: san(r.body), revertido: [200, 201, 204].includes(r.status) });
      console.log(`cleanup ${tipo} ${c.id} -> ${r.status} (${endpoint})`);
    }
  }
  const diferidos = man.creados.filter((c) => DIFERIDOS[c.tipo]).map((c) => ({ tipo: c.tipo, id: c.id, endpoint_reversion: c.endpoint_reversion, motivo: DIFERIDOS[c.tipo] }));
  const despues = await clasificacionActual();
  const evidenciaIntacta = Object.values(despues).every((v) => v.observado === v.esperado);
  const pendientes = acciones.filter((a) => a.revertido === false);
  escribir('cleanup.json', {
    run_id: RUN_ID, fase: 'cleanup', ejecutado: new Date().toISOString(),
    politica_telemetrias: 'Las telemetrias de TC-66/67/68 NO se eliminan: son la evidencia oficial del RUN y no existe politica explicita del proyecto que autorice su eliminacion.',
    acciones,
    diferidos,
    clasificacion_antes_de_la_limpieza: antes,
    clasificacion_despues_de_la_limpieza: despues,
    evidencia_intacta_tras_la_limpieza: evidenciaIntacta,
    estado: pendientes.length === 0
      ? (diferidos.length ? 'FIXTURE_REVERTIDO_PARCIALMENTE_CLEANUP_DIFERIDO_PARA_PRESERVAR_LA_EVIDENCIA' : 'FIXTURE_REVERTIDO')
      : 'CLEANUP_PENDIENTE_POR_FALTA_DE_ENDPOINT_PUBLICO',
    pendientes: pendientes.map((a) => `${a.tipo} ${a.id}: ${a.endpoint} -> ${a.status} ${a.body?.error_code || ''}`.trim()),
    motivo_del_pendiente: 'El area QA no admite baja mientras conserve el dispositivo y el activo QA asociados, y la API no expone ninguna via publica para desvincular o trasladar un dispositivo de su area. El dispositivo queda inactivo y el activo INACTIVO, de modo que el area no puede recibir ni generar datos nuevos.',
    nota: 'Reversion realizada exclusivamente con endpoints publicos oficiales. No se ejecuto SQL. Los elementos diferidos quedan marcados como QA en su nombre y descripcion y pueden darse de baja con los endpoints listados cuando la evidencia del RUN ya no sea necesaria.',
  });
  for (const c of man.creados) {
    const a = acciones.find((x) => x.tipo === c.tipo && x.id === c.id);
    c.estado_POST = a
      ? (a.revertido ? 'revertido por ' + a.endpoint : 'no revertido: ' + a.endpoint + ' -> ' + a.status)
      : (DIFERIDOS[c.tipo] ? 'reversion diferida: ' + DIFERIDOS[c.tipo] + ' (endpoint: ' + c.endpoint_reversion + ')' : 'sin accion de reversion directa');
  }
  escribir('fixture-created.json', man);
  console.log('cleanup acciones=' + acciones.length + ' diferidos=' + diferidos.length + ' evidencia_intacta=' + evidenciaIntacta);
}

// --------------------------------------------------------------------------------- FASE cierre
async function faseCierre() {
  escribir('git-final.json', { run_id: RUN_ID, momento: new Date().toISOString(), git_final: estadoGit(), nota: 'No se modifico Git durante el RUN: ni commits, ni ramas, ni checkout.' });

  const archivos = [];
  const recorrer = (dir) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) recorrer(p); else archivos.push(p); } };
  recorrer(OUT);
  const patrones = [
    ['contrasena literal', (t) => [...secretos].some((s) => t.includes(s))],
    ['JWT', (t) => /eyJ[A-Za-z0-9_-]{10,}\./.test(t)],
    ['cabecera Authorization con valor', (t) => /Authorization"\s*:\s*"(?!\[)/i.test(t)],
    ['cookie de sesion', (t) => /set-cookie/i.test(t)],
    ['campo contrasena con valor', (t) => /"contrasena"\s*:\s*"(?!\[REDACTED)/.test(t)],
    ['access_key con valor', (t) => /"access_key"\s*:\s*"(?!\[REDACTED)/.test(t)],
  ];
  const hallazgos = [];
  for (const f of archivos) {
    if (/\.(png|jpg|jpeg|mp4|webm|zip)$/i.test(f)) continue;
    const t = fs.readFileSync(f, 'utf8');
    for (const [nombre, test] of patrones) if (test(t)) hallazgos.push({ archivo: path.relative(OUT, f).split(path.sep).join('/'), patron: nombre });
  }
  escribir('seguridad-evidencias.json', {
    run_id: RUN_ID, momento: new Date().toISOString(),
    archivos_revisados: archivos.map((f) => path.relative(OUT, f).split(path.sep).join('/')).sort(),
    patrones_buscados: patrones.map(([n]) => n), hallazgos, secretos_persistidos: hallazgos.length > 0,
    marcadores_usados: ['[REDACTED_PASSWORD]', '[REDACTED_TOKEN]', '[REDACTED_ACCESS_KEY]'],
    nota: 'La contrasena del actor se tomo de una variable de proceso y el access_key (serial del dispositivo QA) se leyo por la API oficial; ninguno se persiste. El paquete con credenciales no se versiona.',
  });
  console.log('cierre OK  hallazgos_de_seguridad=' + hallazgos.length);
}

const FASES = { preflight: fasePreflight, fixture: faseFixture, oficial: faseOficial, cleanup: faseCleanup, cierre: faseCierre };
const FASE = (process.env.G31_FASE || '').toLowerCase();
if (!FASES[FASE]) { console.error('G31_FASE debe ser una de: ' + Object.keys(FASES).join(', ')); process.exit(1); }
FASES[FASE]().catch((e) => { console.error('FALLO EN FASE ' + FASE + ': ' + clean(e.message)); process.exit(1); });
