/**
 * TC-DIS-109 — Consistencia visual del formulario de Evento Sanitario por tipo
 * RF-41 · Registrar evento sanitario · Rol: Administrador
 * Activos biológicos → ficha del activo → pestaña "Eventos" → "Sanitario" (modal)
 *
 * Criterio (hoja M02): 0 diferencias no aprobadas vs. baseline vigente en los 3 viewports para el formulario en cada
 * variante (vacunación, tratamiento, diagnóstico, control) y sus estados de error/alerta. Nota del caso: la baseline
 * debe cubrir cada tipo (los campos cambian) y el estado de alerta de período de retiro.
 * No existía baseline vigente: la primera corrida la crea (--update-snapshots).
 *
 * Período de retiro: el formulario NO tiene alerta ni campo de período de retiro (no aparece en
 * EventoSanitarioForm.tsx ni en ninguna parte de src/), así que ese estado no se puede capturar: queda como
 * limitación escrita, no se simula.
 *
 * Datos congelados con fixtures (convención de TC-DIS-123), guardados el 30/09/2026 a partir de la respuesta
 * real de TEST (los mismos de TC-DIS-106; revisados: sin correos, tokens ni datos personales):
 *   - ficha-627 / activo-627 — encabezado, tipo y especie del INDIVIDUAL
 *   - patologias-especie-4   — opciones del select "Diagnóstico"
 *   - metricas-especie-4     — se carga al abrir cualquier modal de evento (no se ve en estas capturas)
 *
 * Estados capturados (tarjeta del diálogo "Registrar evento sanitario"; valores fijos y ficticios):
 *   1. diagnostico-vacio     — recién abierto (tipo por defecto: Diagnóstico)
 *   2. diagnostico-lleno     — patología "Columnaris", fecha 29/09/2026
 *   3. vacunacion-llena      — medicamento, dosis 2, unidad ml, fecha
 *   4. tratamiento-lleno     — medicamento, dosis 0.5 ml, frecuencia 2, duración 5, "Marcar EN TRATAMIENTO", fecha
 *   5. control-lleno         — observaciones, "No cambiar estado", fecha
 *   6. error-requeridos      — Tratamiento enviado vacío: errores del cliente en todos los obligatorios
 *   7. error-400             — Vacunación llena y 400 "dosis fuera de rango" simulado (route.fulfill)
 *
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
import { expect, test, type Locator, type Page, type Route, type TestInfo } from '@playwright/test';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

const ID_INDIVIDUAL = 627;
const HAR_ASSETS = path.join(__dirname, '../../../../.har-cache/assets.har');
const DIALOGO = 'Registrar evento sanitario';

const fixture = (nombre: string) => fs.readFileSync(path.join(__dirname, `${nombre}.fixture.json`), 'utf-8');
const GET_CONGELADOS: { nombre: string; coincide: (u: URL) => boolean; cuerpo: string }[] = [
  { nombre: 'ficha', coincide: (u) => u.pathname.endsWith(`/back-sigab-test/activos-biologicos/${ID_INDIVIDUAL}/ficha-integral`), cuerpo: fixture(`ficha-${ID_INDIVIDUAL}`) },
  { nombre: 'activo', coincide: (u) => u.pathname.endsWith(`/back-sigab-test/activos-biologicos/${ID_INDIVIDUAL}`), cuerpo: fixture(`activo-${ID_INDIVIDUAL}`) },
  { nombre: 'metricas', coincide: (u) => u.pathname.endsWith('/back-sigab-test/configuracion/metricas'), cuerpo: fixture('metricas-especie-4') },
  { nombre: 'patologias', coincide: (u) => u.pathname.endsWith('/back-sigab-test/configuracion/patologias'), cuerpo: fixture('patologias-especie-4') },
];

/** POST de evento sanitario del INDIVIDUAL (API). */
const URL_SANITARIO = (u: URL) => u.pathname.endsWith(`/back-sigab-test/activos-biologicos/${ID_INDIVIDUAL}/eventos/sanitario`);

// 400 SIMULADO con el formato estándar del backend
const ERROR_400 = {
  error_code: 'VALOR_INVALIDO',
  message: 'La dosis está fuera del rango permitido para la especie.',
  fields: [{ field: 'dosis', message: 'La dosis está fuera del rango permitido para la especie.' }],
};

const OPCIONES_DIALOGO = {
  animations: 'disabled' as const,
  caret: 'hide' as const,
  stylePath: [path.join(__dirname, 'captura-completa.css'), path.join(__dirname, 'captura-dialogo.css')],
};

type TipoSanitario = 'DIAGNOSTICO' | 'VACUNACION' | 'TRATAMIENTO' | 'CONTROL_PREVENTIVO';

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

/** goto al activo → pestaña "Eventos" → modal "Sanitario", estabilizado. Falla como BLOQUEO si se perdió la sesión. */
async function abrirSanitario(page: Page, id: number): Promise<Locator> {
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
  await main(page).getByRole('button', { name: 'Sanitario', exact: true }).click();
  const dialogo = page.getByRole('dialog', { name: DIALOGO });
  await expect(dialogo).toBeVisible();
  await expect(campos(dialogo).diagnostico.locator('option').nth(1), 'Las patologías de la especie deben cargarse').toBeAttached({ timeout: 30_000 });
  await estabilizar(page);
  return dialogo;
}

function campos(dialogo: Locator) {
  return {
    tipo: dialogo.getByRole('combobox', { name: /^Tipo/ }),
    diagnostico: dialogo.getByRole('combobox', { name: /^Diagnóstico/ }),
    medicamento: dialogo.getByRole('textbox', { name: /^Medicamento/ }),
    dosis: dialogo.getByRole('spinbutton', { name: /^Dosis/ }),
    unidadDosis: dialogo.getByRole('textbox', { name: 'Unidad de dosis', exact: true }),
    frecuencia: dialogo.getByRole('spinbutton', { name: /^Frecuencia/ }),
    duracion: dialogo.getByRole('spinbutton', { name: /^Duración/ }),
    observaciones: dialogo.getByRole('textbox', { name: /^Observaciones/ }),
    solicitarEstado: dialogo.getByRole('combobox', { name: 'Solicitar cambio de estado', exact: true }),
    fecha: dialogo.getByRole('textbox', { name: 'Fecha', exact: true }),
    registrar: dialogo.getByRole('button', { name: 'Registrar', exact: true }),
    cancelar: dialogo.getByRole('button', { name: 'Cancelar', exact: true }),
  };
}

/** Valores fijos y ficticios (no salen de la cuenta compartida). */
async function llenar(dialogo: Locator, tipo: TipoSanitario) {
  const c = campos(dialogo);
  await c.tipo.selectOption(tipo);
  if (tipo === 'DIAGNOSTICO') await c.diagnostico.selectOption('Columnaris');
  if (tipo === 'VACUNACION' || tipo === 'TRATAMIENTO') {
    await c.medicamento.fill(tipo === 'VACUNACION' ? 'Vacuna QA A' : 'Oxitetraciclina QA');
    await c.dosis.fill(tipo === 'VACUNACION' ? '2' : '0.5');
    await c.unidadDosis.fill('ml');
  }
  if (tipo === 'TRATAMIENTO') {
    await c.frecuencia.fill('2');
    await c.duracion.fill('5');
    await c.solicitarEstado.selectOption('EN_TRATAMIENTO');
  }
  if (tipo === 'CONTROL_PREVENTIVO') await c.observaciones.fill('Revisión de rutina sin hallazgos.');
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

test.describe('TC-DIS-109 - Consistencia visual - Formulario de evento sanitario por tipo (RF-41)', () => {
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

  test('1. Diagnóstico (tipo por defecto) vacío', async ({}, testInfo) => {
    const dialogo = await abrirSanitario(page, ID_INDIVIDUAL);
    expect(servidas.patologias, 'Las patologías deben servirse desde el fixture').toBeGreaterThan(0);
    await expect(campos(dialogo).tipo).toHaveValue('DIAGNOSTICO');
    await registrarEntorno(page, testInfo, 'diagnostico-vacio');
    await expect(tarjeta(dialogo)).toHaveScreenshot('diagnostico-vacio.png', OPCIONES_DIALOGO);
    await cerrar(dialogo);
  });

  const LLENOS: [string, TipoSanitario, string, string][] = [
    ['2', 'DIAGNOSTICO', 'diagnostico-lleno', 'Diagnóstico lleno ("Columnaris")'],
    ['3', 'VACUNACION', 'vacunacion-llena', 'Vacunación llena (medicamento, dosis, unidad)'],
    ['4', 'TRATAMIENTO', 'tratamiento-lleno', 'Tratamiento lleno (frecuencia, duración, cambio de estado)'],
    ['5', 'CONTROL_PREVENTIVO', 'control-lleno', 'Control preventivo lleno (observaciones)'],
  ];
  for (const [n, tipo, estado, titulo] of LLENOS) {
    test(`${n}. ${titulo}`, async ({}, testInfo) => {
      const dialogo = await abrirSanitario(page, ID_INDIVIDUAL);
      await llenar(dialogo, tipo);
      await estabilizar(page);
      await registrarEntorno(page, testInfo, estado);
      await expect(tarjeta(dialogo)).toHaveScreenshot(`${estado}.png`, OPCIONES_DIALOGO);
      await cerrar(dialogo);
    });
  }

  test('6. Error de cliente: Tratamiento enviado sin los obligatorios', async ({}, testInfo) => {
    const dialogo = await abrirSanitario(page, ID_INDIVIDUAL);
    const c = campos(dialogo);
    await c.tipo.selectOption('TRATAMIENTO');
    let envios = 0;
    const contar = (r: Route) => { envios++; return r.fallback(); };
    await page.route(URL_SANITARIO, contar);
    try {
      await c.registrar.click();
      await expect(dialogo.getByRole('alert').filter({ hasText: 'La duración es obligatoria' }), 'Errores de cliente junto a los campos').toBeVisible();
      expect(envios, 'Con errores de cliente no se envía nada').toBe(0);
      await estabilizar(page);
      await registrarEntorno(page, testInfo, 'error-requeridos');
      await expect(tarjeta(dialogo)).toHaveScreenshot('error-requeridos.png', OPCIONES_DIALOGO);
      await cerrar(dialogo);
    } finally {
      await page.unroute(URL_SANITARIO, contar);
    }
  });

  test('7. Error 400 "dosis fuera de rango" (route.fulfill) con Vacunación llena', async ({}, testInfo) => {
    const dialogo = await abrirSanitario(page, ID_INDIVIDUAL);
    await llenar(dialogo, 'VACUNACION');
    let envios = 0;
    await page.route(URL_SANITARIO, (r) => {
      if (r.request().method() !== 'POST') return r.fallback();
      envios++;
      return r.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify(ERROR_400) });
    });
    testInfo.annotations.push({ type: 'Datos simulados', description: 'POST /eventos/sanitario respondido con 400 VALOR_INVALIDO en la página; no se registra nada.' });
    try {
      await campos(dialogo).registrar.click();
      await expect.poll(() => envios, { message: 'El envío debe llegar solo a la simulación' }).toBe(1);
      await expect(dialogo.getByRole('alert').filter({ hasText: 'No se pudo registrar' })).toBeVisible();
      await estabilizar(page);
      await registrarEntorno(page, testInfo, 'error-400');
      await expect(tarjeta(dialogo)).toHaveScreenshot('error-400.png', OPCIONES_DIALOGO);
      await cerrar(dialogo);
    } finally {
      await page.unroute(URL_SANITARIO);
    }
  });
});
