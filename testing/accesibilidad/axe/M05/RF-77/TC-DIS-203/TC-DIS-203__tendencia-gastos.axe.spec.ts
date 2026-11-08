// | Fecha      | Nombre          | Que se hizo                                                        |
// |------------|-----------------|--------------------------------------------------------------------|
// | 2026-11-08 | SaraSofGonzalez | TC-DIS-203 RF-77: variación frente al período anterior con signo   |
/**
 * TC-DIS-203 — [CRÍTICO] Accesibilidad WCAG 2.1 AA de la variación vs período anterior con signo/flecha
 * en el Reporte de Gastos
 * RF-77 · CU-03 · Rol: Productor o Administrador
 * Suministros → Reporte de gastos, indicador de tendencia
 *
 * Criterio: 0 violaciones axe A/AA en 1.4.1 (signo/flecha y etiqueta textual, no solo verde/rojo);
 * 4.1.2 (name/role/value del indicador, incluidos SIN_BASE_COMPARATIVA y SIN_MOVIMIENTO).
 *
 * Datos: el POST se responde en la prueba con los 4 estados ("Datos simulados"): generar un reporte
 * deja un registro que no se borra y el Productor no tiene reportes en TEST.
 */
import { expect, test } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, escanear, irA } from '../../../_shared/sigabA11y';
import { generarReporte, reporteGasto, sesionDelCaso, simularGeneracion, textosCrudos } from '../../_shared/suministros';

const TC_ID = 'TC-DIS-203';
const LH = ['tendencia-positiva', 'tendencia-sin-base'];

test.use({ actionTimeout: 15_000, locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

const tendencia = (estado: string, variacion: string | null, anterior: string | null) => ({ gasto_periodo_actual: '1000000.00', gasto_periodo_anterior: anterior, variacion_porcentual: variacion, estado, nota: null });
const CASOS: [string, ReturnType<typeof tendencia>, RegExp][] = [
  ['tendencia-positiva', tendencia('CALCULADA', '12.5', '888889.00'), /^\+12,5 % frente al periodo anterior/],
  ['tendencia-negativa', tendencia('CALCULADA', '-8.0', '1086957.00'), /^[-−]8(,0)? % frente al periodo anterior/],
  ['tendencia-sin-base', tendencia('SIN_BASE_COMPARATIVA', null, null), /Sin gastos en el periodo anterior/],
  ['tendencia-sin-movimiento', tendencia('SIN_MOVIMIENTO', null, '0.00'), /Sin movimiento/],
];

test.describe('TC-DIS-203 — Variación frente al período anterior', () => {
  const s = sesionDelCaso(TC_ID, 'PRODUCTOR');

  test('a. [1.4.1 / 4.1.2] Variación positiva, negativa, SIN_BASE_COMPARATIVA y SIN_MOVIMIENTO (Datos simulados)', async ({}, testInfo) => {
    const { page } = s;
    let actual = CASOS[0];
    await simularGeneracion(page, () => reporteGasto({ tendencia: actual[1] }));
    await irA(page, 'suministros/gastos', 'Reporte de gastos');
    const seccion = page.locator('section[aria-labelledby="reporte-titulo"]');
    for (const caso of CASOS) {
      actual = caso;
      await generarReporte(page);
      const p = seccion.locator('p').filter({ has: page.locator('svg') }).first();
      await expect.soft(p, `${caso[0]}: no aparece el indicador`).toBeVisible();
      const info = await p.evaluate((e) => {
        const svg = e.querySelector('svg');
        return { texto: (e as HTMLElement).innerText.replace(/\s+/g, ' ').trim(), icono: !!svg, oculto: svg?.getAttribute('aria-hidden') === 'true', clase: svg?.getAttribute('class') ?? '', color: getComputedStyle(e).color };
      }).catch(() => ({ texto: '', icono: false, oculto: false, clase: '', color: '' }));
      anotar(testInfo, caso[0], JSON.stringify(info));
      expect.soft(caso[2].test(info.texto), `1.4.1 (${caso[0]}): el texto no comunica la variación ("${info.texto}")`).toBe(true);
      expect.soft(info.icono && info.oculto, `4.1.2 (${caso[0]}): el ícono de tendencia falta o queda expuesto sin nombre`).toBe(true);
      expect.soft(await textosCrudos(seccion), `4.1.2 (${caso[0]}): el estado se muestra como valor crudo`).toEqual([]);
      await escanear(page, TC_ID, __dirname, caso[0], testInfo, LH);
    }
  });
});
