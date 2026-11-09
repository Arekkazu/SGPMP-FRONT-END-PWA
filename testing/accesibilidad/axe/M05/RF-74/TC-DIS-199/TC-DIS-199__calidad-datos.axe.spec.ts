// | Fecha      | Nombre          | Que se hizo                                                        |
// |------------|-----------------|--------------------------------------------------------------------|
// | 2026-11-08 | SaraSofGonzalez | TC-DIS-199 RF-74: equivalente textual de la calidad de datos       |
/**
 * TC-DIS-199 — [CRÍTICO] Accesibilidad WCAG 2.1 AA del equivalente textual del indicador de calidad
 * de datos (data_quality_score)
 * RF-74 · CU-02 · Rol: Productor, Veterinario o Administrador
 * Suministros → Eficiencia (ICA), activo en CA_NO_CALCULABLE
 *
 * Criterio: 0 violaciones axe A/AA en 1.1.1 (equivalente textual: valor numérico + causa principal);
 * 4.1.2 (name/role/value del indicador). Notas: cubrir SIN_PESO_INICIAL/SIN_PESO_FINAL (score bajo)
 * y DATO_INVALIDO (score 75).
 *
 * Datos: paso a con activos REALES de TEST en CA_NO_CALCULABLE (Admin), buscados por ID y periodo.
 * DATO_INVALIDO (75) y SIN_PESO_FINAL no existen en TEST: paso b con "Datos simulados".
 */
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, escanear, irA, json, precondicion } from '../../../_shared/sigabA11y';
import { consultarIca, resultadoIca, sesionDelCaso, simularActivos, simularIca, textosCrudos } from '../../_shared/suministros';

const TC_ID = 'TC-DIS-199';
const LH = ['calidad-real'];
/** Activos reales con 4 puntajes distintos (consulta del 2026-11-08). */
const REALES: [number, 'SEMANAL' | 'MENSUAL' | 'POR_CICLO'][] = [[957, 'MENSUAL'], [951, 'SEMANAL'], [951, 'POR_CICLO'], [943, 'POR_CICLO']];

test.use({ actionTimeout: 15_000, locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

/** Lee el indicador: valor (dd de "Calidad de datos"), alerta de causa y gráficos sin nombre. */
async function leerIndicador(page: Page) {
  const vigente = page.locator('section[aria-labelledby="ica-vigente"]');
  const dato = await vigente.locator('dl > div').filter({ hasText: 'Calidad de datos' }).evaluate((d) => ({
    rotulo: d.querySelector('dt')?.textContent?.trim() ?? '', valor: d.querySelector('dd')?.textContent?.trim() ?? '',
  })).catch(() => ({ rotulo: '', valor: '' }));
  const alerta = (await vigente.locator('[role="alert"]').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim()).join(' ¦ ');
  const graficos = await vigente.locator('svg:not([aria-hidden="true"]), canvas, [role="meter"], [role="progressbar"], [role="img"]').count();
  return { ...dato, alerta, graficos, crudos: await textosCrudos(vigente) };
}

function verificar(i: Awaited<ReturnType<typeof leerIndicador>>, caso: string) {
  expect.soft(i.rotulo, `4.1.2 (${caso}): el indicador no tiene rótulo asociado`).toBe('Calidad de datos');
  expect.soft(/^\d{1,3} %$/.test(i.valor), `1.1.1 (${caso}): el valor numérico no está en texto ("${i.valor}")`).toBe(true);
  expect.soft(i.alerta.length > 'No se pudo calcular el ICA'.length, `1.1.1 (${caso}): no se comunica la causa en texto ("${i.alerta}")`).toBe(true);
  expect.soft(i.crudos, `1.1.1 (${caso}): la causa o los datos muestran valores crudos`).toEqual([]);
  expect.soft(i.graficos, `1.1.1 (${caso}): hay un gráfico del indicador sin alternativa`).toBe(0);
}

async function elegirPeriodo(page: Page, periodo: string) {
  await page.locator('#ica-periodo').selectOption(periodo);
}

test.describe('TC-DIS-199 — Equivalente textual de la calidad de datos', () => {
  const s = sesionDelCaso(TC_ID, 'ADMIN');

  test('a. [1.1.1 / 4.1.2] Activos reales en CA_NO_CALCULABLE con puntajes distintos', async ({}, testInfo: TestInfo) => {
    const { page } = s;
    await irA(page, 'suministros/eficiencia', 'Eficiencia alimenticia (ICA)');
    const puntajes = new Set<number>();
    let escaneado = false;
    for (const [id, periodo] of REALES) {
      await elegirPeriodo(page, periodo);
      const r = await json<{ tiene_resultado: boolean; resultado: { data_quality_score: number; causa_no_calculo: string; mensaje: string | null } | null }>(await consultarIca(page, id));
      if (!r?.tiene_resultado || !r.resultado) { anotar(testInfo, `Activo #${id} ${periodo}`, 'sin resultado vigente'); continue; }
      puntajes.add(r.resultado.data_quality_score);
      const i = await leerIndicador(page);
      anotar(testInfo, `Activo #${id} ${periodo}`, `API ${r.resultado.data_quality_score}/${r.resultado.causa_no_calculo} · pantalla: "${i.valor}" · ${i.alerta}`);
      verificar(i, `#${id} ${periodo}`);
      if (!escaneado) { await escanear(page, TC_ID, __dirname, 'calidad-real', testInfo, LH); escaneado = true; }
    }
    precondicion(puntajes.size >= 3, `se esperaban 3 puntajes reales distintos; hubo ${[...puntajes].join(', ') || 'ninguno'}`);
  });

  test('b. [1.1.1] Causas DATO_INVALIDO (75) y SIN_PESO_FINAL (25) (Datos simulados)', async ({}, testInfo) => {
    const { page } = s;
    const casos = [
      { causa_no_calculo: 'DATO_INVALIDO', data_quality_score: 75, mensaje: 'Hay un dato inválido en los registros de peso del periodo.' },
      { causa_no_calculo: 'SIN_PESO_FINAL', data_quality_score: 25, mensaje: 'Falta el peso final del periodo para calcular el ICA.' },
    ];
    let actual = casos[0];
    await simularActivos(page);
    await simularIca(page, () => resultadoIca({ estado_resultado: 'CA_NO_CALCULABLE', clasificacion_ca: null, ca_calculado: null, ...actual }), []);
    anotar(testInfo, 'Datos simulados', 'BOV-101 en CA_NO_CALCULABLE con DATO_INVALIDO (75) y SIN_PESO_FINAL (25).');
    await irA(page, 'suministros/eficiencia', 'Eficiencia alimenticia (ICA)');
    for (const c of casos) {
      actual = c;
      await consultarIca(page, 7001);
      const i = await leerIndicador(page);
      anotar(testInfo, c.causa_no_calculo, `"${i.valor}" · ${i.alerta}`);
      verificar(i, c.causa_no_calculo);
      await escanear(page, TC_ID, __dirname, `calidad-${c.data_quality_score}`, testInfo, LH);
    }
  });
});
