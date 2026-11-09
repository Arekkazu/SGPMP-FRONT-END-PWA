// | Fecha      | Nombre          | Que se hizo                                                        |
// |------------|-----------------|--------------------------------------------------------------------|
// | 2026-11-07 | SaraSofGonzalez | TC-DIS-253 RF-COT: vista de solo consulta de cotizaciones (Productor) |
/**
 * TC-DIS-253 — Verificar accesibilidad WCAG 2.1 AA de la vista de solo consulta de cotizaciones
 * para el Productor
 * RF-COT · CU-COT · Rol: Productor · Prioridad: Media
 * Ruta: /finanzas/cotizaciones (cuenta Productor)
 *
 * Criterio: 0 violaciones axe A/AA en 1.3.1 (detalle como lista de definiciones o tabla con
 * etiquetas); 1.4.1 (estado en texto + ícono); 4.1.2 (sin controles de edición deshabilitados que el
 * lector anuncie como acciones); 2.1.1 y 2.4.3 (orden de foco lógico entre listado y detalle).
 *
 * Ambiente: cuenta Productor real de TEST (Acuícola El Remanso) y sus cotizaciones reales COTIZADO y
 * VENCIDA. No hay cotización ANULADA del productor: el estado se revisa con lo que existe.
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_253_VIEWPORTS=escritorio
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, auditarTabla, desviacion, escanear, main, precondicion, recorrerConTab } from '../../../_shared/sigabA11y';
import { abrirSesionRol, badges, irFinanzas, quitarSimulaciones, textosCrudos } from '../../_shared/finanzas';

const TC_ID = 'TC-DIS-253';
const VIEWPORTS = (process.env.TC_DIS_253_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['consulta-productor'];

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe('TC-DIS-253 — Consulta de cotizaciones del Productor', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionRol(browser, testInfo, 'productor'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_253_VIEWPORTS.`);
  });
  test.afterEach(async () => { if (page) await quitarSimulaciones(page); });

  test('a. [1.3.1 / 1.4.1 / 4.1.2] Listado real del Productor: escaneo, estados y ausencia de controles de edición', async ({}, testInfo) => {
    await irFinanzas(page, 'cotizaciones', /Cotizaciones/);
    await escanear(page, TC_ID, __dirname, 'consulta-productor', testInfo, LH);
    const tabla = main(page).locator('table');
    const t = await auditarTabla(tabla);
    const b = await badges(tabla);
    anotar(testInfo, 'Tabla', `Encabezados: ${t.encabezados.join(' | ')} · ${t.filas} filas · estados: ${b.map((x) => x.texto).join(', ')}`);
    precondicion(b.some((x) => x.texto === 'Anulada'), 'el Productor no tiene cotizaciones ANULADA en TEST (solo Cotizada y Vencida)');
    desviacion(b.every((x) => x.icono), '1.4.1: el estado de la cotización no lleva ícono, solo texto y color');
    const edicion = await main(page).getByRole('button', { name: /Registrar|Modificar|Anular/ }).count();
    const deshabilitados = await main(page).locator('button[disabled], [aria-disabled="true"]').evaluateAll((bs) => bs.map((x) => (x.getAttribute('aria-label') ?? x.textContent ?? '').trim()));
    anotar(testInfo, 'Controles', `Edición: ${edicion} · deshabilitados: ${deshabilitados.join(', ') || '—'}`);
    expect.soft(edicion, '4.1.2: el Productor ve controles de crear, modificar o anular').toBe(0);
    expect.soft(deshabilitados.filter((x) => /Registrar|Modificar|Anular/.test(x)), '4.1.2: hay controles de edición deshabilitados que el lector anuncia').toEqual([]);
    const activos = await tabla.locator('tbody tr td:nth-child(2)').allInnerTexts();
    anotar(testInfo, 'Columna Activos', activos.map((a) => a.replace(/\s+/g, ' ')).join(' ¦ '));
    desviacion(!activos.some((a) => /fuera de la contabilidad/i.test(a)),
      '1.3.1: el Productor no ve el identificador de los activos cotizados ("Activo fuera de la contabilidad"): no tiene permiso para leer los activos valorados');
    const crudos = await textosCrudos(main(page));
    desviacion(crudos.length === 0, `regla de textos visibles: valores crudos → ${crudos.join(' ¦ ')}`);
  });

  test('b. [1.3.1 / 2.1.1 / 2.4.3] Detalle de una cotización y orden de foco entre listado y detalle', async ({}, testInfo) => {
    await irFinanzas(page, 'cotizaciones', /Cotizaciones/);
    const fila = main(page).locator('table tbody tr').first();
    const abrible = await fila.locator('button, a, [tabindex="0"]').count() + (await fila.getAttribute('tabindex') !== null ? 1 : 0);
    anotar(testInfo, 'Detalle', abrible ? 'la fila tiene un control para abrir el detalle' : 'la fila no abre ningún detalle');
    desviacion(abrible > 0, '1.3.1/2.4.3: no existe un detalle de la cotización (lista de definiciones con activos, valor propuesto, valor de referencia, vencimiento y estado)');
    await main(page).getByRole('searchbox').first().focus().catch(() => {});
    const recorrido = await recorrerConTab(page, 6);
    anotar(testInfo, 'Recorrido con Tab desde la búsqueda', recorrido.join(' → '));
  });
});
