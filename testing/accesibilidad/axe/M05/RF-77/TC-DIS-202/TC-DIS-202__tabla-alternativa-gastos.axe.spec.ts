// | Fecha      | Nombre          | Que se hizo                                                        |
// |------------|-----------------|--------------------------------------------------------------------|
// | 2026-11-08 | SaraSofGonzalez | TC-DIS-202 RF-77: tabla alternativa a la gráfica por categoría     |
/**
 * TC-DIS-202 — [CRÍTICO] Accesibilidad WCAG 2.1 AA de la tabla alternativa a la gráfica de porcentajes
 * por categoría del Reporte de Gastos
 * RF-77 · CU-03 Reportar Gastos e Historial de Suministros · Rol: Productor o Administrador
 * Suministros → Reporte de gastos, sección "Por categoría"
 *
 * Criterio: 0 violaciones axe A/AA en 1.1.1: la gráfica por categoría (ALIMENTACION/MEDICACION) tiene
 * una alternativa en tabla de datos (categoría, subtotal, porcentaje) accesible por teclado y lector.
 *
 * Datos: generar un reporte deja un registro que no se borra y el historial del Productor en TEST está
 * vacío: el POST se responde en la prueba con ambas categorías ("Datos simulados").
 */
import { expect, test } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, desviacion, escanear, irA } from '../../../_shared/sigabA11y';
import { generarReporte, reporteGasto, sesionDelCaso, simularGeneracion } from '../../_shared/suministros';

const TC_ID = 'TC-DIS-202';
const LH = ['reporte-por-categoria'];

test.use({ actionTimeout: 15_000, locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe('TC-DIS-202 — Tabla alternativa a la gráfica por categoría', () => {
  const s = sesionDelCaso(TC_ID, 'PRODUCTOR');

  test('a. [1.1.1] Reporte con ambas categorías: gráfica y alternativa en tabla (Datos simulados)', async ({}, testInfo) => {
    const { page } = s;
    await simularGeneracion(page, () => reporteGasto());
    anotar(testInfo, 'Datos simulados', 'Reporte de octubre 2026: Alimentación $750.000 (75 %), Medicación $250.000 (25 %).');
    await irA(page, 'suministros/gastos', 'Reporte de gastos');
    await generarReporte(page);
    const seccion = page.locator('section[aria-labelledby="reporte-titulo"]');
    await expect(seccion.getByRole('heading', { name: 'Por categoría' })).toBeVisible();
    await escanear(page, TC_ID, __dirname, 'reporte-por-categoria', testInfo, LH);

    const bloque = seccion.getByRole('heading', { name: 'Por categoría' }).locator('..');
    const texto = (await bloque.innerText()).replace(/\s+/g, ' ');
    const barrasOcultas = await bloque.locator('[aria-hidden="true"]').count();
    anotar(testInfo, 'Bloque "Por categoría"', `${texto} · barras con aria-hidden: ${barrasOcultas}`);
    expect.soft(/Alimentación.*750\.000.*75.*Medicación.*250\.000.*25/.test(texto), '1.1.1: subtotal y porcentaje no están en texto').toBe(true);
    const tablas = await seccion.locator('table').evaluateAll((ts) => ts.map((t) => [...t.querySelectorAll('thead th')].map((h) => (h.textContent ?? '').trim()).join(' | ')));
    anotar(testInfo, 'Tablas del reporte', tablas.join(' ¦ ') || '(ninguna)');
    desviacion(tablas.some((h) => /categor/i.test(h) && /subtotal|monto/i.test(h) && /%|porcentaje/i.test(h)),
      '1.1.1: no hay tabla de datos (categoría, subtotal, porcentaje) como alternativa a la gráfica; las barras están ocultas y los valores son una línea de texto sin encabezados');
  });
});
