// | Fecha      | Nombre      | Que se hizo |
// |------------|-------------|-------------|
// | 2026-11-06 | Laura032005 | M06 RF-84 TC-DIS-229: accesibilidad de la distinción costos de venta vs. mantenimiento |
/**
 * TC-DIS-229 — Accesibilidad WCAG 2.1 AA de la distinción entre costos de venta y costos de
 * mantenimiento y del valor neto resultante
 * RF-84 · CU-03 Calcular valor razonable menos costos de venta · Rol: Contador
 * Finanzas NIC 41 → Costos del período (/finanzas/costos, CostosView.tsx de
 * financial_valuation — identificado internamente como RF-90 en el código, pero es donde la
 * distinción VENTA/MANTENIMIENTO/INVERSION existe de verdad, con tarjetas agrupadas por
 * naturaleza); el valor neto resultante se verifica en Valor razonable neto
 * (/finanzas/valor-razonable, CalculoView.tsx), ya cubierto por TC-DIS-227/228.
 *
 * Ver la nota sobre el estado del código (módulo en `dev`, aún no en `test`) en TC-DIS-221.
 *
 * Criterio (hoja M06): 0 violaciones axe A/AA en 1.3.1 (secciones y tabla con encabezados
 * asociados); 1.4.1 (distinción venta/mantenimiento con texto, no solo color); 1.4.3 (contraste
 * ≥ 4.5:1).
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { abrirSesion, anotar, auditarTabla, escanear, irA, main, precondicion } from '../../../_shared/sigabA11y';

const TC_ID = 'TC-DIS-229';
const RUTA = 'finanzas/costos';
const TITULO = 'Costos del período';
const PASOS_LIGHTHOUSE = ['tarjetas-por-naturaleza', 'tabla-registros'];

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Distinción costos de venta vs. mantenimiento (RF-84)`, () => {
  let contexto: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    ({ contexto, page } = await abrirSesion(browser, testInfo));
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test('1. Secciones por naturaleza con encabezado propio, no solo el borde de color (1.3.1 / 1.4.1)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const secciones = main(page).locator('section.fin-tarjeta[aria-labelledby^="costos-"]');
    const n = await secciones.count();
    precondicion(n > 0, 'el período elegido no tiene costos registrados (los grupos por naturaleza solo se pintan con g.registros > 0)');
    if (n === 0) return;

    for (let i = 0; i < n; i++) {
      const s = secciones.nth(i);
      const idTitulo = await s.getAttribute('aria-labelledby');
      const titulo = s.locator(`#${idTitulo}`);
      await expect.soft(titulo, `1.3.1: la sección debe tener un encabezado asociado por aria-labelledby`).toBeVisible();
      const badge = s.locator('span').first();
      await expect.soft(badge, '1.4.1: cada sección debe nombrar su naturaleza con texto (Badge), no depender solo del borde de color').toBeVisible();
    }
    const nombres = await secciones.locator('h3').allInnerTexts();
    anotar(testInfo, 'Secciones por naturaleza', nombres.join(' | '));
    expect.soft(nombres.some((t) => /venta/i.test(t)), 'debe existir una sección de costos de venta').toBe(true);
    expect.soft(nombres.some((t) => /mantenimiento/i.test(t)), 'debe existir una sección de costos de mantenimiento').toBe(true);

    await escanear(page, TC_ID, __dirname, 'tarjetas-por-naturaleza', testInfo, PASOS_LIGHTHOUSE);
  });

  test('2. Tabla de registros del período - encabezados asociados, naturaleza con texto (1.3.1 / 1.4.1)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const tabla = main(page).getByRole('table');
    precondicion(await tabla.count() > 0, 'el período elegido no tiene registros de costo');
    if (await tabla.count() === 0) return;

    const a = await auditarTabla(tabla);
    anotar(testInfo, 'Encabezados de la tabla de costos', a.encabezados.join(' | '));
    expect.soft(a.filasDesalineadas, '1.3.1: filas con un número de celdas distinto al de encabezados').toEqual([]);
    expect.soft(a.encabezados, 'debe existir una columna de Naturaleza').toEqual(expect.arrayContaining(['Naturaleza']));

    await escanear(page, TC_ID, __dirname, 'tabla-registros', testInfo, PASOS_LIGHTHOUSE);
  });

  test('3. Valor neto resultante - delegado a Valor razonable neto (ver RF-84 TC-DIS-227/228)', async ({}, testInfo) => {
    anotar(testInfo, 'Alcance', 'El "valor neto resultante" (valor razonable bruto menos costos de venta) se calcula y se muestra en CalculoView (/finanzas/valor-razonable), ya auditado por TC-DIS-227 y TC-DIS-228. CostosView (esta vista) solo clasifica y totaliza los costos por naturaleza; no calcula el valor neto de ningún activo.');
  });
});
