/**
 * TC-DIS-164 — Accesibilidad WCAG 2.1 AA de la vista técnica de Calidad de Datos de Telemetría
 * (índice de calidad y flags de anomalía)
 * RF-62 · CU-02 Procesar Telemetría en el Edge · Rol: Administrador (el caso admite Ingeniero de Campo)
 * Telemetría → "Calidad" (/telemetria/calidad)
 *
 * Criterio (hoja M03): 0 violaciones axe A/AA en 1.3.1 (tabla con encabezados
 * sensor_id/indice_calidad/clasificacion_calidad/flags asociados), 1.4.1 (APTO / APTO_CON_RESERVA /
 * NO_APTO / INDETERMINADA también con texto, no solo color o badge), 4.1.2 (name/role/value en filtros
 * y en el detalle de flags), 3.3.1 (INDETERMINADA por serie_insuficiente comunicada con su causa, sin
 * índice de calidad) y 1.4.3. Fuera de alcance: índice de calidad de observaciones de visión (RFC-011).
 *
 * Datos reales: GET /iot/calidad (solo lectura). "Evaluar de nuevo" y "Solicitar re-evaluación" no se
 * pulsan; además el contexto aborta cualquier POST.
 *
 * Herramientas: @axe-core/playwright en los 3 viewports + Lighthouse snapshot solo en escritorio.
 */
// | Fecha      | Nombre        | Que se hizo                                                        |
// |------------|---------------|----------------------------------------------------------------------|
// | 2026-10-29 | Laura032005   | M03 RF-62: desambiguar tabla tras agregarse CalidadVisionPanel (RFC-011) |
import { expect, test, type BrowserContext, type Page, type Response } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import {
  abrirSesion, anotar, auditarTabla, desviacion, escanear, esGet, hayTrampaDeFoco, irA, json, main,
  precondicion, recorrerConTab,
} from '../../../_shared/sigabA11y';

const TC_ID = 'TC-DIS-164';
const RUTA = 'telemetria/calidad';
const TITULO = 'Calidad de Datos de Telemetría';
const PASOS_LIGHTHOUSE = ['listado', 'filtrado', 'detalle-no-apto'];

// El listado, no los 4 GET de resumen de los KPI (mismo endpoint con por_pagina=1, uno por clasificación)
const URL_CALIDAD = (r: Response) => esGet('/iot/calidad')(r) && new URL(r.url()).searchParams.get('por_pagina') !== '1';
const CLASIFICACIONES = ['APTO', 'APTO_CON_RESERVA', 'NO_APTO', 'INDETERMINADA'];
const FLAGS = ['sensor_congelado', 'outlier_estadistico', 'posible_drift', 'gap_temporal_anomalo'];
const COLUMNAS_CRITERIO = ['Sensor', 'Índice', 'Clasificación', 'Flags'];

interface Evaluacion {
  id_telemetria: number;
  clasificacion_calidad: string;
  indice_calidad: number | null;
  flags_detectados: Record<string, unknown> | null;
}

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

function tabla(page: Page) {
  // 2026-10-29: la vista ahora agrega CalidadVisionPanel (RFC-011, panel simulado de
  // observaciones de visión) con su propia tabla — getByRole('table') sin desambiguar
  // revienta en modo estricto. Esta prueba es sobre las lecturas de sensor, no visión.
  return main(page).getByRole('region', { name: 'Tabla de evaluaciones de calidad' }).getByRole('table');
}

function flagsActivos(e: Evaluacion) {
  return Object.entries(e.flags_detectados ?? {}).filter(([, v]) => v === true || (typeof v === 'object' && v !== null)).map(([k]) => k);
}

async function filtrar(page: Page, clasificacion: string) {
  await main(page).getByLabel('Clasificación', { exact: true }).selectOption(clasificacion);
  const r = page.waitForResponse(URL_CALIDAD, { timeout: 60_000 }).catch(() => null);
  await main(page).getByRole('button', { name: 'Aplicar filtros', exact: true }).click();
  const datos = await json<{ items: Evaluacion[] }>(await r);
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  return datos?.items ?? [];
}

/** Abre con Enter la fila de la lectura y devuelve el diálogo de detalle. */
async function abrirDetalle(page: Page, idTelemetria: number) {
  const fila = tabla(page).locator('tbody tr').filter({ hasText: `#${idTelemetria}` }).first();
  await fila.focus();
  await page.keyboard.press('Enter');
  const dialogo = page.getByRole('dialog', { name: `Evaluación de calidad · lectura #${idTelemetria}` });
  await expect(dialogo, '2.1.1: Enter sobre la fila debe abrir el detalle de la evaluación').toBeVisible();
  return dialogo;
}

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Calidad de datos de telemetría (RF-62)`, () => {
  let contexto: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    ({ contexto, page } = await abrirSesion(browser, testInfo));
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test('1. Listado - 0 violaciones axe A/AA, encabezados asociados (1.3.1) y clasificación con texto (1.4.1)', async ({}, testInfo) => {
    const r = await irA(page, RUTA, TITULO, URL_CALIDAD);
    const items = (await json<{ items: Evaluacion[] }>(r))?.items ?? [];
    const clasif = [...new Set(items.map((i) => i.clasificacion_calidad))];
    const flags = [...new Set(items.flatMap(flagsActivos))];
    anotar(testInfo, 'Datos', `${items.length} evaluación(es) · clasificaciones: ${clasif.join(', ')} · flags: ${flags.join(', ') || 'ninguno'}`);
    precondicion(CLASIFICACIONES.every((c) => clasif.includes(c)), `faltan clasificaciones en la primera página: ${CLASIFICACIONES.filter((c) => !clasif.includes(c)).join(', ') || 'ninguna'}`);
    precondicion(FLAGS.every((f) => flags.includes(f)), `faltan flags activos en la primera página: ${FLAGS.filter((f) => !flags.includes(f)).join(', ') || 'ninguno'}`);

    const t = tabla(page);
    precondicion((await t.count()) > 0, 'no hay evaluaciones de calidad que listar');
    if ((await t.count()) === 0) return;
    const a = await auditarTabla(t);
    anotar(testInfo, 'Tabla', `encabezados: ${a.encabezados.join(' | ')} · ${a.filas} fila(s) · ${a.filasEnfocables} enfocable(s)`);
    expect.soft(a.thEnThead, '1.3.1: los encabezados deben ser <th> dentro de <thead>').toBe(true);
    expect.soft(a.filasDesalineadas, '1.3.1: filas con un número de celdas distinto al de encabezados').toEqual([]);
    expect.soft(a.celdasVacias, '1.3.1 / 1.4.1: celdas sin texto ni nombre accesible (p. ej. clasificación o "Apto" solo con color)').toEqual([]);
    for (const col of COLUMNAS_CRITERIO) {
      desviacion(a.encabezados.includes(col), `falta la columna "${col}" que pide el criterio`);
    }

    // Íconos Sí/No de "Apto IA"/"Apto NIC41": nombre accesible y rol expuesto
    const iconos = await t.locator('tbody svg[aria-label]').evaluateAll((els) => [...new Set(els.map((e) => `${e.getAttribute('aria-label')} role=${e.getAttribute('role') ?? '—'}`))]);
    anotar(testInfo, 'Íconos con nombre en la tabla', iconos.join(' | ') || 'ninguno');

    await escanear(page, TC_ID, __dirname, 'listado', testInfo, PASOS_LIGHTHOUSE);
  });

  test('2. Filtro por clasificacion_calidad - name/role/value (4.1.2) y 0 violaciones en el resultado', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO, URL_CALIDAD);
    const filtro = main(page).getByRole('combobox', { name: 'Clasificación', exact: true });
    await expect(filtro, '4.1.2: el filtro de clasificación debe ser un combobox con nombre').toBeVisible();
    const items = await filtrar(page, 'NO_APTO');
    anotar(testInfo, 'Filtro', `clasificación = NO_APTO → ${items.length} evaluación(es)`);
    await expect.soft(filtro, '4.1.2: el combobox debe exponer el valor elegido').toHaveValue('NO_APTO');
    await escanear(page, TC_ID, __dirname, 'filtrado', testInfo, PASOS_LIGHTHOUSE);
  });

  test('3. Detalle de una lectura NO_APTO con varios flags - flags y trazabilidad estadística con etiqueta (1.3.1 / 4.1.2)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO, URL_CALIDAD);
    const items = await filtrar(page, 'NO_APTO');
    const elegida = [...items].sort((a, b) => flagsActivos(b).length - flagsActivos(a).length)[0];
    precondicion(!!elegida, 'no hay lecturas NO_APTO');
    if (!elegida) return;
    precondicion(flagsActivos(elegida).length > 1, `la lectura NO_APTO #${elegida.id_telemetria} no tiene varios flags activos`);
    anotar(testInfo, 'Lectura', `#${elegida.id_telemetria} · flags: ${flagsActivos(elegida).join(', ')}`);

    const dialogo = await abrirDetalle(page, elegida.id_telemetria);
    await expect.soft(dialogo.getByText('Flags detectados', { exact: true }), '1.3.1: la sección de flags debe tener rótulo').toBeVisible();
    const texto = (await dialogo.innerText()).replace(/\s+/g, ' ');
    desviacion(/media|desviaci[oó]n[ _]est|magnitud/i.test(texto), 'el detalle no muestra la trazabilidad estadística de los flags (media_serie, desviacion_estandar, magnitud_drift…)');
    await escanear(page, TC_ID, __dirname, 'detalle-no-apto', testInfo, PASOS_LIGHTHOUSE);
    await page.keyboard.press('Escape');
  });

  test('4. INDETERMINADA por serie_insuficiente - causa comunicada y sin índice de calidad (3.3.1)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO, URL_CALIDAD);
    const items = await filtrar(page, 'INDETERMINADA');
    precondicion(items.length > 0, 'no hay lecturas INDETERMINADA');
    if (items.length === 0) return;
    const elegida = items[0];
    anotar(testInfo, 'Lectura', `#${elegida.id_telemetria} · índice: ${elegida.indice_calidad} · flags: ${JSON.stringify(elegida.flags_detectados)}`);

    const dialogo = await abrirDetalle(page, elegida.id_telemetria);
    const texto = (await dialogo.innerText()).replace(/\s+/g, ' ');
    expect.soft(texto, '3.3.1: una lectura INDETERMINADA no debe mostrar índice de calidad').not.toMatch(/Índice:/);
    expect.soft(texto, '3.3.1: la causa (serie insuficiente) debe comunicarse como texto').toMatch(/serie[ _]insuficiente|insuficiente/i);
    await escanear(page, TC_ID, __dirname, 'detalle-indeterminada', testInfo, PASOS_LIGHTHOUSE);
    await page.keyboard.press('Escape');
  });

  test('5. Teclado - Tab recorre filtros y filas en orden lógico, sin trampas (2.1.1 / 2.4.3)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO, URL_CALIDAD);
    await page.getByRole('heading', { level: 1, name: TITULO, exact: true }).click();
    const recorrido = await recorrerConTab(page, 35);
    anotar(testInfo, 'Recorrido con Tab', recorrido.join(' → '));
    expect.soft(hayTrampaDeFoco(recorrido), '2.1.1: el foco queda atrapado en un elemento').toBe(false);
    const primerFiltro = recorrido.findIndex((f) => f.includes('ID sensor'));
    const primeraFila = recorrido.findIndex((f) => f.startsWith('tr'));
    expect.soft(primerFiltro, '2.1.1: Tab debe llegar a los filtros').toBeGreaterThanOrEqual(0);
    expect.soft(primeraFila, '2.1.1: Tab debe llegar a las filas de la tabla').toBeGreaterThanOrEqual(0);
    if (primerFiltro >= 0 && primeraFila >= 0) {
      expect.soft(primerFiltro < primeraFila, '2.4.3: los filtros deben recorrerse antes que las filas').toBe(true);
    }
  });
});
