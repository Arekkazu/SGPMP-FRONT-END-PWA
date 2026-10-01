/**
 * TC-DIS-106 — Consistencia visual del formulario de medición de crecimiento
 * RF-40 · Registrar evento de crecimiento · Rol: Administrador
 * Activos biológicos → ficha del activo → pestaña "Eventos" → "Crecimiento" (modal)
 *
 * Criterio (hoja M02): 0 diferencias no aprobadas vs. baseline vigente en los 3 viewports para el formulario de
 * medición (distintos tipos de medición y unidades) y sus estados de error.
 * No existía baseline vigente: la primera corrida la crea (--update-snapshots).
 *
 * Datos congelados con fixtures (convención de TC-DIS-123), guardados el 30/09/2026 a partir de la respuesta
 * real de TEST (revisados: sin correos, tokens ni datos personales; id_usuario es una clave numérica que no se
 * muestra):
 *   - ficha-627 / activo-627, ficha-353 / activo-353 — encabezado, tipo y especie de cada activo
 *   - metricas-especie-4   — tipos de medición de la especie: "Peso" (PESO, kg) y "peso_destete" (OTRO, kg)
 *   - patologias-especie-4 — se carga al abrir cualquier modal de evento (no se ve en estas capturas)
 * Unidades: el select "Unidad de medida" depende de la métrica elegida (unidad_medida de la métrica). Con datos
 * reales la especie 4 solo tiene métricas en kg, así que para ver otra unidad se usa
 *   - metricas-especie-4-con-talla.fixture.json — SIMULADO a partir de metricas-especie-4: las 2 métricas reales
 *     más "Talla" (TALLA, cm), porque la especie del activo de prueba solo tiene métricas en kg.
 *
 * Estados capturados (tarjeta del diálogo "Registrar evento de crecimiento"):
 *   1. form-vacio            — INDIVIDUAL #627, recién abierto
 *   2. tipo-peso             — tipo "Peso (PESO)", valor 1.5, unidad kg, fecha 29/09/2026
 *   3. tipo-otro             — tipo "peso_destete (OTRO)", valor 0.8, unidad kg, fecha 29/09/2026
 *   4. lote-poblacional      — LOTE #353: el formulario agrega los campos poblacionales
 *   5. error-valor-cero      — valor 0: validación del cliente en el campo
 *   6. error-400-valor       — formulario lleno y 400 "valor fuera de rango" simulado (route.fulfill)
 *   7. tipo-otra-unidad      — tipo "Talla (TALLA)" (métrica SIMULADA), valor 32.5, unidad cm, fecha 29/09/2026
 *
 * Fecha: el formulario de crecimiento no pone fecha por defecto (las fechas escritas son fijas). Sin máscaras.
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
const DIALOGO = 'Registrar evento de crecimiento';

const fixture = (nombre: string) => fs.readFileSync(path.join(__dirname, `${nombre}.fixture.json`), 'utf-8');
const GET_CONGELADOS: { nombre: string; coincide: (u: URL) => boolean; cuerpo: string }[] = [
  ...[ID_INDIVIDUAL, ID_LOTE].flatMap((id) => [
    { nombre: `ficha-${id}`, coincide: (u: URL) => u.pathname.endsWith(`/back-sigab-test/activos-biologicos/${id}/ficha-integral`), cuerpo: fixture(`ficha-${id}`) },
    { nombre: `activo-${id}`, coincide: (u: URL) => u.pathname.endsWith(`/back-sigab-test/activos-biologicos/${id}`), cuerpo: fixture(`activo-${id}`) },
  ]),
  { nombre: 'metricas', coincide: (u) => u.pathname.endsWith('/back-sigab-test/configuracion/metricas'), cuerpo: fixture('metricas-especie-4') },
  { nombre: 'patologias', coincide: (u) => u.pathname.endsWith('/back-sigab-test/configuracion/patologias'), cuerpo: fixture('patologias-especie-4') },
];

/** POST de evento de crecimiento del INDIVIDUAL (API). */
const URL_CRECIMIENTO = (u: URL) => u.pathname.endsWith(`/back-sigab-test/activos-biologicos/${ID_INDIVIDUAL}/eventos/crecimiento`);
// Métricas simuladas (derivadas de las reales) con una métrica de otra unidad: Talla en cm
const METRICAS_CON_TALLA = fixture('metricas-especie-4-con-talla');
const URL_METRICAS = (u: URL) => u.pathname.endsWith('/back-sigab-test/configuracion/metricas');

// 400 SIMULADO con el formato estándar del backend
const ERROR_400 = {
  error_code: 'VALOR_INVALIDO',
  message: 'El valor de la medición está fuera del rango permitido para la especie.',
  fields: [{ field: 'valor_medicion', message: 'El valor de la medición está fuera del rango permitido para la especie.' }],
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

/** goto al activo → pestaña "Eventos" → modal "Crecimiento", estabilizado. Falla como BLOQUEO si se perdió la sesión. */
async function abrirCrecimiento(page: Page, id: number): Promise<Locator> {
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
  await main(page).getByRole('button', { name: 'Crecimiento', exact: true }).click();
  const dialogo = page.getByRole('dialog', { name: DIALOGO });
  await expect(dialogo).toBeVisible();
  await expect(campos(dialogo).tipo.locator('option').nth(2), 'Las métricas de la especie deben cargarse').toBeAttached({ timeout: 30_000 });
  await estabilizar(page);
  return dialogo;
}

function campos(dialogo: Locator) {
  return {
    tipo: dialogo.getByRole('combobox', { name: 'Tipo de medición', exact: true }),
    valor: dialogo.getByRole('spinbutton', { name: /^Valor/ }),
    unidad: dialogo.getByRole('combobox', { name: 'Unidad de medida', exact: true }),
    fecha: dialogo.getByRole('textbox', { name: 'Fecha', exact: true }),
    registrar: dialogo.getByRole('button', { name: 'Registrar', exact: true }),
    cancelar: dialogo.getByRole('button', { name: 'Cancelar', exact: true }),
  };
}

async function llenar(dialogo: Locator, tipo: string, valor: string) {
  const c = campos(dialogo);
  await c.tipo.selectOption(tipo);
  await c.valor.fill(valor);
  await expect(c.unidad.locator('option').nth(1)).toBeAttached();
  await c.unidad.selectOption('kg');
  await c.fecha.fill('2026-09-29');
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

test.describe('TC-DIS-106 - Consistencia visual - Formulario de medición de crecimiento (RF-40)', () => {
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

  test('1. Formulario vacío (INDIVIDUAL #627, fixtures)', async ({}, testInfo) => {
    const dialogo = await abrirCrecimiento(page, ID_INDIVIDUAL);
    expect(servidas.metricas, 'Las métricas deben servirse desde el fixture').toBeGreaterThan(0);
    await registrarEntorno(page, testInfo, 'form-vacio');
    await expect(tarjeta(dialogo)).toHaveScreenshot('form-vacio.png', OPCIONES_DIALOGO);
    await cerrar(dialogo);
  });

  test('2. Tipo de medición "Peso" (PESO, kg) lleno', async ({}, testInfo) => {
    const dialogo = await abrirCrecimiento(page, ID_INDIVIDUAL);
    await llenar(dialogo, 'PESO', '1.5');
    await estabilizar(page);
    await registrarEntorno(page, testInfo, 'tipo-peso');
    await expect(tarjeta(dialogo)).toHaveScreenshot('tipo-peso.png', OPCIONES_DIALOGO);
    await cerrar(dialogo);
  });

  test('3. Tipo de medición "peso_destete" (OTRO, kg) lleno', async ({}, testInfo) => {
    const dialogo = await abrirCrecimiento(page, ID_INDIVIDUAL);
    await llenar(dialogo, 'OTRO', '0.8');
    await estabilizar(page);
    await registrarEntorno(page, testInfo, 'tipo-otro');
    await expect(tarjeta(dialogo)).toHaveScreenshot('tipo-otro.png', OPCIONES_DIALOGO);
    await cerrar(dialogo);
  });

  test('4. LOTE #353: formulario con los campos poblacionales (fixtures)', async ({}, testInfo) => {
    const dialogo = await abrirCrecimiento(page, ID_LOTE);
    expect(servidas['activo-353'], 'El LOTE debe servirse desde el fixture').toBeGreaterThan(0);
    await expect(dialogo.getByRole('spinbutton', { name: /Nuevo peso promedio/i }), 'LOTE agrega los campos poblacionales').toBeVisible();
    await registrarEntorno(page, testInfo, 'lote-poblacional');
    await expect(tarjeta(dialogo)).toHaveScreenshot('lote-poblacional.png', OPCIONES_DIALOGO);
    await cerrar(dialogo);
  });

  test('5. Error de cliente: valor 0', async ({}, testInfo) => {
    const dialogo = await abrirCrecimiento(page, ID_INDIVIDUAL);
    const c = campos(dialogo);
    await c.tipo.selectOption('PESO');
    await c.valor.fill('0');
    await c.valor.blur();
    await expect(dialogo.getByRole('alert').filter({ hasText: /mayor a 0/i }), 'El error del valor debe verse junto al campo').toBeVisible();
    await estabilizar(page);
    await registrarEntorno(page, testInfo, 'error-valor-cero');
    await expect(tarjeta(dialogo)).toHaveScreenshot('error-valor-cero.png', OPCIONES_DIALOGO);
    await cerrar(dialogo);
  });

  test('6. Error 400 "valor fuera de rango" (route.fulfill) con el formulario lleno', async ({}, testInfo) => {
    const dialogo = await abrirCrecimiento(page, ID_INDIVIDUAL);
    await llenar(dialogo, 'PESO', '999');
    let envios = 0;
    await page.route(URL_CRECIMIENTO, (r) => {
      if (r.request().method() !== 'POST') return r.fallback();
      envios++;
      return r.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify(ERROR_400) });
    });
    testInfo.annotations.push({ type: 'Datos simulados', description: 'POST /eventos/crecimiento respondido con 400 VALOR_INVALIDO en la página; no se registra nada.' });
    try {
      await campos(dialogo).registrar.click();
      await expect.poll(() => envios, { message: 'El envío debe llegar solo a la simulación' }).toBe(1);
      await expect(dialogo.getByRole('alert').filter({ hasText: 'No se pudo registrar' })).toBeVisible();
      await estabilizar(page);
      await registrarEntorno(page, testInfo, 'error-400-valor');
      await expect(tarjeta(dialogo)).toHaveScreenshot('error-400-valor.png', OPCIONES_DIALOGO);
      await cerrar(dialogo);
    } finally {
      await page.unroute(URL_CRECIMIENTO);
    }
  });

  test('7. Tipo de medición con otra unidad: "Talla (TALLA)" en cm (métrica simulada)', async ({}, testInfo) => {
    // Handler más reciente = prioridad sobre el de metricas-especie-4 solo durante este test
    let servidas = 0;
    const handler = (r: import('@playwright/test').Route) => {
      if (r.request().method() !== 'GET') return r.fallback();
      servidas++;
      return r.fulfill({ status: 200, contentType: 'application/json', body: METRICAS_CON_TALLA });
    };
    await page.route(URL_METRICAS, handler);
    testInfo.annotations.push({ type: 'Datos simulados', description: 'GET /configuracion/metricas servido desde metricas-especie-4-con-talla.fixture.json (métricas reales + "Talla" TALLA cm simulada).' });
    try {
      const dialogo = await abrirCrecimiento(page, ID_INDIVIDUAL);
      expect(servidas, 'Las métricas deben servirse desde el fixture simulado').toBeGreaterThan(0);
      const c = campos(dialogo);
      await c.tipo.selectOption('TALLA');
      await c.valor.fill('32.5');
      await expect(c.unidad.locator('option'), 'Con Talla la unidad disponible es cm').toHaveText(['Seleccionar…', 'cm']);
      await c.unidad.selectOption('cm');
      await c.fecha.fill('2026-09-29');
      await estabilizar(page);
      await registrarEntorno(page, testInfo, 'tipo-otra-unidad');
      await expect(tarjeta(dialogo)).toHaveScreenshot('tipo-otra-unidad.png', OPCIONES_DIALOGO);
      await cerrar(dialogo);
    } finally {
      await page.unroute(URL_METRICAS, handler);
    }
  });
});
