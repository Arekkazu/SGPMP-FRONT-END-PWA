// | Fecha      | Nombre      | Que se hizo |
// |------------|-------------|-------------|
// | 2026-11-06 | Laura032005 | M05 RF-78 TC-DIS-216: accesibilidad del acumulado de inversión por categoría del ciclo |
// | 2026-11-11 | Laura032005 | M05 RF-78 TC-DIS-216: reejecución con datos reales del DBA; timeout ampliado a 60s por el volumen de registros de BOV-114-TIL; consultarPrimerActivo ya no toma el primero del combobox a ciegas (a veces caía en un activo sin ciclo), ahora apunta a BOV-114-TIL (1627); test 2 esperaba la tabla sin dar tiempo a que cargara (carrera), ya corregido |
/**
 * TC-DIS-216 — Accesibilidad WCAG 2.1 AA de la vista del acumulado de inversión por categoría
 * del ciclo productivo
 * RF-78 · CU-04 Acumular Inversión y Proveer Costos a M06 · Rol: Gestor de Granja o Contador
 * Suministros → Costos del ciclo (/suministros/costos)
 *
 * Criterio (hoja M05): 0 violaciones axe A/AA en 1.3.1 (tabla de acumulado_por_categoria y
 * acumulado_total_ciclo con encabezados asociados a sus celdas); 1.1.1 (si existe gráfica,
 * alternativa textual o tabular equivalente); 1.4.1 (estado ACTIVO/CERRADO del ciclo y condición
 * de consolidado comunicados con etiqueta textual, no solo color).
 *
 * El desglose por categoría de CostosView se presenta como una <dl> de texto (monto por
 * categoría), no como gráfica: no hay una gráfica que necesite alternativa (1.1.1 no aplica por
 * ausencia del elemento que lo dispara, no porque exista una alternativa). El ciclo CERRADO con
 * su condición "consolidado e inmutable" corresponde al panel NIC-41 (Nic41Panel, ya cubierto
 * por RF-79/TC-DIS-206/207): aquí se verifica solo el acumulado del ciclo vigente, que es lo que
 * expone esta vista.
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { abrirSesion, anotar, desviacion, escanear, irA, main, precondicion } from '../../../_shared/sigabA11y';

const TC_ID = 'TC-DIS-216';
const RUTA = 'suministros/costos';
const TITULO = 'Costos del ciclo productivo';
const PASOS_LIGHTHOUSE = ['acumulado', 'registros-del-ciclo'];

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

async function consultarPrimerActivo(page: Page) {
  const combo = main(page).getByRole('combobox', { name: 'Activo biológico' });
  // BOV-114-TIL (id 1627): ciclo "Levante y ceba" real, fase Ceba activa desde el 1/10 (dato del DBA).
  await combo.fill('1627');
  await combo.blur();
  await main(page).getByRole('button', { name: 'Consultar', exact: true }).click();
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
}

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Acumulado de inversión por categoría (RF-78)`, () => {
  let contexto: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    ({ contexto, page } = await abrirSesion(browser, testInfo));
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test('1. Acumulado por categoría - cada monto con su etiqueta de categoría (1.3.1) y sin gráfica que necesite alternativa (1.1.1)', async ({}, testInfo) => {
    // El panel SÍ carga (confirmado manualmente y en la captura de error de un timeout previo),
    // solo que la consulta en paralelo del acumulado + 80 registros del historial tarda más de
    // 60s en este ambiente cargado: se amplía el margen en vez de asumir un bloqueo real.
    testInfo.setTimeout(120_000);
    await irA(page, RUTA, TITULO);
    await consultarPrimerActivo(page);
    const panel = page.locator('section[aria-labelledby="acumulado-titulo"]');
    // El acumulado y los 80 registros del historial se piden en paralelo; en este ambiente
    // puede tardar bastante más que networkidle en resolverse del todo.
    await panel.waitFor({ state: 'visible', timeout: 90_000 }).catch(() => {});
    if (await panel.count() === 0) {
      // Captura el mensaje real del backend (acumulado.error.message) para saber la causa
      // exacta, no solo el título genérico "El activo no tiene un ciclo productivo activo".
      const avisoSinCiclo = page.getByRole('alert');
      anotar(testInfo, 'Mensaje real del backend (404 costeo-directo)', await avisoSinCiclo.innerText().catch(() => '(no se pudo leer)'));
    }
    precondicion(await panel.count() > 0, 'el activo consultado no tiene un ciclo productivo activo (404 "El activo no tiene un ciclo productivo activo")');
    if (await panel.count() === 0) return;

    const graficas = await panel.locator('svg[role="img"], canvas, [class*="chart"]').count();
    anotar(testInfo, 'Elementos de gráfica detectados', String(graficas));
    expect.soft(graficas, '1.1.1: si existiera una gráfica necesitaría alternativa textual; el desglose actual ya es texto (dl)').toBe(0);

    const categorias = await panel.locator('dl dt').allInnerTexts();
    const montos = await panel.locator('dl dd').allInnerTexts();
    anotar(testInfo, 'Desglose por categoría', categorias.map((c, i) => `${c}: ${montos[i]}`).join(' | '));
    expect.soft(categorias.length, '1.3.1: cada monto del desglose debe tener su etiqueta de categoría (dt/dd asociados)').toBeGreaterThan(0);
    expect.soft(montos.filter((m) => !/\$/.test(m)), '1.3.1/4.1.2: cada monto debe leerse con su moneda').toEqual([]);

    await escanear(page, TC_ID, __dirname, 'acumulado', testInfo, PASOS_LIGHTHOUSE);
  });

  test('2. Tabla de registros del ciclo - encabezados asociados a sus celdas (1.3.1)', async ({}, testInfo) => {
    testInfo.setTimeout(60_000);
    await irA(page, RUTA, TITULO);
    await consultarPrimerActivo(page);
    const tabla = main(page).getByRole('table');
    // La tabla puede resolverse un instante después de networkidle (consulta aparte de la del
    // acumulado): se espera a que aparezca antes de decidir si la precondición no se cumple.
    await tabla.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
    precondicion(await tabla.count() > 0, 'el ciclo activo todavía no tiene registros de suministro');
    if (await tabla.count() === 0) return;

    const encabezados = await tabla.locator('thead th').allInnerTexts();
    anotar(testInfo, 'Encabezados', encabezados.join(' | '));
    const filas = await tabla.locator('tbody tr').count();
    const primeraFila = await tabla.locator('tbody tr').first().locator('td').count();
    expect.soft(primeraFila, '1.3.1: la primera fila debe tener tantas celdas como encabezados (excluyendo la columna de acciones sin encabezado visible)').toBeGreaterThanOrEqual(encabezados.length - 1);
    anotar(testInfo, 'Filas', String(filas));

    await escanear(page, TC_ID, __dirname, 'registros-del-ciclo', testInfo, PASOS_LIGHTHOUSE);
  });

  test('3. Ciclo CERRADO y consolidado - delegado al panel NIC-41 (ver RF-79 TC-DIS-206/207)', async ({}, testInfo) => {
    anotar(testInfo, 'Alcance', 'El estado ACTIVO/CERRADO con condición de "consolidado e inmutable" se comunica en Nic41Panel (badge EstadoRegistroBadge sobre CONSOLIDADO/ENTREGADO), ya auditado por los casos de RF-79. Esta vista (CostosView) solo muestra el acumulado del ciclo vigente, nunca uno cerrado.');
  });
});
