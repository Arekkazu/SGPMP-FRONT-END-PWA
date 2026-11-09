// | Fecha      | Nombre          | Que se hizo                                                        |
// |------------|-----------------|--------------------------------------------------------------------|
// | 2026-11-07 | SaraSofGonzalez | TC-DIS-261 RF-93: ingresos, gastos y resultado neto con signo y texto |
/**
 * TC-DIS-261 — Verificar accesibilidad WCAG 2.1 AA de ingresos, gastos y resultado neto con signo y
 * texto, sin depender solo del color [CRÍTICO]
 * RF-93 · CU-012 · Rol: Contador · Prioridad: Alta
 * Ruta: /finanzas/estado-resultados
 *
 * Criterio: 0 violaciones axe A/AA en 1.4.1 (ingresos y gastos con signo y etiqueta, no solo color;
 * el resultado neto dice "Ganancia" o "Pérdida"); 1.3.1 (el signo es parte del texto accesible, no
 * un pseudo-elemento CSS); 1.4.3 (contraste ≥ 4.5:1 de montos positivos y negativos en tema claro y
 * oscuro); 1.3.1 (la leyenda "Sin actividad en el período" y la lista de activos excluidos son texto
 * visible asociado a su sección).
 *
 * Ambiente: sin estados reales en TEST. Septiembre 2026 se simula con dos versiones: v2 con ganancia
 * y v1 con pérdida, categorías en 0 y un activo excluido del cierre ("Datos simulados").
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_261_VIEWPORTS=escritorio
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, desviacion, escanear, main } from '../../../_shared/sigabA11y';
import { abrirSesionRol, elegirPeriodo, irFinanzas, quitarSimulaciones, simularEstados, temaOscuro } from '../../_shared/finanzas';

const TC_ID = 'TC-DIS-261';
const VIEWPORTS = (process.env.TC_DIS_261_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['ganancia', 'perdida', 'perdida-oscuro'];

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

/** Resumen del estado elegido: valor del resultado y textos de las tablas. */
async function leer(page: Page) {
  const resumen = main(page).getByRole('region', { name: /resumen/i });
  const resultado = await resumen.evaluate((s) => {
    const dt = [...s.querySelectorAll('dt')].find((d) => /resultado/i.test(d.textContent ?? ''));
    const dd = dt?.nextElementSibling as HTMLElement | null;
    const span = dd?.querySelector('span');
    const antes = span ? getComputedStyle(span, '::before').content : 'none';
    return { texto: dd?.innerText ?? '', antes };
  }).catch(() => ({ texto: '', antes: 'none' }));
  const gastos = await main(page).getByRole('region', { name: /Gastos/i }).locator('tbody tr').allInnerTexts();
  return { resultado, gastos: gastos.map((g) => g.replace(/\s+/g, ' ')) };
}

test.describe('TC-DIS-261 — Ingresos, gastos y resultado neto con signo y texto', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionRol(browser, testInfo, 'admin'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_261_VIEWPORTS.`);
  });
  test.afterEach(async () => { if (page) { await temaOscuro(page, false); await quitarSimulaciones(page); } });

  test('a. [1.4.1 / 1.3.1] Estado con ganancia: signo de ingresos y gastos, "Ganancia" en texto (Datos simulados)', async ({}, testInfo) => {
    await simularEstados(page);
    anotar(testInfo, 'Datos simulados', 'Septiembre 2026: v2 APROBADO con resultado +$460.000; BOV-102 excluido del cierre; varias categorías en $0.');
    await irFinanzas(page, 'estado-resultados', /Estado de resultados/);
    await elegirPeriodo(page, 9101);
    await main(page).getByRole('region', { name: /resumen/i }).waitFor({ timeout: 15_000 });
    await escanear(page, TC_ID, __dirname, 'ganancia', testInfo, LH);
    const l = await leer(page);
    anotar(testInfo, 'Resultado neto', `"${l.resultado.texto}" (::before ${l.resultado.antes})`);
    anotar(testInfo, 'Filas de gastos', l.gastos.slice(0, 4).join(' ¦ '));
    expect.soft(/^\+/.test(l.resultado.texto.trim()), '1.4.1: el resultado positivo no lleva signo "+" en el texto').toBe(true);
    desviacion(/ganancia/i.test(l.resultado.texto), `1.4.1: el resultado neto no dice "Ganancia" en texto ("${l.resultado.texto}")`);
    desviacion(l.gastos.filter((g) => /[1-9]/.test(g)).every((g) => /[−-]\s?\$|gasto/i.test(g)), '1.4.1: los montos de gastos no llevan "−" ni la etiqueta "Gasto"; se distinguen solo por estar en la tabla de gastos');
    expect.soft(l.resultado.antes === 'none' || l.resultado.antes === 'normal', '1.3.1: el signo se pinta con un pseudo-elemento CSS').toBe(true);
    const texto = (await main(page).innerText()).replace(/\s+/g, ' ');
    desviacion(/sin actividad en el per[ií]odo/i.test(texto), '1.3.1: las categorías en $0 no muestran la leyenda "Sin actividad en el período"');
    desviacion(/BOV-102/.test(texto), '1.3.1: los activos excluidos del cierre no se listan en texto (solo aparece el número de excluidos)');
  });

  test('b. [1.4.1 / 1.4.3] Estado con pérdida en tema claro y oscuro (Datos simulados)', async ({}, testInfo) => {
    await simularEstados(page);
    await irFinanzas(page, 'estado-resultados', /Estado de resultados/);
    await elegirPeriodo(page, 9101);
    const tabla = main(page).getByRole('region', { name: /versiones|Versiones/i }).locator('table');
    await tabla.getByRole('button', { name: /Ver/ }).nth(1).click();
    await page.waitForTimeout(800);
    await escanear(page, TC_ID, __dirname, 'perdida', testInfo, LH);
    const l = await leer(page);
    anotar(testInfo, 'Resultado neto (v1)', `"${l.resultado.texto}"`);
    expect.soft(/^[−-]/.test(l.resultado.texto.trim()), '1.4.1: el resultado negativo no lleva signo "−" en el texto').toBe(true);
    desviacion(/p[eé]rdida/i.test(l.resultado.texto), `1.4.1: el resultado neto negativo no dice "Pérdida" en texto ("${l.resultado.texto}")`);
    await temaOscuro(page, true);
    await escanear(page, TC_ID, __dirname, 'perdida-oscuro', testInfo, LH);
  });
});
