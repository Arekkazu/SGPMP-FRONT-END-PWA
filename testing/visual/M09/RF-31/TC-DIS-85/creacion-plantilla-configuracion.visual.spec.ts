/**
 * TC-DIS-85 — Consistencia visual del modal "Nueva Plantilla de Configuración"
 * RF-31 · Creación de Plantilla de Configuración · Rol: Administrador · Pareja de accesibilidad: TC-DIS-84
 *
 * Falta también plantillas.fixture.json: se arma con los cuerpos reales de los GET de TEST
 * (hoy no se pueden capturar); sin él el spec no carga.
 *
 * Ruta: Configuración → pestaña Plantillas → botón "Nueva plantilla".
 * Corre en movil / tablet / escritorio con UN login por viewport: describe en
 * serie, página creada en beforeAll y reutilizada por todos los tests. La sesión
 * (JWT) vive en memoria: tras el login NO se usa page.goto(); se navega por el
 * sidebar con irAOpcionMenu (_shared/navegacion.ts) y se vuelve al estado base por clics.
 *
 * Captura de página completa: la app hace scroll dentro de <main>, no en el
 * documento, así que fullPage solo veía el viewport. captura-completa.css
 * (stylePath) suelta ese scroll SOLO durante la captura.
 *
 * Lecturas fijadas (plantillas.fixture.json): el listado de plantillas (fondo
 * del modal), el catálogo de especies (select "Especie base") y la
 * configuración de la especie elegida (ciclos, patologías, métricas, umbrales:
 * conteos por categoría) y el tema guardado (personal y global) los cambia
 * cualquiera que use la cuenta compartida. Se sirven con page.route a partir de
 * respuestas reales de TEST, con el tema fijado en Claro (precedente:
 * plantillas.fixture.json de TC-DIS-62): las 3 plantillas semilla y
 * QA-Inmutable v3, igual que TC-DIS-62, y la especie base Tilapia (1 patología y
 * 3 umbrales; ciclos y métricas vacíos). Cualquier escritura a esos endpoints se
 * aborta: nunca llega al backend.
 *
 * Precondiciones:
 *   - Baseline aprobada. La primera vez se genera con --update-snapshots.
 *
 * Solo se abre y se observa: nunca se pulsa "Crear plantilla"; el modal se
 * cierra con "Cancelar". El error de "Nombre" se provoca por blur (validación
 * del cliente), no enviando el formulario.
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

/**
 * pathname del endpoint → cuerpo real de TEST. `_especieBase` no es un endpoint:
 * es la especie que se elige en el select (debe existir en /configuracion/especies).
 */
const FIXTURE: Record<string, unknown> & { _especieBase: string } = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'plantillas.fixture.json'), 'utf-8'),
);
const ENDPOINTS_FIJOS = Object.keys(FIXTURE).filter((k) => k.startsWith('/'));

/** Sirve los GET del fixture y aborta cualquier escritura a esos endpoints. */
async function fijarLecturas(page: Page) {
  await page.route(
    (url) => ENDPOINTS_FIJOS.some((k) => url.pathname.endsWith(k)),
    async (route) => {
      const req = route.request();
      if (!['xhr', 'fetch'].includes(req.resourceType())) return route.continue();
      if (req.method() !== 'GET') return route.abort('blockedbyclient');
      const pathname = new URL(req.url()).pathname;
      const clave = ENDPOINTS_FIJOS.find((k) => pathname.endsWith(k))!;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FIXTURE[clave]) });
    },
  );
}

/** Configuración → pestaña Plantillas, con el listado cargado. */
async function abrirPlantillas(page: Page) {
  await irAOpcionMenuConReintento(page, /^(Configuración|Settings)$/);
  await page.waitForURL(/configuracion/);
  await page.getByRole('button', { name: /^(Plantillas|Templates)$/ }).click();

  await expect(page.getByRole('main').getByRole('heading', { name: 'Plantillas de Configuración' })).toBeVisible();
  await expect(page.getByRole('main').getByRole('button', { name: 'Nueva plantilla' })).toBeVisible();
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
}

function modalNuevaPlantilla(page: Page) {
  return page.getByRole('dialog', { name: 'Nueva Plantilla de Configuración' });
}

/**
 * Zonas que cambian entre corridas y no son parte del diseño. Las fechas de las
 * tarjetas del fondo NO se enmascaran: vienen fijas del fixture y, como las
 * máscaras se pintan encima de todo, tapaban el modal (Especie base, Cancelar).
 */
function zonasDinamicas(page: Page) {
  return [page.locator('.ds-appbar__notif-badge')];
}

const OPCIONES_CAPTURA = {
  fullPage: true,
  animations: 'disabled' as const,
  caret: 'hide' as const,
  stylePath: path.join(__dirname, 'captura-completa.css'),
};

test.describe('TC-DIS-85 - Consistencia visual - Creación de Plantilla (RF-31)', () => {
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

    await fijarLecturas(page);
    await iniciarSesion(page);
    await page.waitForLoadState('networkidle');
    await abrirPlantillas(page);
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  test('1. Modal Nueva plantilla vacío', async () => {
    await page.getByRole('main').getByRole('button', { name: 'Nueva plantilla' }).click();
    const modal = modalNuevaPlantilla(page);
    await expect(modal).toBeVisible();
    await expect(modal.getByLabel('Nombre de la plantilla')).toHaveValue('');

    await expect(page).toHaveScreenshot('plantilla-modal-vacio.png', {
      ...OPCIONES_CAPTURA,
      mask: zonasDinamicas(page),
    });
  });

  test('2. Error de campo "Nombre" tras blur', async () => {
    const modal = modalNuevaPlantilla(page);
    const nombre = modal.getByLabel('Nombre de la plantilla');
    await nombre.focus();
    await nombre.blur();
    await expect(modal.getByRole('alert').filter({ hasText: /nombre/i })).toBeVisible();

    await expect(page).toHaveScreenshot('plantilla-modal-error-nombre.png', {
      ...OPCIONES_CAPTURA,
      mask: zonasDinamicas(page),
    });
  });

  test('3. Especie base elegida: parámetros a incluir por categoría', async () => {
    const modal = modalNuevaPlantilla(page);
    await modal.getByLabel('Especie base').selectOption({ label: FIXTURE._especieBase });
    await expect(modal.getByRole('checkbox', { name: 'Etapas del ciclo biológico' })).toBeVisible();
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('plantilla-modal-especie-elegida.png', {
      ...OPCIONES_CAPTURA,
      mask: zonasDinamicas(page),
    });

    // Vuelta al estado base por clic, nunca "Crear plantilla"
    await modal.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(modal).toBeHidden();
  });
});
