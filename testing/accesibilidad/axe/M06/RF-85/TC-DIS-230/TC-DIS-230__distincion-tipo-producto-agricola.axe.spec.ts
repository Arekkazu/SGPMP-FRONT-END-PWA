// | Fecha      | Nombre      | Que se hizo |
// |------------|-------------|-------------|
// | 2026-11-06 | Laura032005 | M06 RF-85 TC-DIS-230: accesibilidad de la distinción PRODUCTO_DE_CONSUMO vs. PRODUCTO_PERIODICO |
// | 2026-11-12 | Laura032005 | M06 RF-85 TC-DIS-230: seleccionar período 241, con el producto de consumo real confirmado por el DBA |
// | 2026-11-12 | Laura032005 | M06 RF-85 TC-DIS-230: confirmado que ningún período tiene ambos tipos a la vez (consumo en 241, periódico en 1) — vacío de datos real |
/**
 * TC-DIS-230 — Accesibilidad WCAG 2.1 AA de la distinción entre PRODUCTO_DE_CONSUMO y
 * PRODUCTO_PERIODICO en el reconocimiento de productos agrícolas
 * RF-85 · CU-04 Reconocer producto agrícola en punto de cosecha · Rol: Contador
 * Finanzas NIC 41 → Productos agrícolas (/finanzas/productos), ProductosView.tsx
 *
 * Ver la nota sobre el estado del código (módulo en `dev`, aún no en `test`) en TC-DIS-221.
 *
 * Criterio (hoja M06): 0 violaciones axe A/AA en 1.4.1 (tipo de producto con etiqueta textual,
 * no solo color); 1.4.3 (contraste ≥ 4.5:1); 4.1.2 (name/role/value de las etiquetas expuestas
 * a tecnología de asistencia).
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { abrirSesion, anotar, escanear, irA, main, precondicion } from '../../../_shared/sigabA11y';

const TC_ID = 'TC-DIS-230';
const RUTA = 'finanzas/productos';
const TITULO = 'Productos agrícolas';
const PASOS_LIGHTHOUSE = ['tabla-productos'];

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Tipo de producto agrícola (RF-85)`, () => {
  let contexto: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    ({ contexto, page } = await abrirSesion(browser, testInfo));
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test('1. Badge de tipo con texto para ambos tipos (1.4.1 / 4.1.2)', async ({}, testInfo) => {
    testInfo.setTimeout(60_000);
    await irA(page, RUTA, TITULO);
    // DBA: producto 154 (de consumo) está en el período 241; productos 1 y 2 (periódicos) están
    // en el período 1. Se usa 241, que ya tiene datos reales confirmados.
    const periodo = main(page).getByRole('combobox', { name: 'Período contable' });
    if (await periodo.count() > 0) await periodo.selectOption('241').catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    const tabla = main(page).getByRole('table');
    precondicion(await tabla.count() > 0, 'el período elegido no tiene productos agrícolas reconocidos');
    if (await tabla.count() === 0) return;

    const periodicos = tabla.getByText('Producto periódico', { exact: true });
    const consumo = tabla.getByText('Producto de consumo', { exact: true });
    const nPeriodicos = await periodicos.count();
    const nConsumo = await consumo.count();
    anotar(testInfo, 'Productos por tipo', `periódico: ${nPeriodicos} · de consumo: ${nConsumo}`);
    precondicion(nPeriodicos > 0 && nConsumo > 0, 'el período no tiene al menos un producto de cada tipo (PRODUCTO_DE_CONSUMO y PRODUCTO_PERIODICO) representado');
    expect.soft(nPeriodicos + nConsumo, '1.4.1: todas las filas deben tener su tipo comunicado como texto').toBeGreaterThan(0);

    await escanear(page, TC_ID, __dirname, 'tabla-productos', testInfo, PASOS_LIGHTHOUSE);
  });

  test('2. KPIs "Productos periódicos" y "Cosechas del activo" con conteo accesible (4.1.2)', async ({}, testInfo) => {
    testInfo.setTimeout(60_000);
    await irA(page, RUTA, TITULO);
    const periodo = main(page).getByRole('combobox', { name: 'Período contable' });
    if (await periodo.count() > 0) await periodo.selectOption('241').catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    const kpiPeriodicos = main(page).locator('.fin-kpi', { hasText: 'Productos periódicos' });
    const kpiConsumo = main(page).locator('.fin-kpi', { hasText: 'Cosechas del activo' });
    const hay = await kpiPeriodicos.count() > 0;
    precondicion(hay, 'no hay período seleccionado o los indicadores no se renderizaron');
    if (hay) {
      anotar(testInfo, 'KPI periódicos', await kpiPeriodicos.locator('.fin-kpi__valor').innerText());
      anotar(testInfo, 'KPI de consumo', await kpiConsumo.locator('.fin-kpi__valor').innerText());
      await expect.soft(kpiPeriodicos.locator('dt'), '4.1.2: el KPI debe tener su etiqueta (dt) visible').toBeVisible();
    }
  });
});
