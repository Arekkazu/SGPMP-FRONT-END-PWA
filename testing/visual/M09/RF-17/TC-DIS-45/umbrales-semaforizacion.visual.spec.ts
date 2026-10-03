/**
 * TC-DIS-45 — Consistencia visual del formulario de Umbrales y la vista de Semaforización
 * RF-17 · CU-03 Configurar Umbrales y Alertas Ambientales · Rol: Administrador
 *
 * Baselines:
 *   - Formulario: "Editar umbral" (con las 3 tarjetas de nivel pobladas) y
 *     "Nuevo umbral ambiental" (estado inicial, primera variable del catálogo).
 *   - Semaforización: tabla de umbrales de la especie + recorte de la fila del
 *     umbral evaluado, con los 3 niveles (normal / precaución / crítico)
 *     representados en la barra y en los badges de rango.
 *
 * Datos: especie "Tilapia Roja" (#1), umbral "Temperatura del agua" con niveles
 * crítico 0–20 / precaución 20–25 / normal 25–32. Se cambia con
 * TC_DIS_45_ESPECIE y TC_DIS_45_VARIABLE.
 *
 * Viewports: corre en movil / tablet / escritorio por defecto — se confirmó
 * que esta pantalla navega directo por URL (no por el toggle del sidebar) y
 * no reproduce el bug de M01. Para acotarlo puntualmente:
 *   TC_DIS_45_VIEWPORTS=escritorio
 */
import { expect, test, type Locator, type Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

const ESPECIE = process.env.TC_DIS_45_ESPECIE ?? 'Tilapia Roja';
const VARIABLE = process.env.TC_DIS_45_VARIABLE ?? 'Temperatura del agua';

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_45_VIEWPORTS ?? 'movil,tablet,escritorio')
  .split(',')
  .map((v) => v.trim());

const OPCIONES_CAPTURA = { fullPage: true, animations: 'disabled' as const, caret: 'hide' as const };

async function iniciarSesionAdmin(page: Page) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill(ADMIN_EMAIL);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 });
}

/** /configuracion → Por Especie → especie → Umbrales Ambientales, con la tabla cargada. */
async function abrirUmbrales(page: Page) {
  await page.goto('/configuracion');
  await page.getByRole('button', { name: 'Por Especie', exact: true }).click();
  // Tarjeta cuyo nombre es exactamente ESPECIE (no "Tilapia" si se busca "Tilapia Roja" o viceversa)
  await page.getByRole('button').filter({ has: page.getByText(ESPECIE, { exact: true }) }).first().click();
  await expect(page.getByRole('heading', { level: 2, name: ESPECIE, exact: true })).toBeVisible();

  const umbrales = page.waitForResponse(
    (res) => res.request().method() === 'GET' && /\/configuracion\/umbrales$/.test(new URL(res.url()).pathname),
    { timeout: 20_000 },
  );
  await page.getByRole('button', { name: 'Umbrales Ambientales', exact: true }).click();
  await umbrales;
  await expect(page.getByRole('heading', { name: 'Umbrales Ambientales' })).toBeVisible();
  await expect(filaUmbral(page), `Precondición: "${ESPECIE}" debe tener un umbral de "${VARIABLE}"`).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

function filaUmbral(page: Page) {
  return page.locator('table tbody tr').filter({ hasText: VARIABLE }).first();
}

/** Columna "Actualizado" (fecha dd/mm/aa): cambia con cada guardado y no es parte del diseño. */
function fechas(page: Page): Locator {
  return page.locator('table tbody td').filter({ hasText: /^\d{2}\/\d{2}\/\d{2}$/ });
}

test.describe('TC-DIS-45 - Consistencia visual - Umbrales y Semaforización (RF-17)', () => {
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
    await abrirUmbrales(page);
  });

  test('1. Formulario de umbral - editar (3 niveles poblados)', async ({ page }) => {
    await filaUmbral(page).getByRole('button', { name: `Editar umbral ${VARIABLE}` }).click();
    const dialogo = page.getByRole('dialog', { name: `Editar umbral — ${VARIABLE}` });
    await expect(dialogo).toBeVisible();
    for (const nivel of ['NORMAL', 'PRECAUCIÓN', 'CRÍTICO']) {
      await expect(dialogo.getByText(new RegExp(`${nivel}$`))).toBeVisible();
    }

    await expect(page).toHaveScreenshot('umbral-form-editar.png', { ...OPCIONES_CAPTURA, mask: [fechas(page)] });
  });

  test('1. Formulario de umbral - nuevo (estado inicial)', async ({ page }) => {
    await page.getByRole('button', { name: 'Nuevo umbral' }).click();
    const dialogo = page.getByRole('dialog', { name: 'Nuevo umbral ambiental' });
    await expect(dialogo).toBeVisible();
    await expect(dialogo.getByText(/NORMAL$/)).toBeVisible();

    await expect(page).toHaveScreenshot('umbral-form-nuevo.png', { ...OPCIONES_CAPTURA, mask: [fechas(page)] });
  });

  test('2. Vista de Semaforización - 3 niveles representados', async ({ page }) => {
    const fila = filaUmbral(page);
    const celdas = fila.locator('td');
    // Columnas 5-7: badges de rango de normal / precaución / crítico
    for (const i of [4, 5, 6]) {
      await expect(celdas.nth(i), 'Precondición: el umbral debe tener los 3 niveles configurados').toHaveText(/\d+(\.\d+)?\s*–\s*\d+(\.\d+)?/);
    }

    await expect(page).toHaveScreenshot('semaforizacion-tabla.png', { ...OPCIONES_CAPTURA, mask: [fechas(page)] });

    // Recorte de la fila: barra de semaforización + badges de los 3 niveles, para detectar
    // si un cambio de estilos rompe la distinción visual entre niveles
    await expect(fila).toHaveScreenshot('semaforizacion-fila-3-niveles.png', {
      animations: 'disabled',
      mask: [fila.locator('td').filter({ hasText: /^\d{2}\/\d{2}\/\d{2}$/ })],
    });
  });
});
