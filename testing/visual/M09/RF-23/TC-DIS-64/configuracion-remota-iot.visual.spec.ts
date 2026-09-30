/**
 * TC-DIS-64 — Consistencia visual del panel Configuración Remota IoT
 * RF-23 · Configuración remota de dispositivos IoT · Rol: Administrador · Pareja de accesibilidad: TC-DIS-63
 *
 * BASELINE PENDIENTE (29/09/2026): no se generó por degradación de TEST
 * (/login sin evento load en >30 s entre 18:37 y 19:19, y en >90 s a las 19:27;
 * el bundle principal bajaba a ~22 KB/s). Generar con --update-snapshots
 * --workers=1 cuando /login cargue en menos de 30 s.
 *
 * ⚠ PARCIAL — BLOQUEADO POR #166 (backend): no hay fincas listables, así que no
 * hay dispositivos activos y el panel solo muestra su estado vacío ("No hay
 * dispositivos activos…"). Hoy se versiona SOLO esa captura. Los pasos con
 * dispositivo (selector y formulario de frecuencia/intervalo) están escritos
 * pero se saltan solos mientras la lista esté vacía; al cerrar #166 hay que
 * generar su baseline y re-aprobar la del estado vacío (dejará de aplicar).
 *
 * Ruta: Configuración → pestaña IoT → sección "Configuración Remota IoT".
 * Corre en movil / tablet / escritorio con UN login por viewport: describe en
 * serie, página creada en beforeAll y reutilizada por todos los tests. La sesión
 * (JWT) vive en memoria: tras el login NO se usa page.goto(); se navega por el
 * sidebar con irAOpcionMenu (_shared/navegacion.ts).
 *
 * Captura de página completa: la app hace scroll dentro de <main>, no en el
 * documento, así que fullPage solo veía el viewport. captura-completa.css
 * (stylePath) suelta ese scroll SOLO durante la captura.
 *
 * Precondiciones:
 *   - Baseline aprobada. La primera vez se genera con --update-snapshots.
 *
 * Solo se abre y se observa: nunca se pulsa "Enviar configuración" (llega al
 * dispositivo). El error de intervalo < frecuencia se provoca por blur.
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

const BLOQUEO_166 = 'BLOQUEADO por #166: sin fincas listables no hay dispositivos activos en Configuración Remota IoT.';

/** Sección "Configuración Remota IoT" dentro de la pestaña IoT. */
function seccionRemota(page: Page): Locator {
  return page
    .getByRole('main')
    .locator('div')
    .filter({ has: page.getByRole('heading', { name: 'Configuración Remota IoT' }) })
    .last();
}

function estadoVacio(page: Page): Locator {
  return seccionRemota(page).getByText(/^No hay dispositivos activos\./);
}

/** Configuración → pestaña IoT, con la sección Configuración Remota cargada. */
async function abrirConfiguracionRemota(page: Page) {
  await irAOpcionMenu(page, /^(Configuración|Settings)$/);
  await page.waitForURL(/configuracion/);
  await page.getByRole('button', { name: 'IoT', exact: true }).click();

  await expect(page.getByRole('main').getByRole('heading', { name: 'Configuración Remota IoT' })).toBeVisible();
  await expect(estadoVacio(page).or(seccionRemota(page).getByText(/selecciona el dispositivo a configurar/i))).toBeVisible();
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

test.describe('TC-DIS-64 - Consistencia visual - Configuración Remota IoT (RF-23)', () => {
  // En serie y con un solo login: si falla se detiene, en vez de sumar intentos fallidos a la cuenta admin (bloqueo a los 5)
  test.describe.configure({ mode: 'serial', timeout: 600_000 });

  let page: Page;
  let hayDispositivos = false;

  test.beforeAll(async ({ browser }, testInfo) => {
    expect(ADMIN_EMAIL, 'Falta TEST_ADMIN_EMAIL en testing/.env.test').not.toBe('');
    expect(ADMIN_PASSWORD, 'Falta TEST_ADMIN_PASSWORD en testing/.env.test').not.toBe('');

    const { viewport, deviceScaleFactor, userAgent, isMobile, hasTouch } = testInfo.project.use;
    const contexto = await browser.newContext({ viewport, deviceScaleFactor, userAgent, isMobile, hasTouch });
    await usarCacheAssets(contexto);
    page = await contexto.newPage();
    page.setDefaultNavigationTimeout(300_000);

    await iniciarSesion(page);
    await page.waitForLoadState('networkidle');
    await abrirConfiguracionRemota(page);
    hayDispositivos = !(await estadoVacio(page).isVisible());
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  test('1. Estado vacío por #166 (parcial)', async () => {
    test.skip(hayDispositivos, 'Ya hay dispositivos activos: #166 parece resuelto; rehacer la baseline de este caso.');
    await expect(page).toHaveScreenshot('remota-estado-vacio-bloqueo-166.png', {
      ...OPCIONES_CAPTURA,
      mask: zonasDinamicas(page),
    });
  });

  test('2. Selector de dispositivo', async () => {
    test.skip(!hayDispositivos, BLOQUEO_166);
    await expect(page).toHaveScreenshot('remota-selector-dispositivo.png', {
      ...OPCIONES_CAPTURA,
      mask: zonasDinamicas(page),
    });
  });

  test('3. Formulario de frecuencia / intervalo', async () => {
    test.skip(!hayDispositivos, BLOQUEO_166);
    await seccionRemota(page).getByRole('button').filter({ hasText: /activo/i }).first().click();
    await expect(seccionRemota(page).getByRole('button', { name: /enviar configuración/i })).toBeVisible();
    await expect(page).toHaveScreenshot('remota-formulario.png', {
      ...OPCIONES_CAPTURA,
      mask: zonasDinamicas(page),
    });
  });

  test('4. Error intervalo < frecuencia (por blur, sin enviar)', async () => {
    test.skip(!hayDispositivos, BLOQUEO_166);
    const seccion = seccionRemota(page);
    await seccion.getByLabel(/frecuencia de captura/i).fill('20');
    const intervalo = seccion.getByLabel(/intervalo de transmisión/i);
    await intervalo.fill('5');
    await intervalo.blur();
    await expect(seccion.getByRole('alert')).toContainText(/mayor o igual a la frecuencia/i);
    await expect(page).toHaveScreenshot('remota-error-intervalo.png', {
      ...OPCIONES_CAPTURA,
      mask: zonasDinamicas(page),
    });
  });
});
