// | Fecha      | Nombre      | Que se hizo |
// |------------|-------------|-------------|
// | 2026-11-06 | Laura032005 | M05 RF-81 TC-DIS-219: accesibilidad de los filtros y mensajes de estado del historial |
/**
 * TC-DIS-219 — [CRÍTICO] Accesibilidad WCAG 2.1 AA de los filtros del Historial de Suministros
 * y de sus mensajes de estado
 * RF-81 · CU-03 Reportar Gastos e Historial de Suministros · Rol: Gestor de Granja, Contador o
 * Revisor Fiscal
 * Suministros → Historial (/suministros/historial), formulario `role="search"`
 *
 * Criterio (hoja M05): 0 violaciones axe A/AA en 1.3.1 y 3.3.2 (cada filtro con etiqueta
 * asociada; los rangos de fechas y de costo agrupados con fieldset/legend o equivalente); 2.1.1
 * y 2.4.7 (filtros operables por teclado con foco visible); 3.3.1 (el error E5 —HTTP 422—
 * identifica en texto el filtro en conflicto); 4.1.3 (el mensaje E1 y la actualización del
 * resumen se anuncian mediante aria-live).
 *
 * HistorialView valida E5 en el cliente de forma independiente para cada rango (rango_invalido
 * para fechas, historial.costos_invalidos para costos) y no agrupa Desde/Hasta ni
 * Costo mínimo/máximo con fieldset/legend: cada Input tiene su propia etiqueta suelta dentro de
 * la grilla de filtros. Se reporta como desviación frente al agrupamiento que pide el criterio,
 * sin dejar de verificar que cada filtro individual sí tenga etiqueta y error asociados.
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { abrirSesion, anotar, desviacion, escanear, irA, main, precondicion } from '../../../_shared/sigabA11y';

const TC_ID = 'TC-DIS-219';
const RUTA = 'suministros/historial';
const TITULO = 'Historial de suministros';
const PASOS_LIGHTHOUSE = ['filtros-vacio', 'filtros-con-error'];

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Filtros del historial de suministros (RF-81)`, () => {
  let contexto: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    ({ contexto, page } = await abrirSesion(browser, testInfo));
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test('1. Cada filtro con etiqueta asociada (3.3.2) y sin fieldset/legend que agrupe los rangos (desviación)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const form = page.getByRole('search');
    await expect.soft(form, 'el panel de filtros debe exponerse como región de búsqueda (role="search")').toBeVisible();

    const filtros = [
      ['combobox', 'Activo biológico'], ['textbox', 'Desde'], ['textbox', 'Hasta'],
      ['combobox', 'Tipo'], ['combobox', 'Origen del precio'], ['spinbutton', 'Costo mínimo'], ['spinbutton', 'Costo máximo'],
    ] as const;
    for (const [role, name] of filtros) {
      await expect.soft(form.getByRole(role, { name }), `3.3.2: falta el filtro "${name}" con su etiqueta asociada`).toBeVisible();
    }

    const fieldsets = await form.locator('fieldset').count();
    anotar(testInfo, 'fieldset en el panel de filtros', String(fieldsets));
    desviacion(fieldsets >= 2, 'Desde/Hasta y Costo mínimo/máximo no están agrupados con fieldset/legend (ni con un equivalente aria-labelledby de grupo); cada Input es independiente dentro de la grilla de filtros');

    await escanear(page, TC_ID, __dirname, 'filtros-vacio', testInfo, PASOS_LIGHTHOUSE);
  });

  test('2. E5 - rango de fechas y de costos inválidos se identifican en texto junto al filtro (3.3.1)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const combo = main(page).getByRole('combobox', { name: 'Activo biológico' });
    await combo.focus();
    await combo.press('ArrowDown');
    await combo.press('Enter');

    await page.getByRole('textbox', { name: 'Desde' }).fill('2026-06-01');
    await page.getByRole('textbox', { name: 'Hasta' }).fill('2026-01-01');
    await page.getByRole('spinbutton', { name: 'Costo mínimo' }).fill('100000');
    await page.getByRole('spinbutton', { name: 'Costo máximo' }).fill('1000');
    await page.getByRole('button', { name: 'Consultar', exact: true }).click();

    const errorFechas = page.getByText('La fecha final debe ser igual o posterior a la inicial.');
    const errorCostos = page.getByText('El costo máximo debe ser mayor o igual al mínimo.');
    await expect.soft(errorFechas, '3.3.1 (E5): el conflicto de fechas debe identificarse junto al filtro "Hasta"').toBeVisible();
    await expect.soft(errorCostos, '3.3.1 (E5): el conflicto de costos debe identificarse junto al filtro "Costo máximo"').toBeVisible();
    await expect.soft(page.getByRole('textbox', { name: 'Hasta' }), '4.1.2: aria-invalid="true" en el filtro de fecha en conflicto').toHaveAttribute('aria-invalid', 'true');
    await expect.soft(page.getByRole('spinbutton', { name: 'Costo máximo' }), '4.1.2: aria-invalid="true" en el filtro de costo en conflicto').toHaveAttribute('aria-invalid', 'true');

    await escanear(page, TC_ID, __dirname, 'filtros-con-error', testInfo, PASOS_LIGHTHOUSE);
  });

  test('3. E1 - sin resultados anunciado mediante role="status" (4.1.3)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const combo = main(page).getByRole('combobox', { name: 'Activo biológico' });
    await combo.focus();
    await combo.press('ArrowDown');
    await combo.press('Enter');
    await page.getByRole('textbox', { name: 'Desde' }).fill('2000-01-01');
    await page.getByRole('textbox', { name: 'Hasta' }).fill('2000-01-02');
    await page.getByRole('button', { name: 'Consultar', exact: true }).click();
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    const sinResultados = page.getByText('Sin suministros con esos filtros');
    const hayResultados = await main(page).getByRole('table').count() > 0;
    precondicion(!hayResultados, 'el rango 2000-01-01 a 2000-01-02 igual devolvió resultados para el activo elegido');
    if (!hayResultados) {
      await expect.soft(sinResultados, '4.1.3 (E1): el estado vacío debe anunciarse').toBeVisible();
      await expect.soft(sinResultados.locator('xpath=ancestor::div[@role="status"]'), 'el contenedor del estado vacío debe tener role="status"').toHaveCount(1);
    }
  });

  test('4. Actualización del resumen al aplicar filtros válidos (4.1.3)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const combo = main(page).getByRole('combobox', { name: 'Activo biológico' });
    await combo.focus();
    await combo.press('ArrowDown');
    await combo.press('Enter');
    await page.getByRole('button', { name: 'Consultar', exact: true }).click();
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    const resumen = page.getByLabel('Resumen del historial');
    const existe = await resumen.count() > 0;
    precondicion(existe, 'el activo consultado no devolvió un resumen de historial (sin suministros)');
    if (existe) {
      anotar(testInfo, 'Resumen', (await resumen.innerText()).replace(/\s+/g, ' '));
      const vivo = await resumen.evaluate((e) => !!e.closest('[aria-live]:not([aria-live="off"]), [role="status"], [role="alert"]'));
      desviacion(vivo, 'la sección "Resumen del historial" (aria-label, sin role="status"/aria-live) no está en una región viva: su actualización al cambiar de filtros no se anuncia automáticamente al lector de pantalla');
    }
  });
});
