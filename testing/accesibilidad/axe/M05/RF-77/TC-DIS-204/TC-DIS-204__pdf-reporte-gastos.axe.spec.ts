// | Fecha      | Nombre          | Que se hizo                                                        |
// |------------|-----------------|--------------------------------------------------------------------|
// | 2026-11-08 | SaraSofGonzalez | TC-DIS-204 RF-77: PDF exportado del Reporte de Gastos              |
/**
 * TC-DIS-204 — [CRÍTICO] Accesibilidad del PDF exportado del Reporte de Gastos Acumulados
 * RF-77 · CU-03 · Rol: Productor o Administrador
 * Suministros → Reporte de gastos → PDF
 *
 * Criterio: el PDF tiene estructura etiquetada (encabezados, tablas, orden de lectura) equivalente a
 * PDF/UA básico; tendencia y categorías no dependen solo del color; contraste ≥ 4.5:1.
 *
 * Datos: el historial de reportes en TEST está vacío y no se generó uno real porque queda registrado
 * y no se puede borrar. Sin reporte real no hay PDF real: el criterio del archivo queda en BLOQUEO
 * (paso a). El paso b recorre solo la interfaz de exportación con respuestas simuladas; el archivo
 * simulado NO se valida.
 */
import { expect, test } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, escanear, esGet, irA, json, main, precondicion } from '../../../_shared/sigabA11y';
import { anunciosDurante, generarReporte, reporteGasto, sesionDelCaso, simularEscritura, simularGeneracion } from '../../_shared/suministros';

const TC_ID = 'TC-DIS-204';
const LH = ['exportacion-pdf'];

test.use({ actionTimeout: 15_000, locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe('TC-DIS-204 — PDF exportado del Reporte de Gastos', () => {
  const s = sesionDelCaso(TC_ID, 'PRODUCTOR');

  test('a. Precondición: reporte real para exportar el PDF', async ({}, testInfo) => {
    const { page } = s;
    const r = await irA(page, 'suministros/gastos', 'Reporte de gastos', esGet('/suministros/reportes-gastos/historial'));
    const h = await json<{ total: number }>(r);
    anotar(testInfo, 'Historial real', `${h?.total ?? '?'} reporte(s)`);
    precondicion((h?.total ?? 0) > 0, 'no hay reportes reales en TEST: el PDF generado por el backend no se pudo obtener ni validar (BLOQUEO del criterio del archivo)');
  });

  test('b. Interfaz de exportación: botón y descarga (Datos simulados; el archivo no se valida)', async ({}, testInfo) => {
    const { page } = s;
    await simularGeneracion(page, () => reporteGasto());
    await simularEscritura(page, /\/reportes-gastos\/\d+\/exportacion$/, () => ({ status: 200, json: { id_archivo: 'a-1', formato: 'PDF', nombre_archivo: 'reporte-simulado.pdf', total_registros: 15, fecha_expiracion: '2026-11-09T09:00:00' } }));
    await page.route((u) => /\/reportes-gastos\/exportaciones\//.test(u.pathname), (rt) => rt.fulfill({ status: 200, contentType: 'application/pdf', body: Buffer.from('%PDF-1.4\n% simulado\n') }));
    await irA(page, 'suministros/gastos', 'Reporte de gastos');
    await generarReporte(page);
    const pdf = main(page).getByRole('button', { name: 'PDF', exact: true });
    await expect(pdf, 'El reporte no ofrece exportar a PDF').toBeVisible();
    await escanear(page, TC_ID, __dirname, 'exportacion-pdf', testInfo, LH);
    const descarga = page.waitForEvent('download', { timeout: 20_000 }).catch(() => null);
    await pdf.focus();
    await page.keyboard.press('Enter');
    const anuncios = await anunciosDurante(page, 2000);
    const d = await descarga;
    anotar(testInfo, 'Datos simulados', `Descarga: ${d?.suggestedFilename() ?? 'no se produjo'} · regiones vivas: ${anuncios.join(' ¦ ') || '(ninguna)'}`);
    expect.soft(d, 'La exportación a PDF no produce la descarga').not.toBeNull();
  });
});
