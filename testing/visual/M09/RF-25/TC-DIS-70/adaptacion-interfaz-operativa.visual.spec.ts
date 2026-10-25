/**
 * TC-DIS-70 — Consistencia visual de la interfaz operativa adaptada al rol
 * RF-25 · Adaptación de la interfaz operativa · Rol: Administrador · Pareja de accesibilidad: TC-DIS-69
 *
 * ALCANCE PARCIAL: solo rol Administrador; el caso pide los 3 roles — pendiente
 * con cuentas de Productor e Ingeniero de campo.
 *
 * Se captura el Panel principal real de admin.dev CON finca ("Bienvenido ·
 * Finca Administrativa"). Hasta el 29/09 la cuenta estaba sin finca (TC-DIS-69
 * evaluó la bienvenida "sin finca"), pero ese día quedó vinculada a la finca 78;
 * por decisión del caso NO se simula "sin finca": se evalúa la interfaz
 * operativa por rol, no ese estado.
 *
 * Corre en movil / tablet / escritorio con UN login por viewport: describe en
 * serie, página creada en beforeAll y reutilizada por todos los tests. La sesión
 * (JWT) vive en memoria: tras el login NO se usa page.goto(); se navega por el
 * sidebar con irAOpcionMenu (_shared/navegacion.ts).
 *
 * Captura de página completa: la app hace scroll dentro de <main>, no en el
 * documento, así que fullPage solo veía el viewport. captura-completa.css
 * (stylePath) suelta ese scroll SOLO durante la captura.
 *
 * Lecturas fijadas (cuerpos reales de TEST): layout, catálogo y datos de los
 * widgets del panel (panel.fixture.json: contadores y listas que cambian entre
 * corridas con la actividad de otras pruebas), tema (Claro) y notificaciones.
 * El contexto de interfaz (/configuracion/interfaz/contexto: rol, finca activa)
 * va real: es lo que adapta la interfaz y lo que se evalúa.
 *
 * Precondiciones:
 *   - admin.dev con rol Administrador y finca activa (se valida con "Bienvenido").
 *   - Baseline aprobada. La primera vez se genera con --update-snapshots.
 *
 * Solo se navega y se observa.
 */
import fs from 'fs';
import path from 'path';
import { expect as expectBase, test, type BrowserContext, type Page } from '@playwright/test';
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
 * Tema fijado (tema.fixture.json, cuerpos reales de TEST con theme_mode 1 = Claro):
 * el tema guardado de la cuenta compartida lo cambian otras personas (el 29/09
 * estaba en Oscuro personal y global) y no es lo que evalúa este caso. Guardar
 * tema (PATCH) se aborta.
 */
const TEMA: Record<string, unknown> = JSON.parse(fs.readFileSync(path.join(__dirname, 'tema.fixture.json'), 'utf-8'));

async function fijarTema(page: Page) {
  await page.route(/\/configuracion\/personalizacion\/tema(\/global)?(\?.*)?$/, (route) => {
    const req = route.request();
    if (req.method() !== 'GET') return route.abort('blockedbyclient');
    const pathname = new URL(req.url()).pathname;
    const clave = Object.keys(TEMA).find((k) => pathname.endsWith(k))!;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(TEMA[clave]) });
  });
}

/**
 * Datos del Panel principal fijados (panel.fixture.json, cuerpos reales de TEST del
 * 29/09): contadores (24 dispositivos, 10 configuraciones pendientes, 50 fincas…) y
 * listas que cambian con la actividad de otras pruebas. Escrituras abortadas.
 */
const PANEL: Record<string, unknown> = JSON.parse(fs.readFileSync(path.join(__dirname, 'panel.fixture.json'), 'utf-8'));

async function fijarPanel(page: Page) {
  await page.route(/\/configuracion\/personalizacion\/dashboard(\/widgets|\/datos)?(\?.*)?$/, (route) => {
    const req = route.request();
    if (req.method() !== 'GET') return route.abort('blockedbyclient');
    const pathname = new URL(req.url()).pathname;
    const clave = Object.keys(PANEL).find((k) => pathname.endsWith(k))!;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(PANEL[clave]) });
  });
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

/** Panel principal por el sidebar, con la bienvenida de la finca activa y los widgets pintados. */
async function abrirPanelPrincipal(page: Page) {
  await irAOpcionMenuConReintento(page, /^(Panel principal|Dashboard)$/);
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { name: 'Bienvenido', exact: true }), 'Precondición: admin.dev con finca activa').toBeVisible();
  await expect(main.getByRole('article').first()).toBeVisible();
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
    await fijarTema(page);
    await fijarPanel(page);
    await fijarNotificaciones(page);

    await iniciarSesion(page);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.ds-appbar__notif-badge')).toBeVisible();
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  test('1. Panel principal del Administrador con finca activa', async () => {
    await abrirPanelPrincipal(page);
    await expect(page).toHaveScreenshot('panel-principal-administrador.png', {
      ...OPCIONES_CAPTURA,
      mask: zonasDinamicas(page),
    });
  });
});
