/**
 * TC-DIS-115 — Consistencia visual del formulario de Evento Productivo
 * RF-43 · Registrar evento productivo · Rol: Administrador
 * Activos biológicos → ficha del activo → pestaña "Eventos" → "Productivo" (modal)
 *
 * Criterio (hoja M02): 0 diferencias no aprobadas vs. baseline vigente en los 3 viewports para el formulario de
 * evento productivo y sus estados de error.
 * No existía baseline vigente: la primera corrida la crea (--update-snapshots).
 *
 * Tipos de producto: el paso 2 del caso pide que el formulario solo muestre los tipos de producto habilitados para
 * la fase productiva activa, pero "Tipo de producto" es un campo de texto libre (no hay lista que filtrar); no se
 * simula nada y queda como limitación escrita. El rechazo de un producto no habilitado para la fase se representa
 * con el 422 simulado del estado 5.
 *
 * Datos congelados con fixtures (convención de TC-DIS-123), guardados el 30/09/2026 a partir de la respuesta
 * real de TEST (los mismos de TC-DIS-106; revisados: sin correos, tokens ni datos personales):
 *   - ficha-627 / activo-627 — encabezado, tipo y especie del INDIVIDUAL
 *   - metricas-especie-4 / patologias-especie-4 — se cargan al abrir cualquier modal de evento (no se ven aquí)
 *
 * Fecha: el formulario pone por defecto "Fecha del evento" = hoy (hoyLocal() al cargar el módulo, y max = hoy). Se
 * fija el reloj con page.clock.setFixedTime(2026-09-30 12:00, America/Bogota) ANTES del login. Sin máscaras.
 *
 * Estados capturados (tarjeta del diálogo "Registrar evento productivo"; valores fijos y ficticios):
 *   1. form-vacio            — recién abierto: fecha por defecto 30/09/2026
 *   2. form-lleno            — Leche, 12.5 litros, fecha 30/09/2026, condiciones y observaciones
 *   3. error-requeridos      — enviado vacío: errores del cliente en tipo, cantidad y unidad
 *   4. error-cantidad-cero   — cantidad 0: "Debe ser mayor a 0." junto al campo
 *   5. error-422-fase        — formulario lleno y 422 "producto no habilitado para la fase" simulado (route.fulfill)
 *
 * Estabilización: sin peticiones pendientes, ratón en (0, 0) (sin :hover), foco fuera, fuentes cargadas, sin toasts.
 * CSS de captura (solo durante toHaveScreenshot; no altera colores, tipografía ni espaciado): captura-completa.css
 * y captura-dialogo.css (quita el max-height de 90vh y el scroll interno de la tarjeta).
 * Umbral: el de Playwright por defecto (sin maxDiffPixelRatio).
 *
 * Cuenta compartida: antes de capturar se registra el tema (data-theme) y el idioma (lang).
 * Escrituras: ninguna. Todo POST/PUT/PATCH/DELETE a la API se aborta (salvo /sesiones/); el 422 se simula en la
 * página. Los modales se cierran con "Cancelar".
 * Navegación: page.goto directo a /activos-biologicos/<id>, verificando que la sesión sigue viva
 * ("BLOQUEO DE AMBIENTE: sesión perdida tras goto").
 */
import fs from 'fs';
import path from 'path';
import { expect, test, type Locator, type Page, type Route, type TestInfo } from '@playwright/test';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

const ID_INDIVIDUAL = 627;
const HAR_ASSETS = path.join(__dirname, '../../../../.har-cache/assets.har');
const DIALOGO = 'Registrar evento productivo';
const RELOJ_FIJO = new Date('2026-09-30T12:00:00-05:00');

const fixture = (nombre: string) => fs.readFileSync(path.join(__dirname, `${nombre}.fixture.json`), 'utf-8');
const GET_CONGELADOS: { nombre: string; coincide: (u: URL) => boolean; cuerpo: string }[] = [
  { nombre: 'ficha', coincide: (u) => u.pathname.endsWith(`/back-sigab-test/activos-biologicos/${ID_INDIVIDUAL}/ficha-integral`), cuerpo: fixture(`ficha-${ID_INDIVIDUAL}`) },
  { nombre: 'activo', coincide: (u) => u.pathname.endsWith(`/back-sigab-test/activos-biologicos/${ID_INDIVIDUAL}`), cuerpo: fixture(`activo-${ID_INDIVIDUAL}`) },
  { nombre: 'metricas', coincide: (u) => u.pathname.endsWith('/back-sigab-test/configuracion/metricas'), cuerpo: fixture('metricas-especie-4') },
  { nombre: 'patologias', coincide: (u) => u.pathname.endsWith('/back-sigab-test/configuracion/patologias'), cuerpo: fixture('patologias-especie-4') },
];

/** POST de evento productivo del INDIVIDUAL (API). */
const URL_PRODUCTIVO = (u: URL) => u.pathname.endsWith(`/back-sigab-test/activos-biologicos/${ID_INDIVIDUAL}/eventos/productivo`);

// 422 SIMULADO con el formato estándar del backend (regla de negocio: producto no habilitado para la fase)
const ERROR_422 = {
  error_code: 'TIPO_PRODUCTO_NO_HABILITADO',
  message: 'El tipo de producto no está habilitado para la fase productiva activa del activo.',
  fields: [{ field: 'tipo_producto', message: 'El tipo de producto no está habilitado para la fase productiva activa del activo.' }],
};

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

/** goto al activo → pestaña "Eventos" → modal "Productivo", estabilizado. Falla como BLOQUEO si se perdió la sesión. */
async function abrirProductivo(page: Page, id: number): Promise<Locator> {
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
  await main(page).getByRole('button', { name: 'Productivo', exact: true }).click();
  const dialogo = page.getByRole('dialog', { name: DIALOGO });
  await expect(dialogo).toBeVisible();
  await expect(campos(dialogo).fecha, 'La fecha por defecto debe salir del reloj fijo').toHaveValue('2026-09-30');
  await estabilizar(page);
  return dialogo;
}

function campos(dialogo: Locator) {
  return {
    tipo: dialogo.getByRole('textbox', { name: /^Tipo de producto/ }),
    cantidad: dialogo.getByRole('spinbutton', { name: /^Cantidad producida/ }),
    unidad: dialogo.getByRole('textbox', { name: /^Unidad de medida/ }),
    fecha: dialogo.getByRole('textbox', { name: /^Fecha del evento/ }),
    condiciones: dialogo.getByRole('textbox', { name: 'Condiciones de producción', exact: true }),
    observaciones: dialogo.getByRole('textbox', { name: 'Observaciones', exact: true }),
    registrar: dialogo.getByRole('button', { name: 'Registrar', exact: true }),
    cancelar: dialogo.getByRole('button', { name: 'Cancelar', exact: true }),
  };
}

/** Valores fijos y ficticios (no salen de la cuenta compartida); la fecha queda la por defecto (30/09/2026). */
async function llenar(dialogo: Locator) {
  const c = campos(dialogo);
  await c.tipo.fill('Leche');
  await c.cantidad.fill('12.5');
  await c.unidad.fill('litros');
  await c.condiciones.fill('Ordeño de la mañana.');
  await c.observaciones.fill('Sin novedades.');
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

test.describe('TC-DIS-115 - Consistencia visual - Formulario de evento productivo (RF-43)', () => {
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
    // Ninguna escritura llega al backend (salvo el login). El 422 simulado va en page.route, que tiene prioridad.
    await contexto.route('**/back-sigab-test/**', (r) => {
      const req = r.request();
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method()) || /\/back-sigab-test\/sesiones\//.test(req.url())) return r.continue();
      return r.abort();
    });
    page = await contexto.newPage();
    // Reloj fijo antes de cargar la app: la fecha por defecto del productivo queda en 30/09/2026
    await page.clock.setFixedTime(RELOJ_FIJO);
    page.setDefaultNavigationTimeout(300_000);
    await iniciarSesion(page);
    servidas = await congelarDatos(page);
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  test('1. Formulario vacío (fecha por defecto 30/09/2026)', async ({}, testInfo) => {
    const dialogo = await abrirProductivo(page, ID_INDIVIDUAL);
    expect(servidas.activo, 'El activo debe servirse desde el fixture').toBeGreaterThan(0);
    await registrarEntorno(page, testInfo, 'form-vacio');
    await expect(tarjeta(dialogo)).toHaveScreenshot('form-vacio.png', OPCIONES_DIALOGO);
    await cerrar(dialogo);
  });

  test('2. Formulario lleno (Leche, 12.5 litros)', async ({}, testInfo) => {
    const dialogo = await abrirProductivo(page, ID_INDIVIDUAL);
    await llenar(dialogo);
    await estabilizar(page);
    await registrarEntorno(page, testInfo, 'form-lleno');
    await expect(tarjeta(dialogo)).toHaveScreenshot('form-lleno.png', OPCIONES_DIALOGO);
    await cerrar(dialogo);
  });

  test('3. Error de cliente: enviado sin los obligatorios', async ({}, testInfo) => {
    const dialogo = await abrirProductivo(page, ID_INDIVIDUAL);
    let envios = 0;
    const contar = (r: Route) => { envios++; return r.fallback(); };
    await page.route(URL_PRODUCTIVO, contar);
    try {
      await campos(dialogo).registrar.click();
      await expect(dialogo.getByRole('alert').filter({ hasText: 'La unidad es obligatoria' }), 'Errores de cliente junto a los campos').toBeVisible();
      expect(envios, 'Con errores de cliente no se envía nada').toBe(0);
      await estabilizar(page);
      await registrarEntorno(page, testInfo, 'error-requeridos');
      await expect(tarjeta(dialogo)).toHaveScreenshot('error-requeridos.png', OPCIONES_DIALOGO);
      await cerrar(dialogo);
    } finally {
      await page.unroute(URL_PRODUCTIVO, contar);
    }
  });

  test('4. Error de cliente: cantidad 0', async ({}, testInfo) => {
    const dialogo = await abrirProductivo(page, ID_INDIVIDUAL);
    const c = campos(dialogo);
    await c.tipo.fill('Leche');
    await c.cantidad.fill('0');
    await c.cantidad.blur();
    await expect(dialogo.getByRole('alert').filter({ hasText: /mayor a 0/i }), 'El error de la cantidad debe verse junto al campo').toBeVisible();
    await estabilizar(page);
    await registrarEntorno(page, testInfo, 'error-cantidad-cero');
    await expect(tarjeta(dialogo)).toHaveScreenshot('error-cantidad-cero.png', OPCIONES_DIALOGO);
    await cerrar(dialogo);
  });

  test('5. Error 422 "producto no habilitado para la fase" (route.fulfill) con el formulario lleno', async ({}, testInfo) => {
    const dialogo = await abrirProductivo(page, ID_INDIVIDUAL);
    await llenar(dialogo);
    let envios = 0;
    await page.route(URL_PRODUCTIVO, (r) => {
      if (r.request().method() !== 'POST') return r.fallback();
      envios++;
      return r.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify(ERROR_422) });
    });
    testInfo.annotations.push({ type: 'Datos simulados', description: 'POST /eventos/productivo respondido con 422 TIPO_PRODUCTO_NO_HABILITADO en la página; no se registra nada.' });
    try {
      await campos(dialogo).registrar.click();
      await expect.poll(() => envios, { message: 'El envío debe llegar solo a la simulación' }).toBe(1);
      await expect(dialogo.getByRole('alert').filter({ hasText: 'No se pudo registrar' })).toBeVisible();
      await estabilizar(page);
      await registrarEntorno(page, testInfo, 'error-422-fase');
      await expect(tarjeta(dialogo)).toHaveScreenshot('error-422-fase.png', OPCIONES_DIALOGO);
      await cerrar(dialogo);
    } finally {
      await page.unroute(URL_PRODUCTIVO);
    }
  });
});
