/**
 * TC-DIS-70 — Consistencia visual de la interfaz operativa adaptada (usuario sin finca)
 * RF-25 · Adaptación de la interfaz operativa · Rol: Administrador · Pareja de accesibilidad: TC-DIS-69
 *
 * BASELINE PENDIENTE (29/09/2026): no se generó por degradación de TEST
 * (/login sin evento load en >30 s entre 18:37 y 19:19, y en >90 s a las 19:27;
 * el bundle principal bajaba a ~22 KB/s). Generar con --update-snapshots
 * --workers=1 cuando /login cargue en menos de 30 s.
 *
 * admin.dev no tiene finca vinculada: en las rutas operativas App.tsx reemplaza
 * los paneles por <BienvenidaSinFinca /> ("Bienvenido al sistema" + enlace
 * "Ir a mi perfil"). Se captura en dos rutas operativas del sidebar.
 *
 * Corre en movil / tablet / escritorio con UN login por viewport: describe en
 * serie, página creada en beforeAll y reutilizada por todos los tests. La sesión
 * (JWT) vive en memoria: tras el login NO se usa page.goto(); se navega por el
 * sidebar con irAOpcionMenu.
 *
 * Captura de página completa: la app hace scroll dentro de <main>, no en el
 * documento, así que fullPage solo veía el viewport. captura-completa.css
 * (stylePath) suelta ese scroll SOLO durante la captura.
 *
 * Sin lecturas fijadas: el contexto "sin finca" (/configuracion/interfaz/contexto)
 * ES lo que se evalúa. Si admin.dev llega a tener finca (p. ej. al cerrar #166),
 * esta baseline deja de aplicar y hay que rehacerla, no enmascararla.
 *
 * Precondiciones:
 *   - admin.dev sin finca vinculada (se valida con el texto de bienvenida).
 *   - Baseline aprobada. La primera vez se genera con --update-snapshots.
 *
 * Solo se navega y se observa.
 */
import path from 'path';
import { expect, test, type Page } from '@playwright/test';
import { iniciarSesionAdmin, irAOpcionMenu } from '../../../../accesibilidad/axe/_shared/navegacion';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

/** Va a una opción operativa del sidebar y espera la bienvenida de "sin finca". */
async function abrirRutaOperativa(page: Page, opcion: RegExp) {
  await irAOpcionMenu(page, opcion);
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { name: 'Bienvenido al sistema' }), 'Precondición: admin.dev sin finca vinculada').toBeVisible();
  await expect(main.getByRole('link', { name: 'Ir a mi perfil' })).toBeVisible();
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

test.describe('TC-DIS-70 - Consistencia visual - Adaptación de la interfaz operativa (RF-25)', () => {
  // En serie y con un solo login: si falla se detiene, en vez de sumar intentos fallidos a la cuenta admin (bloqueo a los 5)
  test.describe.configure({ mode: 'serial', timeout: 180_000 });

  let page: Page;

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
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  test('1. Panel principal sin finca', async () => {
    await abrirRutaOperativa(page, /^(Panel principal|Dashboard)$/);
    await expect(page).toHaveScreenshot('panel-principal-sin-finca.png', {
      ...OPCIONES_CAPTURA,
      mask: zonasDinamicas(page),
    });
  });

  test('2. Telemetría IoT sin finca', async () => {
    await abrirRutaOperativa(page, /^(Telemetría IoT|IoT Telemetry)$/);
    await expect(page).toHaveScreenshot('telemetria-sin-finca.png', {
      ...OPCIONES_CAPTURA,
      mask: zonasDinamicas(page),
    });
  });
});
