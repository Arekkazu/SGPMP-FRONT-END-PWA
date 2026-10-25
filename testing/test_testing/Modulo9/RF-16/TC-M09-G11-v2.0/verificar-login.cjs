// verificar-login.cjs — TC-M09-G11-v2.0
// Preflight de solo lectura:
// 1. Un solo login administrativo para validar credenciales y obtener token.
// 2. Confirma Trucha Arcoíris (id 2) activa.
// 3. Consulta ciclos, patologías y métricas de especie #2 con solo_activas=false.
// 4. Selecciona nombres libres probando variante alfabética si el base está ocupado.
// 5. Escribe evidencias/nombres_corrida.json y evidencias/especies_preflight.json SIN token ni contraseñas.
// Códigos de salida: 0 = OK; 2 = No se pudo resolver precondición (STOP); 1 = Error de config/red.

const { resolve } = require('path');
const { existsSync, readFileSync, writeFileSync, mkdirSync } = require('fs');

function cargarEnvTest() {
  const rutas = [
    resolve(__dirname, '.env.test'),
    resolve(__dirname, '../../../../.env.test'),
    resolve(__dirname, '../../../../../.env.test'),
  ];
  for (const envPath of rutas) {
    if (!existsSync(envPath)) continue;
    try {
      for (const l of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
        const linea = l.trim();
        if (!linea || linea.startsWith('#')) continue;
        const idx = linea.indexOf('=');
        if (idx === -1) continue;
        const key = linea.substring(0, idx).trim();
        const val = linea.substring(idx + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
    } catch (_) {}
  }
}
cargarEnvTest();

const target = (process.env.ENV_TARGET || 'TEST').toUpperCase();
const API_POR_TARGET = {
  TEST: 'https://api.inmero.co/back-sigab-test',
  DEV: 'https://api.inmero.co/back-sigab-dev',
};
const apiUrl = process.env.API_BASE_URL || API_POR_TARGET[target];
const email = process.env.ADMIN_EMAIL || '';
const password = process.env.TEST_ADMIN_PASSWORD || '';

const norm = (s) => String(s == null ? '' : s).trim().toLowerCase();

function resolverNombreLibre(baseOriginal, sufijoBase, existentes) {
  const setExistentes = new Set(existentes.map((e) => norm(e)));
  const baseDisponible = !setExistentes.has(norm(baseOriginal));
  if (baseDisponible) {
    return { elegido: baseOriginal, baseDisponible: true };
  }

  // Generar variantes alfabéticas: QAB, QAC, QAD, QAE...
  const letras = 'BCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  for (const letra of letras) {
    const variante = `${sufijoBase} QA${letra}`;
    if (!setExistentes.has(norm(variante))) {
      return { elegido: variante, baseDisponible: false };
    }
  }

  return { elegido: null, baseDisponible: false };
}

async function main() {
  if (!apiUrl) {
    console.error(`[verificar-login] ENV_TARGET desconocido: ${target}`);
    process.exit(1);
  }
  if (!email || !password) {
    console.error('[verificar-login] Faltan ADMIN_EMAIL o TEST_ADMIN_PASSWORD.');
    process.exit(1);
  }

  const evidencias = resolve(__dirname, 'evidencias');
  mkdirSync(evidencias, { recursive: true });

  console.log(`[verificar-login] ENV_TARGET=${target} API=${apiUrl} usuario=${email}`);
  const resLogin = await fetch(`${apiUrl}/sesiones/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo_electronico: email, contrasena: password }),
  });
  let bodyLogin = null;
  try { bodyLogin = await resLogin.json(); } catch (_) {}
  const token = bodyLogin && typeof bodyLogin.token === 'string' ? bodyLogin.token : null;
  console.log(`[verificar-login] POST /sesiones/ -> HTTP ${resLogin.status} token=${token ? 'presente' : 'AUSENTE'}`);
  if (!token) {
    const msg = bodyLogin && (bodyLogin.detail || bodyLogin.mensaje || bodyLogin.message || bodyLogin.codigo);
    console.error(`[verificar-login] Login sin token. Mensaje backend: ${msg ? JSON.stringify(msg) : 'N/A'}`);
    process.exit(1);
  }

  const authHeaders = { Authorization: `Bearer ${token}` };

  // 1. Confirmar especie Trucha Arcoíris (id 2) activa
  const resEsp = await fetch(`${apiUrl}/configuracion/especies?solo_activas=false`, {
    headers: authHeaders,
  });
  let bodyEsp = null;
  try { bodyEsp = await resEsp.json(); } catch (_) {}
  const itemsEsp = Array.isArray(bodyEsp) ? bodyEsp : (bodyEsp && Array.isArray(bodyEsp.items) ? bodyEsp.items : []);
  const trucha = itemsEsp.find((e) => Number(e.id_especie) === 2) || itemsEsp.find((e) => norm(e.nombre) === norm('trucha arcoíris'));

  if (!trucha || trucha.es_activo !== true) {
    console.error(`[verificar-login] Trucha Arcoíris (#2) no encontrada o inactiva.`);
    process.exit(2);
  }
  console.log(`[verificar-login] Especie objetivo confirmada: ID #${trucha.id_especie} "${trucha.nombre}" (activa=true).`);

  // 2. Consultar Ciclos existentes de especie 2
  const resCiclos = await fetch(`${apiUrl}/configuracion/ciclos?id_especie=2&solo_activas=false`, {
    headers: authHeaders,
  });
  const bodyCiclos = await resCiclos.json().catch(() => ({}));
  const ciclosExistentes = (Array.isArray(bodyCiclos) ? bodyCiclos : (bodyCiclos.items || [])).map((c) => c.nombre);

  // 3. Consultar Patologías existentes de especie 2
  const resPat = await fetch(`${apiUrl}/configuracion/patologias?id_especie=2&solo_activas=false`, {
    headers: authHeaders,
  });
  const bodyPat = await resPat.json().catch(() => ({}));
  const patExistentes = (Array.isArray(bodyPat) ? bodyPat : (bodyPat.items || [])).map((p) => p.nombre);

  // 4. Consultar Métricas existentes de especie 2
  const resMet = await fetch(`${apiUrl}/configuracion/metricas?id_especie=2&solo_activas=false`, {
    headers: authHeaders,
  });
  const bodyMet = await resMet.json().catch(() => ({}));
  const metExistentes = (Array.isArray(bodyMet) ? bodyMet : (bodyMet.items || [])).map((m) => m.nombre);

  // 5. Resolver nombres libres
  const resCiclo = resolverNombreLibre('Alevinaje QA2', 'Alevinaje', ciclosExistentes);
  const resPatologia = resolverNombreLibre('Saprolegniosis QA2', 'Saprolegniosis', patExistentes);
  const resMetrica = resolverNombreLibre('Huevos recolectados QA2', 'Huevos recolectados', metExistentes);

  if (!resCiclo.elegido || !resPatologia.elegido || !resMetrica.elegido) {
    console.error(`[verificar-login] No se pudo encontrar un nombre libre para las 3 entidades.`);
    process.exit(2);
  }

  const nombresCorrida = {
    ciclo: resCiclo.elegido,
    patologia: resPatologia.elegido,
    metrica: resMetrica.elegido,
    base_original_disponible: {
      ciclo: resCiclo.baseDisponible,
      patologia: resPatologia.baseDisponible,
      metrica: resMetrica.baseDisponible,
    },
  };

  const nombresPath = resolve(evidencias, 'nombres_corrida.json');
  writeFileSync(nombresPath, JSON.stringify(nombresCorrida, null, 2), 'utf8');
  console.log(`[verificar-login] Nombres de corrida resueltos y guardados en ${nombresPath}:`);
  console.log(JSON.stringify(nombresCorrida, null, 2));

  // Guardar especies_preflight.json para auditoría sin tokens
  const preflightRes = {
    fecha: new Date().toISOString(),
    env_target: target,
    api: apiUrl,
    especie_objetivo: {
      id_especie: trucha.id_especie,
      nombre: trucha.nombre,
      es_activo: trucha.es_activo,
    },
    nombres_corrida: nombresCorrida,
    precondicion: 'CUMPLIDA',
  };
  writeFileSync(resolve(evidencias, 'especies_preflight.json'), JSON.stringify(preflightRes, null, 2), 'utf8');

  process.exit(0);
}

main().catch((err) => {
  console.error('[verificar-login] Error no controlado:', err);
  process.exit(1);
});
