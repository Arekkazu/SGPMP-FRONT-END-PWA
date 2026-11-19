// | Fecha      | Nombre      | Que se hizo                                                                     |
// |------------|-------------|---------------------------------------------------------------------------------|
// | 2026-11-19 | Laura032005 | TC-DIS-287 RF-104: vista previa, generación en segundo plano y descarga por teclado |
/**
 * TC-DIS-287 — Verificar accesibilidad WCAG 2.1 AA de la vista previa del reporte (primeras 20 filas), del estado
 * de generación en segundo plano y de la descarga
 * RF-104 · CU-02 Generar y exportar reportes del sistema · Rol: Contador · Prioridad: Media
 * Ruta: /reportes
 *
 * Criterio: 0 violaciones axe A/AA en 1.3.1 (tabla con encabezados asociados); 4.1.3 (progreso y finalización
 * anunciados sin mover el foco); 2.1.1 (descarga por teclado); 1.4.3; 3.3.1 (aviso de partes en texto claro).
 * Montos en COP leídos con su moneda. Los reportes en segundo plano duran 48 h y se avisan por la bandeja.
 *
 * Desbloqueado el 2026-11-19 (commit 606c7239). Paso a: vista previa REAL del reporte de valoración del Contador
 * (solo lectura). Pasos b y c: un reporte de más de 1.000 registros y otro dividido en partes se simulan
 * ("Datos simulados"), porque TEST no garantiza ese volumen; el archivo simulado no tiene datos reales.
 * Un reporte mayor a 50 MB real no es verificable en TEST.
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_287_VIEWPORTS=escritorio
 */
import fs from 'fs';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { PREFIJO_API, anotar, auditarTabla, desviacion, escanear, main, precondicion } from '../../../_shared/sigabA11y';
import {
  abrirSesionM08, anunciosDurante, describirFocoDialogo, elegirReporte, guardarDescarga, irReportes, llenarFiltrosObligatorios,
  permitirReportes, quitarSimulaciones, simularGet, tiposReporte,
} from '../../_shared/m08';

const TC_ID = 'TC-DIS-287';
const VIEWPORTS = (process.env.TC_DIS_287_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['vista-previa', 'segundo-plano', 'descarga-partes'];
const VALORACION = 'REPORTE_VALORACION_NIC41';

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

/** Reporte con la forma de src/reportes/tipos.ts. */
function reporte(id: string, estado: string, extra: Record<string, unknown> = {}) {
  return {
    id_reporte: id, tipo_reporte: 'REPORTE_TELEMETRIA', titulo: 'Reporte de telemetría', formato: 'EXCEL', estado,
    filtros_aplicados: {}, numero_registros: 1200, tamano_archivo_kb: null, checksum_sha256: null, mensaje: null,
    fecha_solicitud: '2026-11-19T09:00:00-05:00', fecha_generacion: estado === 'GENERADO' ? '2026-11-19T09:01:00-05:00' : null,
    fecha_expiracion: estado === 'GENERADO' ? '2026-11-21T09:01:00-05:00' : null, partes: [], ...extra,
  };
}

const PREVIA_GRANDE = {
  tipo_reporte: 'REPORTE_TELEMETRIA', titulo: 'Reporte de telemetría', encabezado: [{ dato: 'Finca', valor: 'Finca El Rosal' }],
  numero_registros: 1200, en_segundo_plano: true, sin_datos: false, mensaje: null, resumen: [], secciones: [], finales: [],
  advertencias: [], aclaraciones: [],
  detalle: {
    titulo: 'Lecturas', nota: null, total_filas: 1200,
    columnas: [{ clave: 'fecha', titulo: 'Fecha y hora', tipo: 'FECHA_HORA' }, { clave: 'sensor', titulo: 'Sensor', tipo: 'TEXTO' }, { clave: 'valor', titulo: 'Valor', tipo: 'NUMERO' }],
    filas: Array.from({ length: 20 }, (_, i) => ({ fecha: `2026-11-0${1 + (i % 9)}T0${i % 10}:00:00-05:00`, sensor: 'SEN-M08-01', valor: 20 + i / 10 })),
  },
};

test.describe('TC-DIS-287 — Vista previa, segundo plano y descarga de reportes', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionM08(browser, testInfo, 'contador'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_287_VIEWPORTS.`);
  });
  test.afterEach(async () => { if (page) await quitarSimulaciones(page); });

  test('a. [1.3.1 / 4.1.3] Vista previa real del reporte de valoración: tablas con encabezados y montos con moneda', async ({}, testInfo) => {
    await permitirReportes(page);
    await irReportes(page);
    const tipos = await tiposReporte(page);
    precondicion(tipos.some((x) => x.valor === VALORACION), 'el Contador de TEST no tiene el reporte de valoración');
    if (!tipos.some((x) => x.valor === VALORACION)) return;
    await elegirReporte(page, VALORACION);
    await llenarFiltrosObligatorios(page);
    const boton = main(page).getByRole('button', { name: 'Ver vista previa' });
    await boton.focus();
    const anuncios = anunciosDurante(page, 8000);
    await page.keyboard.press('Enter');
    const seccion = main(page).getByRole('region', { name: /^Vista previa/ }).or(main(page).locator('section[aria-labelledby="titulo-previa"]'));
    const hay = await seccion.first().waitFor({ timeout: 60_000 }).then(() => true).catch(() => false);
    const vistos = await anuncios;
    precondicion(hay, 'la vista previa del reporte de valoración no cargó (¿período cerrado con datos en TEST?)');
    if (!hay) return;
    await escanear(page, TC_ID, __dirname, 'vista-previa', testInfo, LH);
    const tablas = seccion.first().locator('table');
    const n = await tablas.count();
    const resumenTablas: string[] = [];
    for (let i = 0; i < n; i++) {
      const t = await auditarTabla(tablas.nth(i));
      resumenTablas.push(`${t.encabezados.join(' | ')} (${t.filas} filas)`);
      expect.soft(t.filasDesalineadas, `1.3.1: filas desalineadas en la tabla ${i + 1}`).toEqual([]);
      expect.soft(t.filas, `RF-104: la tabla ${i + 1} muestra más de 20 filas en la vista previa`).toBeLessThanOrEqual(20);
    }
    const texto = (await seccion.first().innerText()).replace(/\s+/g, ' ');
    anotar(testInfo, 'Vista previa', `${n} tablas · ${resumenTablas.join(' ¦ ')}`);
    anotar(testInfo, 'Anuncios al cargar', vistos.join(' ¦ ') || '(ninguno)');
    expect.soft(vistos.some((a) => /\d[\d.]*\s+registros?/.test(a)), '4.1.3: la cantidad de registros de la vista previa no se anuncia').toBe(true);
    const montos = texto.match(/\$\s?[\d.]+,\d{2}/g) ?? [];
    anotar(testInfo, 'Montos', montos.slice(0, 5).join(', ') || '(ninguno)');
    desviacion(montos.length === 0 || /COP|pesos/i.test(texto), '1.3.1: los montos se muestran con "$" sin decir la moneda (COP); un lector los lee como "dólar"');
  });

  test('b. [4.1.3] Más de 1.000 registros: aviso de segundo plano, progreso y finalización anunciados sin mover el foco (Datos simulados)', async ({}, testInfo) => {
    let estado = 'NINGUNO';
    let consultas = 0;
    await page.route((u) => u.pathname.startsWith(PREFIJO_API) && /\/reportes\/vista-previa$/.test(u.pathname), (r) => r.fulfill({ status: 200, json: PREVIA_GRANDE }));
    await page.route((u) => u.pathname.startsWith(PREFIJO_API) && /\/reportes$/.test(u.pathname), (r) => {
      if (r.request().method() === 'POST') { estado = 'EN_PROCESO'; return r.fulfill({ status: 202, json: reporte('qa-bg-1', 'EN_PROCESO') }); }
      // El listado pasa a GENERADO en la segunda consulta tras pedirlo (el sondeo es cada 10 s).
      if (estado === 'EN_PROCESO' && ++consultas >= 2) estado = 'GENERADO';
      return r.fulfill({ status: 200, json: estado === 'NINGUNO' ? [] : [reporte('qa-bg-1', estado, estado === 'GENERADO' ? { partes: [{ numero_parte: 1, nombre_archivo: 'telemetria.xlsx', tamano_bytes: 2048, checksum_sha256: 'a'.repeat(64) }] } : {})] });
    });
    anotar(testInfo, 'Datos simulados', 'Reporte de telemetría de 1.200 registros: vista previa con aviso de segundo plano, 202 al exportar y listo en el segundo sondeo.');
    await irReportes(page);
    const tipos = await tiposReporte(page);
    precondicion(tipos.length > 0, 'el Contador de TEST no tiene reportes');
    if (!tipos.length) return;
    await elegirReporte(page, tipos[0].valor);
    await llenarFiltrosObligatorios(page);
    await main(page).getByRole('button', { name: 'Ver vista previa' }).click();
    const aviso = main(page).getByText('Este reporte se generará en segundo plano');
    await expect.soft(aviso, 'No aparece el aviso de generación en segundo plano').toBeVisible({ timeout: 15_000 });
    const exportar = main(page).getByRole('button', { name: /^Exportar en/ });
    await exportar.focus();
    const anuncios = anunciosDurante(page, 28_000);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);
    const focoTras = await describirFocoDialogo(page);
    await escanear(page, TC_ID, __dirname, 'segundo-plano', testInfo, LH);
    const vistos = await anuncios;
    anotar(testInfo, 'Durante y después', `foco tras exportar: ${focoTras} · anuncios: ${vistos.join(' ¦ ') || '(ninguno)'}`);
    expect.soft(vistos.some((a) => /segundo plano|Generando|te avisaremos/i.test(a)), '4.1.3: el inicio de la generación en segundo plano no se anuncia').toBe(true);
    expect.soft(vistos.some((a) => /termin[oó] de generarse|est[aá] listo|Listo/i.test(a)), '4.1.3: la finalización del reporte no se anuncia').toBe(true);
    desviacion(!/^body/.test(focoTras), `2.4.3: tras exportar, el foco se pierde (queda en ${focoTras})`);
    desviacion(vistos.some((a) => /siendo generado/i.test(a)), 'RF-104: el mensaje no es el del RF («Tu reporte está siendo generado. Te avisaremos cuando esté listo.»)');
  });

  test('c. [2.1.1 / 3.3.1] Descarga por teclado y aviso de partes en texto claro (Datos simulados)', async ({}, testInfo) => {
    const partes = [1, 2].map((n) => ({ numero_parte: n, nombre_archivo: `telemetria_parte_${n}.xlsx`, tamano_bytes: 50 * 1024 * 1024, checksum_sha256: 'b'.repeat(64) }));
    await simularGet(page, /^\/reportes$/, [reporte('qa-partes', 'GENERADO', { partes, mensaje: 'El archivo superó 50 MB y se dividió en 2 partes.' })]);
    await page.route((u) => u.pathname.startsWith(PREFIJO_API) && /\/reportes\/qa-partes\/partes\/\d+\/descarga$/.test(u.pathname), (r) =>
      r.fulfill({ status: 200, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', body: Buffer.from('PK simulado') }));
    anotar(testInfo, 'Datos simulados', 'Reporte listo dividido en 2 partes de 50 MB; cada parte responde con un archivo de prueba.');
    await irReportes(page);
    const boton = main(page).getByRole('button', { name: /^Descargar el reporte/ });
    await expect(boton, 'No aparece "Descargar" en Mis reportes').toBeVisible();
    const fila = (await main(page).locator('tbody tr').first().innerText()).replace(/\s+/g, ' ');
    anotar(testInfo, 'Fila del reporte en partes', `${fila} · botón: "${await boton.getAttribute('aria-label')}" / "${(await boton.innerText()).trim()}"`);
    expect.soft(fila, '3.3.1: no se explica en texto que el reporte se dividió en partes').toMatch(/partes?/i);
    await boton.focus();
    const descargas: string[] = [];
    page.on('download', (d) => descargas.push(d.suggestedFilename()));
    const primera = page.waitForEvent('download', { timeout: 15_000 }).catch(() => null);
    await page.keyboard.press('Enter');
    const archivo = await primera;
    await page.waitForTimeout(1500);
    const ruta = archivo ? await archivo.path().catch(() => null) : null;
    if (ruta) await guardarDescarga(__dirname, `descarga-simulada-${testInfo.project.name}.xlsx`, fs.readFileSync(ruta));
    await escanear(page, TC_ID, __dirname, 'descarga-partes', testInfo, LH);
    anotar(testInfo, 'Descargas con teclado', descargas.join(', ') || '(ninguna)');
    expect.soft(descargas.length, '2.1.1: "Descargar" con teclado no descarga las dos partes').toBe(2);
    const nombre = await boton.getAttribute('aria-label') ?? '';
    const visible = (await boton.innerText()).trim();
    desviacion(nombre.toLowerCase().includes(visible.toLowerCase()), `2.5.3: el nombre accesible del botón ("${nombre}") no contiene su texto visible ("${visible}"); quien usa control por voz no lo encuentra`);
  });
});
