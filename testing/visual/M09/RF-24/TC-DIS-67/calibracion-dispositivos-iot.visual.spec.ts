/**
 * TC-DIS-67 — Consistencia visual del wizard de Calibración de Sensores IoT
 * RF-24 · Calibración de dispositivos IoT · Rol: Administrador · Pareja de accesibilidad: TC-DIS-66
 *
 * BASELINE PENDIENTE (29/09/2026): no se generó por degradación de TEST
 * (/login sin evento load en >30 s entre 18:37 y 19:19, y en >90 s a las 19:27;
 * el bundle principal bajaba a ~22 KB/s). Generar con --update-snapshots
 * --workers=1 cuando /login cargue en menos de 30 s.
 *
 * ⚠ PARCIAL — BLOQUEADO POR #166 (backend): no hay fincas listables, así que no
 * hay dispositivos activos y el paso 1 del wizard solo muestra su estado vacío
 * ("No hay dispositivos activos disponibles para calibrar."). Hoy se versiona
 * SOLO esa captura. Los pasos con dispositivo (selección de sensor y formulario
 * de calibración) están escritos pero se saltan solos mientras la lista esté
 * vacía; al cerrar #166 hay que generar su baseline y re-aprobar la del estado
 * vacío (dejará de aplicar).
 *
 * Ruta: Configuración → pestaña IoT → sección "Calibración de Sensores IoT".
 * Corre en movil / tablet / escritorio con UN login por viewport: describe en
 * serie, página creada en beforeAll y reutilizada por todos los tests. La sesión
 * (JWT) vive en memoria: tras el login NO se usa page.goto(); se navega por el
 * sidebar con irAOpcionMenu.
 *
 * Captura de página completa: la app hace scroll dentro de <main>, no en el
 * documento, así que fullPage solo veía el viewport. captura-completa.css
 * (stylePath) suelta ese scroll SOLO durante la captura.
 *
 * Precondiciones:
 *   - Baseline aprobada. La primera vez se genera con --update-snapshots.
 *
 * Solo se abre y se observa: nunca se registra una calibración.
 */
import path from 'path';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { iniciarSesionAdmin, irAOpcionMenu } from '../../../../accesibilidad/axe/_shared/navegacion';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

const BLOQUEO_166 = 'BLOQUEADO por #166: sin fincas listables no hay dispositivos activos para calibrar.';

/** Sección "Calibración de Sensores IoT" dentro de la pestaña IoT. */
function seccionCalibracion(page: Page): Locator {
  return page
    .getByRole('main')
    .locator('div')
    .filter({ has: page.getByRole('heading', { name: 'Calibración de Sensores IoT' }) })
    .last();
}

function estadoVacio(page: Page): Locator {
  return seccionCalibracion(page).getByText('No hay dispositivos activos disponibles para calibrar.', { exact: true });
}

/** Configuración → pestaña IoT, con la sección Calibración cargada. */
async function abrirCalibracion(page: Page) {
  await irAOpcionMenu(page, /^(Configuración|Settings)$/);
  await page.waitForURL(/configuracion/);
  await page.getByRole('button', { name: 'IoT', exact: true }).click();

  await expect(page.getByRole('main').getByRole('heading', { name: 'Calibración de Sensores IoT' })).toBeVisible();
  await expect(
    estadoVacio(page).or(seccionCalibracion(page).getByText('Selecciona el dispositivo que contiene el sensor a calibrar:')),
  ).toBeVisible();
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

test.describe('TC-DIS-67 - Consistencia visual - Calibración de dispositivos IoT (RF-24)', () => {
  // En serie y con un solo login: si falla se detiene, en vez de sumar intentos fallidos a la cuenta admin (bloqueo a los 5)
  test.describe.configure({ mode: 'serial', timeout: 180_000 });

  let page: Page;
  let hayDispositivos = false;

  test.beforeAll(async ({ browser }, testInfo) => {
    expect(ADMIN_EMAIL, 'Falta TEST_ADMIN_EMAIL en testing/.env.test').not.toBe('');
    expect(ADMIN_PASSWORD, 'Falta TEST_ADMIN_PASSWORD en testing/.env.test').not.toBe('');

    const { viewport, deviceScaleFactor, userAgent, isMobile, hasTouch } = testInfo.project.use;
    const contexto = await browser.newContext({ viewport, deviceScaleFactor, userAgent, isMobile, hasTouch });
    page = await contexto.newPage();
    page.setDefaultNavigationTimeout(90_000);

    await iniciarSesionAdmin(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.waitForURL(/dashboard/, { timeout: 90_000 });
    await page.waitForLoadState('networkidle');
    await abrirCalibracion(page);
    hayDispositivos = !(await estadoVacio(page).isVisible());
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  test('1. Paso 1 con estado vacío por #166 (parcial)', async () => {
    test.skip(hayDispositivos, 'Ya hay dispositivos activos: #166 parece resuelto; rehacer la baseline de este caso.');
    await expect(page).toHaveScreenshot('calibracion-estado-vacio-bloqueo-166.png', {
      ...OPCIONES_CAPTURA,
      mask: zonasDinamicas(page),
    });
  });

  test('2. Paso 1: selección de dispositivo', async () => {
    test.skip(!hayDispositivos, BLOQUEO_166);
    await expect(page).toHaveScreenshot('calibracion-paso1-dispositivo.png', {
      ...OPCIONES_CAPTURA,
      mask: zonasDinamicas(page),
    });
  });

  test('3. Paso 3: formulario de calibración', async () => {
    test.skip(!hayDispositivos, BLOQUEO_166);
    const seccion = seccionCalibracion(page);
    // TODO al cerrar #166: acotar a un selector de dispositivo/sensor concreto (p. ej. /^SN-/), como pide TC-DIS-66
    await seccion.getByRole('button').filter({ hasText: /./ }).first().click();
    await seccion.getByRole('button').filter({ hasText: /./ }).first().click();
    await expect(seccion.getByRole('heading', { name: 'Datos de calibración' })).toBeVisible();
    await expect(page).toHaveScreenshot('calibracion-paso3-formulario.png', {
      ...OPCIONES_CAPTURA,
      // Fecha de calibración precargada con la hora local y el historial Fecha/Hora
      mask: [...zonasDinamicas(page), seccion.locator('input[type="datetime-local"]'), seccion.locator('table tbody td:first-child')],
    });
  });
});
