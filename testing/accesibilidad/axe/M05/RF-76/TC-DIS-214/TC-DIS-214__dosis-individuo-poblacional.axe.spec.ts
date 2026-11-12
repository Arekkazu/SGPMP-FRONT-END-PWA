// | Fecha      | Nombre      | Que se hizo |
// |------------|-------------|-------------|
// | 2026-11-06 | Laura032005 | M05 RF-76 TC-DIS-214: dosis_por_individuo (POBLACIONAL) no se expone en la UI |
// | 2026-11-11 | Laura032005 | M05 RF-76 TC-DIS-214: reejecución con datos reales del DBA (formulario y tabla ya exponen dosis por individuo desde el 2026-11-10; E13 verificado con el duplicado real de POR-220-TIL) |
/**
 * TC-DIS-214 — Accesibilidad WCAG 2.1 AA del cálculo de dosis_por_individuo (POBLACIONAL) y del
 * rechazo por registro duplicado
 * RF-76 · CU-01 Registrar Suministros (Aplicación de Medicamentos) · Rol: Veterinario
 * Suministros → Medicamentos (/suministros/medicamentos)
 *
 * Criterio (hoja M05): 0 violaciones axe A/AA en 1.3.1 y 4.1.2 (cantidad_actual y
 * dosis_por_individuo expuestos como campos de solo lectura con etiqueta y unidad_dosis);
 * verificación manual de 4.1.3 (el recálculo en tiempo real de dosis_por_individuo se anuncia
 * con aria-live="polite" y el rechazo E13 —HTTP 409— se anuncia sin mover el foco).
 *
 * 2026-11-10: tanto MedicamentoFormModal.tsx (campos "medicamento-cantidad-actual" y
 * "medicamento-dosis-por-individuo") como MedicamentosView.tsx (columna "Por individuo" en la
 * tabla) se corrigieron para exponer dosis_por_individuo. Lo que en la primera ejecución se
 * reportó como desviación en ambos puntos ahora se verifica como corregido.
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { abrirSesion, anotar, describirFoco, desviacion, escanear, irA, main, precondicion } from '../../../_shared/sigabA11y';

const TC_ID = 'TC-DIS-214';
const RUTA = 'suministros/medicamentos';
const TITULO = 'Aplicación de medicamentos';
const PASOS_LIGHTHOUSE = ['formulario', 'tabla'];

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Dosis por individuo en activos POBLACIONAL (RF-76)`, () => {
  let contexto: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    ({ contexto, page } = await abrirSesion(browser, testInfo));
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test('1. Corrección verificada - cantidad_actual y dosis_por_individuo en vivo, con etiqueta/unidad y anuncio aria-live (1.3.1 / 4.1.2 / 4.1.3)', async ({}, testInfo) => {
    testInfo.setTimeout(90_000);
    await irA(page, RUTA, TITULO);

    const encabezados = await main(page).locator('table thead th').allInnerTexts().catch(() => []);
    anotar(testInfo, 'Encabezados de la tabla', encabezados.join(' | ') || 'sin tabla visible (sin registros)');
    desviacion(
      encabezados.some((h) => /individuo|dosis.?por/i.test(h)),
      'MedicamentosView no tiene una columna equivalente a "Por individuo" (AlimentacionView) para dosis_por_individuo; el dato existe en el tipo Medicamento pero no se renderiza en ningún punto de la UI revisada',
    );

    const btn = main(page).getByRole('button', { name: 'Registrar aplicación', exact: true });
    precondicion(await btn.isEnabled().catch(() => false), 'el botón "Registrar aplicación" está deshabilitado (sin conexión o sin permiso)');
    if (await btn.isEnabled().catch(() => false)) {
      await btn.click();
      const dialogo = page.getByRole('dialog');
      await expect(dialogo).toBeVisible();
      const campos = await dialogo.locator('input, textarea, select').evaluateAll((els) => els.map((e) => (e as HTMLInputElement).id));
      anotar(testInfo, 'Campos del formulario', campos.join(', '));
      desviacion(
        campos.some((id) => /cantidad.?actual|dosis.?por.?individuo/i.test(id)),
        'MedicamentoFormModal no tiene campos de solo lectura para cantidad_actual ni dosis_por_individuo (mismo patrón que TC-DIS-210 en RF-75)',
      );

      const cantidadActual = dialogo.locator('#medicamento-cantidad-actual');
      const dosisIndividuo = dialogo.locator('#medicamento-dosis-por-individuo');
      await expect.soft(cantidadActual, '1.3.1/4.1.2: cantidad_actual debe ser de solo lectura').toHaveAttribute('aria-readonly', 'true');
      await expect.soft(dosisIndividuo, '1.3.1/4.1.2: dosis_por_individuo debe ser de solo lectura').toHaveAttribute('aria-readonly', 'true');

      // POR-220-TIL (1632, ACTIVO, 100 tilapias) para verificar el recálculo en vivo.
      const selectorActivo = dialogo.getByRole('combobox', { name: 'Activo biológico' });
      await selectorActivo.fill('1632');
      await selectorActivo.blur();
      await expect.soft(cantidadActual, 'cantidad_actual debe reflejar la población real del lote (100 tilapias)').toHaveValue(/100/, { timeout: 10_000 });

      const parrafoVivo = dialogo.locator('p[aria-live="polite"]');
      await expect.soft(parrafoVivo, '4.1.3: la dosis por individuo debe anunciarse en una región aria-live="polite"').toBeVisible();
      const textoAntes = await parrafoVivo.innerText();
      await dialogo.locator('#medicamento-dosis').fill('10');
      const focoAntes = await describirFoco(page);
      await expect.soft(parrafoVivo, '4.1.3: al cambiar la dosis, el párrafo en vivo debe recalcular el valor por individuo (10/100 = 0.1)').not.toHaveText(textoAntes);
      const focoDespues = await describirFoco(page);
      expect.soft(focoDespues, '4.1.3: el recálculo en vivo no debe mover el foco').toBe(focoAntes);

      await escanear(page, TC_ID, __dirname, 'formulario', testInfo, PASOS_LIGHTHOUSE);
      await page.keyboard.press('Escape');
    }

    await escanear(page, TC_ID, __dirname, 'tabla', testInfo, PASOS_LIGHTHOUSE);
  });

  test('2. E13 - rechazo por registro duplicado (HTTP 409) con POR-220-TIL (Oxitetraciclina LA 200, 1/11 09:00)', async ({}, testInfo) => {
    testInfo.setTimeout(60_000);
    await irA(page, RUTA, TITULO);
    const btn = main(page).getByRole('button', { name: 'Registrar aplicación', exact: true });
    precondicion(await btn.isEnabled().catch(() => false), 'el botón "Registrar aplicación" está deshabilitado (sin conexión o sin permiso)');
    await btn.click();
    const dialogo = page.getByRole('dialog');
    await expect(dialogo).toBeVisible();

    // Duplicado real que preparó el DBA: POR-220-TIL (1632), Oxitetraciclina LA 200, 1/11/2026
    // 09:00 — mismo activo + nombre_medicamento + fecha + hora de un registro VALIDADO. E13/CA-7
    // no incluyen dosis_aplicada en la definición de duplicado (a diferencia de la Restricción
    // 13), así que se usa un valor de dosis cualquiera para aislar esa variable.
    const selectorActivo = dialogo.getByRole('combobox', { name: 'Activo biológico' });
    await selectorActivo.fill('1632');
    await selectorActivo.blur();
    await dialogo.locator('#medicamento-nombre').fill('Oxitetraciclina LA 200');
    await dialogo.locator('#medicamento-via').selectOption('INTRAMUSCULAR');
    await dialogo.locator('#medicamento-fecha').fill('2026-11-01');
    await dialogo.locator('#medicamento-hora').fill('09:00');
    await dialogo.locator('#medicamento-dosis').fill('3');
    await dialogo.locator('#medicamento-unidad').fill('ml');
    await dialogo.locator('#medicamento-costo').fill('4500');
    await dialogo.locator('#medicamento-vet').fill('Carlos Ramírez');
    await dialogo.locator('#medicamento-motivo').fill('Reproducción de duplicado real (E13)');
    await dialogo.getByRole('button', { name: 'Guardar registro', exact: true }).click();
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    const alerta = dialogo.getByRole('alert');
    anotar(testInfo, 'E13 - respuesta del servidor', await alerta.count() > 0 ? await alerta.innerText() : 'ninguna alerta visible; el diálogo pudo haberse cerrado (ver si el duplicado fue aceptado)');
    precondicion(await alerta.count() > 0, 'el servidor no rechazó el envío como duplicado (409); puede que el registro VALIDADO de referencia (1/11 09:00, Oxitetraciclina LA 200) ya no exista tal cual en el ambiente, o que la dosis distinta sí importe para el backend');
    if (await alerta.count() > 0) {
      await expect.soft(alerta, '4.1.3 (E13): el rechazo de duplicado debe anunciarse en una región visible/anunciable, sin mover el foco al body').toBeVisible();
      const foco = await describirFoco(page);
      expect.soft(foco, '4.1.3: el foco no debe perderse al mostrar el error de duplicado').not.toBe('body');
    }

    await page.keyboard.press('Escape');
  });
});
