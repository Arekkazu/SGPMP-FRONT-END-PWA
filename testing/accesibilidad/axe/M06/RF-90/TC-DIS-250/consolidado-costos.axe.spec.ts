// | Fecha      | Nombre          | Que se hizo                                                        |
// |------------|-----------------|--------------------------------------------------------------------|
// | 2026-11-07 | SaraSofGonzalez | TC-DIS-250 RF-90: consolidado de costos del período                |
/**
 * TC-DIS-250 — Verificar accesibilidad WCAG 2.1 AA del consolidado de costos del período por activo,
 * naturaleza, subtipo y origen
 * RF-90 · CU-09 · Rol: Contador y Administrador · Prioridad: Media
 * Ruta: /finanzas/costos (tarjetas por naturaleza + registros del período)
 *
 * Criterio: 0 violaciones axe A/AA en 1.3.1 (tabla del consolidado con encabezados de fila y columna;
 * subtotales identificados como tales; montos en COP legibles); 1.4.1 (tratamiento contable y
 * vehículo hacia la contabilidad externa en texto); 4.1.2 (sin controles sin función en la vista del
 * Administrador); sin enums crudos ni null.
 *
 * Ambiente: el período real no tiene costos; el consolidado se evalúa con 9 costos simulados de las
 * tres naturalezas y los cuatro orígenes, con un grupo de reparto y una inversión capitalizada
 * ("Datos simulados"). La cuenta es Admin (la del Contador no existe en TEST).
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_250_VIEWPORTS=escritorio
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, auditarTabla, desviacion, escanear, main } from '../../../_shared/sigabA11y';
import { ACTIVOS, COSTOS, PERIODOS, abrirSesionRol, irFinanzas, quitarSimulaciones, simularGet, textosCrudos } from '../../_shared/finanzas';

const TC_ID = 'TC-DIS-250';
const VIEWPORTS = (process.env.TC_DIS_250_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['consolidado'];

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe('TC-DIS-250 — Consolidado de costos del período', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionRol(browser, testInfo, 'admin'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_250_VIEWPORTS.`);
  });
  test.afterEach(async () => { if (page) await quitarSimulaciones(page); });

  test('a. [1.3.1 / 1.4.1] Consolidado por naturaleza, subtipo, origen y activo (Datos simulados)', async ({}, testInfo) => {
    await simularGet(page, /^\/finanzas\/periodos\/?$/, PERIODOS);
    await simularGet(page, /^\/finanzas\/costos$/, COSTOS);
    await simularGet(page, /^\/finanzas\/activos$/, ACTIVOS);
    anotar(testInfo, 'Datos simulados', '9 costos de noviembre 2026: 3 naturalezas, 4 orígenes, reparto en 2 activos, inversión capitalizada.');
    await irFinanzas(page, 'costos', /Costos del período/);
    await escanear(page, TC_ID, __dirname, 'consolidado', testInfo, LH);

    const tarjetas = main(page).locator('.fin-columnas section');
    const resumen = await tarjetas.evaluateAll((ss) => ss.map((s) => (s as HTMLElement).innerText.replace(/\s+/g, ' ').trim()));
    anotar(testInfo, 'Tarjetas por naturaleza', resumen.join(' ¦ '));
    expect.soft(resumen.length, 'No hay consolidado por naturaleza').toBeGreaterThanOrEqual(3);
    const tablasConsolidado = await main(page).locator('.fin-columnas table').count();
    desviacion(tablasConsolidado > 0, '1.3.1: los subtotales por subtipo se muestran como barras con rótulo, no como tabla con encabezados de fila y columna');
    desviacion(/origen|consumo de inventario|compra a proveedor/i.test(resumen.join(' ')), '1.3.1: el consolidado no agrupa por origen del costo (solo por naturaleza y subtipo)');
    const porActivo = await main(page).getByText(/por activo|total por activo/i).count();
    desviacion(porActivo > 0, '1.3.1: no hay consolidado por activo (solo el listado de registros)');

    const tabla = main(page).getByRole('region', { name: /Registros del período/i }).locator('table');
    const t = await auditarTabla(tabla);
    anotar(testInfo, 'Tabla de registros', `Encabezados: ${t.encabezados.join(' | ')} · ${t.filas} filas · desalineadas ${t.filasDesalineadas.join(',') || '—'}`);
    const filas = await tabla.locator('tbody tr').evaluateAll((trs) => trs.map((tr) => (tr as HTMLElement).innerText.replace(/\s+/g, ' ')));
    desviacion(filas.some((f) => /factura de compra/i.test(f)) && filas.some((f) => /asiento NIC ?41/i.test(f)),
      '1.4.1: el vehículo hacia la contabilidad externa (factura de compra / comprobante NIC 41 / ninguno) no se expresa en texto en cada costo');
    desviacion(filas.some((f) => /capitaliz/i.test(f)), '1.4.1: la inversión capitalizada no se identifica en texto');
    const totales = await main(page).locator('.fin-kpi__valor').allInnerTexts();
    anotar(testInfo, 'Montos de subtotal', totales.join(' ¦ '));
    expect.soft(totales.every((m) => /\$\s?[\d.]+/.test(m)), 'Montos sin formato de moneda COP').toBe(true);
    const crudos = await textosCrudos(main(page));
    desviacion(crudos.length === 0, `regla de textos visibles: valores crudos en pantalla → ${crudos.join(' ¦ ')}`);
  });

  test('b. [4.1.2] Vista del Administrador: sin controles de edición activos', async ({}, testInfo) => {
    await simularGet(page, /^\/finanzas\/periodos\/?$/, PERIODOS);
    await simularGet(page, /^\/finanzas\/costos$/, COSTOS);
    await simularGet(page, /^\/finanzas\/activos$/, ACTIVOS);
    await irFinanzas(page, 'costos', /Costos del período/);
    const edicion = await main(page).getByRole('button', { name: /Registrar costo|Clasificar/ }).allInnerTexts();
    anotar(testInfo, 'Controles de edición para Admin', edicion.join(' ¦ ') || '(ninguno)');
    desviacion(edicion.length === 0, `4.1.2: la vista del Administrador ofrece controles de edición (${[...new Set(edicion)].join(', ')}); el caso espera una vista de consulta`);
  });
});
