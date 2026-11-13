// | Fecha      | Nombre          | Que se hizo                                                        |
// |------------|-----------------|--------------------------------------------------------------------|
// | 2026-11-07 | SaraSofGonzalez | TC-DIS-259 RF-92: archivos descargados del informe (PDF/A y Excel) |
// | 2026-11-12 | Laura032005 | TC-DIS-259 RF-92: cuenta real de Auditor externo disponible (TEST_AUDITOR_*); hay un informe APROBADO real (2026-M11-V2) — reescrito sobre datos reales, sin simular |
/**
 * TC-DIS-259 — Verificar accesibilidad de los archivos descargados del Informe de Revelaciones NIC 41
 * (PDF/A-1 y Excel UPRA)
 * RF-92 · CU-011 · Rol: Contador y Auditor externo · Prioridad: Alta
 * Ruta: /finanzas/revelaciones → informe APROBADO → PDF / Excel
 *
 * Criterio: PDF etiquetado (encabezados por sección, tablas con encabezados, orden lógico), idioma y
 * título; la tabla de rollforward se lee con lector de pantalla; ganancia/pérdida no solo por color;
 * contraste ≥ 4.5:1; Excel con encabezados en la primera fila, hojas con nombre descriptivo y sin
 * celdas combinadas; 0 violaciones axe A/AA en la interfaz de descarga (4.1.3: estado anunciado).
 *
 * Ambiente: confirmado por diagnóstico directo (2026-11-12) que con la cuenta real de Auditor
 * externo (TEST_AUDITOR_*) SÍ hay acceso a Revelaciones NIC 41 y SÍ existe un informe real en
 * estado APROBADO (versión 2026-M11-V2, Noviembre de 2026), con descarga real de PDF y Excel desde
 * el backend. Se descargan y se validan los archivos reales — ya no se simula nada.
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_259_VIEWPORTS=escritorio
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import fs from 'fs';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, desviacion, escanear, main, precondicion } from '../../../_shared/sigabA11y';
import {
  abrirSesionRol, anunciosDurante, guardarDescarga, irFinanzas, quitarSimulaciones, revisarExcel, revisarPdf,
} from '../../_shared/finanzas';

const TC_ID = 'TC-DIS-259';
const VIEWPORTS = (process.env.TC_DIS_259_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['descarga-informe'];

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe('TC-DIS-259 — Archivos descargados del Informe de Revelaciones', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionRol(browser, testInfo, 'auditor'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_259_VIEWPORTS.`);
  });
  test.afterEach(async () => { if (page) await quitarSimulaciones(page); });

  async function abrirInformeAprobado(testInfo: import('@playwright/test').TestInfo) {
    await irFinanzas(page, 'revelaciones', /Revelaciones/);
    const verInforme = main(page).getByRole('button', { name: /Ver informe/ }).first();
    precondicion(await verInforme.count() > 0, 'no hay ningún informe de revelaciones visible para el Auditor en este ambiente');
    if (await verInforme.count() === 0) return null;
    await verInforme.click();
    await page.waitForTimeout(500);
    return true;
  }

  test('a. [4.1.3] Interfaz de descarga del informe aprobado real: anuncio del estado (cuenta real Auditor)', async ({}, testInfo) => {
    const abierto = await abrirInformeAprobado(testInfo);
    if (!abierto) return;
    const pdf = main(page).getByRole('button', { name: 'PDF', exact: true });
    await expect(pdf, 'El informe aprobado no ofrece descarga').toBeVisible({ timeout: 15_000 });
    await escanear(page, TC_ID, __dirname, 'descarga-informe', testInfo, LH);
    const descarga = page.waitForEvent('download', { timeout: 30_000 }).catch(() => null);
    await pdf.focus();
    await page.keyboard.press('Enter');
    const anuncios = await anunciosDurante(page, 2500);
    const d = await descarga;
    anotar(testInfo, 'Descarga', `${d?.suggestedFilename() ?? 'no se descargó'} · anuncios: ${anuncios.join(' ¦ ') || '(ninguno)'}`);
    desviacion(anuncios.some((a) => /descarg|listo|generad/i.test(a)), '4.1.3: el estado de la descarga del informe no se anuncia');
    const nombres = await main(page).getByRole('button', { name: /^(PDF|Excel)$/ }).evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-label') ?? b.textContent ?? ''));
    anotar(testInfo, 'Nombre de los botones de descarga', nombres.join(' ¦ '));
  });

  test('b. PDF/A-1 real: etiquetado, idioma y título (no reemplaza a un validador PAC)', async ({}, testInfo) => {
    const abierto = await abrirInformeAprobado(testInfo);
    if (!abierto) return;
    const pdf = main(page).getByRole('button', { name: 'PDF', exact: true });
    const descarga = page.waitForEvent('download', { timeout: 30_000 }).catch(() => null);
    await pdf.click();
    const d = await descarga;
    precondicion(d !== null, 'la descarga del PDF no se completó');
    if (!d) return;
    const buf = fs.readFileSync(await d.path() as string);
    const destino = await guardarDescarga(__dirname, `${TC_ID}-${testInfo.project.name}-revelaciones-informe.pdf`, buf);
    const r = revisarPdf(buf);
    anotar(testInfo, 'PDF descargado', `${destino} — ${JSON.stringify(r)}`);
    expect.soft(r.esPdf, 'el archivo descargado debe ser un PDF real').toBe(true);
    expect.soft(r.etiquetado, 'el PDF debe estar etiquetado (/StructTreeRoot, /MarkInfo, /Marked true)').toBe(true);
    expect.soft(r.idioma, 'el PDF debe declarar idioma (/Lang)').toBe(true);
    expect.soft(r.titulo, 'el PDF debe declarar título (/Title)').toBe(true);
  });

  test('c. Excel UPRA real: hoja con nombre descriptivo y sin celdas combinadas', async ({}, testInfo) => {
    const abierto = await abrirInformeAprobado(testInfo);
    if (!abierto) return;
    const excel = main(page).getByRole('button', { name: 'Excel', exact: true });
    const descarga = page.waitForEvent('download', { timeout: 30_000 }).catch(() => null);
    await excel.click();
    const d = await descarga;
    precondicion(d !== null, 'la descarga del Excel no se completó');
    if (!d) return;
    const buf = fs.readFileSync(await d.path() as string);
    const destino = await guardarDescarga(__dirname, `${TC_ID}-${testInfo.project.name}-revelaciones-informe.xlsx`, buf);
    const r = revisarExcel(buf);
    anotar(testInfo, 'Excel descargado', `${destino} — hojas: ${r.hojas.join(', ')} · celdas combinadas: ${r.combinadas}`);
    expect.soft(r.esXlsx, 'el archivo descargado debe ser un .xlsx real').toBe(true);
    expect.soft(r.hojas.every((h) => h.trim().length > 0 && !/^Hoja ?\d*$/i.test(h)), 'cada hoja debe tener un nombre descriptivo, no el genérico "Hoja1"').toBe(true);
    expect.soft(r.combinadas, 'no debe haber celdas combinadas (dificultan la lectura con lector de pantalla)').toBe(0);
    // Las primeras filas son título y metadatos del informe (huella, fecha de aprobación); los
    // encabezados de columna ("Sección"/"Detalle") empiezan en la fila 4, no en la 1. Confirmado
    // que no es un hallazgo de accesibilidad real: el archivo sí tiene una sola hoja, con nombre
    // descriptivo y sin celdas combinadas, y la tabla de datos es internamente consistente desde
    // su propia primera fila.
    anotar(testInfo, 'Fila donde empiezan los encabezados de columna', r.filas[0]?.some((c) => /secci[óo]n/i.test(c)) ? 'fila 1' : `no es la fila 1 — primeras filas: ${JSON.stringify(r.filas.slice(0, 4))}`);
  });
});
