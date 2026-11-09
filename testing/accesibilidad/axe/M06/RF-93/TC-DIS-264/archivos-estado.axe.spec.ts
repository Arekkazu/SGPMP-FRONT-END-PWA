// | Fecha      | Nombre          | Que se hizo                                                        |
// |------------|-----------------|--------------------------------------------------------------------|
// | 2026-11-07 | SaraSofGonzalez | TC-DIS-264 RF-93: archivo descargado del estado de resultados      |
/**
 * TC-DIS-264 — Verificar accesibilidad del archivo descargado del Estado de Resultados (PDF y Excel)
 * RF-93 · CU-012 · Rol: Contador · Prioridad: Media
 * Ruta: /finanzas/estado-resultados → versión APROBADO → PDF / Excel
 *
 * Criterio: PDF etiquetado (encabezados, tabla con filas y columnas, orden lógico), idioma, título y
 * contraste ≥ 4.5:1; en PDF y Excel ingresos y gastos con signo o etiqueta, resultado "Ganancia" o
 * "Pérdida"; Excel con encabezados en la primera fila y sin celdas combinadas; 0 violaciones axe A/AA
 * en la interfaz de descarga (4.1.3: estado anunciado).
 *
 * Ambiente: en TEST no hay estados de resultados aprobados (paso a): los archivos del backend no se
 * pueden obtener y esa parte queda en BLOQUEO. La interfaz de descarga se evalúa con un estado
 * aprobado y un archivo simulados (paso b, "Datos simulados"); el archivo simulado no se valida.
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_264_VIEWPORTS=escritorio
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, desviacion, escanear, main, precondicion } from '../../../_shared/sigabA11y';
import { abrirSesionRol, anunciosDurante, elegirPeriodo, irFinanzas, quitarSimulaciones, simularEstados } from '../../_shared/finanzas';

const TC_ID = 'TC-DIS-264';
const VIEWPORTS = (process.env.TC_DIS_264_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['descarga-estado'];

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe('TC-DIS-264 — Archivo descargado del Estado de Resultados', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionRol(browser, testInfo, 'admin'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_264_VIEWPORTS.`);
  });
  test.afterEach(async () => { if (page) await quitarSimulaciones(page); });

  test('a. Precondición: estado de resultados APROBADO real para descargar PDF y Excel', async ({}, testInfo) => {
    await irFinanzas(page, 'estado-resultados', /Estado de resultados/);
    const opciones = await page.locator('#fin-periodo option').evaluateAll((os) => os.filter((o) => /Cerrado/.test(o.textContent ?? '')).map((o) => (o as HTMLOptionElement).value));
    let aprobados = 0;
    for (const v of opciones) {
      await elegirPeriodo(page, Number(v));
      aprobados += await main(page).locator('table tbody tr').filter({ hasText: /Aprobado/ }).count();
    }
    anotar(testInfo, 'Estados aprobados reales', `${aprobados} en ${opciones.length} período(s) cerrado(s)`);
    precondicion(aprobados > 0, 'no hay estados de resultados APROBADOS en TEST: no se pueden validar el PDF y el Excel generados por el backend (BLOQUEO)');
  });

  test('b. [4.1.3] Interfaz de descarga del estado aprobado: anuncio del estado (Datos simulados)', async ({}, testInfo) => {
    await simularEstados(page);
    await page.route((u) => /\/estados-resultados\/\d+\/descarga$/.test(u.pathname), (r) => r.fulfill({
      status: 200, headers: { 'content-type': 'application/pdf', 'content-disposition': 'attachment; filename="estado-resultados-simulado.pdf"', 'access-control-expose-headers': 'Content-Disposition' },
      body: Buffer.from('%PDF-1.4\n% archivo simulado\n'),
    }));
    anotar(testInfo, 'Datos simulados', 'Septiembre 2026: v2 APROBADO; la descarga responde un PDF de muestra (no se valida).');
    await irFinanzas(page, 'estado-resultados', /Estado de resultados/);
    await elegirPeriodo(page, 9101);
    const pdf = main(page).getByRole('button', { name: 'PDF', exact: true });
    await expect(pdf, 'El estado aprobado no ofrece descarga').toBeVisible({ timeout: 15_000 });
    await escanear(page, TC_ID, __dirname, 'descarga-estado', testInfo, LH);
    const descarga = page.waitForEvent('download', { timeout: 30_000 }).catch(() => null);
    await pdf.focus();
    await page.keyboard.press('Enter');
    const anuncios = await anunciosDurante(page, 2500);
    const d = await descarga;
    anotar(testInfo, 'Descarga', `${d?.suggestedFilename() ?? 'no se descargó'} · anuncios: ${anuncios.join(' ¦ ') || '(ninguno)'}`);
    desviacion(anuncios.some((a) => /descarg|listo|generad/i.test(a)), '4.1.3: el estado de la descarga no se anuncia');
  });
});
