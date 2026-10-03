/**
 * TC-DIS-103 — Consistencia visual del formulario de Evento Biológico por tipo
 * RF-39 · Registrar evento biológico · Rol: Administrador
 * Activos biológicos → ficha del activo #627 → pestaña "Eventos" → Crecimiento / Sanitario / Reproductivo /
 * Productivo (un modal por tipo de evento)
 *
 * Criterio (hoja M02): 0 diferencias no aprobadas vs. baseline vigente en los 3 viewports para el formulario
 * en cada variante de tipo_evento (los campos cambian) y sus estados de error; al menos un estado de error.
 * No existía baseline vigente: la primera corrida la crea (--update-snapshots).
 * En la app cada tipo de evento abre su propio modal (no hay selector tipo_evento; ver TC-DIS-102).
 *
 * Datos congelados con fixtures (convención de TC-DIS-123), guardados el 30/09/2026 a partir de la respuesta
 * real de TEST (revisados: sin correos, tokens ni datos personales; id_usuario es una clave numérica que no se
 * muestra):
 *   - ficha-627 / activo-627             — encabezado del activo y especie
 *   - metricas-especie-4                 — opciones de "Tipo de medición" (crecimiento)
 *   - patologias-especie-4               — opciones de "Diagnóstico" (sanitario)
 *
 * Fecha: el formulario productivo pone por defecto "Fecha del evento" = hoy (hoyLocal() al cargar la app). Se
 * fija el reloj con page.clock.setFixedTime(2026-09-30 12:00, America/Bogota) ANTES del login. Sin máscaras.
 *
 * Estados capturados:
 *   1. pestana-eventos        — <main>: encabezado, pestaña "Eventos" con los 5 botones de registro
 *   2. modal-crecimiento      — diálogo "Registrar evento de crecimiento" recién abierto
 *   3. modal-sanitario        — diálogo "Registrar evento sanitario" (tipo Diagnóstico por defecto)
 *   4. modal-reproductivo     — diálogo "Registrar evento reproductivo"
 *   5. modal-productivo       — diálogo "Registrar evento productivo" (fecha fija 30/09/2026)
 *   6. error-validacion       — crecimiento enviado vacío: errores del cliente en cada campo
 *   7. error-409              — crecimiento lleno con valores fijos y 409 simulado (route.fulfill) en el diálogo
 *
 * Estabilización: sin peticiones pendientes, fuentes cargadas, scroll arriba, sin toasts y el ratón en (0, 0)
 * (tras un clic queda encima del control pulsado y la captura saldría en :hover).
 * CSS de captura (solo durante toHaveScreenshot; no altera colores, tipografía ni espaciado):
 * captura-completa.css (quita el límite de alto/scroll de <main>) y, para los diálogos, captura-dialogo.css
 * (quita el max-height de 90vh y el scroll interno de la tarjeta).
 * Umbral: el de Playwright por defecto (sin maxDiffPixelRatio).
 *
 * Cuenta compartida: antes de capturar se registra el tema (data-theme) y el idioma (lang).
 * Escrituras: ninguna. Todo POST/PUT/PATCH/DELETE a la API se aborta (salvo /sesiones/); el 409 se simula en
 * la página. Los modales se cierran con "Cancelar".
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
const RELOJ_FIJO = new Date('2026-09-30T12:00:00-05:00');

const fixture = (nombre: string) => fs.readFileSync(path.join(__dirname, `${nombre}.fixture.json`), 'utf-8');
const GET_CONGELADOS: { nombre: string; coincide: (u: URL) => boolean; cuerpo: string }[] = [
  { nombre: 'ficha', coincide: (u) => u.pathname.endsWith(`/back-sigab-test/activos-biologicos/${ID_INDIVIDUAL}/ficha-integral`), cuerpo: fixture('ficha-627') },
  { nombre: 'activo', coincide: (u) => u.pathname.endsWith(`/back-sigab-test/activos-biologicos/${ID_INDIVIDUAL}`), cuerpo: fixture('activo-627') },
  { nombre: 'metricas', coincide: (u) => u.pathname.endsWith('/back-sigab-test/configuracion/metricas'), cuerpo: fixture('metricas-especie-4') },
  { nombre: 'patologias', coincide: (u) => u.pathname.endsWith('/back-sigab-test/configuracion/patologias'), cuerpo: fixture('patologias-especie-4') },
];

const TIPOS = [
  { estado: 'modal-crecimiento', boton: 'Crecimiento', dialogo: 'Registrar evento de crecimiento' },
  { estado: 'modal-sanitario', boton: 'Sanitario', dialogo: 'Registrar evento sanitario' },
  { estado: 'modal-reproductivo', boton: 'Reproductivo', dialogo: 'Registrar evento reproductivo' },
  { estado: 'modal-productivo', boton: 'Productivo', dialogo: 'Registrar evento productivo' },
] as const;

/** POST de evento de crecimiento (API). */
const URL_CRECIMIENTO = (u: URL) => u.pathname.endsWith(`/back-sigab-test/activos-biologicos/${ID_INDIVIDUAL}/eventos/crecimiento`);
// 409 SIMULADO con el formato estándar del backend
const ERROR_409 = { error_code: 'ESTADO_NO_PERMITE_EVENTOS', message: 'El activo en estado INACTIVO no permite registrar eventos.', fields: [] };

const OPCIONES_MAIN = {
  animations: 'disabled' as const,
  caret: 'hide' as const,
  stylePath: path.join(__dirname, 'captura-completa.css'),
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

/** goto al activo → pestaña "Eventos", estabilizada. Falla como BLOQUEO si se perdió la sesión. */
async function abrirEventos(page: Page) {
  await page.goto(`/activos-biologicos/${ID_INDIVIDUAL}`, { waitUntil: 'commit', timeout: 120_000 });
  const login = page.getByRole('textbox', { name: 'Correo electrónico', exact: true });
  const secciones = main(page).getByRole('navigation', { name: 'Secciones del activo' });
  await expect(secciones.or(login)).toBeVisible({ timeout: 120_000 });
  if (new URL(page.url()).pathname.includes('/login') || (await login.isVisible())) {
    throw new Error(`BLOQUEO DE AMBIENTE: sesión perdida tras goto (/activos-biologicos/${ID_INDIVIDUAL} → ${page.url()})`);
  }
  await expect(main(page).getByRole('heading', { name: 'Datos del activo', exact: true })).toBeVisible({ timeout: 60_000 });
  await secciones.getByRole('button', { name: 'Eventos', exact: true }).click();
  await expect(main(page).getByRole('heading', { name: 'Registrar evento', exact: true })).toBeVisible();
  await estabilizar(page);
}

async function abrirTipo(page: Page, tipo: (typeof TIPOS)[number]): Promise<Locator> {
  await main(page).getByRole('button', { name: tipo.boton, exact: true }).click();
  const dialogo = page.getByRole('dialog', { name: tipo.dialogo });
  await expect(dialogo).toBeVisible();
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  if (tipo.boton === 'Crecimiento') await expect(dialogo.getByRole('combobox', { name: 'Tipo de medición', exact: true }).locator('option').nth(2)).toBeAttached();
  if (tipo.boton === 'Sanitario') await expect(dialogo.getByRole('combobox', { name: 'Diagnóstico', exact: true }).locator('option').nth(1)).toBeAttached();
  if (tipo.boton === 'Productivo') await expect(dialogo.getByRole('textbox', { name: /^Fecha del evento/ }), 'La fecha por defecto usa el reloj fijado').toHaveValue('2026-09-30');
  await estabilizar(page);
  return dialogo;
}

/** Sin peticiones pendientes, ratón fuera de la UI (sin hover), fuentes cargadas, scroll arriba y sin toasts. */
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

test.describe('TC-DIS-103 - Consistencia visual - Formulario de evento biológico por tipo (RF-39)', () => {
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
    // Ninguna escritura llega al backend (salvo el login). El 409 simulado va en page.route, que tiene prioridad.
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

  test('1. Pestaña "Eventos" con los botones de registro (fixtures)', async ({}, testInfo) => {
    await abrirEventos(page);
    for (const b of ['Crecimiento', 'Sanitario', 'Reproductivo', 'Productivo', 'Baja']) await expect(main(page).getByRole('button', { name: b, exact: true })).toBeVisible();
    await registrarEntorno(page, testInfo, 'pestana-eventos');
    await expect(main(page)).toHaveScreenshot('pestana-eventos.png', OPCIONES_MAIN);
  });

  for (const [i, tipo] of TIPOS.entries()) {
    test(`${i + 2}. Formulario de evento "${tipo.boton}" recién abierto (fixtures)`, async ({}, testInfo) => {
      await abrirEventos(page);
      const dialogo = await abrirTipo(page, tipo);
      await registrarEntorno(page, testInfo, tipo.estado);
      await expect(tarjeta(dialogo)).toHaveScreenshot(`${tipo.estado}.png`, OPCIONES_DIALOGO);
      await dialogo.getByRole('button', { name: 'Cancelar', exact: true }).click();
      await expect(dialogo).toBeHidden();
    });
  }

  test('6. Error de validación: crecimiento enviado vacío', async ({}, testInfo) => {
    await abrirEventos(page);
    const dialogo = await abrirTipo(page, TIPOS[0]);
    await dialogo.getByRole('button', { name: 'Registrar', exact: true }).click();
    await expect(dialogo.getByRole('alert').first(), 'Los errores del cliente deben verse').toBeVisible();
    await estabilizar(page);
    await registrarEntorno(page, testInfo, 'error-validacion');
    await expect(tarjeta(dialogo)).toHaveScreenshot('error-validacion.png', OPCIONES_DIALOGO);
    await dialogo.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(dialogo).toBeHidden();
  });

  test('7. Error 409 al registrar crecimiento (route.fulfill) con el formulario lleno', async ({}, testInfo) => {
    await abrirEventos(page);
    const dialogo = await abrirTipo(page, TIPOS[0]);
    expect(servidas.metricas, 'Las métricas deben servirse desde el fixture').toBeGreaterThan(0);
    await dialogo.getByRole('combobox', { name: 'Tipo de medición', exact: true }).selectOption('PESO');
    await dialogo.getByRole('spinbutton', { name: /^Valor/ }).fill('1.5');
    await dialogo.getByRole('combobox', { name: 'Unidad de medida', exact: true }).selectOption('kg');
    await dialogo.getByRole('textbox', { name: 'Fecha', exact: true }).fill('2026-09-29');
    let envios = 0;
    await page.route(URL_CRECIMIENTO, (r) => {
      if (r.request().method() !== 'POST') return r.fallback();
      envios++;
      return r.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify(ERROR_409) });
    });
    testInfo.annotations.push({ type: 'Datos simulados', description: 'POST /eventos/crecimiento respondido con 409 en la página; no se registra nada.' });
    try {
      await dialogo.getByRole('button', { name: 'Registrar', exact: true }).click();
      await expect.poll(() => envios, { message: 'El envío debe llegar solo a la simulación' }).toBe(1);
      await expect(dialogo.getByRole('alert').filter({ hasText: 'No se pudo registrar' })).toBeVisible();
      await estabilizar(page);
      await registrarEntorno(page, testInfo, 'error-409');
      await expect(tarjeta(dialogo)).toHaveScreenshot('error-409.png', OPCIONES_DIALOGO);
      await dialogo.getByRole('button', { name: 'Cancelar', exact: true }).click();
      await expect(dialogo).toBeHidden();
    } finally {
      await page.unroute(URL_CRECIMIENTO);
    }
  });
});
