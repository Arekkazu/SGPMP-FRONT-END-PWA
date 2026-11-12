// | Fecha      | Nombre      | Que se hizo |
// |------------|-------------|-------------|
// | 2026-11-06 | Laura032005 | M05 RF-81 TC-DIS-218: accesibilidad de la tabla paginada del historial de suministros |
// | 2026-11-11 | Laura032005 | M05 RF-81 TC-DIS-218: reejecución con datos reales del DBA (80 registros en BOV-114-TIL, ya hay paginación real); timeout ampliado a 60s; consultarPrimerActivo ya no toma el primero del combobox a ciegas, ahora apunta a BOV-114-TIL (1627); tests 1 y 2 esperaban la tabla sin dar tiempo a que cargara (carrera), ya corregido |
/**
 * TC-DIS-218 — [CRÍTICO] Accesibilidad WCAG 2.1 AA de la tabla paginada del Historial de
 * Suministros y de su navegación por teclado
 * RF-81 · CU-03 Reportar Gastos e Historial de Suministros · Rol: Gestor de Granja, Contador o
 * Revisor Fiscal
 * Suministros → Historial (/suministros/historial)
 *
 * Criterio (hoja M05): 0 violaciones axe A/AA en 1.3.1 (tabla con encabezados asociados:
 * fecha_aplicacion, tipo_suministro, cantidad, unidad_medida, precio_unitario, costo_registro,
 * origen_precio, ciclo); 2.1.1, 2.4.3 y 2.4.7 (paginación operable por teclado, orden de foco
 * lógico y foco visible); 4.1.2 (página actual expuesta con aria-current y controles de
 * paginación con nombre accesible); 1.4.1 (origen_precio y estado_ciclo no dependen únicamente
 * del color).
 *
 * La tabla de HistorialView.tsx no tiene columnas separadas para unidad_medida ni origen_precio:
 * unidad_medida va junto a la cantidad en la misma celda ("Cantidad") y origen_precio es una
 * segunda línea de texto dentro de la celda "Precio unitario". Es texto asociado a la misma
 * celda del dato principal, no una columna con su propio encabezado — se verifica tal como
 * existe, sin inventar columnas. Paginacion.tsx no usa aria-current (no hay enlaces por número
 * de página, solo "Anterior"/"Siguiente"): se documenta como desviación menor frente al
 * criterio, ya que la página actual se comunica en texto plano, no mediante aria-current.
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import {
  abrirSesion, anotar, auditarTabla, desviacion, escanear, irA, main, precondicion,
} from '../../../_shared/sigabA11y';

const TC_ID = 'TC-DIS-218';
const RUTA = 'suministros/historial';
const TITULO = 'Historial de suministros';
const PASOS_LIGHTHOUSE = ['tabla', 'pagina-2'];

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

async function consultarPrimerActivo(page: Page) {
  const combo = main(page).getByRole('combobox', { name: 'Activo biológico' });
  // BOV-114-TIL (id 1627): ciclo "Levante y ceba" real, fase Ceba activa desde el 1/10 (dato del DBA).
  await combo.fill('1627');
  await combo.blur();
  await main(page).getByRole('button', { name: 'Consultar', exact: true }).click();
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
}

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Tabla paginada del historial (RF-81)`, () => {
  let contexto: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    ({ contexto, page } = await abrirSesion(browser, testInfo));
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test('1. Tabla con encabezados asociados a sus celdas (1.3.1) y sin dependencia única del color (1.4.1)', async ({}, testInfo) => {
    testInfo.setTimeout(60_000);
    await irA(page, RUTA, TITULO);
    await consultarPrimerActivo(page);
    const tabla = main(page).getByRole('table');
    // La tabla puede resolverse un instante después de networkidle: se espera antes de decidir
    // si la precondición no se cumple (carrera observada en TC-DIS-216).
    await tabla.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
    precondicion(await tabla.count() > 0, 'el activo consultado no tiene suministros en el historial');
    if (await tabla.count() === 0) return;

    const a = await auditarTabla(tabla);
    anotar(testInfo, 'Auditoría de la tabla', `encabezados: ${a.encabezados.join(' | ')} · ${a.filas} fila(s)`);
    expect.soft(a.filasDesalineadas, '1.3.1: filas con un número de celdas distinto al de encabezados').toEqual([]);
    expect.soft(a.thEnThead, '1.3.1: todos los <th> deben estar dentro de <thead>').toBe(true);

    const columnasSeparadas = ['unidad_medida', 'origen_precio'].every((c) => a.encabezados.some((h) => h.toLowerCase().includes(c.replace('_', ''))));
    desviacion(columnasSeparadas, 'unidad_medida y origen_precio no tienen columna propia: viajan como texto secundario dentro de "Cantidad" y "Precio unitario" respectivamente. La información es texto (no depende del color), pero no está en su propia columna con encabezado dedicado como pide el criterio');

    await escanear(page, TC_ID, __dirname, 'tabla', testInfo, PASOS_LIGHTHOUSE);
  });

  test('2. Paginación operable por teclado, orden de foco lógico (2.1.1 / 2.4.3 / 2.4.7)', async ({}, testInfo) => {
    testInfo.setTimeout(60_000);
    await irA(page, RUTA, TITULO);
    await consultarPrimerActivo(page);
    const siguiente = page.getByRole('button', { name: 'Siguiente', exact: true });
    // Igual que con la tabla: el botón puede tardar un instante en reflejar el total real de
    // páginas tras networkidle.
    await main(page).getByRole('table').waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
    precondicion(await siguiente.count() > 0 && await siguiente.isEnabled(), 'el historial del activo consultado tiene una sola página (no hay "Siguiente" habilitado)');
    if (await siguiente.count() === 0 || !(await siguiente.isEnabled())) return;

    await siguiente.focus();
    await page.keyboard.press('Enter');
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    const paginaTexto = await page.getByText(/Página \d+ de \d+/).innerText();
    anotar(testInfo, 'Página tras "Siguiente" por teclado', paginaTexto);
    expect.soft(paginaTexto, '2.1.1: "Siguiente" activado por teclado debe avanzar de página').toMatch(/Página 2 de/);

    const foco = await page.evaluate(() => document.activeElement?.tagName.toLowerCase());
    anotar(testInfo, 'Elemento con foco tras cambiar de página', foco ?? 'ninguno');
    expect.soft(foco, '2.4.3: el foco no debe perderse al inicio del documento tras cambiar de página').not.toBe('body');

    await escanear(page, TC_ID, __dirname, 'pagina-2', testInfo, PASOS_LIGHTHOUSE);
  });

  test('3. Desviación - la página actual se comunica en texto plano, no con aria-current (4.1.2)', async ({}, testInfo) => {
    testInfo.setTimeout(60_000);
    await irA(page, RUTA, TITULO);
    await consultarPrimerActivo(page);
    const conAriaCurrent = await page.locator('[aria-current]').count();
    anotar(testInfo, 'Elementos con aria-current', String(conAriaCurrent));
    desviacion(conAriaCurrent > 0, 'Paginacion.tsx no tiene enlaces por número de página ni usa aria-current; solo "Anterior"/"Siguiente" y el texto "Página X de Y" (ambos con nombre accesible, pero sin aria-current)');
  });
});
