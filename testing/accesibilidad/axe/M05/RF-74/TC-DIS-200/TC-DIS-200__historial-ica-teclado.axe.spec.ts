// | Fecha      | Nombre          | Que se hizo                                                        |
// |------------|-----------------|--------------------------------------------------------------------|
// | 2026-11-08 | SaraSofGonzalez | TC-DIS-200 RF-74: navegación por teclado del historial de ICA      |
/**
 * TC-DIS-200 — Accesibilidad WCAG 2.1 AA de la navegación por teclado del historial de ICA por período
 * RF-74 · CU-02 · Rol: Productor, Veterinario o Administrador
 * Suministros → Eficiencia (ICA)
 *
 * Criterio: 0 violaciones axe A/AA en 2.1.1 y 2.4.7 (selector de período y botón de cálculo manual por
 * teclado, con foco visible); 2.4.3 (orden lógico selector → historial → botón). Notas: incluir el
 * acceso al detalle de un cálculo puntual desde el historial.
 *
 * Datos: activo REAL #943 de TEST con historial en los 3 períodos (Admin). El POST /calcular se
 * responde en la prueba porque deja un resultado que no se borra ("Datos simulados").
 */
import { expect, test } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, describirFoco, desviacion, escanear, irA, main, recorrerConTab } from '../../../_shared/sigabA11y';
import { focoVisible, resultadoIca, sesionDelCaso, simularEscritura } from '../../_shared/suministros';

const TC_ID = 'TC-DIS-200';
const ACTIVO = 943;
const LH = ['historial-ica'];

test.use({ actionTimeout: 15_000, locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe('TC-DIS-200 — Navegación por teclado del historial de ICA', () => {
  const s = sesionDelCaso(TC_ID, 'ADMIN');

  test('a. [2.1.1 / 2.4.3 / 2.4.7] Selector, consulta, historial y cálculo manual solo con teclado', async ({}, testInfo) => {
    const { page } = s;
    const posts = await simularEscritura(page, /\/eficiencia-alimenticia\/calcular$/, () => ({ status: 200, json: resultadoIca({ id_activo_biologico: ACTIVO, tipo_calculo: 'MANUAL' }) }), 500);
    await irA(page, 'suministros/eficiencia', 'Eficiencia alimenticia (ICA)');

    const activo = page.locator('#ica-activo');
    await page.keyboard.press('Shift');
    await activo.focus();
    expect.soft(await focoVisible(page), '2.4.7: el selector de activo no muestra foco visible').toBe(true);
    await page.keyboard.type(String(ACTIVO));
    await page.keyboard.press('Escape');

    // Tab hasta el selector de período y recorrerlo con flechas.
    const camino: string[] = [];
    for (let i = 0; i < 4 && (await page.evaluate(() => document.activeElement?.id)) !== 'ica-periodo'; i++) {
      await page.keyboard.press('Tab');
      camino.push(await describirFoco(page));
    }
    anotar(testInfo, 'Tab desde el activo hasta el período', camino.join(' → '));
    const periodo = page.locator('#ica-periodo');
    await expect.soft(periodo, '2.1.1: el selector de período no se alcanza con Tab').toBeFocused();
    expect.soft(await focoVisible(page), '2.4.7: el selector de período no muestra foco visible').toBe(true);
    const valores: string[] = [await periodo.inputValue()];
    await page.keyboard.press('ArrowUp');
    valores.push(await periodo.inputValue());
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    valores.push(await periodo.inputValue());
    anotar(testInfo, 'Períodos con flechas', valores.join(' → '));
    expect.soft(new Set(valores).size, '2.1.1: las flechas no recorren los 3 períodos').toBe(3);

    // Consultar con teclado.
    await page.keyboard.press('Tab');
    const consultar = main(page).getByRole('button', { name: 'Consultar', exact: true });
    await expect.soft(consultar, '2.4.3: tras el período el foco no pasa a Consultar').toBeFocused();
    expect.soft(await focoVisible(page), '2.4.7: "Consultar" no muestra foco visible').toBe(true);
    const r = page.waitForResponse((x) => /\/historial(\?|$)/.test(x.url()), { timeout: 60_000 });
    await page.keyboard.press('Enter');
    await r;
    const seccion = page.locator('section[aria-labelledby="ica-vigente"]');
    await seccion.waitFor({ timeout: 15_000 });
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(400);
    const focoConsulta = await describirFoco(page);
    anotar(testInfo, 'Foco tras consultar', focoConsulta);
    desviacion(focoConsulta !== 'body', '2.4.3: tras consultar, el foco se pierde (queda en body)');

    await escanear(page, TC_ID, __dirname, 'historial-ica', testInfo, LH);

    // Orden de foco después de la consulta.
    await consultar.focus();
    const orden = await recorrerConTab(page, 3);
    anotar(testInfo, 'Tab desde Consultar', orden.join(' → '));
    expect.soft(orden[0], '2.4.3: tras Consultar el foco no pasa a "Calcular ahora"').toContain('Calcular ahora');
    expect.soft(orden.some((f) => /Cálculos anteriores/.test(f)), '2.4.3/2.1.1: la región del historial no recibe el foco para desplazarse con teclado').toBe(true);

    const filas = main(page).getByRole('region', { name: 'Cálculos anteriores' }).locator('table tbody tr');
    const nFilas = await filas.count();
    const controles = await filas.locator('button, a[href], [tabindex="0"]').count();
    anotar(testInfo, 'Historial', `${nFilas} fila(s) · controles dentro de las filas: ${controles}`);
    desviacion(controles > 0, 'Notas del caso: el historial no da acceso al detalle de un cálculo puntual (las filas no tienen ningún control)');

    // Cálculo manual con teclado.
    const calcular = main(page).getByRole('button', { name: 'Calcular ahora', exact: true });
    await page.keyboard.press('Shift');
    await calcular.focus();
    expect.soft(await focoVisible(page), '2.4.7: "Calcular ahora" no muestra foco visible').toBe(true);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    const focoCalculo = await describirFoco(page);
    anotar(testInfo, 'Datos simulados', `POST /calcular respondido en la prueba (${posts.length} envío) · foco tras calcular: ${focoCalculo}`);
    expect.soft(posts.length, '2.1.1: el cálculo manual no se pudo lanzar con teclado').toBe(1);
    desviacion(focoCalculo !== 'body', '2.4.3: tras el cálculo manual el foco se pierde (queda en body)');
  });
});
