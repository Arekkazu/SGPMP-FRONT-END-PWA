/**
 * TC-DIS-62 — Consistencia visual del listado de Plantillas de Configuración
 * RF-30 · CU-07 Gestionar Plantillas de Configuración · Rol: Administrador
 * Configuración → pestaña "Plantillas"
 *
 * Baselines: listado con datos y listado vacío (simulado).
 *
 * El listado real tiene ~140 plantillas, casi todas creadas por otras pruebas QA,
 * así que la baseline "con datos" usa un fixture fijo de registros reales servido
 * con page.route (./plantillas.fixture.json): las 3 plantillas semilla y una
 * plantilla en su versión 3, para cubrir la etiqueta de versión. El test "0"
 * verifica que el listado real cargue.
 *
 * Nota del caso ("con y sin resultados de búsqueda/filtro por especie"): la
 * pantalla no tiene búsqueda ni filtro por especie; se cubren el listado con
 * datos y el vacío.
 *
 * Viewports: el script contempla movil / tablet / escritorio, pero solo se
 * ejecuta ESCRITORIO por el defecto abierto de sidebar/scroll (TC-DIS-07/08/10/11).
 * Para habilitarlos: TC_DIS_62_VIEWPORTS=movil,tablet,escritorio
 */
import fs from 'fs';
import path from 'path';
import { expect, test, type Locator, type Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_62_VIEWPORTS ?? 'escritorio')
  .split(',')
  .map((v) => v.trim());

// page.route compara la URL completa: se filtra por pathname
const URL_PLANTILLAS = (url: URL) => /\/configuracion\/plantillas$/.test(url.pathname);

// Registros reales de GET /configuracion/plantillas/{id} (ambiente TEST, 2026-09-28)
const PLANTILLAS_FIXTURE: { template_name: string }[] = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'plantillas.fixture.json'), 'utf-8'),
);

async function iniciarSesionAdmin(page: Page) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill(ADMIN_EMAIL);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 });
}

async function servirPlantillas(page: Page, plantillas: unknown[]) {
  await page.route(URL_PLANTILLAS, (r) =>
    r.request().method() === 'GET'
      ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(plantillas) })
      : r.fallback());
}

/** /configuracion → Plantillas. Devuelve el estado HTTP del listado. */
async function abrirPlantillas(page: Page): Promise<number> {
  await page.goto('/configuracion');
  const listado = page.waitForResponse((r) => r.request().method() === 'GET' && URL_PLANTILLAS(new URL(r.url())), { timeout: 20_000 });
  await page.getByRole('button', { name: 'Plantillas', exact: true }).click();
  const estado = (await listado).status();
  await expect(page.getByRole('heading', { name: 'Plantillas de Configuración' })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  return estado;
}

/** Bloque de la pestaña Plantillas (encabezado, tarjetas e historial), sin el resto de la página. */
function seccionPlantillas(page: Page): Locator {
  return page
    .locator('div')
    .filter({ has: page.getByRole('heading', { name: 'Plantillas de Configuración' }) })
    .filter({ has: page.getByRole('button', { name: 'Historial de aplicaciones' }) })
    .last();
}

test.describe('TC-DIS-62 - Consistencia visual - Plantillas de Configuración (RF-30)', () => {
  // workers: 1 en el config; timeout amplio por la latencia del login en TEST
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      !VIEWPORTS_HABILITADOS.includes(testInfo.project.name),
      `Viewport "${testInfo.project.name}" deshabilitado: defecto abierto de sidebar/scroll en móvil y tablet (TC-DIS-07/08/10/11). Solo se evalúa escritorio.`,
    );
    expect(ADMIN_EMAIL, 'Falta TEST_ADMIN_EMAIL en testing/.env.test').not.toBe('');
    expect(ADMIN_PASSWORD, 'Falta TEST_ADMIN_PASSWORD en testing/.env.test').not.toBe('');
    await iniciarSesionAdmin(page);
  });

  test('0. Precondición - el listado real de plantillas carga con datos', async ({ page }) => {
    expect(await abrirPlantillas(page), 'GET /configuracion/plantillas debe responder 200').toBe(200);
    await expect(page.getByText('Plantilla estándar tilapia', { exact: true }).first()).toBeVisible();
  });

  test('1. Listado con datos', async ({ page }) => {
    await servirPlantillas(page, PLANTILLAS_FIXTURE);
    await abrirPlantillas(page);
    for (const p of PLANTILLAS_FIXTURE) {
      await expect(page.getByText(p.template_name, { exact: true })).toBeVisible();
    }

    await expect(seccionPlantillas(page)).toHaveScreenshot('plantillas-listado.png', { animations: 'disabled' });
  });

  test('2. Listado vacío (simulado)', async ({ page }) => {
    await servirPlantillas(page, []);
    await abrirPlantillas(page);
    await expect(page.getByText('Sin plantillas creadas', { exact: true })).toBeVisible();

    await expect(seccionPlantillas(page)).toHaveScreenshot('plantillas-listado-vacio.png', { animations: 'disabled' });
  });
});
