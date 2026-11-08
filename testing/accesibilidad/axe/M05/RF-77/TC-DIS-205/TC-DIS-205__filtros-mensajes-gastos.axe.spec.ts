// | Fecha      | Nombre          | Que se hizo                                                        |
// |------------|-----------------|--------------------------------------------------------------------|
// | 2026-11-08 | SaraSofGonzalez | TC-DIS-205 RF-77: filtros y mensajes de estado del Reporte de Gastos |
/**
 * TC-DIS-205 — Accesibilidad WCAG 2.1 AA de los filtros y mensajes de estado del Reporte de Gastos
 * RF-77 · CU-03 · Rol: Productor o Administrador
 * Suministros → Reporte de gastos
 *
 * Criterio: 0 violaciones axe A/AA en 2.1.1 y 2.4.7 (filtros por teclado); 4.1.3 (SIN_DATOS y bloqueo
 * de exportación PDF por volumen E6b se anuncian por aria-live). Notas: también el mensaje E2 (rango
 * de fechas inválido).
 *
 * Datos: el formulario y E2 son reales. SIN_DATOS (E1) y E6b se responden en la prueba porque generar
 * y exportar dejan registros que no se borran ("Datos simulados").
 */
import { expect, test } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, camposSinNombre, describirFoco, escanear, estaEnRegionViva, irA, main } from '../../../_shared/sigabA11y';
import { errorApi, focoVisible, generarReporte, reporteGasto, sesionDelCaso, simularEscritura, simularGeneracion, textosCrudos } from '../../_shared/suministros';

const TC_ID = 'TC-DIS-205';
const LH = ['filtros', 'sin-datos', 'bloqueo-pdf'];
const MSJ_E1 = 'No hay gastos registrados en el periodo elegido.';
const MSJ_E6B = 'El reporte supera los 500 registros: expórtalo en CSV o reduce el rango de fechas.';

test.use({ actionTimeout: 15_000, locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe('TC-DIS-205 — Filtros y mensajes del Reporte de Gastos', () => {
  const s = sesionDelCaso(TC_ID, 'PRODUCTOR');

  test('a. [2.1.1 / 2.4.7] Filtros reales recorridos con teclado; categoría requerida y E2', async ({}, testInfo) => {
    const { page } = s;
    await irA(page, 'suministros/gastos', 'Reporte de gastos');
    await escanear(page, TC_ID, __dirname, 'filtros', testInfo, LH);
    const form = main(page).locator('form').first();
    expect.soft(await camposSinNombre(form), '2.1.1: filtros sin nombre accesible').toEqual([]);

    await page.keyboard.press('Shift');
    await form.locator('#gastos-desde').focus();
    const recorrido: string[] = [];
    const sinFoco: string[] = [];
    for (let i = 0; i < 16; i++) {
      const f = await describirFoco(page);
      recorrido.push(f);
      if (!(await focoVisible(page))) sinFoco.push(f);
      if (/Generar reporte/.test(f)) break;
      await page.keyboard.press('Tab');
    }
    anotar(testInfo, 'Recorrido con Tab', [...new Set(recorrido)].join(' → '));
    for (const re of [/Desde/, /Hasta/, /Desglose/, /Activo/, /Alimentación/, /Medicación/, /Generar reporte/]) {
      expect.soft(recorrido.some((f) => re.test(f)), `2.1.1: el recorrido con Tab no pasa por ${re}`).toBe(true);
    }
    expect.soft([...new Set(sinFoco)], '2.4.7: controles sin foco visible').toEqual([]);

    // Categorías con espacio: sin ninguna, el error se anuncia.
    const casillas = form.getByRole('checkbox');
    await casillas.nth(0).focus(); await page.keyboard.press('Space');
    await casillas.nth(1).focus(); await page.keyboard.press('Space');
    const reqCat = form.locator('.ds-field__error[role="alert"]').filter({ hasText: 'categoría' });
    await expect.soft(reqCat, '4.1.3: "Elige al menos una categoría" no se anuncia').toBeVisible();
    await casillas.nth(0).check(); await casillas.nth(1).check();

    // E2: rango inválido.
    const desde = await form.locator('#gastos-desde').inputValue();
    const hasta = await form.locator('#gastos-hasta').inputValue();
    await form.locator('#gastos-hasta').fill('2020-01-01');
    const e2 = form.locator('[role="alert"]').filter({ hasText: /rango|anterior|posterior|fecha/i });
    await expect.soft(e2, 'E2: el rango de fechas inválido no se anuncia con role="alert"').toBeVisible();
    anotar(testInfo, 'E2', `${await e2.innerText().catch(() => '(sin mensaje)')} · desde ${desde}, hasta original ${hasta}`);
    await form.locator('#gastos-hasta').fill(hasta);
  });

  test('b. [4.1.3] SIN_DATOS (E1) y bloqueo de exportación PDF por volumen (E6b) (Datos simulados)', async ({}, testInfo) => {
    const { page } = s;
    let actual: Record<string, unknown> = { sin_datos: true, mensaje: MSJ_E1, gasto_total_acumulado: '0.00', desglose_categorias: [], desglose_temporal: [] };
    await simularGeneracion(page, () => reporteGasto(actual));
    await simularEscritura(page, /\/reportes-gastos\/\d+\/exportacion$/, () => ({ status: 422, json: errorApi('EXPORTACION_PDF_EXCEDE_LIMITE', MSJ_E6B) }));
    anotar(testInfo, 'Datos simulados', 'POST del reporte con sin_datos=true; POST de exportación PDF con 422 por más de 500 registros.');
    await irA(page, 'suministros/gastos', 'Reporte de gastos');

    await generarReporte(page);
    const e1 = main(page).getByText(MSJ_E1).first();
    await expect.soft(e1, 'E1: no aparece el mensaje de reporte sin datos').toBeVisible();
    expect.soft(await e1.count() ? await estaEnRegionViva(e1) : false, '4.1.3: el mensaje SIN_DATOS no está en una región aria-live').toBe(true);
    await escanear(page, TC_ID, __dirname, 'sin-datos', testInfo, LH);

    actual = {};
    await generarReporte(page);
    const pdf = main(page).getByRole('button', { name: 'PDF', exact: true });
    await pdf.focus();
    await page.keyboard.press('Enter');
    const e6b = main(page).getByText(MSJ_E6B).first();
    await expect.soft(e6b, 'E6b: no aparece el mensaje de bloqueo').toBeVisible({ timeout: 10_000 });
    expect.soft(await e6b.count() ? await estaEnRegionViva(e6b) : false, '4.1.3: el bloqueo de exportación PDF no está en una región aria-live').toBe(true);
    await escanear(page, TC_ID, __dirname, 'bloqueo-pdf', testInfo, LH);
    expect.soft(await textosCrudos(main(page).locator('section[aria-labelledby="reporte-titulo"]')), 'E6b: el código interno aparece en pantalla').toEqual([]);
  });
});
