// TC-M09-G22 — REEVALUACION V4 (RF-17). Derivada de EvaluacionV2/helpers.cjs.
// Cambios respecto V2: RUN_ID V3, salida en EvaluacionV4/Resultados, referencia V2 fijada
// (misma variable, mismo rango, mismos niveles) y fixture de especie por caso.
// La contrasena llega solo por variable de proceso (TEST_ADMIN_PASSWORD) y el token vive
// en memoria; nunca se escribe en disco.
const fs = require('fs');
const path = require('path');

// Esquema HTTPS: el backend TEST por HTTP devuelve 404 del proxy y el frontend HTTP
// redirige 301 a HTTPS (verificado en el preflight y documentado en el reporte).
const BASE = 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test';
// La UI de TEST se publica ahora bajo el mismo dominio registrable que su API
// (api.inmero.co): la cookie de refresco viaja con SameSite=lax, por lo que el login solo
// se completa desde este origen. La URL antigua de sslip.io quedo apuntando a esa API y,
// al ser otro dominio registrable, el navegador descarta la cookie y la sesion no se abre.
const FRONT = 'https://api.inmero.co';
const BASE_HTTP_SUMINISTRADA = 'http://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test';
const FRONT_HTTP_SUMINISTRADA = 'http://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io';

// La cuenta existente esta escrita "administador" (sin la segunda r): no se corrige.
const ACTOR = process.env.TEST_ADMIN_EMAIL || 'administador.dev@gmail.com';
const ROLES_RF17 = ['Administrador', 'Veterinario'];
const ROL_V2 = 'Administrador';           // V3 reproduce el actor de V2; Veterinario solo es fallback historico.
const RECURSO_UMBRALES = 20;
const PERMISOS_V2 = [1, 2, 3, 4];         // crear / consultar / editar / desactivar observados en V2.
const CASOS = ['TC-M09-46', 'TC-M09-47', 'TC-M09-48', 'TC-M09-49'];

const META = {
  grupo: 'TC-M09-G22', rf: 'RF-17', tipo: 'REEVALUACION V4', entorno: 'TEST',
  rama: 'qa/juan-esteban-cuarta-evaluacion-M09-y-M02', base: BASE,
};

// Los nombres del catalogo llegan con UTF-8 doble-codificado desde la API
// ("CamarÃ³n Blanco"): todos los patrones evitan caracteres acentuados.
const ACUATICA = /cachama|camar|mojarra|tilapia|trucha|acuatic/i;
const TERRESTRE = /bovin|equin|\bave\b|porcin|ovin|capr/i;

// Fixture de QA provisionado antes de V3 por el flujo oficial. V3 ocupo con el las dos
// combinaciones de TC-46 y TC-47, asi que V4 ya no puede reutilizarlo y lo descubre como una
// especie mas. No se recrea, no se edita, no se desactiva y no se borra: aqui solo se consulta.
const FIXTURE_QA = { id: 61, nombre: 'Especie Acuatica Prueba' };

const SEMANTICA = {
  'TC-M09-46': { patron: null, etiqueta: 'Configuracion base (variable activa del catalogo)', preferVar: [/geno disuelto/i], preferEspecie: ACUATICA },
  'TC-M09-47': { patron: /temperatura/i, etiqueta: 'Temperatura', preferVar: [/temperatura del agua/i, /temperatura/i], preferEspecie: ACUATICA },
  'TC-M09-48': { patron: /humedad/i, etiqueta: 'Humedad', preferVar: [/humedad/i], preferEspecie: TERRESTRE },
  'TC-M09-49': { patron: /\bph\b|potencial de hidr/i, etiqueta: 'pH', escala: ['0.00', '14.00'], preferVar: [/\bph del agua\b/i, /\bph\b/i], preferEspecie: ACUATICA },
};
// Especies creadas por QA en otros grupos: se evitan mientras existan especies reales libres.
const ES_QA = /\bqa\b|\btest\b/i;

// ---------------------------------------------------------------------------
// REFERENCIA V2 (evidencia historica, inmutable). V3 reproduce la misma prueba:
// misma variable, mismo rango y mismos tres niveles. Lo unico que cambia es la
// especie, porque las combinaciones de V2 quedaron persistidas (ids 38-41) y la
// unicidad es por (especie, variable).
//
// `variablePatron` localiza la variable POR NOMBRE en el catalogo actual;
// `variableIdHistorico` solo se usa para contrastar, nunca para fijar el envio.
// `especieFija` obliga al fixture de QA; `especiePreferida` es el primer candidato
// a revalidar, con respaldo en cualquier especie activa del tipo correcto.
// ---------------------------------------------------------------------------
const REFERENCIA_V2 = {
  'TC-M09-46': {
    idUmbral: 38, especie: { id: 5, nombre: 'Mojarra Plateada' },
    variablePatron: /geno disuelto/i, variableIdHistorico: 3, variableNombre: 'Oxigeno disuelto',
    fisicoHistorico: ['0', '20'], tipoEspecie: 'ACUATICA', puntos: ['8.00', '9.33', '10.66', '12.00'],
    especiePreferida: /$^/,
  },
  'TC-M09-47': {
    idUmbral: 39, especie: { id: 10, nombre: 'Tilapia' },
    variablePatron: /temperatura del agua/i, variableIdHistorico: 1, variableNombre: 'Temperatura del agua',
    fisicoHistorico: ['0', '45'], tipoEspecie: 'ACUATICA', puntos: ['18.00', '21.00', '24.00', '27.00'],
    especiePreferida: /$^/,
  },
  'TC-M09-48': {
    idUmbral: 40, especie: { id: 39, nombre: 'Bovino' },
    variablePatron: /humedad relativa/i, variableIdHistorico: 10, variableNombre: 'Humedad Relativa',
    fisicoHistorico: ['0', '100'], tipoEspecie: 'TERRESTRE', puntos: ['40.00', '46.66', '53.32', '60.00'],
    especiePreferida: /^equino$/i,
  },
  'TC-M09-49': {
    idUmbral: 41, especie: { id: 3, nombre: 'Camaron Blanco' },
    variablePatron: /ph del agua/i, variableIdHistorico: 2, variableNombre: 'pH del agua',
    fisicoHistorico: ['0', '14'], tipoEspecie: 'ACUATICA', puntos: ['5.60', '6.53', '7.46', '8.40'],
    especiePreferida: /cachama blanca/i,
  },
};
const IDS_V2 = CASOS.map((c) => REFERENCIA_V2[c].idUmbral);

function settings({ requiereCaso = true } = {}) {
  const runId = process.env.G22_REEVAL_V4_RUN_ID;
  if (!runId || !/^[\w-]+$/.test(runId)) throw Error('G22_REEVAL_V4_RUN_ID requerido');
  if (!process.env.TEST_ADMIN_PASSWORD) throw Error('TEST_ADMIN_PASSWORD requerida');
  const caso = process.env.G22_CASE;
  const intento = Number(process.env.G22_INTENTO || 1);
  if (requiereCaso && !CASOS.includes(caso)) throw Error('G22_CASE debe ser uno de: ' + CASOS.join(' | '));
  // Presupuesto V4: un unico POST por original. No hay reintento mutante automatico.
  if (intento !== 1) throw Error('G22_INTENTO solo puede ser 1: presupuesto V4 de un POST por original');
  return { runId, caso, intento };
}

function clean(s) {
  if (s == null) return s;
  s = String(s);
  for (const secreto of [process.env.TEST_ADMIN_PASSWORD].filter(Boolean)) s = s.split(secreto).join('[REDACTED]');
  return s
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[JWT REDACTED]')
    .replace(/Bearer\s+(?!\{\{)[A-Za-z0-9_.\-]+/g, 'Bearer [REDACTED]')
    .replace(/refresh_token=[^;"\s]+/gi, 'refresh_token=[REDACTED]');
}

function dir(runId, ...sub) {
  const d = path.join(__dirname, 'Resultados', runId, ...sub);
  fs.mkdirSync(d, { recursive: true });
  return d;
}
function save(runId, name, value, { sobrescribir = false } = {}) {
  const p = path.join(dir(runId), name);
  if (fs.existsSync(p) && !sobrescribir) throw Error('No sobrescribir evidencia existente: ' + name);
  fs.writeFileSync(p, clean(JSON.stringify({ ...META, runId, fecha: new Date().toISOString(), ...value }, null, 2)));
}
function load(runId, name) {
  const p = path.join(dir(runId), name);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
}

async function get(endpoint, token) {
  const r = await fetch(BASE + endpoint, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(25000) });
  if (r.status !== 200) throw Error(`GET ${endpoint} HTTP ${r.status}`);
  return r.json();
}
async function login() {
  const r = await fetch(BASE + '/sesiones/', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo_electronico: ACTOR, contrasena: process.env.TEST_ADMIN_PASSWORD }),
    signal: AbortSignal.timeout(25000),
  });
  if (r.status !== 200) throw Error(`ENVIRONMENT_ERROR login HTTP ${r.status}`);
  const j = await r.json();
  if (!j.token) throw Error('ENVIRONMENT_ERROR login sin token');
  return j.token;
}

// Identidad, rol RF-17 y permisos del recurso 20. V3 exige el MISMO rol que V2:
// cambiar de actor rompe la comparabilidad y obliga a detenerse, no a sustituirlo.
async function validarActor(token) {
  const me = await get('/usuarios/me', token);
  const permisos = (await get('/sesiones/me/permisos', token)).permisos
    .filter((p) => p.id_recurso === RECURSO_UMBRALES).map((p) => p.id_accion).sort();
  const actor = {
    correo_electronico: me.correo_electronico, id_usuario: me.id_usuario, nombre_rol: me.nombre_rol,
    estado_cuenta: me.estado_cuenta, permisosRecurso20: permisos,
    permisosV2: PERMISOS_V2, permisosIgualesQueV2: JSON.stringify(permisos) === JSON.stringify(PERMISOS_V2),
    mismoActorQueV2: me.correo_electronico === ACTOR && me.nombre_rol === ROL_V2,
  };
  if (me.correo_electronico !== ACTOR) throw Error('Identidad inesperada del actor');
  if (!ROLES_RF17.includes(me.nombre_rol)) throw Error(`Rol no autorizado por RF-17: ${me.nombre_rol}`);
  if (me.nombre_rol !== ROL_V2) throw Error(`BLOCKED actor V3 distinto del actor V2 (${ROL_V2}): ${me.nombre_rol}`);
  if (me.estado_cuenta !== 'Activo') throw Error('BLOCKED cuenta del actor no activa: ' + me.estado_cuenta);
  if (![1, 2].every((a) => permisos.includes(a))) throw Error('BLOCKED permiso RF-17 crear/consultar ausente');
  return actor;
}

// Aritmetica decimal exacta a dos decimales.
function d2(v) {
  const [e, d = ''] = String(v).split('.');
  const neg = e.startsWith('-');
  return (neg ? -1n : 1n) * BigInt((neg ? e.slice(1) : e) + (d + '00').slice(0, 2));
}
function txt(c) {
  const neg = c < 0n;
  const a = (neg ? -c : c).toString().padStart(3, '0');
  return (neg ? '-' : '') + a.slice(0, -2) + '.' + a.slice(-2);
}

/** Rango claramente interior (40 %–60 % del rango fisico efectivo) con tres niveles contiguos. */
function rangoValido(variable, escala) {
  let lo = d2(variable.valor_fisico_min);
  let hi = d2(variable.valor_fisico_max);
  if (escala) { lo = lo > d2(escala[0]) ? lo : d2(escala[0]); hi = hi < d2(escala[1]) ? hi : d2(escala[1]); }
  const R = hi - lo;
  if (R <= 0n) return null;
  const a = lo + (R * 40n) / 100n;
  const d = lo + (R * 60n) / 100n;
  const paso = (d - a) / 3n;
  if (paso <= 0n) return null;
  const puntos = [a, a + paso, a + 2n * paso, d].map(txt);
  return { puntos, efectivoMin: txt(lo), efectivoMax: txt(hi), origen: 'intervalo interior 40%-60% del rango fisico real, niveles en tercios' };
}

/**
 * Equivalencia con V2: con los limites fisicos actuales, el mismo criterio de V2 debe
 * producir exactamente los cuatro puntos de V2. Si el catalogo cambio y el rango ya no
 * es reproducible, no se recalcula nada: el caso se queda sin plan y la ejecucion se detiene.
 */
function equivalenciaV2(caso, variable) {
  const ref = REFERENCIA_V2[caso];
  const calculado = rangoValido(variable, SEMANTICA[caso].escala);
  const mismoRango = !!calculado && JSON.stringify(calculado.puntos) === JSON.stringify(ref.puntos);
  const dentroDeLimites = d2(ref.puntos[0]) >= d2(variable.valor_fisico_min) && d2(ref.puntos[3]) <= d2(variable.valor_fisico_max);
  return {
    idUmbralV2: ref.idUmbral, especieV2: ref.especie,
    variableIdHistorico: ref.variableIdHistorico, variableIdActual: variable.id_variable_ambiental,
    variableIdSinCambios: variable.id_variable_ambiental === ref.variableIdHistorico,
    nombreVariableV2: ref.variableNombre, nombreVariableActual: variable.nombre,
    limiteFisicoHistorico: ref.fisicoHistorico,
    limiteFisicoActual: [String(variable.valor_fisico_min), String(variable.valor_fisico_max)],
    limiteFisicoSinCambios: String(variable.valor_fisico_min) === ref.fisicoHistorico[0] && String(variable.valor_fisico_max) === ref.fisicoHistorico[1],
    puntosV2: ref.puntos, puntosRecalculados: calculado ? calculado.puntos : null,
    mismaVariable: ref.variablePatron.test(variable.nombre),
    mismoRango, mismosNiveles: mismoRango, rangoV2DentroDeLimitesActuales: dentroDeLimites,
    criterio: 'V3 reproduce variable, rango y niveles de V2; solo se sustituye la especie por unicidad (especie, variable)',
  };
}

async function catalogo(token) {
  const especies = (await get('/configuracion/especies', token)).items;
  const activas = especies.filter((s) => s.es_activo);
  const variables = (await get('/configuracion/variables-ambientales', token)).items;
  const umbralesPorEspecie = {};
  for (const s of activas) umbralesPorEspecie[s.id_especie] = (await get(`/configuracion/umbrales?id_especie=${s.id_especie}`, token)).items;
  const ocupadas = [];
  const libres = [];
  for (const s of activas) {
    for (const v of variables) {
      const combo = { id_especie: s.id_especie, especie: s.nombre, id_variable_ambiental: v.id_variable_ambiental, variable: v.nombre };
      if (umbralesPorEspecie[s.id_especie].some((u) => u.id_variable_ambiental === v.id_variable_ambiental)) ocupadas.push(combo);
      else libres.push(combo);
    }
  }
  return { especies, activas, variables, umbralesPorEspecie, ocupadas, libres };
}

/** Localiza la variable de un caso POR NOMBRE en el catalogo vigente, sin hardcodear el id. */
function variableDe(caso, cat) {
  const ref = REFERENCIA_V2[caso];
  const halladas = cat.variables.filter((v) => ref.variablePatron.test(v.nombre));
  return halladas.length === 1 ? halladas[0] : null;
}

/**
 * Estado del fixture de QA (especie 61): solo GET. Se revalida siempre antes de planificar.
 */
function estadoFixture(cat) {
  const esp = cat.especies.find((s) => s.id_especie === FIXTURE_QA.id) || null;
  const umbrales = esp && esp.es_activo ? (cat.umbralesPorEspecie[FIXTURE_QA.id] || []) : [];
  const libre = (caso) => {
    const v = variableDe(caso, cat);
    return v ? !umbrales.some((u) => u.id_variable_ambiental === v.id_variable_ambiental) : null;
  };
  return {
    id: FIXTURE_QA.id, esperado: FIXTURE_QA.nombre,
    presente: !!esp, nombre: esp ? esp.nombre : null, nombreCoincide: !!esp && esp.nombre === FIXTURE_QA.nombre,
    es_activo: esp ? esp.es_activo : null,
    densidad_maxima_por_especie: esp ? esp.densidad_maxima_por_especie ?? null : null,
    totalUmbrales: umbrales.length,
    umbrales: umbrales.map((u) => ({ id: u.id_umbral_ambiental, id_variable_ambiental: u.id_variable_ambiental, es_activo: u.es_activo })),
    oxigenoLibre: libre('TC-M09-46'), temperaturaAguaLibre: libre('TC-M09-47'),
  };
}

/**
 * Estado de los datos historicos de V2 (ids 38-41): solo GET. No se reutilizan, no se
 * borran y no se modifican; se registran para demostrar que siguen ahi.
 */
function estadoDatosV2(cat) {
  const porId = new Map();
  for (const [id, items] of Object.entries(cat.umbralesPorEspecie)) {
    for (const u of items) porId.set(u.id_umbral_ambiental, { ...u, id_especie_consultada: Number(id) });
  }
  const detalle = {};
  for (const caso of CASOS) {
    const ref = REFERENCIA_V2[caso];
    const u = porId.get(ref.idUmbral) || null;
    detalle[caso] = {
      idUmbralV2: ref.idUmbral, presente: !!u,
      especieEsperada: ref.especie, especieReal: u ? u.id_especie : null,
      variableReal: u ? u.id_variable_ambiental : null,
      valor_min: u ? u.valor_min : null, valor_max: u ? u.valor_max : null,
      es_activo: u ? u.es_activo : null,
      niveles: u ? u.niveles.map((n) => `${n.nivel} ${n.limite_inferior}-${n.limite_superior}`) : null,
    };
  }
  return { ids: IDS_V2, todosPresentes: Object.values(detalle).every((d) => d.presente), detalle };
}

/**
 * Deteccion de escrituras de una EvaluacionV3 anterior: borrar archivos locales no revierte
 * datos en TEST, asi que se comprueba contra el propio ambiente. Se distinguen dos cosas:
 *
 *  - `escriturasDeEsteplan`: un umbral que YA ocupa exactamente la combinacion y el rango que
 *    V3 va a enviar. Eso significaria que un POST de V3 ya persistio: hay que detenerse y no
 *    repetirlo, porque duplicaria datos.
 *  - `equivalentesEnOtrasEspecies`: umbrales posteriores a V2 con la misma variable, el mismo
 *    rango y los mismos niveles pero con OTRA especie. Repetir el mismo caso con un fixture
 *    distinto es valido en una reevaluacion (autorizado por el responsable QA), asi que solo
 *    se documentan; no bloquean.
 */
function escriturasPreviasV4(cat, plan) {
  const maxV2 = Math.max(...IDS_V2);
  const escriturasDeEstePlan = [];
  const equivalentesEnOtrasEspecies = [];
  for (const caso of CASOS) {
    const ref = REFERENCIA_V2[caso];
    const v = variableDe(caso, cat);
    if (!v) continue;
    const previsto = plan && plan[caso] ? plan[caso] : null;
    for (const s of cat.activas) {
      for (const u of cat.umbralesPorEspecie[s.id_especie] || []) {
        if (u.id_variable_ambiental !== v.id_variable_ambiental) continue;
        if (u.id_umbral_ambiental <= maxV2) continue;                      // V1/V2: evidencia historica
        const mismoRango = u.valor_min === ref.puntos[0] && u.valor_max === ref.puntos[3];
        if (!mismoRango) continue;                                          // otro escenario, ajeno a G22
        const fila = { caso, id_umbral_ambiental: u.id_umbral_ambiental, id_especie: s.id_especie, especie: s.nombre,
          id_variable_ambiental: v.id_variable_ambiental, variable: v.nombre, valor_min: u.valor_min, valor_max: u.valor_max,
          niveles: u.niveles.map((n) => `${n.limite_inferior}-${n.limite_superior}`), es_activo: u.es_activo,
          fecha_actualizacion: u.fecha_actualizacion ?? null };
        if (previsto && s.id_especie === previsto.especie.id) escriturasDeEstePlan.push(fila);
        else equivalentesEnOtrasEspecies.push(fila);
      }
    }
  }
  return { escriturasDeEstePlan, equivalentesEnOtrasEspecies };
}

function contextoDe(caso, cat, especie, variable) {
  const sem = SEMANTICA[caso];
  const ref = REFERENCIA_V2[caso];
  const eq = equivalenciaV2(caso, variable);
  // V3 no acepta un rango distinto del de V2: si no coincide, no hay contexto.
  if (!eq.mismaVariable || !eq.mismoRango || !eq.rangoV2DentroDeLimitesActuales) return null;
  const [p0, p1, p2, p3] = ref.puntos;
  const previos = cat.umbralesPorEspecie[especie.id_especie] || [];
  return {
    caso,
    especie: { id: especie.id_especie, nombre: especie.nombre, es_activo: especie.es_activo,
      esFixtureQA: especie.id_especie === FIXTURE_QA.id },
    variable: {
      id: variable.id_variable_ambiental, nombre: variable.nombre, unidad: variable.unidad, catalogoActivo: true,
      fisicoMin: String(variable.valor_fisico_min), fisicoMax: String(variable.valor_fisico_max),
      semantica: sem.etiqueta, coincidePatron: sem.patron ? sem.patron.test(variable.nombre) : true,
      idResueltoPorNombre: true, idHistorico: ref.variableIdHistorico,
    },
    rangoElegido: {
      valor_min: p0, valor_max: p3,
      origen: 'rango exacto de V2 (mismo criterio: intervalo interior 40%-60% del rango fisico, niveles en tercios)',
      efectivoMin: String(variable.valor_fisico_min), efectivoMax: String(variable.valor_fisico_max),
    },
    equivalenciaV2: eq,
    datoModificadoRespectoV2: especie.id_especie === ref.especie.id ? 'ninguno' : 'solo especie',
    tipoEspecieEsperado: ref.tipoEspecie,
    tipoEspecieCoincide: (ref.tipoEspecie === 'ACUATICA' ? ACUATICA : TERRESTRE).test(especie.nombre),
    combinacionLibre: true,
    umbralesPrevios: previos.map((u) => ({ id: u.id_umbral_ambiental, id_variable_ambiental: u.id_variable_ambiental })),
    payload: {
      id_especie: especie.id_especie, id_variable_ambiental: variable.id_variable_ambiental, valor_min: p0, valor_max: p3,
      niveles: [
        { nivel: 'normal', limite_inferior: p0, limite_superior: p1 },
        { nivel: 'precaucion', limite_inferior: p1, limite_superior: p2 },
        { nivel: 'critico', limite_inferior: p2, limite_superior: p3 },
      ],
    },
  };
}

/**
 * Planificacion V4. La variable, el rango y los niveles quedan fijados por V2 y la variable
 * se resuelve por nombre en el catalogo vigente.
 *  - En V4 los cuatro casos descubren especie: la unicidad (especie, variable) dejo ocupadas
 *    todas las combinaciones que uso V3, incluida la del fixture de QA en TC-46 y TC-47.
 *  - TC-48 y TC-49 revalidan primero el candidato equivalente identificado en el analisis
 *    previo y, si no sirve, buscan otra especie ACTIVA del MISMO tipo semantico con la
 *    combinacion libre. El tipo de especie es un requisito, no una preferencia: usar una
 *    especie terrestre para una variable de agua cambiaria la naturaleza de la prueba.
 * `excluir` evita combinaciones ya usadas en este run.
 */
function planificar(cat, casos = CASOS, excluir = []) {
  const clave = (e, v) => `${e}:${v}`;
  const usadas = new Set(excluir.map((x) => clave(x.id_especie, x.id_variable_ambiental)));
  const especiesUsadas = new Set(excluir.map((x) => x.id_especie));
  // Cualquier umbral existente (activo o inactivo) ocupa la combinacion: la unicidad es por (especie, variable).
  const libre = (s, v) => !(cat.umbralesPorEspecie[s.id_especie] || []).some((u) => u.id_variable_ambiental === v.id_variable_ambiental)
    && !usadas.has(clave(s.id_especie, v.id_variable_ambiental));
  const plan = {};
  for (const caso of CASOS.filter((c) => casos.includes(c))) {
    const ref = REFERENCIA_V2[caso];
    const variable = variableDe(caso, cat);
    if (!variable) { plan[caso] = null; continue; }
    let candidatas;
    if (ref.especieFija) {
      candidatas = cat.activas.filter((e) => e.id_especie === ref.especieFija);
    } else {
      const tipo = ref.tipoEspecie === 'ACUATICA' ? ACUATICA : TERRESTRE;
      const rank = (e) => (ref.especiePreferida.test(e.nombre) ? 0 : 10)
        + (ES_QA.test(e.nombre) ? 4 : 0) + (especiesUsadas.has(e.id_especie) ? 2 : 0);
      candidatas = cat.activas
        .filter((e) => e.id_especie !== ref.especie.id)      // la especie de V2 ya ocupa la combinacion
        // En V3 el fixture quedaba reservado a TC-46/47; en V4 esas dos combinaciones ya estan
        // ocupadas por el propio V3, asi que el fixture vuelve al catalogo general de candidatas.
        .filter((e) => tipo.test(e.nombre))                  // requisito semantico, igual que V2
        .sort((a, b) => rank(a) - rank(b) || a.id_especie - b.id_especie);
    }
    let elegido = null;
    for (const e of candidatas) {
      if (!libre(e, variable)) continue;
      const ctx = contextoDe(caso, cat, e, variable);
      if (ctx) { elegido = ctx; break; }
    }
    plan[caso] = elegido;
    if (elegido) { usadas.add(clave(elegido.especie.id, elegido.variable.id)); especiesUsadas.add(elegido.especie.id); }
  }
  return plan;
}

/** Diagnostico para el safety stop de datos. */
function diagnostico(caso, cat) {
  const ref = REFERENCIA_V2[caso];
  const variable = variableDe(caso, cat);
  const tipo = ref.tipoEspecie === 'ACUATICA' ? ACUATICA : TERRESTRE;
  const revisadas = cat.activas.map((e) => ({
    id: e.id_especie, nombre: e.nombre, tipoApropiado: tipo.test(e.nombre), esEspecieV2: e.id_especie === ref.especie.id,
    combinacionOcupada: variable ? (cat.umbralesPorEspecie[e.id_especie] || []).some((u) => u.id_variable_ambiental === variable.id_variable_ambiental) : null,
  }));
  const aptas = revisadas.filter((e) => e.tipoApropiado && !e.esEspecieV2
    && (ref.especieFija ? e.id === ref.especieFija : true));
  return {
    caso, variableEsperada: ref.variableNombre, variablePresente: !!variable,
    variableId: variable ? variable.id_variable_ambiental : null, tipoEspecieRequerido: ref.tipoEspecie,
    especiesRevisadas: revisadas,
    especiesAptas: aptas.map((e) => `${e.id}:${e.nombre}${e.combinacionOcupada ? ' (OCUPADA)' : ' (libre)'}`),
    especiesAptasLibres: aptas.filter((e) => e.combinacionOcupada === false).length,
    datoAdicionalNecesario: !variable ? 'la variable de V2 no se localiza por nombre en el catalogo'
      : aptas.every((e) => e.combinacionOcupada) ? `habria que cambiar la variable o el tipo de especie de ${caso}` : 'ninguno',
  };
}

// Cuerpo con literales decimales exactos.
function cuerpo(p) {
  const nivel = (n) => `{"nivel":"${n.nivel}","limite_inferior":${n.limite_inferior},"limite_superior":${n.limite_superior}}`;
  return `{"id_especie":${p.id_especie},"id_variable_ambiental":${p.id_variable_ambiental},`
    + `"valor_min":${p.valor_min},"valor_max":${p.valor_max},"niveles":[${p.niveles.map(nivel).join(',')}]}`;
}

async function preflight() {
  const salida = [];
  for (const url of [BASE_HTTP_SUMINISTRADA + '/health', FRONT_HTTP_SUMINISTRADA + '/login']) {
    try {
      const r = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(20000) });
      salida.push({ url, status: r.status, location: r.headers.get('location'), nota: 'URL HTTP suministrada; el ambiente decisorio es HTTPS' });
    } catch (e) { salida.push({ url, error: clean(e.message) }); }
  }
  for (const url of [FRONT + '/login', BASE + '/health', BASE + '/openapi.json']) {
    const r = await fetch(url, { signal: AbortSignal.timeout(25000) });
    salida.push({ url, status: r.status });
    if (r.status !== 200) throw Error('ENVIRONMENT_ERROR preflight HTTP ' + r.status + ' ' + url);
    if (url.endsWith('openapi.json')) {
      const j = await r.json();
      const op = j.paths['/configuracion/umbrales']?.post;
      if (!op) throw Error('Contrato ausente: POST /configuracion/umbrales');
      const exitos = Object.keys(op.responses).filter((s) => s.startsWith('2'));
      salida.push({
        contrato: 'POST /configuracion/umbrales',
        respuestasDeclaradas: Object.keys(op.responses), exitoDeclarado: exitos,
        dto: 'RegistrarUmbralDTO', dtoRequerido: j.components.schemas.RegistrarUmbralDTO?.required || [],
        dtoPropiedades: Object.keys(j.components.schemas.RegistrarUmbralDTO?.properties || {}),
        nivelDtoRequerido: j.components.schemas.NivelDTO?.required || [],
        erroresDeclarados: Object.keys(op.responses).filter((s) => !s.startsWith('2')),
        umbralResponse: Object.keys(j.components.schemas.UmbralAmbientalResponse?.properties || {}),
      });
      if (exitos.length !== 1 || exitos[0] !== '201') throw Error('CONTRATO: exito declarado distinto de 201: ' + exitos.join(','));
    }
  }
  return salida;
}

module.exports = {
  BASE, FRONT, ACTOR, CASOS, META, SEMANTICA, REFERENCIA_V2, IDS_V2, FIXTURE_QA,
  settings, clean, dir, save, load, get, login, validarActor, catalogo, variableDe,
  estadoFixture, estadoDatosV2, escriturasPreviasV4, planificar, diagnostico, cuerpo,
  preflight, rangoValido, equivalenciaV2,
};
