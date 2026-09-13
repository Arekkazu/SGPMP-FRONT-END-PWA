// TC-M09-G22 — REEVALUACION V2 (RF-17). Utilidades de descubrimiento, planificacion
// de combinaciones libres y saneamiento. La contrasena llega solo por variable de
// proceso (TEST_ADMIN_PASSWORD) y el token vive en memoria.
const fs = require('fs');
const path = require('path');

// Esquema HTTPS: el backend TEST por HTTP devuelve 404 del proxy y el frontend HTTP
// redirige 301 a HTTPS (verificado en el preflight y documentado en el reporte).
const BASE = 'https://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test';
const FRONT = 'https://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io';
const BASE_HTTP_SUMINISTRADA = 'http://sigab-backendtest-389pcb-a48238-158-69-200-27.sslip.io/api-sgpmp-test';
const FRONT_HTTP_SUMINISTRADA = 'http://sigab-frontendtest-6aqrny-d2b730-158-69-200-27.sslip.io';

const ACTOR = 'administador.dev@gmail.com';
const ROLES_RF17 = ['Administrador', 'Veterinario'];
const RECURSO_UMBRALES = 20;
const CASOS = ['TC-M09-46', 'TC-M09-47', 'TC-M09-48', 'TC-M09-49'];

const META = {
  grupo: 'TC-M09-G22', rf: 'RF-17', tipo: 'REEVALUACION V2', entorno: 'TEST',
  rama: 'qa/juan-esteban-re-evaluacion-M02', base: BASE,
};

// Semantica exigida por cada original. TC-46 es la configuracion base: preferiblemente
// una variable distinta de las tres que reservan TC-47/48/49.
const ACUATICA = /cachama|camar[oó]n|mojarra|tilapia|trucha/i;
const TERRESTRE = /bovin|equin|\bave\b|porcin|ovin|capr/i;
const SEMANTICA = {
  'TC-M09-47': { patron: /temperatura/i, etiqueta: 'Temperatura', preferVar: [/temperatura del agua/i, /temperatura/i], preferEspecie: ACUATICA },
  'TC-M09-48': { patron: /humedad/i, etiqueta: 'Humedad', preferVar: [/humedad/i], preferEspecie: TERRESTRE },
  'TC-M09-49': { patron: /\bph\b|potencial de hidr/i, etiqueta: 'pH', escala: ['0.00', '14.00'], preferVar: [/\bph del agua\b/i, /\bph\b/i], preferEspecie: ACUATICA },
  'TC-M09-46': { patron: null, etiqueta: 'Configuracion base (variable activa del catalogo)', preferVar: [/ox[ií]geno disuelto/i], preferEspecie: ACUATICA },
};
// Especies creadas por QA en otros grupos: se evitan mientras existan especies reales libres.
const ES_QA = /\bqa\b|\btest\b/i;

function settings({ requiereCaso = true } = {}) {
  const runId = process.env.G22_REEVAL_V2_RUN_ID;
  if (!runId || !/^[\w-]+$/.test(runId)) throw Error('G22_REEVAL_V2_RUN_ID requerido');
  if (!process.env.TEST_ADMIN_PASSWORD) throw Error('TEST_ADMIN_PASSWORD requerida');
  const caso = process.env.G22_CASE;
  const intento = Number(process.env.G22_INTENTO || 1);
  if (requiereCaso && !CASOS.includes(caso)) throw Error('G22_CASE debe ser uno de: ' + CASOS.join(' | '));
  if (![1, 2].includes(intento)) throw Error('G22_INTENTO solo puede ser 1 o 2: maximo dos POST por original');
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
  const d = path.join(__dirname, 'RESULTADOS', runId, ...sub);
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

// Validacion del actor: identidad, rol RF-17 y permisos crear/consultar del recurso 20.
async function validarActor(token) {
  const me = await get('/usuarios/me', token);
  const permisos = (await get('/sesiones/me/permisos', token)).permisos
    .filter((p) => p.id_recurso === RECURSO_UMBRALES).map((p) => p.id_accion).sort();
  const actor = {
    correo_electronico: me.correo_electronico, id_usuario: me.id_usuario, nombre_rol: me.nombre_rol,
    estado_cuenta: me.estado_cuenta, permisosRecurso20: permisos,
  };
  if (me.correo_electronico !== ACTOR) throw Error('Identidad inesperada del actor');
  if (!ROLES_RF17.includes(me.nombre_rol)) throw Error(`Rol no autorizado por RF-17: ${me.nombre_rol}`);
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

function contextoDe(caso, cat, especie, variable) {
  const sem = SEMANTICA[caso];
  const rango = rangoValido(variable, sem.escala);
  if (!rango) return null;
  const [p0, p1, p2, p3] = rango.puntos;
  const previos = cat.umbralesPorEspecie[especie.id_especie];
  return {
    caso,
    especie: { id: especie.id_especie, nombre: especie.nombre, es_activo: especie.es_activo },
    variable: {
      id: variable.id_variable_ambiental, nombre: variable.nombre, unidad: variable.unidad, catalogoActivo: true,
      fisicoMin: String(variable.valor_fisico_min), fisicoMax: String(variable.valor_fisico_max),
      semantica: sem.etiqueta, coincidePatron: sem.patron ? sem.patron.test(variable.nombre) : true,
    },
    rangoElegido: { valor_min: p0, valor_max: p3, origen: rango.origen, efectivoMin: rango.efectivoMin, efectivoMax: rango.efectivoMax },
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
 * Planifica una combinacion libre y distinta por original. Reserva primero las
 * variables semanticas (TC-47/48/49) y despues TC-46, preferiblemente con otra
 * variable y otra especie. `excluir` evita combinaciones ya usadas en este run.
 */
function planificar(cat, casos = CASOS, excluir = []) {
  const clave = (e, v) => `${e}:${v}`;
  const usadas = new Set(excluir.map((x) => clave(x.id_especie, x.id_variable_ambiental)));
  const especiesUsadas = new Set(excluir.map((x) => x.id_especie));
  // Cualquier umbral existente (activo o inactivo) ocupa la combinacion: la unicidad es por (especie, variable).
  const libre = (s, v) => !cat.umbralesPorEspecie[s.id_especie].some((u) => u.id_variable_ambiental === v.id_variable_ambiental)
    && !usadas.has(clave(s.id_especie, v.id_variable_ambiental));
  const orden = ['TC-M09-47', 'TC-M09-48', 'TC-M09-49', 'TC-M09-46'].filter((c) => casos.includes(c));
  const semanticos = cat.variables.filter((v) => ['TC-M09-47', 'TC-M09-48', 'TC-M09-49'].some((c) => SEMANTICA[c].patron.test(v.nombre)));
  const plan = {};
  for (const caso of orden) {
    const sem = SEMANTICA[caso];
    let candidatasVar = sem.patron ? cat.variables.filter((v) => sem.patron.test(v.nombre)) : cat.variables.filter((v) => !semanticos.includes(v));
    if (!sem.patron && !candidatasVar.length) candidatasVar = cat.variables;
    // Coherencia semantica primero (tipo de especie, especie no QA, variable preferida)
    // y despues especies aun no usadas, para maximizar independencia entre originales.
    const rankEspecie = (e) => (sem.preferEspecie.test(e.nombre) ? 0 : 4) + (ES_QA.test(e.nombre) ? 2 : 0) + (especiesUsadas.has(e.id_especie) ? 1 : 0);
    const especiesOrdenadas = [...cat.activas].sort((a, b) => rankEspecie(a) - rankEspecie(b) || a.id_especie - b.id_especie);
    const rankVar = (v) => { const i = sem.preferVar.findIndex((r) => r.test(v.nombre)); return i === -1 ? 99 : i; };
    candidatasVar = [...candidatasVar].sort((a, b) => rankVar(a) - rankVar(b));
    let elegido = null;
    const pares = [];
    for (const v of candidatasVar) for (const e of especiesOrdenadas) pares.push([e, v]);
    pares.sort((x, y) => (rankEspecie(x[0]) + 3 * rankVar(x[1])) - (rankEspecie(y[0]) + 3 * rankVar(y[1])));
    for (const [e, v] of pares) {
      if (!libre(e, v)) continue;
      const ctx = contextoDe(caso, cat, e, v);
      if (ctx) { elegido = ctx; break; }
    }
    if (!elegido && !sem.patron) {
      // Fallback TC-46: cualquier variable libre no reservada.
      for (const s of especiesOrdenadas) {
        for (const v of cat.variables) { if (libre(s, v)) { elegido = contextoDe(caso, cat, s, v); if (elegido) break; } }
        if (elegido) break;
      }
    }
    plan[caso] = elegido;
    if (elegido) { usadas.add(clave(elegido.especie.id, elegido.variable.id)); especiesUsadas.add(elegido.especie.id); }
  }
  return plan;
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
      salida.push({ url, status: r.status, location: r.headers.get('location'), nota: 'URL suministrada' });
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
      salida.push({ contrato: 'POST /configuracion/umbrales', respuestasDeclaradas: Object.keys(op.responses), exitoDeclarado: exitos,
        umbralResponse: Object.keys(j.components.schemas.UmbralAmbientalResponse?.properties || {}) });
      if (exitos.length !== 1 || exitos[0] !== '201') throw Error('CONTRATO: exito declarado distinto de 201: ' + exitos.join(','));
    }
  }
  return salida;
}

module.exports = {
  BASE, FRONT, ACTOR, CASOS, META, SEMANTICA, settings, clean, dir, save, load, get, login, validarActor,
  catalogo, planificar, cuerpo, preflight, rangoValido,
};
