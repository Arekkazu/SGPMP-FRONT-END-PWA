/**
 * TC-DIS-118 — Consistencia visual de la Ficha Integral del activo (solo lectura)
 * RF-47 · Consultar ficha integral · Rol: Administrador
 * Activos biológicos → ficha del activo → pestaña "Ficha integral" (vista por defecto)
 *
 * Criterio (hoja M02): 0 diferencias no aprobadas vs. baseline vigente en los 3 viewports para la
 * ficha, incluido el estado con secciones sin datos y la sección 7 (datos de lote) solo en LOTE.
 * No existía baseline vigente: la primera corrida la crea (--update-snapshots).
 *
 * Datos congelados con fixtures (convención de TC-DIS-123): la baseline no puede depender de datos
 * vivos de la cuenta compartida (eventos, pesajes, días en sistema). El GET de la ficha integral se
 * responde con route.fulfill desde los fixtures de esta carpeta, guardados el 30/09/2026 a partir de
 * la respuesta real de TEST (revisados: sin correos, tokens ni datos del usuario):
 *   - ficha-627.fixture.json — INDIVIDUAL #627 "QAG53R2-21297514"
 *   - ficha-353.fixture.json — LOTE #353
 * El resto de la página (activo, sesión) viene del ambiente; en la pestaña "Ficha integral" todo lo
 * que se ve (encabezado incluido) sale de la ficha.
 *
 * Estados capturados (contenido de <main>, sin AppBar ni sidebar):
 *   1. ficha-individual  — ficha-627 (eventos reproductivos; el resto de secciones vacías)
 *   2. ficha-lote        — ficha-353, con la sección "Datos del lote" (sección 7)
 *   3. ficha-sin-datos   — ficha-627 con eventos, indicadores y datos biológicos vaciados
 *
 * Máscaras: ninguna. Con la ficha congelada no queda nada que cambie solo: "Días en sistema" lo envía
 * el servidor en la ficha (el cliente no lo calcula contra la fecha actual), igual que peso y métricas.
 * El badge de notificaciones y el nombre/correo del usuario están en el AppBar/sidebar, fuera de <main>.
 *
 * Umbral: el de Playwright por defecto (sin maxDiffPixelRatio), igual que los visuales de M09.
 * Captura completa de <main> con captura-completa.css (stylePath): la app hace scroll dentro de <main>.
 *
 * Cuenta compartida: antes de capturar se registra el tema (data-theme) y el idioma (lang) en consola y
 * en una anotación. Si cambian entre corridas, la diferencia no es de la UI.
 *
 * Escrituras: ninguna. Todo POST/PUT/PATCH/DELETE a la API se aborta (salvo /sesiones/).
 * Navegación: page.goto directo a /activos-biologicos/<id>, verificando tras cada goto que la sesión
 * sigue viva ("BLOQUEO DE AMBIENTE: sesión perdida tras goto") y que el activo cargó.
 */
import fs from 'fs';
import path from 'path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

const ID_INDIVIDUAL = 627;
const ID_LOTE = 353;
const HAR_ASSETS = path.join(__dirname, '../../../../.har-cache/assets.har');

type Ficha = Record<string, unknown>;
const FICHA_627: Ficha = JSON.parse(fs.readFileSync(path.join(__dirname, 'ficha-627.fixture.json'), 'utf-8'));
const FICHA_353: Ficha = JSON.parse(fs.readFileSync(path.join(__dirname, 'ficha-353.fixture.json'), 'utf-8'));
const FICHA_627_SIN_DATOS: Ficha = {
  ...FICHA_627,
  raza: null, sexo: null, fecha_nacimiento: null, peso_actual: null, fecha_ultimo_peso: null,
  eventos_sanitarios: [], eventos_productivos: [], eventos_crecimiento: [], eventos_reproductivos: [],
  indicadores: [], advertencias: [],
};

const URL_FICHA = (id: number) => (url: URL) => url.pathname.endsWith(`/back-sigab-test/activos-biologicos/${id}/ficha-integral`);

const OPCIONES_CAPTURA = {
  animations: 'disabled' as const,
  caret: 'hide' as const,
  stylePath: path.join(__dirname, 'captura-completa.css'),
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

/** Abre la ficha de `id` sirviendo el GET de la ficha desde `ficha` (fixture). Falla como BLOQUEO si se perdió la sesión. */
async function abrirFicha(page: Page, id: number, ficha: Ficha) {
  const urlFicha = URL_FICHA(id);
  let servidas = 0;
  await page.route(urlFicha, (r) => {
    if (r.request().method() !== 'GET') return r.fallback();
    servidas++;
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ficha) });
  });
  try {
    await page.goto(`/activos-biologicos/${id}`, { waitUntil: 'commit', timeout: 120_000 });
    const login = page.getByRole('textbox', { name: 'Correo electrónico', exact: true });
    const secciones = main(page).getByRole('navigation', { name: 'Secciones del activo' });
    await expect(secciones.or(login)).toBeVisible({ timeout: 120_000 });
    if (new URL(page.url()).pathname.includes('/login') || (await login.isVisible())) {
      throw new Error(`BLOQUEO DE AMBIENTE: sesión perdida tras goto (/activos-biologicos/${id} → ${page.url()})`);
    }
    await estabilizar(page);
    if ((await main(page).getByText('No se pudo cargar el activo').count()) > 0) {
      throw new Error(`BLOQUEO DE AMBIENTE: no se pudo cargar el activo #${id}`);
    }
    expect(servidas, 'La ficha debe servirse desde el fixture').toBeGreaterThan(0);
  } finally {
    await page.unroute(urlFicha);
  }
}

/** Deja la ficha lista: sin skeleton, sin peticiones pendientes, fuentes cargadas y scroll arriba. */
async function estabilizar(page: Page) {
  await expect(main(page).getByRole('heading', { name: 'Datos del activo', exact: true })).toBeVisible({ timeout: 60_000 });
  await expect(main(page).getByRole('heading', { name: 'Indicadores', exact: true })).toBeVisible();
  await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
  await page.evaluate(async () => {
    await document.fonts.ready;
    document.querySelector('main')?.scrollTo(0, 0);
    window.scrollTo(0, 0);
  });
  // Sin toasts ni alertas flotando encima
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

test.describe('TC-DIS-118 - Consistencia visual - Ficha integral del activo (RF-47)', () => {
  // En serie y con un solo login: si falla se detiene, en vez de sumar intentos de login a la cuenta compartida
  test.describe.configure({ mode: 'serial', timeout: 300_000 });

  let page: Page;

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
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  test('1. Ficha INDIVIDUAL #627 (fixture)', async ({}, testInfo) => {
    await abrirFicha(page, ID_INDIVIDUAL, FICHA_627);
    await expect(main(page).getByRole('heading', { name: 'Datos biológicos', exact: true }), 'INDIVIDUAL muestra "Datos biológicos"').toBeVisible();
    await expect(main(page).getByRole('heading', { name: /lote/i }), 'INDIVIDUAL no muestra la sección 7 (datos de lote)').toHaveCount(0);
    await registrarEntorno(page, testInfo, 'ficha-individual');
    await expect(main(page)).toHaveScreenshot('ficha-individual.png', OPCIONES_CAPTURA);
  });

  test('2. Ficha LOTE #353 con la sección 7 (fixture)', async ({}, testInfo) => {
    await abrirFicha(page, ID_LOTE, FICHA_353);
    await expect(main(page).getByRole('heading', { name: 'Datos del lote', exact: true }), 'LOTE muestra la sección 7 (datos de lote)').toBeVisible();
    await registrarEntorno(page, testInfo, 'ficha-lote');
    await expect(main(page)).toHaveScreenshot('ficha-lote.png', OPCIONES_CAPTURA);
  });

  test('3. Ficha con secciones sin datos (fixture de #627 vaciado)', async ({}, testInfo) => {
    testInfo.annotations.push({ type: 'Datos simulados', description: 'Ficha de #627 (fixture) con eventos, indicadores y datos biológicos vaciados.' });
    await abrirFicha(page, ID_INDIVIDUAL, FICHA_627_SIN_DATOS);
    for (const vacio of ['Sin eventos sanitarios.', 'Sin eventos de crecimiento.', 'Sin eventos productivos.', 'Sin eventos reproductivos.', 'Sin indicadores calculados.']) {
      await expect(main(page).getByText(vacio, { exact: true }), `La sección vacía muestra "${vacio}"`).toBeVisible();
    }
    await registrarEntorno(page, testInfo, 'ficha-sin-datos');
    await expect(main(page)).toHaveScreenshot('ficha-sin-datos.png', OPCIONES_CAPTURA);
  });
});
