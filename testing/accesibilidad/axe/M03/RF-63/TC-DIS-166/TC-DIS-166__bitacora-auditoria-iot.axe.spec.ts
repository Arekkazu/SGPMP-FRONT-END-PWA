/**
 * TC-DIS-166 — Accesibilidad WCAG 2.1 AA de la Bitácora de Auditoría y Trazabilidad de Eventos de
 * Telemetría y Alertas (filtros, detalle y exportación)
 * RF-63 · CU-06 Auditar y Trazar Eventos del Módulo IoT · Rol: Administrador
 * Telemetría → "Bitácora" (/telemetria/bitacora)
 *
 * Criterio (hoja M03): 0 violaciones axe A/AA en 1.3.1 (encabezados fecha_hora/tipo_evento/
 * entidad_afectada/resultado/severidad_log asociados), 2.4.6 (encabezados de filtros y columnas
 * descriptivos), 2.1.1 (filtros, paginación, ordenamiento, detalle y exportación por teclado),
 * 4.1.2 (controles de filtro y botón Exportar con sus formatos JSON/CSV), 4.1.3 ('sin resultados'
 * anunciado vía aria-live) y 1.4.3. El campo componente_origen es interno: no debe exponerse.
 * No confundir con la bitácora general de M01 (TC-DIS-29/30/31).
 *
 * Datos reales: GET /iot/auditoria (solo lectura). Exportar y "Verificar integridad" no se pulsan.
 *
 * Herramientas: @axe-core/playwright en los 3 viewports + Lighthouse snapshot solo en escritorio.
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import {
  abrirSesion, anotar, auditarTabla, desviacion, escanear, esGet, estaEnRegionViva, fechaHaceDias,
  hayTrampaDeFoco, irA, json, main, precondicion, recorrerConTab, regionesVivas,
} from '../../../_shared/sigabA11y';

const TC_ID = 'TC-DIS-166';
const RUTA = 'telemetria/bitacora';
const TITULO = 'Bitácora de Auditoría IoT';
const PASOS_LIGHTHOUSE = ['listado', 'sin-resultados', 'detalle-critical'];

const URL_AUDITORIA = esGet('/iot/auditoria');
const SEVERIDADES = ['INFO', 'WARNING', 'ERROR', 'CRITICAL'];
const COLUMNAS_CRITERIO = ['Fecha', 'Tipo de evento', 'Entidad', 'Resultado', 'Severidad'];
const SIN_RESULTADOS = 'Sin eventos de auditoría para los filtros seleccionados.';
const COMPONENTE_ORIGEN = /componente[_ ]origen/i;

interface Evento { id_evento: string; tipo_evento: string; severidad_log: string; clasificacion_registro: string; registro_incompleto: boolean }

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

function tabla(page: Page) {
  return main(page).getByRole('table');
}

async function aplicar(page: Page) {
  const r = page.waitForResponse(URL_AUDITORIA, { timeout: 60_000 }).catch(() => null);
  await main(page).getByRole('button', { name: 'Aplicar filtros', exact: true }).click();
  const datos = await json<{ items: Evento[] }>(await r);
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  return datos?.items ?? [];
}

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Bitácora de auditoría IoT (RF-63)`, () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });

  let contexto: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    testInfo.setTimeout(420_000);
    ({ contexto, page } = await abrirSesion(browser, testInfo));
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test('1. Listado paginado - 0 violaciones axe A/AA, encabezados asociados (1.3.1 / 2.4.6) y componente_origen oculto', async ({}, testInfo) => {
    const r = await irA(page, RUTA, TITULO, URL_AUDITORIA);
    const datos = await json<{ total: number; items: Evento[] }>(r);
    const items = datos?.items ?? [];
    const sev = [...new Set(items.map((i) => i.severidad_log))];
    const clasif = [...new Set(items.map((i) => i.clasificacion_registro))];
    anotar(testInfo, 'Datos', `${items.length} de ${datos?.total} evento(s) · severidades: ${sev.join(', ')} · clasificación: ${clasif.join(', ')} · incompletos: ${items.filter((i) => i.registro_incompleto).length}`);
    precondicion(SEVERIDADES.every((s) => sev.includes(s)), `faltan severidades en la primera página: ${SEVERIDADES.filter((s) => !sev.includes(s)).join(', ') || 'ninguna'}`);
    precondicion(clasif.some((c) => /NIC/i.test(c)) && clasif.some((c) => /TECNIC/i.test(c)), 'deben existir eventos NIC41 y TECNICO');
    precondicion(items.some((i) => i.registro_incompleto), 'debe existir al menos un evento con registro_incompleto = true');

    const t = tabla(page);
    precondicion((await t.count()) > 0, 'la bitácora no tiene eventos');
    if ((await t.count()) === 0) return;
    const a = await auditarTabla(t);
    anotar(testInfo, 'Tabla', `encabezados: ${a.encabezados.join(' | ')} · ${a.filas} fila(s) · ${a.filasEnfocables} enfocable(s)`);
    expect.soft(a.thEnThead, '1.3.1: los encabezados deben ser <th> dentro de <thead>').toBe(true);
    expect.soft(a.filasDesalineadas, '1.3.1: filas con un número de celdas distinto al de encabezados').toEqual([]);
    expect.soft(a.encabezados.filter((h) => h.endsWith('.')), '2.4.6: encabezados abreviados que no describen la columna').toEqual([]);
    for (const col of COLUMNAS_CRITERIO) {
      desviacion(a.encabezados.includes(col), `falta la columna "${col}" que pide el criterio`);
    }
    expect.soft(await t.innerText(), 'componente_origen es interno y no debe exponerse en la consulta').not.toMatch(COMPONENTE_ORIGEN);

    await escanear(page, TC_ID, __dirname, 'listado', testInfo, PASOS_LIGHTHOUSE);
  });

  test('2. Filtro combinado (rango de fechas + rf_origen + severidad_log) - 0 violaciones en el resultado', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO, URL_AUDITORIA);
    desviacion((await main(page).getByLabel(/rf|origen/i).count()) > 0, 'no hay filtro por rf_origen (paso 3 del caso); se combinan fechas + severidad');
    await main(page).getByLabel('Desde', { exact: true }).fill(fechaHaceDias(30));
    await main(page).getByLabel('Hasta', { exact: true }).fill(fechaHaceDias(0));
    await main(page).getByLabel('Severidad', { exact: true }).selectOption('WARNING');
    const items = await aplicar(page);
    anotar(testInfo, 'Filtro', `últimos 30 días + WARNING → ${items.length} evento(s)`);
    await escanear(page, TC_ID, __dirname, 'filtrado', testInfo, PASOS_LIGHTHOUSE);
  });

  test('3. Sin resultados - mensaje anunciado vía aria-live (4.1.3)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO, URL_AUDITORIA);
    await main(page).getByLabel('ID entidad afectada', { exact: true }).fill('QA-NO-EXISTE-000');
    await aplicar(page);
    const mensaje = main(page).getByText(SIN_RESULTADOS, { exact: true });
    await expect(mensaje, 'un filtro sin resultados debe mostrar el estado vacío').toBeVisible();
    anotar(testInfo, 'Regiones vivas', (await regionesVivas(page)).join(' ; ') || 'ninguna');
    expect.soft(await estaEnRegionViva(mensaje), '4.1.3: el mensaje "sin resultados" no está en una región aria-live/status').toBe(true);
    await escanear(page, TC_ID, __dirname, 'sin-resultados', testInfo, PASOS_LIGHTHOUSE);
  });

  test('4. Detalle de un evento CRITICAL abierto con Enter - accion_detallada, hash e entidad (1.3.1 / 4.1.2)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO, URL_AUDITORIA);
    await main(page).getByLabel('Severidad', { exact: true }).selectOption('CRITICAL');
    const criticos = await aplicar(page);
    precondicion(criticos.length > 0, 'no hay eventos CRITICAL; se abre el primer evento disponible');
    if (criticos.length === 0) {
      await main(page).getByRole('button', { name: 'Limpiar', exact: true }).click();
      await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    }
    const fila = tabla(page).locator('tbody tr').first();
    await expect(fila, 'debe haber al menos un evento para abrir').toBeVisible();
    await fila.focus();
    await page.keyboard.press('Enter');
    const dialogo = page.getByRole('dialog', { name: /^Evento de auditoría · / });
    await expect(dialogo, '2.1.1: Enter sobre la fila debe abrir el detalle').toBeVisible();
    await expect.soft(dialogo.getByRole('heading', { name: /Cadena de integridad/ }), '1.3.1: el hash de integridad debe tener encabezado').toBeVisible();
    const texto = (await dialogo.innerText()).replace(/\s+/g, ' ');
    anotar(testInfo, 'Detalle', texto.slice(0, 300));
    expect.soft(texto, 'el detalle debe mostrar la entidad afectada').toMatch(/Entidad afectada/);
    expect.soft(texto, 'componente_origen es interno y no debe exponerse en el detalle').not.toMatch(COMPONENTE_ORIGEN);
    await escanear(page, TC_ID, __dirname, 'detalle-critical', testInfo, PASOS_LIGHTHOUSE);
    await page.keyboard.press('Escape');
  });

  test('5. Exportación JSON/CSV - botón Exportar con nombre y formatos (4.1.2 / 2.4.6)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO, URL_AUDITORIA);
    const csv = main(page).getByRole('button', { name: 'CSV', exact: true });
    const jsonBtn = main(page).getByRole('button', { name: 'JSON', exact: true });
    const exportar = main(page).getByRole('button', { name: /exportar/i });
    anotar(testInfo, 'Exportación', `botones CSV: ${await csv.count()} · JSON: ${await jsonBtn.count()} · "Exportar…": ${await exportar.count()}`);
    desviacion((await csv.count()) + (await jsonBtn.count()) > 0, 'no hay acciones de exportación (¿la cuenta no tiene permiso E sobre el recurso 39?)');
    expect.soft(await exportar.count(), '4.1.2 / 2.4.6: los botones se llaman solo "CSV" y "JSON"; el nombre accesible no dice que exportan').toBeGreaterThan(0);
    desviacion((await page.getByRole('dialog').count()) > 0 || (await exportar.count()) > 0, 'no hay diálogo de exportación: el formato se elige con dos botones sueltos (paso 6 del caso)');
  });

  test('6. Teclado - filtros, tabla, paginación y ordenamiento en orden lógico (2.1.1 / 2.4.3)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO, URL_AUDITORIA);
    await page.getByRole('heading', { level: 1, name: TITULO, exact: true }).click();
    const recorrido = await recorrerConTab(page, 40);
    anotar(testInfo, 'Recorrido con Tab', recorrido.join(' → '));
    expect.soft(hayTrampaDeFoco(recorrido), '2.1.1: el foco queda atrapado en un elemento').toBe(false);
    const filtro = recorrido.findIndex((f) => f.includes('Tipo de evento'));
    const fila = recorrido.findIndex((f) => f.startsWith('tr'));
    expect.soft(filtro, '2.1.1: Tab debe llegar a los filtros').toBeGreaterThanOrEqual(0);
    expect.soft(fila, '2.1.1: Tab debe llegar a las filas').toBeGreaterThanOrEqual(0);
    if (filtro >= 0 && fila >= 0) expect.soft(filtro < fila, '2.4.3: los filtros deben recorrerse antes que las filas').toBe(true);
    const ordenables = await tabla(page).locator('th[aria-sort], th button').count();
    desviacion(ordenables > 0, 'las columnas no se pueden ordenar (el criterio pide ordenamiento operable por teclado)');
  });
});
