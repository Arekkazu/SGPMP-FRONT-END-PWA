/**
 * TC-DIS-97 — Consistencia visual del Cambio de fase del ciclo productivo
 * RF-37 · Cambiar fase del ciclo productivo · Rol: Administrador
 * Activos biológicos → ficha del activo #627 → pestaña "Fases" → "Cambiar fase" (modal)
 *
 * Criterio (hoja M02): 0 diferencias no aprobadas vs. baseline vigente en los 3 viewports para la gestión
 * de fases: formulario de cambio, historial de fases y diálogo de confirmación si existe.
 * No existía baseline vigente: la primera corrida la crea (--update-snapshots).
 * Diálogo de confirmación: NO existe. "Cambiar fase" dentro del modal envía el cambio al primer clic (ya
 * reportado en accesibilidad TC-DIS-96, 3.3.4); no hay estado de confirmación que capturar.
 *
 * Datos congelados con fixtures (convención de TC-DIS-123): los GET que pintan datos se responden con
 * route.fulfill desde los fixtures de esta carpeta, guardados el 30/09/2026 a partir de la respuesta real
 * de TEST (revisados: sin correos, tokens ni datos personales; id_usuario es una clave numérica que no se
 * muestra):
 *   - ficha-627.fixture.json          — GET /activos-biologicos/627/ficha-integral (encabezado)
 *   - activo-627.fixture.json         — GET /activos-biologicos/627 (especie del activo)
 *   - fases-627.fixture.json          — GET /activos-biologicos/627/fases (historial de fases)
 *   - ciclos-especie-4.fixture.json   — GET /configuracion/ciclos?id_especie=4 (opciones del selector)
 *   - fases-627-con-finalizada.fixture.json — SIMULADO a partir de fases-627: la fase real ACTIVA más una
 *     fase anterior FINALIZADA ("Ciclo alevinaje cachama 2025", 2026-09-01 → 2026-09-26) para ver cómo
 *     pinta el historial una fase terminada; #627 real solo tiene la fase activa.
 *
 * Estados capturados:
 *   1. pestana-fases  — contenido de <main>: encabezado, pestañas y "Secuencia de fases" (historial) con la
 *                       acción "Cambiar fase" (sin AppBar ni sidebar).
 *   2. modal-vacio    — tarjeta del diálogo "Cambiar / avanzar fase" recién abierto.
 *   3. modal-lleno    — la misma tarjeta con fase destino, fecha y motivo fijos y ficticios. SIN guardar: el
 *                       modal se cierra con "Cancelar".
 *   4. historial-fase-finalizada — contenido de <main> con el historial de 2 fases (fixture simulado): la
 *                       actual ACTIVA y una anterior FINALIZADA con fecha de fin.
 *
 * Máscaras: ninguna (con los GET congelados no queda nada que cambie solo; la fecha del modal es fija).
 * Umbral: el de Playwright por defecto (sin maxDiffPixelRatio), igual que los visuales de M09.
 * Captura completa de <main> con captura-completa.css (stylePath); el diálogo se captura sin stylePath.
 *
 * Cuenta compartida: antes de capturar se registra el tema (data-theme) y el idioma (lang).
 * Escrituras: ninguna. Todo POST/PUT/PATCH/DELETE a la API se aborta (salvo /sesiones/).
 * Navegación: page.goto directo a /activos-biologicos/627, verificando que la sesión sigue viva
 * ("BLOQUEO DE AMBIENTE: sesión perdida tras goto").
 */
import fs from 'fs';
import path from 'path';
import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

const ID_INDIVIDUAL = 627;
const HAR_ASSETS = path.join(__dirname, '../../../../.har-cache/assets.har');

const fixture = (nombre: string) => fs.readFileSync(path.join(__dirname, `${nombre}.fixture.json`), 'utf-8');
const GET_CONGELADOS: { nombre: string; coincide: (u: URL) => boolean; cuerpo: string }[] = [
  { nombre: 'ficha', coincide: (u) => u.pathname.endsWith(`/back-sigab-test/activos-biologicos/${ID_INDIVIDUAL}/ficha-integral`), cuerpo: fixture('ficha-627') },
  { nombre: 'activo', coincide: (u) => u.pathname.endsWith(`/back-sigab-test/activos-biologicos/${ID_INDIVIDUAL}`), cuerpo: fixture('activo-627') },
  { nombre: 'fases', coincide: (u) => u.pathname.endsWith(`/back-sigab-test/activos-biologicos/${ID_INDIVIDUAL}/fases`), cuerpo: fixture('fases-627') },
  { nombre: 'ciclos', coincide: (u) => u.pathname.endsWith('/back-sigab-test/configuracion/ciclos'), cuerpo: fixture('ciclos-especie-4') },
];

// Historial simulado (derivado del real): fase actual ACTIVA + fase anterior FINALIZADA
const FASES_CON_FINALIZADA = fixture('fases-627-con-finalizada');
const URL_FASES = (u: URL) => u.pathname.endsWith(`/back-sigab-test/activos-biologicos/${ID_INDIVIDUAL}/fases`);

// Valores fijos y ficticios del modal lleno
const RELLENO = { destino: 'Fase engorde cachama', fecha: '2026-09-29', motivo: 'Motivo QA ficticio (TC-DIS-97)' };

const OPCIONES_MAIN = {
  animations: 'disabled' as const,
  caret: 'hide' as const,
  stylePath: path.join(__dirname, 'captura-completa.css'),
};
const OPCIONES_DIALOGO = { animations: 'disabled' as const, caret: 'hide' as const };

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

/** Sirve los GET que pintan datos desde los fixtures. Devuelve cuántas veces se sirvió cada uno. */
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

/** goto al activo → pestaña "Fases", estabilizada. Falla como BLOQUEO si se perdió la sesión. */
async function abrirFases(page: Page) {
  await page.goto(`/activos-biologicos/${ID_INDIVIDUAL}`, { waitUntil: 'commit', timeout: 120_000 });
  const login = page.getByRole('textbox', { name: 'Correo electrónico', exact: true });
  const secciones = main(page).getByRole('navigation', { name: 'Secciones del activo' });
  await expect(secciones.or(login)).toBeVisible({ timeout: 120_000 });
  if (new URL(page.url()).pathname.includes('/login') || (await login.isVisible())) {
    throw new Error(`BLOQUEO DE AMBIENTE: sesión perdida tras goto (/activos-biologicos/${ID_INDIVIDUAL} → ${page.url()})`);
  }
  await expect(main(page).getByRole('heading', { name: 'Datos del activo', exact: true })).toBeVisible({ timeout: 60_000 });
  await secciones.getByRole('button', { name: 'Fases', exact: true }).click();
  await expect(main(page).getByRole('heading', { name: 'Secuencia de fases', exact: true })).toBeVisible();
  await expect(main(page).getByRole('listitem').filter({ hasText: 'Ciclo completo cachama 2025-A' }), 'El historial muestra la fase del fixture').toBeVisible();
  await estabilizar(page);
}

async function abrirModal(page: Page): Promise<Locator> {
  await main(page).getByRole('button', { name: 'Cambiar fase', exact: true }).click();
  const dialogo = page.getByRole('dialog', { name: 'Cambiar / avanzar fase' });
  await expect(dialogo).toBeVisible();
  // Opciones del selector cargadas desde el fixture de ciclos
  await expect(dialogo.getByRole('combobox').locator('option').nth(3)).toBeAttached({ timeout: 30_000 });
  await estabilizar(page);
  return dialogo;
}

/** Sin peticiones pendientes, fuentes cargadas, scroll arriba y sin toasts encima. */
async function estabilizar(page: Page) {
  // Ratón fuera de la UI antes de capturar: tras un clic queda encima del control pulsado (estado :hover)
  await page.mouse.move(0, 0);
  await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
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

test.describe('TC-DIS-97 - Consistencia visual - Cambio de fase del ciclo productivo (RF-37)', () => {
  // En serie y con un solo login: si falla se detiene, en vez de sumar intentos de login a la cuenta compartida
  test.describe.configure({ mode: 'serial', timeout: 300_000 });

  let page: Page;
  let servidas: Record<string, number>;

  test.beforeAll(async ({ browser }, testInfo) => {
    // describe.configure no alcanza a los hooks
    test.setTimeout(420_000);
    expect(ADMIN_EMAIL, 'Faltan TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD en testing/.env.test').not.toBe('');
    expect(ADMIN_PASSWORD, 'Faltan TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD en testing/.env.test').not.toBe('');

    const { baseURL, viewport, deviceScaleFactor, userAgent, isMobile, hasTouch } = testInfo.project.use;
    const contexto = await browser.newContext({ baseURL, viewport, deviceScaleFactor, userAgent, isMobile, hasTouch, locale: 'es-CO' });
    // Caché de JS/CSS/fuentes para red lenta; nunca la API
    await contexto.routeFromHAR(HAR_ASSETS, { url: '**/assets/**', update: !fs.existsSync(HAR_ASSETS), notFound: 'fallback' });
    // Ninguna escritura llega al backend (salvo el login)
    await contexto.route('**/back-sigab-test/**', (r) => {
      const req = r.request();
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method()) || /\/back-sigab-test\/sesiones\//.test(req.url())) return r.continue();
      return r.abort();
    });
    page = await contexto.newPage();
    page.setDefaultNavigationTimeout(300_000);
    await iniciarSesion(page);
    servidas = await congelarDatos(page);
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  test('1. Pestaña "Fases" con historial y acción "Cambiar fase" (fixtures)', async ({}, testInfo) => {
    await abrirFases(page);
    for (const g of ['ficha', 'activo', 'fases']) expect(servidas[g], `El GET de ${g} debe servirse desde el fixture`).toBeGreaterThan(0);
    await expect(main(page).getByRole('button', { name: 'Cambiar fase', exact: true })).toBeVisible();
    await registrarEntorno(page, testInfo, 'pestana-fases');
    await expect(main(page)).toHaveScreenshot('pestana-fases.png', OPCIONES_MAIN);
  });

  test('2. Modal "Cambiar / avanzar fase" vacío (fixtures)', async ({}, testInfo) => {
    await abrirFases(page);
    const dialogo = await abrirModal(page);
    expect(servidas.ciclos, 'Las opciones del selector deben servirse desde el fixture').toBeGreaterThan(0);
    await registrarEntorno(page, testInfo, 'modal-vacio');
    await expect(dialogo.locator(':scope > div').first()).toHaveScreenshot('modal-vacio.png', OPCIONES_DIALOGO);
    await dialogo.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(dialogo).toBeHidden();
  });

  test('3. Modal lleno con valores fijos, SIN guardar (fixtures)', async ({}, testInfo) => {
    await abrirFases(page);
    const dialogo = await abrirModal(page);
    await dialogo.getByRole('combobox').selectOption({ label: RELLENO.destino });
    await dialogo.getByRole('textbox', { name: 'Fecha de inicio', exact: true }).fill(RELLENO.fecha);
    await dialogo.getByRole('textbox', { name: 'Motivo del cambio', exact: true }).fill(RELLENO.motivo);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await estabilizar(page);
    await registrarEntorno(page, testInfo, 'modal-lleno');
    await expect(dialogo.locator(':scope > div').first()).toHaveScreenshot('modal-lleno.png', OPCIONES_DIALOGO);
    // Sin guardar: se cancela
    await dialogo.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(dialogo).toBeHidden();
  });

  test('4. Historial con una fase FINALIZADA (fixture simulado a partir del real)', async ({}, testInfo) => {
    // Handler más reciente = prioridad sobre el de fases-627 solo durante este test
    let servidas = 0;
    const handler = (r: import('@playwright/test').Route) => {
      if (r.request().method() !== 'GET') return r.fallback();
      servidas++;
      return r.fulfill({ status: 200, contentType: 'application/json', body: FASES_CON_FINALIZADA });
    };
    await page.route(URL_FASES, handler);
    testInfo.annotations.push({ type: 'Datos simulados', description: 'GET /fases servido desde fases-627-con-finalizada.fixture.json (fase actual real + fase anterior FINALIZADA simulada).' });
    try {
      await abrirFases(page);
      expect(servidas, 'El historial debe servirse desde el fixture simulado').toBeGreaterThan(0);
      const anterior = main(page).getByRole('listitem').filter({ hasText: 'Ciclo alevinaje cachama 2025' });
      await expect(anterior, 'El historial muestra la fase anterior').toBeVisible();
      await expect(anterior, 'La fase anterior muestra su fecha de fin').toContainText('2026-09-26');
      await expect(main(page).getByRole('listitem'), 'Historial con 2 fases').toHaveCount(2);
      await registrarEntorno(page, testInfo, 'historial-fase-finalizada');
      await expect(main(page)).toHaveScreenshot('historial-fase-finalizada.png', OPCIONES_MAIN);
    } finally {
      await page.unroute(URL_FASES, handler);
    }
  });
});
