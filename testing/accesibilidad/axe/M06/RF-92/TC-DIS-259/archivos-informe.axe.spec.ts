// | Fecha      | Nombre          | Que se hizo                                                        |
// |------------|-----------------|--------------------------------------------------------------------|
// | 2026-11-07 | SaraSofGonzalez | TC-DIS-259 RF-92: archivos descargados del informe (PDF/A y Excel) |
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
 * Ambiente: en TEST no hay un informe APROBADO real visible (Admin no tiene permiso sobre
 * Revelaciones, Productor no puede consultar los períodos y no hay cuentas de Contador ni Auditor).
 * Los archivos generados por el backend no se pueden obtener: esa parte queda en BLOQUEO (paso a).
 * La interfaz de descarga se evalúa con permiso, historial y archivo simulados (paso b, "Datos
 * simulados"); el archivo simulado no se valida.
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_259_VIEWPORTS=escritorio
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, desviacion, escanear, main, precondicion } from '../../../_shared/sigabA11y';
import {
  abrirSesionRol, accesoDenegado, anunciosDurante, elegirPeriodo, irFinanzas, quitarSimulaciones, simularRevelaciones,
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
    ({ contexto, page } = await abrirSesionRol(browser, testInfo, 'admin'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_259_VIEWPORTS.`);
  });
  test.afterEach(async () => { if (page) await quitarSimulaciones(page); });

  test('a. Precondición: informe APROBADO real para descargar el PDF/A-1 y el Excel UPRA', async ({}, testInfo) => {
    await irFinanzas(page, 'revelaciones', /Revelaciones/);
    const denegado = await accesoDenegado(page);
    anotar(testInfo, 'Estado real (Admin)', denegado ? 'No tienes acceso a esta sección' : 'con acceso');
    precondicion(false, 'no hay un informe APROBADO accesible en TEST: no se pueden validar el PDF/A-1 (etiquetado, idioma, título, rollforward) ni el Excel UPRA (encabezados, hojas, celdas combinadas) generados por el backend');
  });

  test('b. [4.1.3] Interfaz de descarga del informe aprobado: anuncio del estado (Datos simulados)', async ({}, testInfo) => {
    await simularRevelaciones(page);
    await page.route((u) => /\/revelaciones\/\d+\/descarga$/.test(u.pathname), (r) => r.fulfill({
      status: 200, headers: { 'content-type': 'application/pdf', 'content-disposition': 'attachment; filename="revelaciones-simulado.pdf"', 'access-control-expose-headers': 'Content-Disposition' },
      body: Buffer.from('%PDF-1.4\n% archivo simulado\n'),
    }));
    anotar(testInfo, 'Datos simulados', 'Permiso revelaciones_nic41·R; versión v2 APROBADO; la descarga responde un PDF de muestra (no se valida).');
    await irFinanzas(page, 'revelaciones', /Revelaciones/);
    await elegirPeriodo(page, 9101);
    await main(page).locator('table tbody tr').filter({ hasText: 'Aprobado' }).getByRole('button', { name: /Ver informe/ }).click();
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
});
