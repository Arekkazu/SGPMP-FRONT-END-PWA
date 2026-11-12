// | Fecha      | Nombre          | Que se hizo                                                        |
// |------------|-----------------|--------------------------------------------------------------------|
// | 2026-11-07 | SaraSofGonzalez | TC-DIS-260 RF-93: tabla alternativa a las gráficas del estado de resultados |
// | 2026-11-11 | SaraSofGonzalez | TC-DIS-260 RF-93: reejecución con el estado de resultados real #32 (octubre) |
/**
 * TC-DIS-260 — Verificar accesibilidad WCAG 2.1 AA de la tabla alternativa a las gráficas del
 * dashboard del Estado de Resultados [CRÍTICO]
 * RF-93 · CU-012 - Generar Estado de Resultados del Período Agropecuario · Rol: Contador · Prioridad: Alta
 * Ruta: /finanzas/estado-resultados
 *
 * Criterio: 0 violaciones axe A/AA en 1.1.1 (cada gráfica —composición de ingresos, composición de
 * gastos, resultado neto— con nombre accesible y tabla alternativa con los mismos datos); 1.3.1
 * (tablas alternativas con encabezados de columna y fila); 1.4.11 (segmentos ≥ 3:1 entre sí o
 * distinguidos por patrón o etiqueta).
 *
 * Ambiente: en TEST no hay estados de resultados generados (paso a). El estado de septiembre 2026
 * (período cerrado) se simula con todas las categorías ("Datos simulados").
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_260_VIEWPORTS=escritorio
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, auditarTabla, desviacion, escanear, main, precondicion } from '../../../_shared/sigabA11y';
import { abrirSesionRol, elegirPeriodo, irFinanzas, quitarSimulaciones, simularEstados } from '../../_shared/finanzas';

const TC_ID = 'TC-DIS-260';
const VIEWPORTS = (process.env.TC_DIS_260_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['estado-real', 'dashboard-estado'];

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe('TC-DIS-260 — Tabla alternativa a las gráficas del Estado de Resultados', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionRol(browser, testInfo, 'admin'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_260_VIEWPORTS.`);
  });
  test.afterEach(async () => { if (page) await quitarSimulaciones(page); });

  test('a. Estado de resultados real; precondición: estado generado para un período cerrado', async ({}, testInfo) => {
    await irFinanzas(page, 'estado-resultados', /Estado de resultados/);
    // Reejecución 2026-11-11: período real de Finca El Rosal (NIT 901458732).
    await elegirPeriodo(page, 253);
    await escanear(page, TC_ID, __dirname, 'estado-real', testInfo, LH);
    const versiones = await main(page).locator('table tbody tr').count();
    anotar(testInfo, 'Estado real', `${versiones} versión(es) en el período elegido`);
    precondicion(versiones > 0, 'no hay estados de resultados generados en TEST; se evalúa con datos simulados (b)');
  });

  test('b. [1.1.1 / 1.3.1 / 1.4.11] Gráficas del estado y sus tablas alternativas (Datos simulados)', async ({}, testInfo) => {
    await simularEstados(page);
    anotar(testInfo, 'Datos simulados', 'Septiembre 2026 CERRADO con v2 APROBADO (ingresos $1.650.000, gastos $1.190.000, ganancia $460.000).');
    await irFinanzas(page, 'estado-resultados', /Estado de resultados/);
    await elegirPeriodo(page, 9101);
    await main(page).getByRole('region', { name: /Ingresos/i }).first().waitFor({ timeout: 15_000 }).catch(() => {});
    await escanear(page, TC_ID, __dirname, 'dashboard-estado', testInfo, LH);
    const graficas = await main(page).locator('svg[role="img"], canvas, [role="img"], figure').evaluateAll((gs) => gs.map((g) => `${g.tagName.toLowerCase()} "${g.getAttribute('aria-label') ?? ''}"`));
    anotar(testInfo, 'Gráficas encontradas', graficas.join(' ¦ ') || '(ninguna)');
    desviacion(graficas.length >= 3, '1.1.1: el estado de resultados no tiene las gráficas de composición de ingresos, composición de gastos y resultado neto (solo tablas y cifras)');
    for (const nombre of [/Ingresos/i, /Gastos/i]) {
      const tabla = main(page).getByRole('region', { name: nombre }).locator('table');
      expect.soft(await tabla.count(), `No hay tabla de ${nombre}`).toBeGreaterThan(0);
      if (!(await tabla.count())) continue;
      const t = await auditarTabla(tabla.first());
      const thFila = await tabla.first().locator('tbody th[scope="row"], tbody th').count();
      anotar(testInfo, `Tabla ${nombre}`, `Encabezados: ${t.encabezados.join(' | ')} · ${t.filas} filas · encabezados de fila: ${thFila}`);
      desviacion(thFila > 0, `1.3.1: la tabla de ${nombre.source} no tiene encabezados de fila (la categoría va en un td)`);
    }
  });
});
