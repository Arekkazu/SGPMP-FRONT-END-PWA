// | Fecha      | Nombre      | Que se hizo                                                                     |
// |------------|-------------|---------------------------------------------------------------------------------|
// | 2026-11-19 | Laura032005 | TC-DIS-288 RF-104: estructura y accesibilidad de los PDF y Excel exportados      |
/**
 * TC-DIS-288 — Verificar accesibilidad WCAG 2.1 AA de los archivos exportados PDF y Excel (estructura, encabezados
 * y texto alternativo)
 * RF-104 · CU-02 Generar y exportar reportes del sistema · Rol: Contador · Prioridad: Media
 * Ruta: /reportes → reporte de valoración → Exportar en PDF / Excel
 *
 * Criterio: PDF etiquetado, con idioma y título (1.3.1, 1.3.2, 3.1.1); Excel con encabezados de columna en la
 * primera fila, hojas con nombre descriptivo y sin celdas combinadas en tablas de datos; el contenido no depende
 * solo del color (p. ej. el método COSTO dicho en texto, 1.4.1). Alcance confirmado: se revisan los archivos.
 *
 * Desbloqueado el 2026-11-19 (commit 606c7239). Los archivos son REALES: se genera el reporte de valoración del
 * Contador con el primer período cerrado que ofrece la pantalla. Generar no modifica datos de negocio: crea un
 * archivo temporal en "Mis reportes" (48 h). La revisión es estructural (como en M06 TC-DIS-264) y no reemplaza a
 * PAC ni al lector de pantalla, que se registran en la verificación manual.
 *
 * Viewports: el archivo es el mismo en cualquier ancho; se genera solo en escritorio. TC_DIS_288_VIEWPORTS cambia eso.
 */
import fs from 'fs';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, desviacion, escanear, main, precondicion } from '../../../_shared/sigabA11y';
import {
  abrirSesionM08, elegirReporte, guardarDescarga, irReportes, llenarFiltrosObligatorios, permitirReportes, quitarSimulaciones,
  revisarExcel, revisarPdf, tiposReporte,
} from '../../_shared/m08';

const TC_ID = 'TC-DIS-288';
const VIEWPORTS = (process.env.TC_DIS_288_VIEWPORTS ?? 'escritorio').split(',').map((v) => v.trim());
const LH = ['exportar'];
const VALORACION = 'REPORTE_VALORACION_NIC41';

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe('TC-DIS-288 — Archivos PDF y Excel del reporte de valoración', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionM08(browser, testInfo, 'contador'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_288_VIEWPORTS (el archivo no depende del ancho).`);
  });
  test.afterEach(async () => { if (page) await quitarSimulaciones(page); });

  /** Elige el formato, pide la vista previa, exporta y devuelve el archivo descargado (o null). */
  async function exportar(formato: 'PDF' | 'Excel', escanearPaso: boolean, testInfo: Parameters<typeof escanear>[4]) {
    await main(page).getByRole('radio', { name: formato, exact: true }).check();
    await main(page).getByRole('button', { name: 'Ver vista previa' }).click();
    const exportarBtn = main(page).getByRole('button', { name: `Exportar en ${formato}` });
    const lista = await expect(exportarBtn).toBeEnabled({ timeout: 60_000 }).then(() => true).catch(() => false);
    if (!lista) return null;
    if (escanearPaso) await escanear(page, TC_ID, __dirname, 'exportar', testInfo, LH);
    await exportarBtn.focus();
    const descarga = page.waitForEvent('download', { timeout: 90_000 }).catch(() => null);
    await page.keyboard.press('Enter');
    const d = await descarga;
    if (!d) return null;
    const bytes = fs.readFileSync((await d.path())!);
    await guardarDescarga(__dirname, `${TC_ID}-${d.suggestedFilename()}`, bytes);
    return { nombre: d.suggestedFilename(), bytes };
  }

  test('a. PDF y Excel REALES del reporte de valoración: estructura, idioma, encabezados y celdas combinadas', async ({}, testInfo) => {
    await permitirReportes(page);
    await irReportes(page);
    const tipos = await tiposReporte(page);
    precondicion(tipos.some((x) => x.valor === VALORACION), 'el Contador de TEST no tiene el reporte de valoración');
    if (!tipos.some((x) => x.valor === VALORACION)) return;
    await elegirReporte(page, VALORACION);
    await llenarFiltrosObligatorios(page);
    const filtros = await main(page).locator('[id^="filtro-"]').evaluateAll((es) => es.map((e) => {
      const s = e as HTMLSelectElement;
      return `${s.labels?.[0]?.textContent?.trim()}: ${s.tagName === 'SELECT' ? s.selectedOptions[0]?.textContent : s.value}`;
    }));
    anotar(testInfo, 'Filtros usados', filtros.join(' · '));
    anotar(testInfo, 'Datos', 'Reporte REAL de TEST; generar crea un archivo temporal de "Mis reportes" y no cambia datos de negocio.');

    const pdf = await exportar('PDF', true, testInfo);
    expect.soft(pdf, 'No se descargó el PDF (¿más de 1.000 registros y quedó en segundo plano?)').not.toBeNull();
    if (pdf) {
      const r = revisarPdf(pdf.bytes);
      anotar(testInfo, 'PDF · estructura', `${pdf.nombre} · ${JSON.stringify(r)}`);
      expect.soft(r.esPdf, 'El archivo descargado no es un PDF').toBe(true);
      desviacion(r.etiquetado, '1.3.1 / 1.3.2: el PDF no está etiquetado (sin StructTreeRoot / MarkInfo Marked true): sin estructura ni orden de lectura');
      desviacion(r.idioma, '3.1.1: el PDF no declara el idioma del documento');
      desviacion(r.titulo && r.mostrarTitulo, '2.4.2: el PDF no muestra un título descriptivo en la barra del lector');
    }

    const excel = await exportar('Excel', false, testInfo);
    expect.soft(excel, 'No se descargó el Excel').not.toBeNull();
    if (excel) {
      const x = revisarExcel(excel.bytes);
      anotar(testInfo, 'Excel · estructura', `${excel.nombre} · hojas: ${x.hojas.join(' | ')} · celdas combinadas: ${x.combinadas}`);
      anotar(testInfo, 'Excel · primeras filas', x.filas.map((f, i) => `${i + 1}: ${f.join(' | ')}`).join(' ¦ '));
      expect.soft(x.esXlsx, 'El Excel descargado no es un libro válido').toBe(true);
      expect.soft(x.combinadas, 'Excel: tiene celdas combinadas').toBe(0);
      desviacion(x.hojas.every((h) => !/^(Sheet|Hoja)\s?\d+$/i.test(h)), `Excel: hojas sin nombre descriptivo (${x.hojas.join(', ')})`);
      const primera = x.filas[0] ?? [];
      desviacion(primera.filter(Boolean).length > 1, `Excel: la primera fila no son los encabezados de columna (dice «${primera.join(' | ')}»)`);
      const texto = x.filas.flat().join(' ');
      // 1.4.1: el método de medición debe ir en texto; si ningún activo se valora al costo, no hay qué comprobar.
      anotar(testInfo, 'Método de medición en el Excel', /costo/i.test(texto) ? 'aparece "costo" en texto' : 'no aparece "costo" en las primeras filas (no hay activos al costo o no se dice): revisar a mano');
    }
  });
});
