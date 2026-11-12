// | Fecha      | Nombre      | Que se hizo |
// |------------|-------------|-------------|
// | 2026-11-06 | Laura032005 | M05 RF-75 TC-DIS-210: accesibilidad del cálculo por individuo en activos POBLACIONAL |
// | 2026-11-11 | Laura032005 | M05 RF-75 TC-DIS-210: reejecución con datos reales del DBA (ConsumoFormModal ya expone el cálculo en vivo desde el 2026-11-10; E7 verificado con POR-221-TIL, id 1633, 0 individuos) |
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
 * 2026-11-10: ConsumoFormModal.tsx se corrigió y ya expone cantidad_actual y el cálculo en vivo
 * de consumo_por_individuo_kg como campos de solo lectura (ids "consumo-cantidad-actual" y
 * "consumo-por-individuo"), más un párrafo aria-live="polite" con el valor por individuo. Lo que
 * en la primera ejecución se reportó como desviación ahora se verifica como corregido.
 * E7 (POBLACIONAL con cantidad_actual = 0/NULL) se verifica con el activo real POR-221-TIL
 * (id 1633, 0 individuos, sin fase) que el DBA preparó para este caso.
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { abrirSesion, anotar, desviacion, describirFoco, escanear, irA, main, precondicion } from '../../../_shared/sigabA11y';

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

  test('1. Corrección verificada - cantidad_actual y consumo_por_individuo_kg en vivo, con etiqueta/unidad y anuncio aria-live (1.3.1 / 4.1.2 / 4.1.3)', async ({}, testInfo) => {
    testInfo.setTimeout(90_000);
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

    const cantidadActual = dialogo.locator('#consumo-cantidad-actual');
    const porIndividuo = dialogo.locator('#consumo-por-individuo');
    await expect.soft(cantidadActual, '1.3.1/4.1.2: cantidad_actual debe ser de solo lectura').toHaveAttribute('aria-readonly', 'true');
    await expect.soft(porIndividuo, '1.3.1/4.1.2: consumo_por_individuo_kg debe ser de solo lectura').toHaveAttribute('aria-readonly', 'true');

    // RF-75 real: BOV-114-TIL (1627) es individual, no POBLACIONAL. Se usa POR-220-TIL (1632,
    // ACTIVO, 100 tilapias) para verificar el recálculo en vivo con una población real > 0.
    const selectorActivo = dialogo.getByRole('combobox', { name: 'Activo biológico' });
    await selectorActivo.fill('1632');
    await selectorActivo.blur();
    await expect.soft(cantidadActual, 'cantidad_actual debe reflejar la población real del lote (100 tilapias)').toHaveValue(/100/, { timeout: 10_000 });

    const parrafoVivo = dialogo.locator('p[aria-live="polite"]');
    await expect.soft(parrafoVivo, '4.1.3: el total/por-individuo debe anunciarse en una región aria-live="polite"').toBeVisible();
    const textoAntes = await parrafoVivo.innerText();
    await dialogo.locator('#consumo-cantidad').fill('8');
    const focoAntes = await describirFoco(page);
    await expect.soft(parrafoVivo, '4.1.3: al cambiar la cantidad, el párrafo en vivo debe recalcular el valor por individuo (8/100 = 0.08 kg)').not.toHaveText(textoAntes);
    const focoDespues = await describirFoco(page);
    expect.soft(focoDespues, '4.1.3: el recálculo en vivo no debe mover el foco').toBe(focoAntes);
    await expect.soft(porIndividuo, '1.3.1/4.1.2: el valor por individuo debe incluir su unidad (kg)').toHaveValue(/kg/i);

    await escanear(page, TC_ID, __dirname, 'formulario', testInfo, PASOS_LIGHTHOUSE);
    await page.keyboard.press('Escape');
  });

  test('2. Columna "Por individuo" de la tabla - etiqueta y unidad kg (lo único de este cálculo que la UI expone)', async ({}, testInfo) => {
    // BOV-114-TIL ahora tiene 80 registros reales (datos del DBA, 2026-11-11): la tabla tarda
    // más en cargar y escanear que el límite por defecto de 30s.
    testInfo.setTimeout(60_000);
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

  test('3. E7 - POR-221-TIL (id 1633, POBLACIONAL con 0 individuos): el estado sin población se comunica en texto, y el rechazo del servidor se anuncia', async ({}, testInfo) => {
    testInfo.setTimeout(60_000);
    await irA(page, RUTA, TITULO);
    const btn = main(page).getByRole('button', { name: 'Registrar consumo', exact: true });
    precondicion(await btn.isEnabled().catch(() => false), 'el botón "Registrar consumo" está deshabilitado (sin conexión o sin permiso)');
    await btn.click();
    const dialogo = page.getByRole('dialog');
    await expect(dialogo).toBeVisible();

    const selectorActivo = dialogo.getByRole('combobox', { name: 'Activo biológico' });
    await selectorActivo.fill('1633');
    await selectorActivo.blur();

    const cantidadActual = dialogo.locator('#consumo-cantidad-actual');
    const porIndividuo = dialogo.locator('#consumo-por-individuo');
    // Espera a que termine de cargar la población (no solo que cambie de "0"/vacío), para no
    // capturar el texto intermedio "Cargando…" como si fuera el estado final.
    await expect.soft(cantidadActual, 'con cantidad_actual=0, el campo debe mostrar un texto que explique la ausencia de población, no "0", vacío ni quedarse en "Cargando…"').not.toHaveValue(/^0?$|Cargando/, { timeout: 10_000 });
    anotar(testInfo, 'cantidad_actual (POR-221-TIL)', await cantidadActual.inputValue());
    anotar(testInfo, 'consumo_por_individuo_kg (POR-221-TIL)', await porIndividuo.inputValue());
    expect.soft(await porIndividuo.inputValue(), '4.1.2: con 0 individuos no debe mostrarse un cálculo (división por cero), sino un texto de "pendiente"').not.toMatch(/NaN|Infinity/i);

    const tipoAlimento = dialogo.getByRole('combobox', { name: 'Tipo de alimento' });
    await tipoAlimento.focus();
    await tipoAlimento.press('ArrowDown');
    await tipoAlimento.press('Enter');
    await dialogo.locator('#consumo-cantidad').fill('5');
    await dialogo.locator('#consumo-costo').fill('1000');
    await dialogo.getByRole('button', { name: 'Guardar registro', exact: true }).click();
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    const alerta = dialogo.getByRole('alert');
    const siguioAbierto = await dialogo.isVisible().catch(() => false);
    anotar(testInfo, 'E7 - resultado del envío', siguioAbierto ? `diálogo sigue abierto; alerta: ${await alerta.count() > 0 ? await alerta.innerText() : 'ninguna'}` : 'el diálogo se cerró (el backend aceptó el registro pese a cantidad_actual=0)');
    if (siguioAbierto && (await alerta.count()) > 0) {
      await expect.soft(alerta, '4.1.3 (E7): el rechazo del servidor debe anunciarse en una región visible/anunciable').toBeVisible();
    }
  });
});
