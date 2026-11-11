// | Fecha      | Nombre          | Que se hizo                                                        |
// |------------|-----------------|--------------------------------------------------------------------|
// | 2026-11-08 | SaraSofGonzalez | TC-DIS-202 RF-77: tabla alternativa a la gráfica por categoría     |
// | 2026-11-11 | SaraSofGonzalez | TC-DIS-202 RF-77: reejecución sobre el reporte real #225 (Admin), sin generar reportes |
/**
 * TC-DIS-202 — [CRÍTICO] Accesibilidad WCAG 2.1 AA de la tabla alternativa a la gráfica de porcentajes
 * por categoría del Reporte de Gastos
 * RF-77 · CU-03 Reportar Gastos e Historial de Suministros · Rol: Productor o Administrador
 * Suministros → Reporte de gastos, sección "Por categoría"
 *
 * Criterio: 0 violaciones axe A/AA en 1.1.1: la gráfica por categoría (ALIMENTACION/MEDICACION) tiene
 * una alternativa en tabla de datos (categoría, subtotal, porcentaje) accesible por teclado y lector.
 *
 * Datos (reejecución 2026-11-11): reporte REAL #225 del historial de la cuenta Admin (1/10/2026 –
 * 11/11/2026, todas las fincas), que incluye los consumos y medicamentos de Finca El Rosal. Se abre con
 * «Ver» (lectura): no se genera ningún reporte nuevo. Admin es un rol válido del caso.
 */
import { expect, test } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, desviacion, escanear, irA, main, precondicion } from '../../../_shared/sigabA11y';
import { sesionDelCaso } from '../../_shared/suministros';

const TC_ID = 'TC-DIS-202';
const LH = ['reporte-por-categoria'];

test.use({ actionTimeout: 15_000, locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe('TC-DIS-202 — Tabla alternativa a la gráfica por categoría', () => {
  const s = sesionDelCaso(TC_ID, 'ADMIN');

  test('a. [1.1.1] Reporte real con ambas categorías: gráfica y alternativa en tabla', async ({}, testInfo) => {
    const { page } = s;
    await irA(page, 'suministros/gastos', 'Reporte de gastos');
    const historial = main(page).getByRole('region', { name: 'Reportes generados' });
    await historial.locator('tbody tr').first().waitFor({ timeout: 30_000 });
    const fila = historial.locator('tbody tr').filter({ hasNotText: '#' }).first();
    anotar(testInfo, 'Reporte real abierto', (await fila.innerText()).replace(/\s+/g, ' '));
    await fila.getByRole('button', { name: 'Ver', exact: true }).click();
    const seccion = page.locator('section[aria-labelledby="reporte-titulo"]');
    await expect(seccion.getByRole('heading', { name: 'Por categoría' })).toBeVisible();
    await escanear(page, TC_ID, __dirname, 'reporte-por-categoria', testInfo, LH);

    const bloque = seccion.getByRole('heading', { name: 'Por categoría' }).locator('..');
    const texto = (await bloque.innerText()).replace(/\s+/g, ' ');
    const barrasOcultas = await bloque.locator('[aria-hidden="true"]').count();
    anotar(testInfo, 'Bloque "Por categoría"', `${texto} · barras con aria-hidden: ${barrasOcultas}`);
    precondicion(/Alimentación/.test(texto) && /Medicación/.test(texto), 'el reporte real no tiene las dos categorías');
    expect.soft(/Alimentación.*\$\s?[\d.]+.*%.*Medicación.*\$\s?[\d.]+.*%/.test(texto), '1.1.1: subtotal y porcentaje no están en texto').toBe(true);
    const tablas = await seccion.locator('table').evaluateAll((ts) => ts.map((t) => [...t.querySelectorAll('thead th')].map((h) => (h.textContent ?? '').trim()).join(' | ')));
    anotar(testInfo, 'Tablas del reporte', tablas.join(' ¦ ') || '(ninguna)');
    desviacion(tablas.some((h) => /categor/i.test(h) && /subtotal|monto/i.test(h) && /%|porcentaje/i.test(h)),
      '1.1.1: no hay tabla de datos (categoría, subtotal, porcentaje) como alternativa a la gráfica; las barras están ocultas y los valores son una línea de texto sin encabezados');
  });
});
