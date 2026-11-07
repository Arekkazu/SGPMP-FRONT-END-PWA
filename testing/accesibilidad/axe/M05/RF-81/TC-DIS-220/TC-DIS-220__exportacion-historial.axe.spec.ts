// | Fecha      | Nombre      | Que se hizo |
// |------------|-------------|-------------|
// | 2026-11-06 | Laura032005 | M05 RF-81 TC-DIS-220: accesibilidad de la exportación del historial y sus estados asíncronos |
/**
 * TC-DIS-220 — Accesibilidad de la exportación del Historial de Suministros (PDF/Excel) y de
 * sus estados asíncronos
 * RF-81 · CU-03 Reportar Gastos e Historial de Suministros · Rol: Gestor de Granja, Contador o
 * Revisor Fiscal
 * Suministros → Historial (/suministros/historial), botones "PDF"/"Excel"
 * (historialApi.exportar → GET /suministros/historial/exportar)
 *
 * Criterio (hoja M05): verificación manual de 4.1.3 (estado de generación, aceptación asíncrona
 * —HTTP 202 con id_exportacion— y rechazo E6 —HTTP 429— anunciados mediante aria-live); 0
 * violaciones axe A/AA en 2.1.1 (selector de formato y botón de exportación operables por
 * teclado); PDF exportado con estructura etiquetada y orden de lectura lógico.
 *
 * Generar más de 10 000 registros reales es costoso (nota de la hoja): se intercepta la
 * respuesta de /suministros/historial/exportar con page.route para simular el 202 (E3) y el 429
 * (E6), tal como la propia hoja sugiere como alternativa. La revisión manual del PDF exportado
 * (estructura PDF/UA) queda fuera de este spec automatizado — se registra como precondición
 * de un paso manual, no se fabrica un resultado de esa revisión.
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import {
  abrirSesion, anotar, escanear, irA, main, precondicion, PREFIJO_API,
} from '../../../_shared/sigabA11y';

const TC_ID = 'TC-DIS-220';
const RUTA = 'suministros/historial';
const TITULO = 'Historial de suministros';
const PASOS_LIGHTHOUSE = ['exportacion-aceptada', 'limite-concurrente'];

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

async function consultarPrimerActivo(page: Page) {
  const combo = main(page).getByRole('combobox', { name: 'Activo biológico' });
  await combo.focus();
  await combo.press('ArrowDown');
  await combo.press('Enter');
  await main(page).getByRole('button', { name: 'Consultar', exact: true }).click();
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
}

test.describe(`${TC_ID} - Accesibilidad - Exportación del historial y estados asíncronos (RF-81)`, () => {
  let contexto: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    ({ contexto, page } = await abrirSesion(browser, testInfo));
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test('1. Selector de formato y botones de exportación operables por teclado (2.1.1)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    await consultarPrimerActivo(page);
    const pdf = main(page).getByRole('button', { name: 'PDF', exact: true });
    const excel = main(page).getByRole('button', { name: 'Excel', exact: true });
    await expect.soft(pdf, '2.1.1: el botón de exportar a PDF debe existir y ser enfocable').toBeVisible();
    await expect.soft(excel, '2.1.1: el botón de exportar a Excel debe existir y ser enfocable').toBeVisible();
    await pdf.focus();
    await expect.soft(pdf, 'el botón enfocado debe ser el que recibe el foco visualmente').toBeFocused();
  });

  test('2. E3 - aceptación asíncrona (HTTP 202 con id_exportacion) anunciada sin mover el foco (4.1.3)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    await consultarPrimerActivo(page);
    await page.route(`**${PREFIJO_API}/suministros/historial/exportar*`, async (route) => {
      await route.fulfill({ status: 202, contentType: 'application/json', body: JSON.stringify({ id_exportacion: 999001, estado: 'EN_COLA', mensaje: 'La exportación se está generando en segundo plano.' }) });
    });
    const pdf = main(page).getByRole('button', { name: 'PDF', exact: true });
    precondicion(await pdf.isVisible().catch(() => false), 'no hay filtros aplicados sobre los que exportar');
    if (!(await pdf.isVisible().catch(() => false))) return;

    const focoAntes = await page.evaluate(() => document.activeElement?.tagName.toLowerCase());
    await pdf.click();
    const aviso = page.getByText('Exportación en cola').or(page.getByText('Exportación en proceso'));
    await expect.soft(aviso, '4.1.3 (E3): la aceptación asíncrona debe anunciarse').toBeVisible();
    const enRegionViva = await aviso.evaluate((e) => !!e.closest('[aria-live]:not([aria-live="off"]), [role="status"], [role="alert"]'));
    expect.soft(enRegionViva, '4.1.3: el aviso de exportación en cola debe estar en una región viva').toBe(true);
    const focoDespues = await page.evaluate(() => document.activeElement?.tagName.toLowerCase());
    expect.soft(focoDespues, '4.1.3: el anuncio no debe mover el foco').toBe(focoAntes);
    anotar(testInfo, 'Foco antes/después del 202', `${focoAntes} → ${focoDespues}`);

    await escanear(page, TC_ID, __dirname, 'exportacion-aceptada', testInfo, PASOS_LIGHTHOUSE);
    await page.unroute(`**${PREFIJO_API}/suministros/historial/exportar*`);
  });

  test('3. E6 - límite de exportaciones concurrentes (HTTP 429) anunciado al usuario (4.1.3)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    await consultarPrimerActivo(page);
    await page.route(`**${PREFIJO_API}/suministros/historial/exportar*`, async (route) => {
      await route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ code: 'LIMITE_EXPORTACIONES_CONCURRENTES', message: 'Ya tienes 3 exportaciones en curso. Espera a que terminen antes de iniciar una nueva.' }) });
    });
    const excel = main(page).getByRole('button', { name: 'Excel', exact: true });
    precondicion(await excel.isVisible().catch(() => false), 'no hay filtros aplicados sobre los que exportar');
    if (!(await excel.isVisible().catch(() => false))) return;

    await excel.click();
    const error = main(page).locator('[role="alert"], [aria-live]').filter({ hasText: /./ }).first();
    await expect.soft(error, '4.1.3 (E6): el rechazo por límite de exportaciones debe anunciarse').toBeVisible({ timeout: 10_000 });
    anotar(testInfo, 'Mensaje de rechazo (429)', await error.innerText().catch(() => '(no se encontró un mensaje en una región viva)'));

    await escanear(page, TC_ID, __dirname, 'limite-concurrente', testInfo, PASOS_LIGHTHOUSE);
    await page.unroute(`**${PREFIJO_API}/suministros/historial/exportar*`);
  });

  test('4. Estructura del PDF exportado (PDF/UA) - paso manual, no automatizable en este spec', async ({}, testInfo) => {
    precondicion(false, 'requiere abrir el PDF exportado real con un validador de accesibilidad de PDF (p. ej. PAC o un lector con soporte PDF/UA) para confirmar encabezados, tabla con filas/columnas asociadas y orden de lectura — esta verificación es manual y no se fabrica aquí');
    anotar(testInfo, 'Alcance de este spec', 'Cubre la accesibilidad de los controles y de los anuncios de estado (202/429) en la UI web; la validación de la estructura interna del PDF queda para la revisión manual que pide el criterio.');
  });
});
