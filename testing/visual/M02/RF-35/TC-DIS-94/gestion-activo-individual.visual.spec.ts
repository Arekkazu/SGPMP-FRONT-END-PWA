/**
 * TC-DIS-94 — Consistencia visual de la vista de Gestión de un activo INDIVIDUAL
 * RF-35 · Gestionar activo individual · Rol: Administrador
 * Activos biológicos → ficha del activo #627 → pestaña "Datos" → "Editar" (modal)
 *
 * Criterio (hoja M02): 0 diferencias no aprobadas vs. baseline vigente en los 3 viewports para la vista
 * de gestión individual (identificación, datos y acciones disponibles).
 * No existía baseline vigente: la primera corrida la crea (--update-snapshots).
 *
 * Datos congelados con fixtures (convención de TC-DIS-123): los GET que pintan datos se responden con
 * route.fulfill desde los fixtures de esta carpeta, guardados el 30/09/2026 a partir de la respuesta
 * real de TEST (revisados: sin correos, tokens ni datos personales; id_usuario es una clave numérica
 * que no se muestra):
 *   - activo-627.fixture.json — GET /activos-biologicos/627 (pestaña "Datos" y modal "Editar activo")
 *   - ficha-627.fixture.json  — GET /activos-biologicos/627/ficha-integral (encabezado del activo)
 *
 * Estados capturados:
 *   1. datos         — contenido de <main>: encabezado del activo, pestañas y pestaña "Datos" con la
 *                      acción "Editar" (sin AppBar ni sidebar).
 *   2. modal-editar  — la tarjeta del diálogo "Editar activo — QAG53R2-21297514" abierto, SIN guardar.
 *                      El select "Sexo" aparece sin opción seleccionada: es el defecto ya reportado en
 *                      TC-DIS-93 ("Hembra" vs opciones HEMBRA); la baseline registra la pantalla real.
 *
 * Máscaras: ninguna. Con los GET congelados no queda nada que cambie solo (los datos del activo y del
 * encabezado, incluido "Días en sistema", vienen del servidor en los fixtures).
 *
 * Umbral: el de Playwright por defecto (sin maxDiffPixelRatio), igual que los visuales de M09.
 * Captura completa de <main> con captura-completa.css (stylePath); el diálogo se captura sin stylePath
 * (es position: fixed y cabe en el viewport).
 *
 * Cuenta compartida: antes de capturar se registra el tema (data-theme) y el idioma (lang).
 * Escrituras: ninguna. Todo POST/PUT/PATCH/DELETE a la API se aborta (salvo /sesiones/); el modal se
 * cierra con "Cancelar".
 * Navegación: page.goto directo a /activos-biologicos/627, verificando que la sesión sigue viva
 * ("BLOQUEO DE AMBIENTE: sesión perdida tras goto").
 */
import fs from 'fs';
import path from 'path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

const ID_INDIVIDUAL = 627;
const IDENTIFICADOR = 'QAG53R2-21297514';
const HAR_ASSETS = path.join(__dirname, '../../../../.har-cache/assets.har');

const ACTIVO_627 = fs.readFileSync(path.join(__dirname, 'activo-627.fixture.json'), 'utf-8');
const FICHA_627 = fs.readFileSync(path.join(__dirname, 'ficha-627.fixture.json'), 'utf-8');

const URL_ACTIVO = (url: URL) => url.pathname.endsWith(`/back-sigab-test/activos-biologicos/${ID_INDIVIDUAL}`);
const URL_FICHA = (url: URL) => url.pathname.endsWith(`/back-sigab-test/activos-biologicos/${ID_INDIVIDUAL}/ficha-integral`);

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

/** Sirve los GET del activo y de su ficha desde los fixtures. */
async function congelarDatos(page: Page) {
  const servidas = { activo: 0, ficha: 0 };
  await page.route(URL_ACTIVO, (r) => {
    if (r.request().method() !== 'GET') return r.fallback();
    servidas.activo++;
    return r.fulfill({ status: 200, contentType: 'application/json', body: ACTIVO_627 });
  });
  await page.route(URL_FICHA, (r) => {
    if (r.request().method() !== 'GET') return r.fallback();
    servidas.ficha++;
    return r.fulfill({ status: 200, contentType: 'application/json', body: FICHA_627 });
  });
  return servidas;
}

/** goto al activo → pestaña "Datos", estabilizada. Falla como BLOQUEO si se perdió la sesión. */
async function abrirDatos(page: Page) {
  await page.goto(`/activos-biologicos/${ID_INDIVIDUAL}`, { waitUntil: 'commit', timeout: 120_000 });
  const login = page.getByRole('textbox', { name: 'Correo electrónico', exact: true });
  const secciones = main(page).getByRole('navigation', { name: 'Secciones del activo' });
  await expect(secciones.or(login)).toBeVisible({ timeout: 120_000 });
  if (new URL(page.url()).pathname.includes('/login') || (await login.isVisible())) {
    throw new Error(`BLOQUEO DE AMBIENTE: sesión perdida tras goto (/activos-biologicos/${ID_INDIVIDUAL} → ${page.url()})`);
  }
  await expect(main(page).getByRole('heading', { name: 'Datos del activo', exact: true })).toBeVisible({ timeout: 60_000 });
  if ((await main(page).getByText('No se pudo cargar el activo').count()) > 0) {
    throw new Error(`BLOQUEO DE AMBIENTE: no se pudo cargar el activo #${ID_INDIVIDUAL}`);
  }
  await secciones.getByRole('button', { name: 'Datos', exact: true }).click();
  await expect(main(page).getByRole('heading', { name: 'Detalle individual', exact: true })).toBeVisible({ timeout: 60_000 });
  await expect(main(page).getByRole('heading', { name: 'Origen y procedencia', exact: true })).toBeVisible();
  await estabilizar(page);
}

/** Sin peticiones pendientes, ratón fuera de la UI (sin hover), fuentes cargadas, scroll arriba y sin toasts. */
async function estabilizar(page: Page) {
  await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
  // Tras un clic el ratón queda encima del botón pulsado; en móvil "Editar" cae sobre "Guardar cambios" del
  // modal y la captura salía con el estado :hover. Se lleva a la esquina, fuera de cualquier control.
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

test.describe('TC-DIS-94 - Consistencia visual - Gestión de activo individual (RF-35)', () => {
  // En serie y con un solo login: si falla se detiene, en vez de sumar intentos de login a la cuenta compartida
  test.describe.configure({ mode: 'serial', timeout: 300_000 });

  let page: Page;
  let servidas: { activo: number; ficha: number };

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

  test('1. Pestaña "Datos" con encabezado y acciones del activo (fixtures)', async ({}, testInfo) => {
    await abrirDatos(page);
    expect(servidas.activo, 'El activo debe servirse desde el fixture').toBeGreaterThan(0);
    expect(servidas.ficha, 'La ficha (encabezado) debe servirse desde el fixture').toBeGreaterThan(0);
    await expect(main(page).getByRole('heading', { name: IDENTIFICADOR, level: 2 }), 'Encabezado con el identificador del activo').toBeVisible();
    await expect(main(page).getByRole('button', { name: 'Editar activo', exact: true }), 'Acción "Editar" visible para el Administrador').toBeVisible();
    await registrarEntorno(page, testInfo, 'datos');
    await expect(main(page)).toHaveScreenshot('datos.png', OPCIONES_MAIN);
  });

  test('2. Modal "Editar activo" abierto, sin guardar (fixtures)', async ({}, testInfo) => {
    await abrirDatos(page);
    await main(page).getByRole('button', { name: 'Editar activo', exact: true }).click();
    const dialogo = page.getByRole('dialog', { name: `Editar activo — ${IDENTIFICADOR}` });
    await expect(dialogo).toBeVisible();
    await expect(dialogo.getByRole('textbox', { name: 'Raza', exact: true }), 'El formulario carga los datos del activo').toHaveValue('QA');
    await estabilizar(page);
    await registrarEntorno(page, testInfo, 'modal-editar');
    // Tarjeta del diálogo (el overlay ocupa toda la pantalla)
    await expect(dialogo.locator(':scope > div').first()).toHaveScreenshot('modal-editar.png', OPCIONES_DIALOGO);
    await dialogo.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(dialogo).toBeHidden();
  });
});
