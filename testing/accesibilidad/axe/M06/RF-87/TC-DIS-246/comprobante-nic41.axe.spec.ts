// | Fecha      | Nombre          | Que se hizo                                                        |
// |------------|-----------------|--------------------------------------------------------------------|
// | 2026-11-07 | SaraSofGonzalez | TC-DIS-246 RF-87: comprobante NIC 41 y su descarga en CSV y PDF    |
/**
 * TC-DIS-246 — Verificar accesibilidad del comprobante NIC 41 del período cerrado y de su descarga
 * en CSV y PDF
 * RF-87 · CU-06 - Ejecutar cierre del período contable · Rol: Contador · Prioridad: Media
 * Ruta: /finanzas/cierre (período cerrado) → tabla "Comprobantes NIC 41" → CSV / PDF
 *
 * Criterio: 0 violaciones axe A/AA en 1.3.1 (tabla de líneas con encabezados; débito y crédito
 * identificados por encabezado, no por posición o color); 4.1.3 (notificación de período cerrado y
 * estado de la descarga anunciados); el PDF tiene estructura etiquetada, idioma y título; el CSV
 * tiene encabezados descriptivos en la primera fila.
 *
 * Ambiente: se recorren los períodos CERRADOS reales de TEST y se usa el primero con comprobantes.
 * Las descargas son GET reales (no modifican datos); los archivos quedan en resultados/. La revisión
 * del PDF es estructural (StructTreeRoot, MarkInfo, Lang, Title): no reemplaza a PAC ni al lector.
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_246_VIEWPORTS=escritorio
 */
import fs from 'fs';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, auditarTabla, desviacion, escanear, main, precondicion } from '../../../_shared/sigabA11y';
import {
  PERIODOS, abrirSesionRol, anunciosDurante, elegirPeriodo, guardarDescarga, irFinanzas, quitarSimulaciones, revisarPdf, simularGet,
} from '../../_shared/finanzas';

const TC_ID = 'TC-DIS-246';
const VIEWPORTS = (process.env.TC_DIS_246_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['comprobantes', 'comprobantes-simulados'];

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe('TC-DIS-246 — Comprobante NIC 41 y su descarga', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;
  let conComprobantes = false;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionRol(browser, testInfo, 'admin'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_246_VIEWPORTS.`);
  });
  test.afterEach(async () => { if (page) await quitarSimulaciones(page); });

  test('a. [1.3.1] Período cerrado real con comprobantes: escaneo y tabla de líneas', async ({}, testInfo) => {
    await irFinanzas(page, 'cierre', /Cierre del período/);
    const cerrados = await page.locator('#fin-periodo option').evaluateAll((os) => os.filter((o) => /Cerrado/.test(o.textContent ?? '')).map((o) => ({ v: (o as HTMLOptionElement).value, t: o.textContent ?? '' })));
    const probados: string[] = [];
    for (const p of cerrados) {
      await elegirPeriodo(page, Number(p.v));
      const tabla = main(page).getByRole('region', { name: /Comprobantes/i }).locator('table');
      const n = (await tabla.count()) ? await tabla.locator('tbody tr').count() : 0;
      probados.push(`${p.t}: ${n}`);
      if (n > 0) { conComprobantes = true; break; }
    }
    anotar(testInfo, 'Períodos cerrados revisados (comprobantes)', probados.join(' ¦ ') || '(ninguno)');
    precondicion(conComprobantes, 'ningún período CERRADO del ambiente tiene comprobantes NIC 41 (la tabla se evalúa con datos simulados en c)');
    if (!conComprobantes) return;

    await escanear(page, TC_ID, __dirname, 'comprobantes', testInfo, LH);
    const tabla = main(page).getByRole('region', { name: /Comprobantes/i }).locator('table');
    const t = await auditarTabla(tabla);
    anotar(testInfo, 'Tabla de comprobantes', `Encabezados: ${t.encabezados.join(' | ')} · ${t.filas} fila(s) · desalineadas: ${t.filasDesalineadas.join(',') || '—'} · vacías: ${t.celdasVacias.join(', ') || '—'}`);
    expect.soft(t.filasDesalineadas, '1.3.1: filas con un número de celdas distinto al de encabezados').toEqual([]);
    desviacion(t.encabezados.some((e) => /d[eé]bito/i.test(e)) && t.encabezados.some((e) => /cr[eé]dito/i.test(e)),
      `1.3.1: débito y crédito no tienen encabezado propio; se muestran juntos en "${t.encabezados.find((e) => /cuenta/i.test(e)) ?? '—'}" separados por "/" (solo por posición)`);
    desviacion(t.encabezados.some((e) => /fecha/i.test(e)), '1.3.1: la tabla no muestra la fecha del comprobante');
  });

  test('c. [1.3.1 / 4.1.3] Comprobantes simulados de dos especies y dos hechos: tabla y anuncio de la descarga (Datos simulados)', async ({}, testInfo) => {
    test.skip(conComprobantes, 'Hay comprobantes reales: se evaluaron en a y b');
    const linea = (d: string, c: string, v: string) => ({ valor: v, cuenta_debito: d, cuenta_credito: c });
    const comprobantes = [
      { id_comprobante_nic41: 1, codigo: 'NIC41-2026-09-001', tipo_hecho: 'VARIACION_VR_PM', especie: 'Bovino', fecha_comprobante: '2026-09-30', lineas: [linea('1580101', '4250101', '850000.00')], valor_total: '850000.00', hash_integridad: 'c'.repeat(64) },
      { id_comprobante_nic41: 2, codigo: 'NIC41-2026-09-002', tipo_hecho: 'CONSUMO_INSUMO', especie: 'Tilapia', fecha_comprobante: '2026-09-30', lineas: [linea('5205101', '1435101', '320000.00')], valor_total: '320000.00', hash_integridad: 'd'.repeat(64) },
    ];
    await simularGet(page, /^\/finanzas\/periodos\/?$/, PERIODOS);
    await simularGet(page, /^\/finanzas\/periodos\/\d+\/comprobantes$/, comprobantes);
    await page.route((u) => /\/comprobantes\/descarga$/.test(u.pathname), (r) => r.fulfill({
      status: 200, headers: { 'content-type': 'text/csv', 'content-disposition': 'attachment; filename="comprobantes-simulados.csv"', 'access-control-expose-headers': 'Content-Disposition' },
      body: 'codigo,tipo_hecho,cuenta_debito,cuenta_credito,valor\nNIC41-2026-09-001,VARIACION_VR_PM,1580101,4250101,850000.00\n',
    }));
    anotar(testInfo, 'Datos simulados', 'Septiembre 2026 CERRADO con 2 comprobantes (Bovino·variación por precio, Tilapia·consumo de insumos); la descarga responde un CSV de muestra (no evalúa el archivo real).');
    await irFinanzas(page, 'cierre', /Cierre del período/);
    await elegirPeriodo(page, 9101);
    await escanear(page, TC_ID, __dirname, 'comprobantes-simulados', testInfo, LH);
    const tabla = main(page).getByRole('region', { name: /Comprobantes/i }).locator('table');
    const t = await auditarTabla(tabla);
    anotar(testInfo, 'Tabla de comprobantes', `Encabezados: ${t.encabezados.join(' | ')} · ${t.filas} fila(s)`);
    desviacion(t.encabezados.some((e) => /d[eé]bito/i.test(e)) && t.encabezados.some((e) => /cr[eé]dito/i.test(e)),
      `1.3.1: débito y crédito no tienen encabezado propio; se muestran juntos en "${t.encabezados.find((e) => /cuenta/i.test(e)) ?? '—'}" separados por "/" (solo por posición)`);
    desviacion(t.encabezados.some((e) => /fecha/i.test(e)), '1.3.1: la tabla no muestra la fecha del comprobante');
    const boton = main(page).getByRole('button', { name: 'CSV', exact: true });
    await boton.focus();
    await page.keyboard.press('Enter');
    const anuncios = await anunciosDurante(page, 2500);
    anotar(testInfo, 'Anuncios tras descargar', anuncios.join(' ¦ ') || '(ninguno)');
    desviacion(anuncios.some((a) => /descarg|listo|generad/i.test(a)), '4.1.3: el estado de la descarga no se anuncia');
    precondicion(false, 'sin comprobantes reales no se pueden validar el PDF (etiquetado, idioma, título) ni el CSV generados por el backend: BLOQUEO para esa parte del criterio');
  });

  test('b. [4.1.3] Descarga en CSV y PDF: anuncio del estado y revisión de los archivos', async ({}, testInfo) => {
    test.skip(!conComprobantes, 'Sin comprobantes reales (paso a)');
    for (const formato of ['CSV', 'PDF'] as const) {
      const boton = main(page).getByRole('button', { name: formato, exact: true });
      const descarga = page.waitForEvent('download', { timeout: 60_000 }).catch(() => null);
      await boton.focus();
      await page.keyboard.press('Enter');
      const anuncios = await anunciosDurante(page, 2500);
      const d = await descarga;
      anotar(testInfo, `Descarga ${formato}`, `${d ? d.suggestedFilename() : 'no se descargó'} · anuncios: ${anuncios.join(' ¦ ') || '(ninguno)'}`);
      desviacion(anuncios.some((a) => /descarg|listo|generad/i.test(a)), `4.1.3: el estado de la descarga ${formato} no se anuncia`);
      expect.soft(d, `La descarga ${formato} no se produjo`).not.toBeNull();
      if (!d) continue;
      const bytes = fs.readFileSync(await d.path());
      await guardarDescarga(__dirname, `${TC_ID}-${testInfo.project.name}-${d.suggestedFilename()}`, bytes);
      if (formato === 'CSV') {
        const primera = bytes.toString('utf8').replace(/^﻿/, '').split(/\r?\n/)[0];
        anotar(testInfo, 'CSV · primera fila', primera);
        desviacion(/[a-záéíóú]/i.test(primera) && !/^\d/.test(primera), 'CSV: la primera fila no tiene encabezados descriptivos');
        desviacion(!/\b(id_|tabla_|[a-z]+_[a-z]+)\b/.test(primera), `CSV: los encabezados son nombres de columna internos (${primera})`);
      } else {
        const r = revisarPdf(bytes);
        anotar(testInfo, 'PDF · estructura', JSON.stringify(r));
        expect.soft(r.esPdf, 'El archivo PDF no es un PDF válido').toBe(true);
        desviacion(r.etiquetado, 'PDF: no está etiquetado (sin StructTreeRoot / MarkInfo Marked true): el lector de pantalla no recibe encabezados ni tablas');
        desviacion(r.idioma, 'PDF: no declara el idioma del documento (/Lang)');
        desviacion(r.titulo && r.mostrarTitulo, 'PDF: no declara el título del documento o no lo muestra (/Title + DisplayDocTitle)');
      }
    }
  });
});
