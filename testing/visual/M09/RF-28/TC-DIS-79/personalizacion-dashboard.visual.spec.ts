/**
 * TC-DIS-79 — Consistencia visual de la sección Dashboard Personalizable
 * RF-28 · Personalización del Dashboard · Rol: Administrador · Pareja de accesibilidad: TC-DIS-78
 *
 * BASELINE PENDIENTE (29/09/2026): no se generó por degradación de TEST
 * (/login sin evento load en >30 s entre 18:37 y 19:19, y en >90 s a las 19:27;
 * el bundle principal bajaba a ~22 KB/s). Generar con --update-snapshots
 * --workers=1 cuando /login cargue en menos de 30 s.
 * Falta también personalizacion.fixture.json: se arma con los cuerpos reales de los GET de TEST
 * (hoy no se pueden capturar); sin él el spec no carga.
 *
 * Ruta: Configuración → pestaña Personalización → sección "Dashboard Personalizable".
 * Corre en movil / tablet / escritorio con UN login por viewport: describe en
 * serie, página creada en beforeAll y reutilizada por todos los tests. La sesión
 * (JWT) vive en memoria: tras el login NO se usa page.goto(); se navega por el
 * sidebar con irAOpcionMenu (_shared/navegacion.ts) y se vuelve al estado base por clics.
 *
 * Captura de página completa: la app hace scroll dentro de <main>, no en el
 * documento, así que fullPage solo veía el viewport. captura-completa.css
 * (stylePath) suelta ese scroll SOLO durante la captura.
 *
 * Lecturas fijadas (personalizacion.fixture.json): admin.dev es una cuenta
 * compartida; su layout de dashboard, tema e idioma los cambia cualquiera que
 * pruebe a mano. Los GET de personalización se sirven con page.route a partir
 * de respuestas reales de TEST (precedente: plantillas.fixture.json de
 * TC-DIS-62). Las escrituras de personalización se interceptan y nunca llegan
 * al backend.
 *
 * Precondiciones:
 *   - Baseline aprobada. La primera vez se genera con --update-snapshots.
 *
 * Solo se abre y se observa: seleccionar un widget del catálogo es estado local
 * (nunca se pulsa "Guardar configuración") y el modal "Restaurar predeterminado"
 * se cierra con "Cancelar", nunca con "Restaurar".
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

/** pathname del endpoint → cuerpo real de TEST con los valores de estado fijados. */
const LECTURAS_FIJAS: Record<string, unknown> = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'personalizacion.fixture.json'), 'utf-8'),
);

/** Sirve los GET del fixture y bloquea toda escritura de personalización (responde 200 sin llegar al backend). */
async function fijarPersonalizacion(page: Page) {
  await page.route(/\/configuracion\/personalizacion\//, async (route) => {
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

/** Sección "Dashboard Personalizable" (cabecera, grilla 4×3 y catálogo), sin el resto de la pestaña. */
function seccionDashboard(page: Page): Locator {
  return page
    .getByRole('main')
    .locator('div')
    .filter({ has: page.getByRole('heading', { name: 'Dashboard Personalizable' }) })
    .filter({ hasText: 'Catálogo de Widgets' })
    .last();
}

/** Configuración → pestaña Personalización, con la sección Dashboard Personalizable cargada. */
async function abrirDashboardPersonalizable(page: Page) {
  await irAOpcionMenu(page, /^(Configuración|Settings)$/);
  await page.waitForURL(/configuracion/);
  await page.getByRole('button', { name: /^(Personalización|Personalization)$/ }).click();

  await expect(page.getByRole('main').getByRole('heading', { name: 'Dashboard Personalizable' })).toBeVisible();
  await expect(seccionDashboard(page).getByText('Catálogo de Widgets', { exact: true })).toBeVisible();
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

test.describe('TC-DIS-79 - Consistencia visual - Personalización del Dashboard (RF-28)', () => {
  // En serie y con un solo login: si falla se detiene, en vez de sumar intentos fallidos a la cuenta admin (bloqueo a los 5)
  test.describe.configure({ mode: 'serial', timeout: 600_000 });

  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    expect(ADMIN_EMAIL, 'Falta TEST_ADMIN_EMAIL en testing/.env.test').not.toBe('');
    expect(ADMIN_PASSWORD, 'Falta TEST_ADMIN_PASSWORD en testing/.env.test').not.toBe('');

    const { viewport, deviceScaleFactor, userAgent, isMobile, hasTouch } = testInfo.project.use;
    const contexto = await browser.newContext({ viewport, deviceScaleFactor, userAgent, isMobile, hasTouch });
    await usarCacheAssets(contexto);
    page = await contexto.newPage();
    page.setDefaultNavigationTimeout(300_000);

    await fijarPersonalizacion(page);
    await iniciarSesion(page);
    await page.waitForLoadState('networkidle');
    await abrirDashboardPersonalizable(page);
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  test('1. Vista inicial: grilla guardada y catálogo de widgets', async () => {
    await expect(page).toHaveScreenshot('dashboard-vista-inicial.png', {
      ...OPCIONES_CAPTURA,
      mask: zonasDinamicas(page),
    });
  });

  test('2. Modal "Restaurar predeterminado" (se cierra con Cancelar)', async () => {
    await seccionDashboard(page).getByRole('button', { name: 'Restaurar predeterminado' }).click();
    const modal = page.getByRole('dialog', { name: 'Restaurar configuración predeterminada' });
    await expect(modal).toBeVisible();

    await expect(page).toHaveScreenshot('dashboard-modal-restaurar.png', {
      ...OPCIONES_CAPTURA,
      mask: zonasDinamicas(page),
    });

    // Vuelta al estado base por clic, nunca "Restaurar"
    await modal.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(modal).toBeHidden();
  });

  test('3. Widget del catálogo seleccionado: celdas vacías en modo "Colocar"', async () => {
    const seccion = seccionDashboard(page);
    const catalogo = seccion.getByText('Catálogo de Widgets', { exact: true }).locator('xpath=../..');
    await catalogo.getByRole('button').first().click();
    await expect(seccion.getByRole('button', { name: /^Colocar / }).first()).toBeVisible();

    await expect(page).toHaveScreenshot('dashboard-widget-seleccionado.png', {
      ...OPCIONES_CAPTURA,
      mask: zonasDinamicas(page),
    });
  });
});
