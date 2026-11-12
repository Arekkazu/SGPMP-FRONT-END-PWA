// | Fecha      | Nombre          | Que se hizo                                                        |
// |------------|-----------------|--------------------------------------------------------------------|
// | 2026-11-08 | SaraSofGonzalez | TC-DIS-204 RF-77: PDF exportado del Reporte de Gastos              |
// | 2026-11-11 | SaraSofGonzalez | TC-DIS-204 RF-77: reejecución; abre el reporte real del activo #1032 aunque haya otros en el historial |
/**
 * TC-DIS-204 — [CRÍTICO] Accesibilidad del PDF exportado del Reporte de Gastos Acumulados
 * RF-77 · CU-03 · Rol: Productor o Administrador
 * Suministros → Reporte de gastos → PDF
 *
 * Criterio: el PDF tiene estructura etiquetada (encabezados, tablas, orden de lectura) equivalente a
 * PDF/UA básico; tendencia y categorías no dependen solo del color; contraste ≥ 4.5:1.
 *
 * Datos: con autorización de la responsable del caso (2026-11-08) se generó UN reporte real con la
 * cuenta Admin (activo #1032 QA-M05-BOV-CICLOS, septiembre y octubre 2026, desglose mensual), que queda
 * registrado y no se puede borrar. Los activos del Productor con registros no sirven: #1 y #5 no tienen
 * fecha de inicio de ciclo (422 ACTIVO_SIN_CICLO) y #57 solo tiene un consumo de $ 10. El
 * paso a reutiliza el último reporte del historial: reejecutar no crea otro. La exportación también es
 * real; su archivo expira a las 24 h. El PDF es el mismo en cualquier viewport: se valida en escritorio.
 * La revisión del spec es estructural (etiquetas, idioma, título); no reemplaza a PAC ni al lector.
 * El paso b recorre la interfaz de exportación con respuestas simuladas; ese archivo no se valida.
 */
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { expect, test } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, desviacion, escanear, esGet, irA, json, main } from '../../../_shared/sigabA11y';
import { anunciosDurante, generarReporte, reporteGasto, sesionDelCaso, simularEscritura, simularGeneracion } from '../../_shared/suministros';

const TC_ID = 'TC-DIS-204';
const LH = ['exportacion-pdf'];

test.use({ actionTimeout: 15_000, locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe('TC-DIS-204 — PDF exportado del Reporte de Gastos', () => {
  const s = sesionDelCaso(TC_ID, 'ADMIN');

  test('a. Reporte real: generar una sola vez, exportar el PDF y revisar su estructura', async ({}, testInfo) => {
    test.skip(testInfo.project.name !== 'escritorio', 'El PDF no depende del viewport: se valida en escritorio.');
    const { page } = s;
    const permitir = (patron: RegExp) => page.route((u) => patron.test(u.pathname), (rt) => (rt.request().method() === 'POST' ? rt.continue() : rt.fallback()));
    const r = await irA(page, 'suministros/gastos', 'Reporte de gastos', esGet('/suministros/reportes-gastos/historial'));
    const h = await json<{ total: number }>(r);
    anotar(testInfo, 'Historial real antes de la prueba', `${h?.total ?? '?'} reporte(s)`);
    const seccion = page.locator('section[aria-labelledby="reporte-titulo"]');
    if ((h?.total ?? 0) > 0) {
      // El reporte real del caso es el del activo #1032; si no aparece, el primero del historial.
      const historial = main(page).getByRole('region', { name: 'Reportes generados' });
      const fila = historial.locator('tbody tr').filter({ hasText: '#1032' });
      await ((await fila.count()) ? fila.first() : historial).getByRole('button', { name: 'Ver', exact: true }).first().click();
    } else {
      await permitir(/\/suministros\/reportes-gastos\/?$/);
      await page.locator('#gastos-desde').fill('2026-09-01');
      await page.locator('#gastos-hasta').fill('2026-10-31');
      await page.locator('#gastos-granularidad').selectOption('MENSUAL');
      await page.locator('#gastos-activo').fill('1032');
      await page.locator('#gastos-activo').press('Escape');
      const post = page.waitForResponse((x) => /\/reportes-gastos\/?$/.test(new URL(x.url()).pathname) && x.request().method() === 'POST', { timeout: 120_000 });
      await main(page).getByRole('button', { name: 'Generar reporte', exact: true }).click();
      const respuesta = await post;
      anotar(testInfo, 'Generación real', `POST /reportes-gastos → HTTP ${respuesta.status()}${respuesta.ok() ? '' : ` · ${(await respuesta.text()).slice(0, 300)}`}`);
      expect(respuesta.ok(), 'El backend rechazó la generación del reporte').toBe(true);
    }
    await seccion.waitFor({ timeout: 180_000 });
    anotar(testInfo, 'Reporte real', (await seccion.innerText()).replace(/\s+/g, ' ').slice(0, 700));

    await permitir(/\/reportes-gastos\/\d+\/exportacion$/);
    const pdf = seccion.getByRole('button', { name: 'PDF', exact: true });
    const descarga = page.waitForEvent('download', { timeout: 120_000 }).catch(() => null);
    await pdf.focus();
    await page.keyboard.press('Enter');
    const anuncios = await anunciosDurante(page, 2500);
    const d = await descarga;
    anotar(testInfo, 'Exportación real', `${d?.suggestedFilename() ?? 'no se descargó'} · regiones vivas: ${anuncios.join(' ¦ ') || '(ninguna)'}`);
    expect(d, 'La exportación a PDF no produjo el archivo').not.toBeNull();
    const bytes = fs.readFileSync(await d!.path());
    fs.mkdirSync(path.join(__dirname, 'resultados'), { recursive: true });
    fs.writeFileSync(path.join(__dirname, 'resultados', 'TC-DIS-204-reporte-real.pdf'), bytes);

    // Los diccionarios pueden ir dentro de object streams comprimidos: se inflan antes de buscar.
    const crudo = bytes.toString('latin1');
    let texto = crudo;
    for (const m of crudo.matchAll(/stream\r?\n([\s\S]*?)\r?\n?endstream/g)) {
      try { texto += zlib.inflateSync(Buffer.from(m[1], 'latin1')).toString('latin1'); } catch { /* no es Flate */ }
    }
    const e = {
      esPdf: crudo.startsWith('%PDF'), etiquetado: /\/StructTreeRoot/.test(texto), marcado: /\/Marked\s+true/.test(texto), idioma: /\/Lang\s*[(<]/.test(texto),
      titulo: /\/Title\s*[(<]/.test(texto), mostrarTitulo: /\/DisplayDocTitle\s+true/.test(texto), tablas: /\/S\s*\/Table/.test(texto), encabezados: /\/S\s*\/H[1-6]?[\s/>]/.test(texto),
    };
    anotar(testInfo, 'PDF · estructura', JSON.stringify(e));
    expect(e.esPdf, 'El archivo no es un PDF').toBe(true);
    desviacion(e.etiquetado && e.marcado, 'PDF: no está etiquetado (sin StructTreeRoot / Marked true): el lector no recibe encabezados, tablas ni orden de lectura');
    desviacion(e.tablas, 'PDF: no hay tablas etiquetadas con filas y columnas asociadas');
    desviacion(e.encabezados, 'PDF: no hay encabezados etiquetados');
    desviacion(e.idioma, 'PDF: no declara el idioma del documento');
    desviacion(e.titulo && e.mostrarTitulo, 'PDF: no declara el título del documento o no lo muestra');
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
