// | Fecha      | Nombre      | Que se hizo |
// |------------|-------------|-------------|
// | 2026-11-06 | Laura032005 | M05 RF-75 TC-DIS-210: accesibilidad del cálculo por individuo en activos POBLACIONAL |
/**
 * TC-DIS-210 — [CRÍTICO] Accesibilidad WCAG 2.1 AA del cálculo en tiempo real de
 * consumo_por_individuo_kg para activos POBLACIONAL
 * RF-75 · CU-01 Registrar Suministros (Consumo de Alimentos) · Rol: Productor, Veterinario o
 * Administrador
 * Suministros → Alimentación (/suministros/alimentacion)
 *
 * Criterio (hoja M05): 0 violaciones axe A/AA en 1.3.1 y 4.1.2 (cantidad_actual y
 * consumo_por_individuo_kg expuestos como campos de solo lectura —readonly/aria-readonly— con
 * etiqueta y unidad kg); verificación manual de 4.1.3 (la actualización en tiempo real de
 * consumo_por_individuo_kg al cambiar cantidad_alimento se anuncia mediante aria-live="polite"
 * sin mover el foco, y el rechazo E7 —HTTP 422— se anuncia al usuario).
 *
 * ConsumoFormModal.tsx no tiene ningún campo de cantidad_actual ni de consumo_por_individuo_kg:
 * el valor solo aparece después de guardar, como columna de solo lectura en la tabla de
 * consumos ("Por individuo"), no como cálculo en vivo dentro del formulario. El criterio del
 * caso no se puede evaluar sobre el formulario porque la funcionalidad que describe no existe
 * ahí — se reporta como desviación en vez de inventar un selector.
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { abrirSesion, anotar, desviacion, escanear, irA, main, precondicion } from '../../../_shared/sigabA11y';

const TC_ID = 'TC-DIS-210';
const RUTA = 'suministros/alimentacion';
const TITULO = 'Registro de alimentación';
const PASOS_LIGHTHOUSE = ['formulario', 'tabla-por-individuo'];

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Consumo por individuo en activos POBLACIONAL (RF-75)`, () => {
  let contexto: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    ({ contexto, page } = await abrirSesion(browser, testInfo));
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test('1. Desviación - el formulario no expone cantidad_actual ni un recálculo en vivo de consumo_por_individuo_kg', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const btn = main(page).getByRole('button', { name: 'Registrar consumo', exact: true });
    precondicion(await btn.isEnabled().catch(() => false), 'el botón "Registrar consumo" está deshabilitado (sin conexión o sin permiso)');
    await btn.click();
    const dialogo = page.getByRole('dialog');
    await expect(dialogo).toBeVisible();

    const camposFormulario = await dialogo.locator('input, textarea').evaluateAll((els) => els.map((e) => (e as HTMLInputElement).id));
    anotar(testInfo, 'Campos del formulario', camposFormulario.join(', '));
    desviacion(
      camposFormulario.some((id) => /cantidad.?actual|por.?individuo/i.test(id)),
      'ConsumoFormModal no tiene un campo de solo lectura para cantidad_actual ni para consumo_por_individuo_kg; ese valor solo se ve después de guardar, en la tabla ("Por individuo"), fuera del alcance de 1.3.1/4.1.2 sobre el formulario que pide el criterio',
    );
    await escanear(page, TC_ID, __dirname, 'formulario', testInfo, PASOS_LIGHTHOUSE);
    await page.keyboard.press('Escape');
  });

  test('2. Columna "Por individuo" de la tabla - etiqueta y unidad kg (lo único de este cálculo que la UI expone)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const encabezado = main(page).locator('table thead th', { hasText: 'Por individuo' });
    precondicion(await encabezado.count() > 0, 'no hay tabla de consumos visible para inspeccionar la columna "Por individuo"');
    if (await encabezado.count() === 0) return;

    const idx = await main(page).locator('table thead th').evaluateAll((ths) => ths.findIndex((th) => th.textContent?.trim() === 'Por individuo'));
    const valores = await main(page).locator('table tbody tr').evaluateAll(
      (filas, i) => filas.map((f) => (f.children[i] as HTMLElement)?.textContent?.trim() ?? ''),
      idx,
    );
    const conValor = valores.filter((v) => v !== '—' && v !== '');
    precondicion(conValor.length > 0, 'ningún consumo de la lista tiene consumo_por_individuo_kg calculado (activo no es POBLACIONAL o no hay registros)');
    anotar(testInfo, 'Valores "Por individuo"', valores.join(' | '));
    expect.soft(conValor.filter((v) => !/kg/i.test(v)), '4.1.2: el valor debe incluir su unidad (kg) como texto, no solo el número').toEqual([]);

    await escanear(page, TC_ID, __dirname, 'tabla-por-individuo', testInfo, PASOS_LIGHTHOUSE);
  });

  test('3. E7 - rechazo por cantidad_actual = 0/NULL (precondición de datos, no se fuerza con datos inventados)', async ({}, testInfo) => {
    precondicion(false, 'requiere un activo POBLACIONAL de prueba con cantidad_actual = 0 o NULL preparado en el ambiente; no existe un selector en la UI para simular este estado sin ese dato real');
    anotar(testInfo, 'E7', 'Si el backend rechaza el registro con HTTP 422, el error se mostraría mediante el Alert genérico de ConsumoFormModal (error.status !== 409 → variant="warning"), igual que cualquier otro error de servidor — no hay un mensaje dedicado a E7 en el código revisado.');
  });
});
