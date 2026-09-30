/**
 * TC-DIS-91 — Consistencia visual del formulario "Registrar activo biológico"
 * RF-33 · Registrar activo biológico · Rol: Administrador
 * Activos biológicos → /activos-biologicos/nuevo
 *
 * Criterio (hoja M02): 0 diferencias no aprobadas vs. baseline vigente en los 3 viewports para el
 * formulario en sus variantes INDIVIDUAL y POBLACIONAL y en sus estados de error (identificador
 * duplicado, cantidad inválida). No existía baseline vigente: la primera corrida la crea.
 *
 * Estados capturados (contenido de <main>, sin AppBar ni sidebar):
 *   1. form-individual-vacio   — tipo INDIVIDUAL (por defecto), sin datos
 *   2. form-poblacional-vacio  — tipo POBLACIONAL, sin datos
 *   3. error-409-identificador — INDIVIDUAL lleno con valores fijos y ficticios; el POST se responde con
 *                                409 IDENTIFICADOR_DUPLICADO (route.fulfill) y se ve la alerta
 *   4. error-cantidad-cero     — POBLACIONAL con "Cantidad inicial" = 0: validación del cliente en el campo
 *
 * Datos: el formulario no pinta datos de ningún GET (especie e infraestructura son IDs de texto libre y
 * no hay listas), así que no hace falta fixture. Los valores de relleno son fijos y ficticios.
 * Fechas: el formulario no pone ninguna fecha por defecto (los campos de fecha arrancan vacíos; "hoy"
 * solo se usa en el atributo max, que no se ve) y las que se escriben son fijas. Sin page.clock.
 * Máscaras: ninguna.
 *
 * Umbral: el de Playwright por defecto (sin maxDiffPixelRatio), igual que los visuales de M09.
 * Captura completa de <main> con captura-completa.css (stylePath): la app hace scroll dentro de <main>.
 *
 * Cuenta compartida: antes de capturar se registra el tema (data-theme) y el idioma (lang).
 * Escrituras: ninguna. El POST de registro solo se responde con route.fulfill (409 simulado); todo
 * otro POST/PUT/PATCH/DELETE a la API se aborta (salvo /sesiones/).
 * Navegación: page.goto directo a /activos-biologicos/nuevo, verificando que la sesión sigue viva
 * ("BLOQUEO DE AMBIENTE: sesión perdida tras goto").
 */
import fs from 'fs';
import path from 'path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

const HAR_ASSETS = path.join(__dirname, '../../../../.har-cache/assets.har');

/** POST de registro (API, no la ruta del frontend). */
const URL_REGISTRO = (url: URL) => /\/back-sigab-test\/activos-biologicos\/?$/.test(url.pathname);

// Valores de relleno fijos y ficticios
const RELLENO = {
  especie: '4',
  infraestructura: '6',
  inicioCiclo: '2026-09-01',
  identificador: 'QA-TC-DIS-91-FICTICIO',
  raza: 'Raza QA',
  nacimiento: '2024-01-01',
};

// 409 SIMULADO con el formato estándar del backend
const ERROR_409 = {
  error_code: 'IDENTIFICADOR_DUPLICADO',
  message: `El identificador ${RELLENO.identificador} ya está registrado para otro activo.`,
  fields: [{ field: 'identificador', message: 'El identificador ya está registrado.' }],
};

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

function campos(page: Page) {
  const m = main(page);
  return {
    individual: m.getByRole('radio', { name: /^Individual/ }),
    poblacional: m.getByRole('radio', { name: /^Poblacional/ }),
    especie: m.getByRole('spinbutton', { name: 'ID de especie', exact: true }),
    infraestructura: m.getByRole('spinbutton', { name: 'ID de infraestructura', exact: true }),
    inicioCiclo: m.getByRole('textbox', { name: 'Fecha de inicio de ciclo', exact: true }),
    origen: m.getByRole('combobox', { name: 'Origen', exact: true }),
    identificador: m.getByRole('textbox', { name: 'Identificador', exact: true }),
    raza: m.getByRole('textbox', { name: 'Raza', exact: true }),
    sexo: m.getByRole('combobox', { name: 'Sexo', exact: true }),
    nacimiento: m.getByRole('textbox', { name: 'Fecha de nacimiento', exact: true }),
    cantidad: m.getByRole('spinbutton', { name: 'Cantidad inicial', exact: true }),
    enviar: m.getByRole('button', { name: 'Registrar activo', exact: true }),
  };
}

/** goto al formulario vacío. Falla como BLOQUEO si se perdió la sesión. */
async function abrirFormulario(page: Page) {
  await page.goto('/activos-biologicos/nuevo', { waitUntil: 'commit', timeout: 120_000 });
  const login = page.getByRole('textbox', { name: 'Correo electrónico', exact: true });
  const titulo = main(page).getByRole('heading', { name: 'Registrar activo biológico', level: 1 });
  await expect(titulo.or(login)).toBeVisible({ timeout: 120_000 });
  if (new URL(page.url()).pathname.includes('/login') || (await login.isVisible())) {
    throw new Error(`BLOQUEO DE AMBIENTE: sesión perdida tras goto (/activos-biologicos/nuevo → ${page.url()})`);
  }
  await expect(campos(page).individual, 'INDIVIDUAL es el tipo por defecto').toBeChecked();
}

/** Sin peticiones pendientes, fuentes cargadas, foco fuera de los campos, scroll arriba y sin toasts. */
async function estabilizar(page: Page) {
  await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
  // Ratón fuera de la UI antes de capturar: tras un clic queda encima del control pulsado (estado :hover)
  await page.mouse.move(0, 0);
  await page.evaluate(async () => {
    (document.activeElement as HTMLElement | null)?.blur();
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

test.describe('TC-DIS-91 - Consistencia visual - Formulario de registro de activo (RF-33)', () => {
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
    // Ninguna escritura llega al backend (salvo el login). La simulación del 409 va en page.route, que tiene prioridad.
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

  test('1. Formulario INDIVIDUAL vacío', async ({}, testInfo) => {
    await abrirFormulario(page);
    await expect(campos(page).identificador, 'INDIVIDUAL muestra "Identificador"').toBeVisible();
    await estabilizar(page);
    await registrarEntorno(page, testInfo, 'form-individual-vacio');
    await expect(main(page)).toHaveScreenshot('form-individual-vacio.png', OPCIONES_CAPTURA);
  });

  test('2. Formulario POBLACIONAL vacío', async ({}, testInfo) => {
    await abrirFormulario(page);
    await campos(page).poblacional.check();
    await expect(campos(page).cantidad, 'POBLACIONAL muestra "Cantidad inicial"').toBeVisible();
    await expect(campos(page).identificador).toHaveCount(0);
    await estabilizar(page);
    await registrarEntorno(page, testInfo, 'form-poblacional-vacio');
    await expect(main(page)).toHaveScreenshot('form-poblacional-vacio.png', OPCIONES_CAPTURA);
  });

  test('3. Error 409 "identificador ya registrado" (route.fulfill) con el formulario lleno', async ({}, testInfo) => {
    await abrirFormulario(page);
    const c = campos(page);
    await c.especie.fill(RELLENO.especie);
    await c.infraestructura.fill(RELLENO.infraestructura);
    await c.inicioCiclo.fill(RELLENO.inicioCiclo);
    await c.origen.selectOption('nacimiento');
    await c.identificador.fill(RELLENO.identificador);
    await c.raza.fill(RELLENO.raza);
    await c.sexo.selectOption('HEMBRA');
    await c.nacimiento.fill(RELLENO.nacimiento);

    let envios = 0;
    await page.route(URL_REGISTRO, (r) => {
      if (r.request().method() !== 'POST') return r.fallback();
      envios++;
      return r.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify(ERROR_409) });
    });
    testInfo.annotations.push({ type: 'Datos simulados', description: 'POST /activos-biologicos respondido con 409 IDENTIFICADOR_DUPLICADO; no se registra nada.' });
    try {
      await c.enviar.click();
      await expect.poll(() => envios, { message: 'El envío debe llegar al POST simulado' }).toBe(1);
      await expect(main(page).getByRole('alert').filter({ hasText: 'No se pudo registrar el activo' }), 'La alerta del 409 debe verse').toBeVisible();
      await expect(c.enviar, 'El botón vuelve a estar disponible tras el error').toBeEnabled();
      await estabilizar(page);
      await registrarEntorno(page, testInfo, 'error-409-identificador');
      await expect(main(page)).toHaveScreenshot('error-409-identificador.png', OPCIONES_CAPTURA);
    } finally {
      await page.unroute(URL_REGISTRO);
    }
  });

  test('4. Error de cantidad inválida (cantidad 0, validación del cliente)', async ({}, testInfo) => {
    await abrirFormulario(page);
    const c = campos(page);
    await c.poblacional.check();
    await c.cantidad.fill('0');
    await c.cantidad.blur();
    await expect(main(page).getByRole('alert').filter({ hasText: /mayor a 0/i }), 'El error de cantidad debe verse junto al campo').toBeVisible();
    await expect(c.cantidad).toHaveAttribute('aria-invalid', 'true');
    await estabilizar(page);
    await registrarEntorno(page, testInfo, 'error-cantidad-cero');
    await expect(main(page)).toHaveScreenshot('error-cantidad-cero.png', OPCIONES_CAPTURA);
  });
});
