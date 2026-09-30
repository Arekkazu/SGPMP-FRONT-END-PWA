/**
 * TC-DIS-79 — Consistencia visual de la sección Dashboard Personalizable
 * RF-28 · Personalización del Dashboard · Rol: Administrador · Pareja de accesibilidad: TC-DIS-78
 *
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
 * HALLAZGO VISUAL (móvil 375 px, 29/09): la cabecera de la sección desborda el
 * ancho: "Guardar configuración" queda cortado en el borde derecho y la grilla
 * 4×3 llega al borde. NO se oculta ni se enmascara: la baseline lo registra tal
 * cual, para que el arreglo aparezca como diferencia esperada.
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
      page.setDefaultTimeout(0);
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
  await irAOpcionMenuConReintento(page, /^(Configuración|Settings)$/);
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
    // describe.configure no alcanza a los hooks: sin esto el beforeAll usa los 30 s del config
    test.setTimeout(600_000);
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
    // Hallazgo visual en móvil 375 px: "Guardar configuración" cortado y grilla al borde (ver cabecera). Queda en la baseline.
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
