/**
 * TC-DIS-88 — Consistencia visual del wizard "Aplicar Plantilla"
 * RF-32 · Aplicación de Plantilla · Rol: Administrador · Pareja de accesibilidad: TC-DIS-87
 *
 * Falta también plantillas.fixture.json: se arma con los cuerpos reales de los GET de TEST
 * (hoy no se pueden capturar); sin él el spec no carga.
 *
 * Ruta: Configuración → pestaña Plantillas → "Aplicar plantilla" (primera tarjeta).
 * Corre en movil / tablet / escritorio con UN login por viewport: describe en
 * serie, página creada en beforeAll y reutilizada por todos los tests. La sesión
 * (JWT) vive en memoria: tras el login NO se usa page.goto(); se navega por el
 * sidebar con irAOpcionMenu (_shared/navegacion.ts) y se vuelve al estado base por clics.
 *
 * Captura de página completa: la app hace scroll dentro de <main>, no en el
 * documento, así que fullPage solo veía el viewport. captura-completa.css
 * (stylePath) suelta ese scroll SOLO durante la captura.
 *
 * Lecturas fijadas (plantillas.fixture.json): el listado de plantillas (qué
 * tarjeta es la primera y su params_snapshot, que se muestra en la
 * previsualización), el catálogo de especies destino y el tema guardado
 * (personal y global) los cambia cualquiera que use la cuenta compartida. Se
 * sirven con page.route a partir de respuestas reales de TEST, con el tema
 * fijado en Claro y las mismas 4 plantillas de TC-DIS-62 (3 semilla +
 * QA-Inmutable v3; la primera es "Plantilla estándar tilapia"). Cualquier
 * escritura a esos endpoints (incluido POST /plantillas/{id}/aplicar) se aborta:
 * nunca llega al backend.
 *
 * Precondiciones:
 *   - La especie destino "Especie Acuatica Prueba" (la misma de TC-DIS-87) está
 *     en el fixture de especies.
 *   - Baseline aprobada. La primera vez se genera con --update-snapshots.
 *
 * Solo se abre y se observa: el botón "Aplicar plantilla" del paso 2 (irreversible)
 * NUNCA se pulsa; se vuelve con "Atrás" y se cierra con "Cancelar".
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

const ESPECIE_DESTINO = 'Especie Acuatica Prueba';

/** pathname del endpoint → cuerpo real de TEST. */
const LECTURAS_FIJAS: Record<string, unknown> = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'plantillas.fixture.json'), 'utf-8'),
);
const ENDPOINTS_FIJOS = Object.keys(LECTURAS_FIJAS);

/** Sirve los GET del fixture y aborta cualquier escritura a esos endpoints. */
async function fijarLecturas(page: Page) {
  // El POST de aplicar es /plantillas/{id}/aplicar: no termina en ninguna clave, se aborta aparte
  await page.route(/\/configuracion\/plantillas\/\d+\/aplicar$/, (route) => route.abort('blockedbyclient'));
  await page.route(
    (url) => ENDPOINTS_FIJOS.some((k) => url.pathname.endsWith(k)),
    async (route) => {
      const req = route.request();
      if (!['xhr', 'fetch'].includes(req.resourceType())) return route.continue();
      if (req.method() !== 'GET') return route.abort('blockedbyclient');
      const pathname = new URL(req.url()).pathname;
      const clave = ENDPOINTS_FIJOS.find((k) => pathname.endsWith(k))!;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(LECTURAS_FIJAS[clave]) });
    },
  );
}

/** Configuración → pestaña Plantillas, con el listado cargado. */
async function abrirPlantillas(page: Page) {
  await irAOpcionMenuConReintento(page, /^(Configuración|Settings)$/);
  await page.waitForURL(/configuracion/);
  await page.getByRole('button', { name: /^(Plantillas|Templates)$/ }).click();

  await expect(page.getByRole('main').getByRole('heading', { name: 'Plantillas de Configuración' })).toBeVisible();
  await expect(page.getByRole('main').getByRole('button', { name: 'Aplicar plantilla' }).first()).toBeVisible();
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
}

function wizard(page: Page) {
  return page.getByRole('dialog', { name: 'Aplicar Plantilla' });
}

/**
 * Zonas que cambian entre corridas y no son parte del diseño: badge y la línea
 * "ID · Creada …" de la especie destino (fecha dentro del propio wizard). Las
 * fechas de las tarjetas del fondo NO se enmascaran: vienen fijas del fixture y,
 * como las máscaras se pintan encima de todo, tapaban el wizard.
 */
function zonasDinamicas(page: Page) {
  return [page.locator('.ds-appbar__notif-badge'), wizard(page).getByText(/· Creada /)];
}

const OPCIONES_CAPTURA = {
  fullPage: true,
  animations: 'disabled' as const,
  caret: 'hide' as const,
  stylePath: path.join(__dirname, 'captura-completa.css'),
};

test.describe('TC-DIS-88 - Consistencia visual - Aplicación de Plantilla (RF-32)', () => {
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
    await fijarNotificaciones(page);

    await fijarLecturas(page);
    await iniciarSesion(page);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.ds-appbar__notif-badge')).toBeVisible();
    await abrirPlantillas(page);
  });

  test.afterAll(async () => {
    await page?.context().close();
  });

  test('1. Paso 1: selección de especie destino (sin elegir)', async () => {
    await page.getByRole('main').getByRole('button', { name: 'Aplicar plantilla' }).first().click();
    await expect(wizard(page)).toBeVisible();
    await expect(wizard(page).getByText('Selecciona la especie destino')).toBeVisible();

    await expect(page).toHaveScreenshot('aplicar-paso1-especie.png', {
      ...OPCIONES_CAPTURA,
      mask: zonasDinamicas(page),
    });
  });

  test('2. Paso 1: especie destino elegida', async () => {
    await wizard(page).getByRole('button', { name: ESPECIE_DESTINO, exact: true }).click();
    await expect(wizard(page).getByRole('button', { name: 'Siguiente' })).toBeEnabled();

    await expect(page).toHaveScreenshot('aplicar-paso1-especie-elegida.png', {
      ...OPCIONES_CAPTURA,
      mask: zonasDinamicas(page),
    });
  });

  test('3. Paso 2: previsualización con advertencia de irreversibilidad', async () => {
    const modal = wizard(page);
    await modal.getByRole('button', { name: 'Siguiente' }).click();
    await expect(modal.getByText('Previsualización')).toBeVisible();
    await expect(modal.getByText('Esta acción es irreversible')).toBeVisible();

    await expect(page).toHaveScreenshot('aplicar-paso2-previsualizacion.png', {
      ...OPCIONES_CAPTURA,
      mask: zonasDinamicas(page),
    });

    // Vuelta al estado base por clics: "Atrás" y "Cancelar", nunca "Aplicar plantilla"
    await modal.getByRole('button', { name: 'Atrás', exact: true }).click();
    await modal.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(modal).toBeHidden();
  });
});
