/**
 * TC-DIS-76 — Consistencia visual de la pestaña Personalización en tema Claro y Oscuro
 * RF-27 · Tema Claro/Oscuro · Rol: Administrador · Pareja de accesibilidad: TC-DIS-75
 *
 *
 * Corre en movil / tablet / escritorio con UN login por viewport: describe en
 * serie, página creada en beforeAll y reutilizada por todos los tests. La sesión
 * (JWT) vive en memoria: tras el login NO se usa page.goto(); se navega por el
 * sidebar con irAOpcionMenu (_shared/navegacion.ts) (espera .ds-sidebar--open en móvil/tablet para no
 * capturar a mitad de la animación del drawer).
 *
 * Captura de página completa: la app hace scroll dentro de <main>, no en el
 * documento, así que fullPage solo veía el viewport. captura-completa.css
 * (stylePath) suelta ese scroll SOLO durante la captura.
 *
 * Lecturas fijadas (personalizacion.fixture.json): admin.dev es una cuenta
 * compartida y su tema personal/global cambió entre corridas del 29/09 (pruebas
 * manuales de otras personas), lo que hacía la baseline no determinista. Los GET
 * de tema, idioma y dashboard se sirven con page.route a partir de respuestas
 * reales de TEST, con la preferencia personal y la global fijadas en Claro.
 * Precedente: plantillas.fixture.json de TC-DIS-62. Las escrituras de
 * personalización (PATCH) se interceptan y nunca llegan al backend.
 *
 * El tema se cambia con el botón del AppBar, como en TC-DIS-75: forzar
 * data-theme por evaluate() no sirve porque Personalización re-aplica la
 * preferencia guardada.
 *
 * Precondiciones:
 *   - Baseline aprobada. La primera vez se genera con --update-snapshots.
 *
 * Solo se abre y se observa: ningún "Guardar tema" ni acción irreversible.
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

type Tema = 'light' | 'dark';

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

/** Configuración → pestaña Personalización, esperando a que la sección Tema Visual termine de cargar. */
async function abrirPersonalizacion(page: Page) {
  await irAOpcionMenu(page, /^(Configuración|Settings)$/);
  await page.waitForURL(/configuracion/);
  await page.getByRole('button', { name: /^(Personalización|Personalization)$/ }).click();

  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { name: 'Tema Visual' })).toBeVisible();
  await expect(main.getByRole('button', { name: 'Guardar tema', exact: true }).first()).toBeVisible();
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
}

/**
 * Cambia el tema con el botón del AppBar y verifica que no lo revierta una
 * re-aplicación posterior de la preferencia guardada.
 */
async function ponerTema(page: Page, objetivo: Tema) {
  const html = page.locator('html');
  const actual: Tema = (await html.getAttribute('data-theme')) === 'dark' ? 'dark' : 'light';
  if (actual !== objetivo) {
    const nombre = objetivo === 'dark' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro';
    await page.getByRole('banner').getByRole('button', { name: nombre, exact: true }).click();
  }
  await expect(html).toHaveAttribute('data-theme', objetivo);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  await expect(html).toHaveAttribute('data-theme', objetivo);
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

test.describe('TC-DIS-76 - Consistencia visual - Tema Claro/Oscuro (RF-27)', () => {
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
    await abrirPersonalizacion(page);
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  test('1. Personalización en tema Claro', async () => {
    await ponerTema(page, 'light');
    await expect(page).toHaveScreenshot('personalizacion-tema-claro.png', {
      ...OPCIONES_CAPTURA,
      mask: zonasDinamicas(page),
    });
  });

  test('2. Personalización en tema Oscuro', async () => {
    await ponerTema(page, 'dark');
    // Comportamiento real verificado manualmente el 29/09: el toggle del AppBar no actualiza la tarjeta
    // marcada en 'Mi preferencia' (queda 'Claro' con la UI en oscuro). Registrado como hallazgo de usabilidad.
    await expect(page).toHaveScreenshot('personalizacion-tema-oscuro.png', {
      ...OPCIONES_CAPTURA,
      mask: zonasDinamicas(page),
    });
  });
});
