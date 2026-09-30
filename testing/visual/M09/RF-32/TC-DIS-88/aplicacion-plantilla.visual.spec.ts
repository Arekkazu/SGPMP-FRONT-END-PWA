/**
 * TC-DIS-88 — Consistencia visual del wizard "Aplicar Plantilla"
 * RF-32 · Aplicación de Plantilla · Rol: Administrador · Pareja de accesibilidad: TC-DIS-87
 *
 * BASELINE PENDIENTE (29/09/2026): no se generó por degradación de TEST
 * (/login sin evento load en >30 s entre 18:37 y 19:19, y en >90 s a las 19:27;
 * el bundle principal bajaba a ~22 KB/s). Generar con --update-snapshots
 * --workers=1 cuando /login cargue en menos de 30 s.
 * Falta también plantillas.fixture.json: se arma con los cuerpos reales de los GET de TEST
 * (hoy no se pueden capturar); sin él el spec no carga.
 *
 * Ruta: Configuración → pestaña Plantillas → "Aplicar plantilla" (primera tarjeta).
 * Corre en movil / tablet / escritorio con UN login por viewport: describe en
 * serie, página creada en beforeAll y reutilizada por todos los tests. La sesión
 * (JWT) vive en memoria: tras el login NO se usa page.goto(); se navega por el
 * sidebar con irAOpcionMenu y se vuelve al estado base por clics.
 *
 * Captura de página completa: la app hace scroll dentro de <main>, no en el
 * documento, así que fullPage solo veía el viewport. captura-completa.css
 * (stylePath) suelta ese scroll SOLO durante la captura.
 *
 * Lecturas fijadas (plantillas.fixture.json): el listado de plantillas (qué
 * tarjeta es la primera y su params_snapshot, que se muestra en la
 * previsualización) y el catálogo de especies destino los cambia cualquiera que
 * use la cuenta compartida. Se sirven con page.route a partir de respuestas
 * reales de TEST (precedente: plantillas.fixture.json de TC-DIS-62). Cualquier
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
import { expect, test, type Page } from '@playwright/test';
import { iniciarSesionAdmin, irAOpcionMenu } from '../../../../accesibilidad/axe/_shared/navegacion';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

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
  await irAOpcionMenu(page, /^(Configuración|Settings)$/);
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

/** Zonas que cambian entre corridas y no son parte del diseño: badge, fechas de tarjetas y "ID · Creada …" de la especie. */
function zonasDinamicas(page: Page) {
  return [
    page.locator('.ds-appbar__notif-badge'),
    page.getByRole('main').getByText(/\b\d{1,2}[\s/-](de\s)?[\p{L}\d]{1,10}\.?[\s/-](de\s)?\d{2,4}\b/u),
    wizard(page).getByText(/· Creada /),
  ];
}

const OPCIONES_CAPTURA = {
  fullPage: true,
  animations: 'disabled' as const,
  caret: 'hide' as const,
  stylePath: path.join(__dirname, 'captura-completa.css'),
};

test.describe('TC-DIS-88 - Consistencia visual - Aplicación de Plantilla (RF-32)', () => {
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

    await fijarLecturas(page);
    await iniciarSesionAdmin(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.waitForURL(/dashboard/, { timeout: 90_000 });
    await page.waitForLoadState('networkidle');
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
