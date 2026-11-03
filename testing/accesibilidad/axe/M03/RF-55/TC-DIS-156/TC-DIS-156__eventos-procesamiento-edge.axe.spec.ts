/**
 * TC-DIS-156 — Accesibilidad WCAG 2.1 AA de la vista técnica de Eventos de Procesamiento Edge
 * RF-55 · CU-02 Procesar Telemetría en el Edge · Rol: Administrador (el caso admite Ingeniero de Campo)
 * Telemetría → Flujo IoT → "Edge" (/telemetria/edge)
 *
 * Criterio (hoja M03): 0 violaciones axe A/AA en 1.3.1 (tabla de eventos con encabezados
 * tipo_evento/severidad/variables_involucradas/origen TIEMPO_REAL o BUFFER_LOCAL), 1.4.1 (severidad
 * LEVE/MODERADO/CRITICO también con texto), 4.1.2 (name/role/value en filtros y detalle),
 * 3.3.1 (evento ERROR_CONFIGURACION anunciado con su causa) y 1.4.3 (contraste ≥4.5:1).
 *
 * 2026-10-27: PROTO-V2 (21/10) agregó un filtro por "Clasificación" (no por "Severidad" como
 * pide el criterio textualmente). La vista sigue sobre datos simulados (DatosSimuladosBanner),
 * y sus filas no abren detalle (sin tabIndex/onClick, a diferencia de Pipeline).
 *
 * Herramientas: @axe-core/playwright en los 3 viewports (resultados/axe-TC-DIS-156.html/json) +
 * Lighthouse snapshot solo en escritorio. Sin escrituras: la vista es de solo lectura.
 */
// | Fecha      | Nombre        | Que se hizo                                                    |
// |------------|---------------|------------------------------------------------------------------|
// | 2026-10-30 | Laura032005   | M03 RF-55: regex de severidad no reconocía la forma femenina "Moderada" |
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import {
  abrirSesion, anotar, auditarTabla, desviacion, escanear, estaEnRegionViva, hayTrampaDeFoco,
  irA, main, precondicion, recorrerConTab, regionesVivas, textosColumna,
} from '../../../_shared/sigabA11y';

const TC_ID = 'TC-DIS-156';
const RUTA = 'telemetria/edge';
const TITULO = 'Detección de Desviaciones en Campo';
const PASOS_LIGHTHOUSE = ['listado', 'filtro-severidad', 'detalle-compuesta'];

// 2026-10-27: etiquetas reales de telemetry.json ("edge.clasif_*"), no el código con "_"→espacio.
const TIPOS_EVENTO = ['Normal', 'Desviación simple', 'Compuesta', 'Error de configuración'];
// T-22 (24/10): la severidad se muestra en femenino, igual que en el filtro ("edge.clasif_*" /
// SeveridadBadge): Leve / Moderada / Crítica, no Moderado/Crítico.
const SEVERIDADES = ['Leve', 'Moderada', 'Crítica'];
const COLUMNAS_CRITERIO = ['Clasificación', 'Severidad', 'Variable(s)', 'Origen'];

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

function tabla(page: Page) {
  return main(page).getByRole('table');
}

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Eventos de procesamiento Edge (RF-55)`, () => {
  let contexto: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    ({ contexto, page } = await abrirSesion(browser, testInfo));
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test('1. Listado de eventos - 0 violaciones axe A/AA, encabezados asociados (1.3.1) y estados con texto (1.4.1)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    if (await main(page).getByRole('note').filter({ hasText: 'Datos simulados' }).isVisible()) {
      anotar(testInfo, 'Datos', 'Vista con datos simulados (DatosSimuladosBanner): sin endpoints AIOT todavía.');
    }

    const t = tabla(page);
    await expect(t).toBeVisible();
    const a = await auditarTabla(t);
    anotar(testInfo, 'Tabla', `encabezados: ${a.encabezados.join(' | ')} · ${a.filas} fila(s)`);
    expect.soft(a.thEnThead, '1.3.1: los encabezados deben ser <th> dentro de <thead>').toBe(true);
    expect.soft(a.filasDesalineadas, '1.3.1: filas con un número de celdas distinto al de encabezados').toEqual([]);
    expect.soft(a.celdasVacias, '1.3.1: celdas sin texto (el lector anuncia la celda vacía)').toEqual([]);
    for (const col of COLUMNAS_CRITERIO) {
      desviacion(a.encabezados.includes(col), `falta la columna "${col}" que pide el criterio`);
    }

    const clasif = await textosColumna(t, 'Clasificación');
    const sev = await textosColumna(t, 'Severidad');
    const origen = await textosColumna(t, 'Origen');
    anotar(testInfo, 'Valores', `clasificación: ${[...new Set(clasif)].join(', ')} · severidad: ${[...new Set(sev)].join(', ')} · origen: ${[...new Set(origen)].join(', ')}`);

    // Un evento NORMAL no tiene severidad y la celda muestra "—" (no aplica, no es un defecto).
    expect.soft(sev.filter((s) => s !== '—' && !SEVERIDADES.includes(s)), '1.4.1: la severidad debe leerse como texto (Leve/Moderada/Crítica), no solo por color').toEqual([]);
    precondicion(TIPOS_EVENTO.every((x) => clasif.includes(x)), `el listado debe tener los 4 tipo_evento; faltan: ${TIPOS_EVENTO.filter((x) => !clasif.includes(x)).join(', ') || 'ninguno'}`);
    precondicion(SEVERIDADES.every((x) => sev.includes(x)), `el listado debe tener las 3 severidades; faltan: ${SEVERIDADES.filter((x) => !sev.includes(x)).join(', ') || 'ninguna'}`);
    desviacion(origen.every((o) => /tiempo real|buffer/i.test(o)), `la columna "Origen" muestra el emisor (${[...new Set(origen)].join(', ')}), no TIEMPO_REAL / BUFFER_LOCAL como pide el criterio`);

    await escanear(page, TC_ID, __dirname, 'listado', testInfo, PASOS_LIGHTHOUSE);
  });

  test('2. Medidores de variables - nombre accesible con valor y unidad (1.1.1)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    // [role="img"] explícito: getByRole('img') incluye también el <svg> interno de cada Gauge,
    // que no necesita nombre porque el contenedor role="img" ya lo lleva.
    const medidores = main(page).locator('[role="img"]');
    const nombres = await medidores.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') ?? ''));
    anotar(testInfo, 'Medidores', nombres.join(' | ') || 'ninguno');
    expect.soft(nombres.filter((n) => !n.trim()), '1.1.1: cada medidor (role="img") necesita un nombre con su valor').toEqual([]);
  });

  test('3. Filtro por severidad - name/role/value (4.1.2) y resultado filtrado', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const filtro = main(page).getByRole('combobox', { name: /severidad/i });
    const existe = (await filtro.count()) > 0;
    desviacion(existe, 'la vista Edge no tiene filtro por severidad (paso 3 del caso)');
    if (!existe) return;
    await filtro.first().selectOption({ index: 1 });
    await page.waitForTimeout(500);
    anotar(testInfo, 'Filtro', `severidad = ${await filtro.first().inputValue()} · ${await tabla(page).locator('tbody tr').count()} fila(s)`);
    await escanear(page, TC_ID, __dirname, 'filtro-severidad', testInfo, PASOS_LIGHTHOUSE);
  });

  test('4. Detalle de un evento DESVIACION_COMPUESTA abierto con Enter - variables y severidad (4.1.2)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const fila = tabla(page).locator('tbody tr').filter({ hasText: 'COMPUESTA' }).first();
    precondicion((await fila.count()) > 0, 'no hay ningún evento DESVIACION_COMPUESTA en el listado');
    if ((await fila.count()) === 0) return;
    anotar(testInfo, 'Fila COMPUESTA', (await fila.innerText()).replace(/\s+/g, ' '));

    const enfocable = (await fila.getAttribute('tabindex')) !== null;
    desviacion(enfocable, 'las filas de eventos no son enfocables ni abren un detalle con Enter (pasos 4 y 5 del caso)');
    if (!enfocable) return;

    await fila.focus();
    await page.keyboard.press('Enter');
    const dialogo = page.getByRole('dialog');
    await expect(dialogo, 'Enter sobre la fila debe abrir el detalle del evento').toBeVisible();
    // 2026-10-30: la UI usa la forma femenina ("Leve/Moderada/Crítica", concuerda con "Severidad"),
    // no la masculina del criterio (LEVE/MODERADO/CRITICO) — se acepta cualquiera de las dos.
    await expect.soft(dialogo, '4.1.2: el detalle debe mostrar la severidad como texto').toContainText(/leve|moderad[oa]|cr[ií]tic[oa]/i);
    await escanear(page, TC_ID, __dirname, 'detalle-compuesta', testInfo, PASOS_LIGHTHOUSE);
    await page.keyboard.press('Escape');
  });

  test('5. Evento ERROR_CONFIGURACION comunicado con su causa (3.3.1)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const fila = tabla(page).locator('tbody tr').filter({ hasText: /configuraci[oó]n/i }).first();
    precondicion((await fila.count()) > 0, 'no hay ningún evento ERROR_CONFIGURACION en el listado');
    if ((await fila.count()) === 0) return;

    const texto = (await fila.innerText()).replace(/\s+/g, ' ');
    const vivas = await regionesVivas(page);
    anotar(testInfo, 'ERROR_CONFIGURACION', `fila: "${texto}" · dentro de región viva: ${await estaEnRegionViva(fila)} · regiones vivas: ${vivas.join(' ; ') || 'ninguna'}`);
    expect.soft(texto, '3.3.1: la fila debe explicar la causa del error de configuración (regla aplicada)').toMatch(/umbral|configur|regla/i);
  });

  test('6. Teclado - Tab recorre la vista en orden lógico y sin trampas de foco (2.1.1 / 2.4.3)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    await page.getByRole('heading', { level: 1, name: TITULO, exact: true }).click();
    const recorrido = await recorrerConTab(page, 15);
    anotar(testInfo, 'Recorrido con Tab', recorrido.join(' → '));
    expect.soft(hayTrampaDeFoco(recorrido), '2.1.1: el foco queda atrapado en un elemento').toBe(false);
    desviacion(recorrido.some((f) => f.startsWith('tr')), 'Tab no alcanza ninguna fila de la tabla: los eventos no son operables con teclado');
  });
});
