/**
 * TC-DIS-73 — Consistencia visual de la sección Identidad Visual
 * RF-26 · Identidad visual del sistema · Rol: Administrador · Pareja de accesibilidad: TC-DIS-72
 *
 *
 * ⚠ PARCIAL — BLOQUEADO POR #166 (backend): no hay fincas listables, así que la
 * sección solo muestra "No hay fincas activas disponibles." Hoy se versiona SOLO
 * esa captura. El formulario de identidad (colores, nombre, logo y "Vista previa
 * en vivo") está escrito pero se salta solo mientras no haya fincas; al cerrar
 * #166 hay que generar su baseline y re-aprobar la del estado vacío.
 *
 * Ruta: Configuración → pestaña Personalización → sección "Identidad Visual".
 * Corre en movil / tablet / escritorio con UN login por viewport: describe en
 * serie, página creada en beforeAll y reutilizada por todos los tests. La sesión
 * (JWT) vive en memoria: tras el login NO se usa page.goto(); se navega por el
 * sidebar con irAOpcionMenu (_shared/navegacion.ts).
 *
 * Captura de página completa: la app hace scroll dentro de <main>, no en el
 * documento, así que fullPage solo veía el viewport. captura-completa.css
 * (stylePath) suelta ese scroll SOLO durante la captura.
 *
 * Lecturas fijadas (personalizacion.fixture.json): la página completa incluye
 * las secciones Tema, Idioma y Dashboard, cuyos valores cambia cualquiera que
 * use la cuenta compartida admin.dev. Esos GET se sirven con page.route a partir
 * de respuestas reales de TEST (precedente: plantillas.fixture.json de
 * TC-DIS-62). Identidad Visual y fincas NO se fijan: son lo que se evalúa.
 * Las escrituras de personalización se interceptan y nunca llegan al backend.
 *
 * Precondiciones:
 *   - Baseline aprobada. La primera vez se genera con --update-snapshots.
 *
 * Solo se abre y se observa: nunca se pulsa guardar ni se sube un logo.
 */
import fs from 'fs';
import path from 'path';
import { expect as expectBase, test, type BrowserContext, type Locator, type Page } from '@playwright/test';
import { irAOpcionMenu } from '../../../../accesibilidad/axe/_shared/navegacion';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

// Red lenta (~3.5 Mbps): expect de 30 s en vez de los 5 s por defecto
const expect = expectBase.configure({ timeout: 30_000 });

const BASE_URL = process.env.BASE_URL ?? 'https://api.inmero.co/';

/**
 * Caché de assets para red lenta (~3.5 Mbps): la primera corrida graba en un HAR
 * solo los estáticos de /assets/** (JS, CSS, fuentes) y las siguientes los sirven
 * desde ahí sin red. NUNCA se cachea la API. Un asset que no esté en el HAR (nuevo
 * despliegue) sale a la red. El HAR no se versiona (testing/.gitignore).
 */
const HAR_ASSETS = path.join(__dirname, '../../../../.har-cache/assets.har');

async function usarCacheAssets(contexto: BrowserContext) {
  const grabar = !fs.existsSync(HAR_ASSETS);
  await contexto.routeFromHAR(HAR_ASSETS, { url: '**/assets/**', update: grabar, notFound: 'fallback' });
}

/**
 * Notificaciones fijadas (notificaciones.fixture.json, cuerpo real de TEST): cada
 * login crea una notificación nueva ("nuevo inicio de sesión"), así que no_leidas
 * sube en cada corrida, y el badge aparecía o no según cuándo llegaba el GET
 * (diferencia de 555 px en TC-DIS-88 tablet el 29/09). Con el GET fijado el badge
 * siempre está y se espera antes de capturar; su máscara es determinista. Marcar
 * como leída (escritura) se aborta.
 */
const NOTIFICACIONES: unknown = JSON.parse(fs.readFileSync(path.join(__dirname, 'notificaciones.fixture.json'), 'utf-8'));

async function fijarNotificaciones(page: Page) {
  await page.route(/\/notificaciones(\/[^?]*)?(\?.*)?$/, (route) => {
    const req = route.request();
    if (!['xhr', 'fetch'].includes(req.resourceType())) return route.continue();
    if (req.method() !== 'GET') return route.abort('blockedbyclient');
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(NOTIFICACIONES) });
  });
}

/**
 * irAOpcionMenu (_shared/navegacion.ts) con reintento. Flake visto en tablet el
 * 29/09: el drawer llega a abrirse (.ds-sidebar--open) pero un re-render de la app
 * justo tras el login lo vuelve a cerrar y el ítem queda fuera del viewport; el
 * clic se queda reintentando hasta agotar el tiempo. Cada intento dura como máximo
 * 15 s; al reintentar, el helper compartido vuelve a abrir el menú.
 */
async function irAOpcionMenuConReintento(page: Page, opcion: string | RegExp) {
  for (let intento = 1; ; intento++) {
    page.setDefaultTimeout(15_000);
    try {
      await irAOpcionMenu(page, opcion);
      return;
    } catch (error) {
      if (intento >= 3) throw error;
      console.log(`[menu] reintento ${intento} para ${opcion}`);
      await page.waitForTimeout(1000);
    } finally {
      page.setDefaultTimeout(60_000);
    }
  }
}

/**
 * Mismo flujo que iniciarSesionAdmin (_shared/navegacion.ts), pero sin esperar el
 * evento load (espera también fuentes e imágenes y con la red lenta pasa de 90 s):
 * el goto termina en 'commit' y se espera a que el campo de correo esté visible.
 */
async function iniciarSesion(page: Page) {
  const inicio = Date.now();
  await page.goto(new URL('/login', BASE_URL).toString(), { waitUntil: 'commit' });
  const correo = page.getByLabel(/correo electrónico/i);
  await correo.waitFor({ state: 'visible', timeout: 300_000 });
  await correo.fill(ADMIN_EMAIL);
  await page.getByLabel(/contraseña/i).fill(ADMIN_PASSWORD);
  const ingresar = page.getByRole('button', { name: /ingresar/i });
  await ingresar.waitFor({ state: 'visible' });
  await ingresar.click();
  await page.waitForURL(/dashboard/, { timeout: 300_000 });
  console.log(`[login] ${((Date.now() - inicio) / 1000).toFixed(0)} s`);
}

const BLOQUEO_166 = 'BLOQUEADO por #166: sin fincas listables Identidad Visual no tiene finca que configurar.';

/** pathname del endpoint → cuerpo real de TEST con los valores de estado fijados. */
const LECTURAS_FIJAS: Record<string, unknown> = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'personalizacion.fixture.json'), 'utf-8'),
);

/** Sirve los GET del fixture y bloquea toda escritura de personalización (responde 200 sin llegar al backend). */
async function fijarPersonalizacion(page: Page) {
  await page.route(/\/configuracion\/(personalizacion|identidad-visual)\//, async (route) => {
    const req = route.request();
    const pathname = new URL(req.url()).pathname;
    if (req.method() === 'GET') {
      const clave = Object.keys(LECTURAS_FIJAS).find((k) => pathname.endsWith(k));
      if (!clave) return route.continue();
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(LECTURAS_FIJAS[clave]) });
    }
    const dto = req.postDataJSON() ?? {};
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(dto) });
  });
}

/** Sección "Identidad Visual" dentro de la pestaña Personalización. */
function seccionIdentidad(page: Page): Locator {
  return page
    .getByRole('main')
    .locator('div')
    .filter({ has: page.getByRole('heading', { name: 'Identidad Visual', exact: true }) })
    .last();
}

function estadoVacio(page: Page): Locator {
  // Acotado a <main>: el div más interno con el encabezado no incluye el mensaje, y el texto es único en la pestaña
  return page.getByRole('main').getByText('No hay fincas activas disponibles.', { exact: true });
}

/** Configuración → pestaña Personalización, con la sección Identidad Visual cargada. */
async function abrirIdentidadVisual(page: Page) {
  // El estado vacío depende del listado de fincas (hoy 400 por #166): se espera su respuesta
  // real antes de decidir si hay fincas, para no confundir "aún cargando" con "hay datos".
  const listado = page.waitForResponse(
    (r) => r.request().method() === 'GET' && new URL(r.url()).pathname.endsWith('/configuracion/fincas'),
    { timeout: 120_000 },
  );
  await irAOpcionMenuConReintento(page, /^(Configuración|Settings)$/);
  await page.waitForURL(/configuracion/);
  await page.getByRole('button', { name: /^(Personalización|Personalization)$/ }).click();
  await listado;

  await expect(page.getByRole('main').getByRole('heading', { name: 'Identidad Visual', exact: true })).toBeVisible();
  await expect(page.getByRole('main').getByRole('button', { name: 'Guardar tema', exact: true }).first()).toBeVisible();
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
}

/** Zonas que cambian entre corridas y no son parte del diseño. */
function zonasDinamicas(page: Page) {
  return [page.locator('.ds-appbar__notif-badge')];
}

const OPCIONES_CAPTURA = {
  fullPage: true,
  animations: 'disabled' as const,
  caret: 'hide' as const,
  stylePath: path.join(__dirname, 'captura-completa.css'),
};

test.describe('TC-DIS-73 - Consistencia visual - Identidad Visual (RF-26)', () => {
  // En serie y con un solo login: si falla se detiene, en vez de sumar intentos fallidos a la cuenta admin (bloqueo a los 5)
  test.describe.configure({ mode: 'serial', timeout: 600_000 });

  let page: Page;
  let hayFincas = false;

  test.beforeAll(async ({ browser }, testInfo) => {
    // describe.configure no alcanza a los hooks: sin esto el beforeAll usa los 30 s del config
    test.setTimeout(600_000);
    expect(ADMIN_EMAIL, 'Falta TEST_ADMIN_EMAIL en testing/.env.test').not.toBe('');
    expect(ADMIN_PASSWORD, 'Falta TEST_ADMIN_PASSWORD en testing/.env.test').not.toBe('');

    const { viewport, deviceScaleFactor, userAgent, isMobile, hasTouch } = testInfo.project.use;
    const contexto = await browser.newContext({ viewport, deviceScaleFactor, userAgent, isMobile, hasTouch });
    await usarCacheAssets(contexto);
    page = await contexto.newPage();
    page.setDefaultNavigationTimeout(300_000);
    await fijarNotificaciones(page);

    await fijarPersonalizacion(page);
    await iniciarSesion(page);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.ds-appbar__notif-badge')).toBeVisible();
    await abrirIdentidadVisual(page);
    hayFincas = !(await estadoVacio(page).isVisible());
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  test('2. Selector de finca', async () => {
    test.skip(!hayFincas, BLOQUEO_166);
    await expect(page).toHaveScreenshot('identidad-selector-finca.png', {
      ...OPCIONES_CAPTURA,
      mask: zonasDinamicas(page),
    });
  });

  test('3. Formulario de identidad con vista previa en vivo', async () => {
    test.skip(!hayFincas, BLOQUEO_166);
    await page.getByRole('main').getByRole('button', { name: /^Finca Administrativa/ }).click();
    await expect(page.getByText('Vista previa en vivo', { exact: true })).toBeVisible();
    await expect(page).toHaveScreenshot('identidad-formulario.png', {
      ...OPCIONES_CAPTURA,
      mask: zonasDinamicas(page),
    });
  });
});
