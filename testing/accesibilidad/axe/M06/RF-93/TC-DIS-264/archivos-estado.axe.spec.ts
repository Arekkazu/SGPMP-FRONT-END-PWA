// | Fecha      | Nombre          | Que se hizo                                                        |
// |------------|-----------------|--------------------------------------------------------------------|
// | 2026-11-07 | SaraSofGonzalez | TC-DIS-264 RF-93: archivo descargado del estado de resultados      |
// | 2026-11-11 | SaraSofGonzalez | TC-DIS-264 RF-93: reejecución; PDF y Excel reales del estado aprobado #32 |
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
 * Ambiente (reejecución 2026-11-11): el estado #32 (octubre 2026, Finca El Rosal, NIT 901458732)
 * está APROBADO; el paso a descarga y revisa su PDF y su Excel reales. La interfaz de descarga se
 * evalúa además con un estado y un archivo simulados (paso b, "Datos simulados").
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_264_VIEWPORTS=escritorio
 */
import fs from 'fs';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, desviacion, escanear, main, precondicion } from '../../../_shared/sigabA11y';
import {
  abrirSesionRol, anunciosDurante, elegirPeriodo, guardarDescarga, irFinanzas, quitarSimulaciones, revisarExcel, revisarPdf, simularEstados,
} from '../../_shared/finanzas';

const TC_ID = 'TC-DIS-264';
const PERIODO_REAL = 253;
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

  test('a. PDF y Excel reales del estado APROBADO #32 (octubre 2026, Finca El Rosal)', async ({}, testInfo) => {
    // Reejecución 2026-11-11: el estado #32 del período cerrado #253 quedó APROBADO. Sus archivos se
    // descargan desde la interfaz (solo lectura) y se revisan aquí; el contraste y las etiquetas del
    // PDF se verificaron además con pypdf y PyMuPDF (ver la nota del PR).
    await irFinanzas(page, 'estado-resultados', /Estado de resultados/);
    await elegirPeriodo(page, PERIODO_REAL);
    const fila = main(page).locator('table tbody tr').filter({ hasText: /Aprobado/ }).first();
    await fila.waitFor({ timeout: 20_000 }).catch(() => {});
    const aprobado = (await fila.count()) > 0;
    anotar(testInfo, 'Estado aprobado real', aprobado ? (await fila.innerText()).replace(/\s+/g, ' ') : '(no hay)');
    precondicion(aprobado, 'el período #253 ya no tiene un estado de resultados APROBADO (BLOQUEO)');
    if (!aprobado) return;
    const ver = fila.getByRole('button', { name: /ver/i });
    if (await ver.count()) await ver.first().click();
    await page.waitForTimeout(600);

    const bajar = async (formato: 'PDF' | 'Excel') => {
      const boton = main(page).getByRole('button', { name: formato, exact: true });
      await expect(boton, `No hay botón ${formato} en el estado aprobado`).toBeVisible({ timeout: 15_000 });
      const evento = page.waitForEvent('download', { timeout: 60_000 }).catch(() => null);
      await boton.focus();
      await page.keyboard.press('Enter');
      const d = await evento;
      if (!d) return null;
      const bytes = fs.readFileSync(await d.path());
      await guardarDescarga(__dirname, `${TC_ID}-${testInfo.project.name}-${d.suggestedFilename()}`, bytes);
      return { nombre: d.suggestedFilename(), bytes };
    };

    const pdf = await bajar('PDF');
    expect.soft(pdf, 'La descarga del PDF no se produjo').not.toBeNull();
    if (pdf) {
      const r = revisarPdf(pdf.bytes);
      anotar(testInfo, 'PDF · estructura', `${pdf.nombre} · ${JSON.stringify(r)}`);
      desviacion(r.etiquetado, 'PDF: no está etiquetado (sin StructTreeRoot / MarkInfo Marked true)');
      desviacion(r.idioma, 'PDF: no declara el idioma del documento');
      desviacion(r.titulo && r.mostrarTitulo, 'PDF: no muestra un título descriptivo en la barra del lector');
    }

    const excel = await bajar('Excel');
    expect.soft(excel, 'La descarga del Excel no se produjo').not.toBeNull();
    if (excel) {
      const x = revisarExcel(excel.bytes);
      anotar(testInfo, 'Excel · estructura', `${excel.nombre} · hojas: ${x.hojas.join(' | ')} · celdas combinadas: ${x.combinadas}`);
      anotar(testInfo, 'Excel · primeras filas', x.filas.map((f, i) => `${i + 1}: ${f.join(' | ')}`).join(' ¦ '));
      expect.soft(x.esXlsx, 'El Excel descargado no es un libro válido').toBe(true);
      expect.soft(x.combinadas, 'Excel: tiene celdas combinadas').toBe(0);
      const primera = x.filas[0] ?? [];
      desviacion(primera.length > 1 && primera.some((c) => /componente|concepto/i.test(c)),
        `Excel: la primera fila no son los encabezados de columna (dice «${primera.join(' | ')}»); los encabezados empiezan en la fila ${x.filas.findIndex((f) => f.some((c) => /componente/i.test(c))) + 1}`);
      const textoExcel = x.filas.flat().join(' ');
      desviacion(/ingreso|gasto/i.test(textoExcel), 'Excel: ingresos y gastos no llevan etiqueta de tipo');
    }
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
