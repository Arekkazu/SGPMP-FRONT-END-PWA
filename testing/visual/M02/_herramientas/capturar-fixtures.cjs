// Guarda como <nombre>.fixture.json la respuesta real de los GET que pinta la ficha de un activo (solo lectura).
// Unifica los scripts fixtures-XX.cjs de los casos visuales M02. Uso (desde testing/):
//   node visual/M02/_herramientas/capturar-fixtures.cjs --caso TC-DIS-XX --activo <id> \
//     --endpoint <nombre>=<ruta> [--endpoint ...] [--pestana <Pestaña>] [--boton <Botón>] [--salida <carpeta>]
// <ruta> es el final del path de la API sin /back-sigab-test; {id} se reemplaza por el activo (también en <nombre>).
// Credenciales: TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD de testing/.env.test. Base: TEST_BASE_URL o la de
// playwright.config.ts. Toda escritura a la API se aborta (salvo /sesiones/, el login).
const path = require('path');
const fs = require('fs');

const TESTING = path.resolve(__dirname, '../../..');
require('dotenv').config({ path: path.join(TESTING, '.env.test'), quiet: true });
const { chromium } = require('@playwright/test');

const BASE_URL = process.env.TEST_BASE_URL || 'https://api.inmero.co/';
const PREFIJO_API = '/back-sigab-test';
const HAR = path.join(TESTING, '.har-cache/assets.har');

function argumentos(argv) {
  const a = { endpoints: [] };
  for (let i = 0; i < argv.length; i += 2) {
    const [clave, valor] = [argv[i], argv[i + 1]];
    if (valor === undefined) throw new Error(`Falta el valor de ${clave}`);
    if (clave === '--endpoint') {
      const [nombre, ...ruta] = valor.split('=');
      if (!nombre || !ruta.length) throw new Error(`--endpoint espera <nombre>=<ruta>, recibió "${valor}"`);
      // Git Bash convierte "/ruta" en "C:/Program Files/Git/ruta"
      if (!ruta.join('=').startsWith('/')) throw new Error(`La ruta de --endpoint debe empezar por "/" (recibió "${ruta.join('=')}"); en Git Bash usa MSYS_NO_PATHCONV=1`);
      a.endpoints.push({ nombre, ruta: ruta.join('=') });
    } else if (['--caso', '--activo', '--pestana', '--boton', '--salida'].includes(clave)) {
      a[clave.slice(2)] = valor;
    } else {
      throw new Error(`Argumento desconocido: ${clave}`);
    }
  }
  if (!a.caso || !a.activo || !a.endpoints.length) {
    throw new Error('Uso: --caso TC-DIS-XX --activo <id> --endpoint <nombre>=<ruta> [...] [--pestana P] [--boton B] [--salida carpeta]');
  }
  return a;
}

/** Carpeta del caso: --salida, o la única testing/visual/M02/RF-*\/<caso>. */
function carpetaCaso(caso, salida) {
  if (salida) return path.resolve(salida);
  const m02 = path.join(TESTING, 'visual/M02');
  const hallados = fs.readdirSync(m02)
    .filter((rf) => /^RF-/.test(rf))
    .map((rf) => path.join(m02, rf, caso))
    .filter((c) => fs.existsSync(c));
  if (hallados.length !== 1) throw new Error(`No se encontró una única carpeta para ${caso} (${hallados.length}); usa --salida`);
  return hallados[0];
}

(async () => {
  const a = argumentos(process.argv.slice(2));
  const { TEST_ADMIN_EMAIL: correo, TEST_ADMIN_PASSWORD: clave } = process.env;
  if (!correo || !clave) throw new Error('Faltan TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD en testing/.env.test');
  const salida = carpetaCaso(a.caso, a.salida);
  fs.mkdirSync(salida, { recursive: true });

  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'es-CO', timezoneId: 'America/Bogota', baseURL: BASE_URL });
    if (fs.existsSync(HAR)) await ctx.routeFromHAR(HAR, { url: '**/assets/**', notFound: 'fallback' });
    await ctx.route(`**${PREFIJO_API}/**`, (r) => {
      const req = r.request();
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method()) || new RegExp(`${PREFIJO_API}/sesiones/`).test(req.url())) return r.continue();
      console.log(`ABORT ${req.method()} ${req.url()}`);
      return r.abort();
    });
    const page = await ctx.newPage();

    await page.goto('/login', { waitUntil: 'commit', timeout: 300_000 });
    const campoCorreo = page.getByRole('textbox', { name: 'Correo electrónico', exact: true });
    await campoCorreo.waitFor({ state: 'visible', timeout: 300_000 });
    await campoCorreo.fill(correo);
    await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(clave);
    await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
    await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 120_000 }).catch(() => {
      throw new Error('LOGIN FALLIDO: la app sigue en /login. No reintentar (bloqueo tras 5 intentos).');
    });

    // Se escuchan todas las respuestas antes de navegar: cada GET puede llegar al cargar la ficha, la pestaña o el modal
    // (el .catch inmediato evita que una espera vencida tumbe el proceso antes de reportarla)
    const esperas = a.endpoints.map(({ nombre, ruta }) => {
      const fin = PREFIJO_API + ruta.replaceAll('{id}', a.activo);
      const respuesta = page
        .waitForResponse((r) => r.request().method() === 'GET' && new URL(r.url()).pathname.endsWith(fin), { timeout: 300_000 })
        .catch(() => null);
      return { nombre: nombre.replaceAll('{id}', a.activo), fin, respuesta };
    });

    await page.goto(`/activos-biologicos/${a.activo}`, { waitUntil: 'commit', timeout: 300_000 });
    const main = page.getByRole('main');
    const secciones = main.getByRole('navigation', { name: 'Secciones del activo' });
    await secciones.waitFor({ state: 'visible', timeout: 300_000 });
    if (page.url().includes('/login')) throw new Error('BLOQUEO DE AMBIENTE: sesión perdida tras goto');
    console.log(`ficha de #${a.activo} cargada`);
    if (a.pestana) await secciones.getByRole('button', { name: a.pestana, exact: true }).click({ timeout: 120_000 });
    if (a.boton) await main.getByRole('button', { name: a.boton, exact: true }).click({ timeout: 120_000 });

    for (const { nombre, fin, respuesta } of esperas) {
      const r = await respuesta;
      if (!r) throw new Error(`No llegó el GET ${fin} (¿falta --pestana o --boton?)`);
      const archivo = path.join(salida, `${nombre}.fixture.json`);
      fs.writeFileSync(archivo, JSON.stringify(await r.json(), null, 2) + '\n');
      console.log(`${nombre}: ${r.status()} ${fin} → ${path.relative(TESTING, archivo)}`);
    }
    console.log('Revisa cada fixture antes de versionarlo: sin correos, tokens ni datos personales.');
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e.message ?? e); process.exit(1); });
