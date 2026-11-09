// | Fecha      | Nombre          | Que se hizo                                                        |
// |------------|-----------------|--------------------------------------------------------------------|
// | 2026-11-08 | SaraSofGonzalez | TC-DIS-201 RF-74: consistencia visual del resultado del CA         |
/**
 * TC-DIS-201 — Consistencia visual del resultado del CA y sus 4 clasificaciones frente a baseline
 * RF-74 · CU-02 · Rol: Productor, Veterinario o Administrador
 * Suministros → Eficiencia (ICA), sección "ICA vigente"
 *
 * Criterio: 0 diferencias no aprobadas vs. baseline vigente en los 3 viewports, cubriendo las 4
 * clasificaciones y un activo en CA_NO_CALCULABLE con su causa.
 *
 * Datos: los resultados se congelan con "Datos simulados", como pide la hoja. No existía baseline de
 * este caso: la primera ejecución la crea (`--update-snapshots`) y las siguientes comparan contra ella.
 */
import { expect, test } from '@playwright/test';
import { irA } from '../../../../accesibilidad/axe/_shared/sigabA11y';
import { CLASIFICACIONES, consultarIca, resultadoIca, sesionDelCaso, simularActivos, simularIca } from '../../../../accesibilidad/axe/M05/_shared/suministros';

const TC_ID = 'TC-DIS-201';

test.use({ actionTimeout: 15_000, locale: 'es-CO' });

test.describe('TC-DIS-201 — Consistencia visual del resultado del CA', () => {
  const s = sesionDelCaso(TC_ID, 'ADMIN');

  test('a. Las 4 clasificaciones y CA_NO_CALCULABLE frente a la baseline (Datos simulados)', async () => {
    const { page } = s;
    const estados: [string, Record<string, unknown>][] = [
      ...CLASIFICACIONES.map(([c, , ca]): [string, Record<string, unknown>] => [c.toLowerCase(), { clasificacion_ca: c, ca_calculado: ca }]),
      ['no-calculable', { estado_resultado: 'CA_NO_CALCULABLE', clasificacion_ca: null, ca_calculado: null, alimento_consumido_total_kg: null, ganancia_peso_kg: null, data_quality_score: 25, causa_no_calculo: 'SIN_PESO_FINAL', mensaje: 'Falta el peso final del periodo para calcular el ICA.' }],
    ];
    let actual = estados[0][1];
    await simularActivos(page);
    await simularIca(page, () => resultadoIca(actual), []);
    await irA(page, 'suministros/eficiencia', 'Eficiencia alimenticia (ICA)');
    const seccion = page.locator('section[aria-labelledby="ica-vigente"]');
    for (const [nombre, datos] of estados) {
      actual = datos;
      await consultarIca(page, 7001);
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      await expect.soft(seccion, `${nombre}: difiere de la baseline`).toHaveScreenshot(`ca-${nombre}.png`, { animations: 'disabled' });
    }
  });
});
