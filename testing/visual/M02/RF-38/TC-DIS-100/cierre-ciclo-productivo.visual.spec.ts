/**
 * TC-DIS-100 — Consistencia visual del Cierre del ciclo productivo
 * RF-38 · Cerrar ciclo productivo · Rol: Administrador
 * Activos biológicos → ficha del activo #627 → pestaña "Estado" → "Cerrar ciclo" (modal)
 *
 * Criterio (hoja M02): 0 diferencias no aprobadas vs. baseline vigente en los 3 viewports para el cierre
 * de ciclo: formulario, diálogo con la advertencia y error 409 "operación redundante".
 * No existía baseline vigente: la primera corrida la crea (--update-snapshots).
 *
 * *** NUNCA SE CONFIRMA UN CIERRE REAL. *** Todo POST/PUT/PATCH/DELETE a la API se aborta en el contexto
 * (salvo /sesiones/). Solo el estado 3 intercepta el POST de cierre en la página y lo responde con un 409
 * simulado; el spec verifica al final que el contexto no tuvo que abortar ningún POST de cierre.
 *
 * Datos congelados con fixtures (convención de TC-DIS-123), guardados el 30/09/2026 a partir de la respuesta
 * real de TEST (revisados: sin correos, tokens ni datos personales; id_usuario es una clave numérica que no
 * se muestra): activo-627.fixture.json (GET del activo) y ficha-627.fixture.json (GET de la ficha:
 * encabezado y estado actual). La pestaña "Estado" no hace otros GET.
 *
 * Fecha: el modal pone por defecto "Fecha de cierre" = hoy (hoyLocal() al cargar la app). Se fija el reloj
 * del navegador con page.clock.setFixedTime(2026-09-30 12:00, America/Bogota) ANTES del login, así el campo
 * muestra siempre 30/09/2026. Sin máscaras.
 *
 * Estados capturados:
 *   1. pestana-estado  — contenido de <main>: encabezado, pestaña "Estado" con el estado actual y las acciones
 *                        "Cambiar estado" y "Cerrar ciclo" (sin AppBar ni sidebar).
 *   2. modal-cierre    — tarjeta del diálogo "Cerrar ciclo — QAG53R2-21297514" recién abierto: advertencia
 *                        "Acción difícilmente reversible", fecha, motivo y descripción vacíos.
 *   3. error-409       — la misma tarjeta con motivo ficticio y el 409 "operación redundante" (route.fulfill)
 *                        anunciado en el diálogo.
 *
 * Umbral: el de Playwright por defecto (sin maxDiffPixelRatio), igual que los visuales de M09.
 * Captura completa de <main> con captura-completa.css (stylePath). El diálogo se captura con
 * captura-completa.css + captura-dialogo.css: la tarjeta tiene max-height 90vh con scroll interno y en móvil
 * el 409 no cabía (la captura se cortaba antes de los botones).
 * Estabilización: antes de capturar el ratón se lleva a (0, 0) para que ningún control salga en :hover.
 * Cuenta compartida: antes de capturar se registra el tema (data-theme) y el idioma (lang).
 * Navegación: page.goto directo a /activos-biologicos/627, verificando que la sesión sigue viva
 * ("BLOQUEO DE AMBIENTE: sesión perdida tras goto").
 */
import fs from 'fs';
import path from 'path';
import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

const ID_INDIVIDUAL = 627;
const IDENTIFICADOR = 'QAG53R2-21297514';
const HAR_ASSETS = path.join(__dirname, '../../../../.har-cache/assets.har');
const RELOJ_FIJO = new Date('2026-09-30T12:00:00-05:00');

const fixture = (nombre: string) => fs.readFileSync(path.join(__dirname, `${nombre}.fixture.json`), 'utf-8');
const GET_CONGELADOS: { nombre: string; coincide: (u: URL) => boolean; cuerpo: string }[] = [
  { nombre: 'ficha', coincide: (u) => u.pathname.endsWith(`/back-sigab-test/activos-biologicos/${ID_INDIVIDUAL}/ficha-integral`), cuerpo: fixture('ficha-627') },
  { nombre: 'activo', coincide: (u) => u.pathname.endsWith(`/back-sigab-test/activos-biologicos/${ID_INDIVIDUAL}`), cuerpo: fixture('activo-627') },
];

/** POST de cierre (API). */
const URL_CIERRE = (u: URL) => u.pathname.endsWith(`/back-sigab-test/activos-biologicos/${ID_INDIVIDUAL}/cierre`);

// 409 SIMULADO con el formato estándar del backend
const ERROR_409 = { error_code: 'OPERACION_REDUNDANTE', message: 'Operación redundante: el activo ya se encuentra en estado CERRADO.', fields: [] };
const MOTIVO = 'Motivo QA ficticio (TC-DIS-100, nunca real)';

const OPCIONES_MAIN = {
  animations: 'disabled' as const,
  caret: 'hide' as const,
  stylePath: path.join(__dirname, 'captura-completa.css'),
};
// Diálogo: captura-dialogo.css deja la tarjeta a su alto real (sin el max-height de 90vh ni scroll interno)
const OPCIONES_DIALOGO = {
  animations: 'disabled' as const,
  caret: 'hide' as const,
  stylePath: [path.join(__dirname, 'captura-completa.css'), path.join(__dirname, 'captura-dialogo.css')],
};

// ── Sesión y navegación ──────────────────────────────────────────────────────

async function iniciarSesion(page: Page) {
  await page.goto('/login', { waitUntil: 'commit', timeout: 300_000 });
  const correo = page.getByRole('textbox', { name: 'Correo electrónico', exact: true });
  await correo.waitFor({ state: 'visible', timeout: 300_000 });
  await correo.fill(ADMIN_EMAIL);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 120_000 }).catch(() => {
    throw new Error('LOGIN FALLIDO: la app sigue en /login tras "Ingresar". No reintentar (bloqueo tras 5 intentos).');
  });
  await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
}

function main(page: Page) {
  return page.getByRole('main');
}

async function congelarDatos(page: Page) {
  const servidas: Record<string, number> = {};
  for (const g of GET_CONGELADOS) {
    servidas[g.nombre] = 0;
    await page.route(g.coincide, (r) => {
      if (r.request().method() !== 'GET') return r.fallback();
      servidas[g.nombre]++;
      return r.fulfill({ status: 200, contentType: 'application/json', body: g.cuerpo });
    });
  }
  return servidas;
}

/** goto al activo → pestaña "Estado", estabilizada. Falla como BLOQUEO si se perdió la sesión. */
async function abrirEstado(page: Page) {
  await page.goto(`/activos-biologicos/${ID_INDIVIDUAL}`, { waitUntil: 'commit', timeout: 120_000 });
  const login = page.getByRole('textbox', { name: 'Correo electrónico', exact: true });
  const secciones = main(page).getByRole('navigation', { name: 'Secciones del activo' });
  await expect(secciones.or(login)).toBeVisible({ timeout: 120_000 });
  if (new URL(page.url()).pathname.includes('/login') || (await login.isVisible())) {
    throw new Error(`BLOQUEO DE AMBIENTE: sesión perdida tras goto (/activos-biologicos/${ID_INDIVIDUAL} → ${page.url()})`);
  }
  await expect(main(page).getByRole('heading', { name: 'Datos del activo', exact: true })).toBeVisible({ timeout: 60_000 });
  await secciones.getByRole('button', { name: 'Estado', exact: true }).click();
  await expect(main(page).getByRole('button', { name: 'Cerrar ciclo', exact: true }), 'El Administrador debe ver "Cerrar ciclo"').toBeVisible({ timeout: 30_000 });
  await estabilizar(page);
}

async function abrirModal(page: Page): Promise<Locator> {
  await main(page).getByRole('button', { name: 'Cerrar ciclo', exact: true }).click();
  const dialogo = page.getByRole('dialog', { name: `Cerrar ciclo — ${IDENTIFICADOR}` });
  await expect(dialogo).toBeVisible();
  await expect(dialogo.getByRole('textbox', { name: /^Fecha de cierre/ }), 'La fecha de cierre por defecto usa el reloj fijado').toHaveValue('2026-09-30');
  await estabilizar(page);
  return dialogo;
}

/** Sin peticiones pendientes, ratón fuera de la UI (sin hover), fuentes cargadas, scroll arriba y sin toasts. */
async function estabilizar(page: Page) {
  await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
  // Tras un clic el ratón queda encima del botón pulsado; en móvil cae sobre el botón principal del modal y
  // la captura salía con el estado :hover. Se lleva a la esquina, fuera de cualquier control.
  await page.mouse.move(0, 0);
  await page.evaluate(async () => {
    await document.fonts.ready;
    document.querySelector('main')?.scrollTo(0, 0);
    window.scrollTo(0, 0);
  });
  await expect(page.locator('.ds-toast, [role="status"]').filter({ hasText: /\S/ })).toHaveCount(0);
}

/** Tema e idioma de la cuenta compartida en el momento de capturar. */
async function registrarEntorno(page: Page, testInfo: TestInfo, estado: string) {
  const entorno = await page.evaluate(() => ({
    tema: document.documentElement.getAttribute('data-theme') ?? '(sin data-theme)',
    idioma: document.documentElement.getAttribute('lang') ?? '(sin lang)',
  }));
  const linea = `[entorno] ${testInfo.project.name} · ${estado} · tema=${entorno.tema} · idioma=${entorno.idioma}`;
  console.log(linea);
  testInfo.annotations.push({ type: 'Entorno', description: linea });
}

// ── Casos ────────────────────────────────────────────────────────────────────

test.describe('TC-DIS-100 - Consistencia visual - Cierre del ciclo productivo (RF-38)', () => {
  // En serie y con un solo login: si falla se detiene, en vez de sumar intentos de login a la cuenta compartida
  test.describe.configure({ mode: 'serial', timeout: 300_000 });

  let page: Page;
  let servidas: Record<string, number>;
  const abortadas: string[] = [];

  test.beforeAll(async ({ browser }, testInfo) => {
    // describe.configure no alcanza a los hooks
    test.setTimeout(420_000);
    expect(ADMIN_EMAIL, 'Faltan TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD en testing/.env.test').not.toBe('');
    expect(ADMIN_PASSWORD, 'Faltan TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD en testing/.env.test').not.toBe('');

    const { baseURL, viewport, deviceScaleFactor, userAgent, isMobile, hasTouch } = testInfo.project.use;
    const contexto = await browser.newContext({ baseURL, viewport, deviceScaleFactor, userAgent, isMobile, hasTouch, locale: 'es-CO', timezoneId: 'America/Bogota' });
    // Caché de JS/CSS/fuentes para red lenta; nunca la API
    await contexto.routeFromHAR(HAR_ASSETS, { url: '**/assets/**', update: !fs.existsSync(HAR_ASSETS), notFound: 'fallback' });
    // Ninguna escritura llega al backend (salvo el login). El 409 simulado va en page.route, que tiene prioridad.
    await contexto.route('**/back-sigab-test/**', (r) => {
      const req = r.request();
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method()) || /\/back-sigab-test\/sesiones\//.test(req.url())) return r.continue();
      abortadas.push(`${req.method()} ${new URL(req.url()).pathname}`);
      return r.abort();
    });
    page = await contexto.newPage();
    // Reloj fijo antes de cargar la app: la fecha de cierre por defecto (hoy) queda en 30/09/2026
    await page.clock.setFixedTime(RELOJ_FIJO);
    page.setDefaultNavigationTimeout(300_000);
    await iniciarSesion(page);
    servidas = await congelarDatos(page);
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  test('1. Pestaña "Estado" con las acciones del activo (fixtures)', async ({}, testInfo) => {
    await abrirEstado(page);
    expect(servidas.ficha, 'La ficha (encabezado y estado) debe servirse desde el fixture').toBeGreaterThan(0);
    await registrarEntorno(page, testInfo, 'pestana-estado');
    await expect(main(page)).toHaveScreenshot('pestana-estado.png', OPCIONES_MAIN);
  });

  test('2. Diálogo de cierre con la advertencia, recién abierto (fixtures, reloj fijo)', async ({}, testInfo) => {
    await abrirEstado(page);
    const dialogo = await abrirModal(page);
    await expect(dialogo.getByRole('alert').first(), 'El diálogo muestra la advertencia').toContainText('Acción difícilmente reversible');
    await registrarEntorno(page, testInfo, 'modal-cierre');
    await expect(dialogo.locator(':scope > div').first()).toHaveScreenshot('modal-cierre.png', OPCIONES_DIALOGO);
    await dialogo.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(dialogo).toBeHidden();
  });

  test('3. Error 409 "operación redundante" (route.fulfill), nunca un cierre real', async ({}, testInfo) => {
    await abrirEstado(page);
    const dialogo = await abrirModal(page);
    let envios = 0;
    await page.route(URL_CIERRE, (r) => {
      if (r.request().method() !== 'POST') return r.fallback();
      envios++;
      return r.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify(ERROR_409) });
    });
    testInfo.annotations.push({ type: 'Datos simulados', description: 'POST /activos-biologicos/627/cierre respondido con 409 OPERACION_REDUNDANTE en la página; el contexto aborta cualquier otra escritura. No se cierra nada.' });
    try {
      await dialogo.getByRole('textbox', { name: /^Motivo del cierre/ }).fill(MOTIVO);
      await dialogo.getByRole('button', { name: 'Cerrar ciclo', exact: true }).click();
      await expect.poll(() => envios, { message: 'El cierre debe llegar solo a la simulación' }).toBe(1);
      await expect(dialogo.getByRole('alert').filter({ hasText: 'No se pudo cerrar el ciclo' }), 'El 409 debe verse en el diálogo').toBeVisible();
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      await estabilizar(page);
      await registrarEntorno(page, testInfo, 'error-409');
      await expect(dialogo.locator(':scope > div').first()).toHaveScreenshot('error-409.png', OPCIONES_DIALOGO);
      await dialogo.getByRole('button', { name: 'Cancelar', exact: true }).click();
      await expect(dialogo).toBeHidden();
    } finally {
      await page.unroute(URL_CIERRE);
    }
    // Seguridad: ningún POST de cierre tuvo que abortarse (todos los atendió la simulación)
    expect(abortadas.filter((a) => a.endsWith('/cierre')), 'SEGURIDAD: ningún POST de cierre debe llegar a la red').toEqual([]);
  });
});
