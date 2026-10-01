/**
 * TC-DIS-112 — Consistencia visual del formulario reproductivo (variantes LOTE / INDIVIDUAL)
 * RF-42 · Registrar evento reproductivo · Rol: Administrador
 * Activos biológicos → ficha del activo → pestaña "Eventos" → "Reproductivo" (modal)
 *
 * Criterio (hoja M02): 0 diferencias no aprobadas vs. baseline vigente en los 3 viewports para el formulario
 * reproductivo, incluyendo la variante LOTE (solo nacimiento) y la variante INDIVIDUAL con relaciones genealógicas.
 * No existía baseline vigente: la primera corrida la crea (--update-snapshots).
 *
 * Datos congelados con fixtures (convención de TC-DIS-123), guardados el 30/09/2026 a partir de la respuesta
 * real de TEST (los mismos de TC-DIS-106; revisados: sin correos, tokens ni datos personales):
 *   - ficha-627 / activo-627 — INDIVIDUAL: la categoría ofrece los 6 tipos reproductivos
 *   - ficha-353 / activo-353 — LOTE: la categoría queda fija en "Nacimiento" y deshabilitada
 *   - metricas-especie-4 / patologias-especie-4 — se cargan al abrir cualquier modal de evento (no se ven aquí)
 *
 * Relaciones genealógicas: "ID padre" e "ID madre" son campos numéricos libres (el formulario no busca ni muestra
 * el activo referido), así que los IDs escritos (9001, 9002) son fijos y ficticios; nada se envía al backend.
 *
 * Estados capturados (tarjeta del diálogo "Registrar evento reproductivo"; valores fijos y ficticios):
 *   1. individual-vacio        — INDIVIDUAL #627 recién abierto (categoría por defecto: Inseminación)
 *   2. individual-relaciones   — Parto exitoso, fecha 29/09/2026, ID padre 9001, ID madre 9002, 3 crías
 *   3. individual-fallido      — Aborto con resultado Fallido, fecha 29/09/2026, 0 crías
 *   4. lote-vacio              — LOTE #353 recién abierto: solo "Nacimiento", deshabilitado
 *   5. lote-nacimiento         — LOTE #353: Nacimiento exitoso, fecha 29/09/2026, 120 crías
 *   6. error-400               — INDIVIDUAL con relaciones y 400 "la madre indicada no existe" simulado (route.fulfill)
 *
 * El formulario no tiene validaciones de cliente (ningún campo con reglas), así que no hay estado de error de
 * cliente que capturar; el estado de error es el del servidor.
 * Fecha: el formulario no pone fecha por defecto (las fechas escritas son fijas). Sin máscaras.
 * Estabilización: sin peticiones pendientes, ratón en (0, 0) (sin :hover), foco fuera, fuentes cargadas, sin toasts.
 * CSS de captura (solo durante toHaveScreenshot; no altera colores, tipografía ni espaciado): captura-completa.css
 * y captura-dialogo.css (quita el max-height de 90vh y el scroll interno de la tarjeta).
 * Umbral: el de Playwright por defecto (sin maxDiffPixelRatio).
 *
 * Cuenta compartida: antes de capturar se registra el tema (data-theme) y el idioma (lang).
 * Escrituras: ninguna. Todo POST/PUT/PATCH/DELETE a la API se aborta (salvo /sesiones/); el 400 se simula en la
 * página. Los modales se cierran con "Cancelar".
 * Navegación: page.goto directo a /activos-biologicos/<id>, verificando que la sesión sigue viva
 * ("BLOQUEO DE AMBIENTE: sesión perdida tras goto").
 */
import fs from 'fs';
import path from 'path';
import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

const ID_INDIVIDUAL = 627;
const ID_LOTE = 353;
const HAR_ASSETS = path.join(__dirname, '../../../../.har-cache/assets.har');
const DIALOGO = 'Registrar evento reproductivo';

const fixture = (nombre: string) => fs.readFileSync(path.join(__dirname, `${nombre}.fixture.json`), 'utf-8');
const GET_CONGELADOS: { nombre: string; coincide: (u: URL) => boolean; cuerpo: string }[] = [
  ...[ID_INDIVIDUAL, ID_LOTE].flatMap((id) => [
    { nombre: `ficha-${id}`, coincide: (u: URL) => u.pathname.endsWith(`/back-sigab-test/activos-biologicos/${id}/ficha-integral`), cuerpo: fixture(`ficha-${id}`) },
    { nombre: `activo-${id}`, coincide: (u: URL) => u.pathname.endsWith(`/back-sigab-test/activos-biologicos/${id}`), cuerpo: fixture(`activo-${id}`) },
  ]),
  { nombre: 'metricas', coincide: (u) => u.pathname.endsWith('/back-sigab-test/configuracion/metricas'), cuerpo: fixture('metricas-especie-4') },
  { nombre: 'patologias', coincide: (u) => u.pathname.endsWith('/back-sigab-test/configuracion/patologias'), cuerpo: fixture('patologias-especie-4') },
];

/** POST de evento reproductivo del INDIVIDUAL (API). */
const URL_REPRODUCTIVO = (u: URL) => u.pathname.endsWith(`/back-sigab-test/activos-biologicos/${ID_INDIVIDUAL}/eventos/reproductivo`);

// 400 SIMULADO con el formato estándar del backend
const ERROR_400 = {
  error_code: 'VALOR_INVALIDO',
  message: 'La madre indicada no existe o no es un activo INDIVIDUAL de la misma especie.',
  fields: [{ field: 'id_madre', message: 'La madre indicada no existe o no es un activo INDIVIDUAL de la misma especie.' }],
};

const OPCIONES_DIALOGO = {
  animations: 'disabled' as const,
  caret: 'hide' as const,
  stylePath: [path.join(__dirname, 'captura-completa.css'), path.join(__dirname, 'captura-dialogo.css')],
};

const OPCIONES_INDIVIDUAL = ['Servicio', 'Inseminación', 'Diagnóstico', 'Parto', 'Aborto', 'Nacimiento'];

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

/** goto al activo → pestaña "Eventos" → modal "Reproductivo", estabilizado. Falla como BLOQUEO si se perdió la sesión. */
async function abrirReproductivo(page: Page, id: number): Promise<Locator> {
  await page.goto(`/activos-biologicos/${id}`, { waitUntil: 'commit', timeout: 120_000 });
  const login = page.getByRole('textbox', { name: 'Correo electrónico', exact: true });
  const secciones = main(page).getByRole('navigation', { name: 'Secciones del activo' });
  await expect(secciones.or(login)).toBeVisible({ timeout: 120_000 });
  if (new URL(page.url()).pathname.includes('/login') || (await login.isVisible())) {
    throw new Error(`BLOQUEO DE AMBIENTE: sesión perdida tras goto (/activos-biologicos/${id} → ${page.url()})`);
  }
  await expect(main(page).getByRole('heading', { name: 'Datos del activo', exact: true })).toBeVisible({ timeout: 60_000 });
  await secciones.getByRole('button', { name: 'Eventos', exact: true }).click();
  await expect(main(page).getByRole('heading', { name: 'Registrar evento', exact: true })).toBeVisible();
  await main(page).getByRole('button', { name: 'Reproductivo', exact: true }).click();
  const dialogo = page.getByRole('dialog', { name: DIALOGO });
  await expect(dialogo).toBeVisible();
  await estabilizar(page);
  return dialogo;
}

function campos(dialogo: Locator) {
  return {
    categoria: dialogo.getByRole('combobox', { name: /^Categoría/ }),
    resultado: dialogo.getByRole('combobox', { name: /^Resultado/ }),
    fecha: dialogo.getByRole('textbox', { name: 'Fecha', exact: true }),
    idPadre: dialogo.getByRole('spinbutton', { name: 'ID padre', exact: true }),
    idMadre: dialogo.getByRole('spinbutton', { name: 'ID madre', exact: true }),
    crias: dialogo.getByRole('spinbutton', { name: 'Número de crías', exact: true }),
    registrar: dialogo.getByRole('button', { name: 'Registrar', exact: true }),
    cancelar: dialogo.getByRole('button', { name: 'Cancelar', exact: true }),
  };
}

/** Parto exitoso con relaciones genealógicas (IDs fijos y ficticios). */
async function llenarRelaciones(dialogo: Locator) {
  const c = campos(dialogo);
  await c.categoria.selectOption('parto');
  await c.resultado.selectOption('exitoso');
  await c.fecha.fill('2026-09-29');
  await c.idPadre.fill('9001');
  await c.idMadre.fill('9002');
  await c.crias.fill('3');
}

/** Sin peticiones pendientes, ratón fuera de la UI (sin hover), foco fuera, fuentes cargadas, scroll arriba y sin toasts. */
async function estabilizar(page: Page) {
  await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
  await page.mouse.move(0, 0);
  await page.evaluate(async () => {
    (document.activeElement as HTMLElement | null)?.blur();
    await document.fonts.ready;
    document.querySelector('main')?.scrollTo(0, 0);
    window.scrollTo(0, 0);
  });
  await expect(page.locator('.ds-toast, [role="status"]').filter({ hasText: /\S/ })).toHaveCount(0);
}

function tarjeta(dialogo: Locator) {
  return dialogo.locator(':scope > div').first();
}

async function cerrar(dialogo: Locator) {
  await campos(dialogo).cancelar.click();
  await expect(dialogo).toBeHidden();
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

test.describe('TC-DIS-112 - Consistencia visual - Formulario reproductivo LOTE/INDIVIDUAL (RF-42)', () => {
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
    const contexto = await browser.newContext({ baseURL, viewport, deviceScaleFactor, userAgent, isMobile, hasTouch, locale: 'es-CO', timezoneId: 'America/Bogota' });
    // Caché de JS/CSS/fuentes para red lenta; nunca la API
    await contexto.routeFromHAR(HAR_ASSETS, { url: '**/assets/**', update: !fs.existsSync(HAR_ASSETS), notFound: 'fallback' });
    // Ninguna escritura llega al backend (salvo el login). El 400 simulado va en page.route, que tiene prioridad.
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

  test('1. INDIVIDUAL #627 vacío (categoría por defecto: Inseminación)', async ({}, testInfo) => {
    const dialogo = await abrirReproductivo(page, ID_INDIVIDUAL);
    expect(servidas['activo-627'], 'El INDIVIDUAL debe servirse desde el fixture').toBeGreaterThan(0);
    const c = campos(dialogo);
    await expect(c.categoria.locator('option'), 'INDIVIDUAL ofrece los 6 tipos reproductivos').toHaveText(OPCIONES_INDIVIDUAL);
    await expect(c.categoria).toHaveValue('inseminacion');
    await expect(c.categoria).toBeEnabled();
    await registrarEntorno(page, testInfo, 'individual-vacio');
    await expect(tarjeta(dialogo)).toHaveScreenshot('individual-vacio.png', OPCIONES_DIALOGO);
    await cerrar(dialogo);
  });

  test('2. INDIVIDUAL #627 con relaciones genealógicas (Parto, padre, madre, crías)', async ({}, testInfo) => {
    const dialogo = await abrirReproductivo(page, ID_INDIVIDUAL);
    await llenarRelaciones(dialogo);
    await estabilizar(page);
    await registrarEntorno(page, testInfo, 'individual-relaciones');
    await expect(tarjeta(dialogo)).toHaveScreenshot('individual-relaciones.png', OPCIONES_DIALOGO);
    await cerrar(dialogo);
  });

  test('3. INDIVIDUAL #627: Aborto con resultado Fallido', async ({}, testInfo) => {
    const dialogo = await abrirReproductivo(page, ID_INDIVIDUAL);
    const c = campos(dialogo);
    await c.categoria.selectOption('aborto');
    await c.resultado.selectOption('fallido');
    await c.fecha.fill('2026-09-29');
    await estabilizar(page);
    await registrarEntorno(page, testInfo, 'individual-fallido');
    await expect(tarjeta(dialogo)).toHaveScreenshot('individual-fallido.png', OPCIONES_DIALOGO);
    await cerrar(dialogo);
  });

  test('4. LOTE #353 vacío: solo "Nacimiento", deshabilitado', async ({}, testInfo) => {
    const dialogo = await abrirReproductivo(page, ID_LOTE);
    expect(servidas['activo-353'], 'El LOTE debe servirse desde el fixture').toBeGreaterThan(0);
    const c = campos(dialogo);
    await expect(c.categoria.locator('option'), 'LOTE solo ofrece Nacimiento').toHaveText(['Nacimiento']);
    await expect(c.categoria).toBeDisabled();
    await registrarEntorno(page, testInfo, 'lote-vacio');
    await expect(tarjeta(dialogo)).toHaveScreenshot('lote-vacio.png', OPCIONES_DIALOGO);
    await cerrar(dialogo);
  });

  test('5. LOTE #353: Nacimiento lleno (120 crías)', async ({}, testInfo) => {
    const dialogo = await abrirReproductivo(page, ID_LOTE);
    const c = campos(dialogo);
    await c.resultado.selectOption('exitoso');
    await c.fecha.fill('2026-09-29');
    await c.crias.fill('120');
    await estabilizar(page);
    await registrarEntorno(page, testInfo, 'lote-nacimiento');
    await expect(tarjeta(dialogo)).toHaveScreenshot('lote-nacimiento.png', OPCIONES_DIALOGO);
    await cerrar(dialogo);
  });

  test('6. Error 400 "la madre indicada no existe" (route.fulfill) con relaciones', async ({}, testInfo) => {
    const dialogo = await abrirReproductivo(page, ID_INDIVIDUAL);
    await llenarRelaciones(dialogo);
    let envios = 0;
    await page.route(URL_REPRODUCTIVO, (r) => {
      if (r.request().method() !== 'POST') return r.fallback();
      envios++;
      return r.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify(ERROR_400) });
    });
    testInfo.annotations.push({ type: 'Datos simulados', description: 'POST /eventos/reproductivo respondido con 400 VALOR_INVALIDO en la página; no se registra nada.' });
    try {
      await campos(dialogo).registrar.click();
      await expect.poll(() => envios, { message: 'El envío debe llegar solo a la simulación' }).toBe(1);
      await expect(dialogo.getByRole('alert').filter({ hasText: 'No se pudo registrar' })).toBeVisible();
      await estabilizar(page);
      await registrarEntorno(page, testInfo, 'error-400');
      await expect(tarjeta(dialogo)).toHaveScreenshot('error-400.png', OPCIONES_DIALOGO);
      await cerrar(dialogo);
    } finally {
      await page.unroute(URL_REPRODUCTIVO);
    }
  });
});
