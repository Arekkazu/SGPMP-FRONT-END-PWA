// | Fecha      | Nombre      | Que se hizo |
// |------------|-------------|-------------|
// | 2026-11-06 | Laura032005 | M05 RF-76 TC-DIS-214: dosis_por_individuo (POBLACIONAL) no se expone en la UI |
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
 * Medicamento.dosis_por_individuo existe en el tipo de dominio (types.ts) pero no se renderiza
 * en ningún punto de la UI revisada: ni en MedicamentoFormModal (que no tiene campos de
 * cantidad_actual/dosis_por_individuo, igual que ConsumoFormModal en TC-DIS-210) ni en la tabla
 * de MedicamentosView (cuya columna "Dosis" muestra cantidad + unidad_dosis, sin una columna
 * equivalente a "Por individuo" de AlimentacionView). Es una desviación real, no solo la
 * ausencia del cálculo en vivo que ya reportó TC-DIS-210 para RF-75.
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { abrirSesion, anotar, desviacion, escanear, irA, main, precondicion } from '../../../_shared/sigabA11y';

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

  test('1. Desviación - ni el formulario ni la tabla exponen cantidad_actual ni dosis_por_individuo', async ({}, testInfo) => {
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
      await escanear(page, TC_ID, __dirname, 'formulario', testInfo, PASOS_LIGHTHOUSE);
      await page.keyboard.press('Escape');
    }

    await escanear(page, TC_ID, __dirname, 'tabla', testInfo, PASOS_LIGHTHOUSE);
  });

  test('2. E13 - rechazo por registro duplicado (precondición de datos, no se fuerza con datos inventados)', async ({}, testInfo) => {
    precondicion(false, 'requiere reproducir el mismo activo, nombre_medicamento, dosis, fecha y hora de aplicación de un registro VALIDADO existente; la hoja señala una inconsistencia entre la Restricción 13 (incluye dosis_aplicada) y E13/CA-7 (no la incluyen) — se usaría la misma dosis del original para cubrir ambas definiciones, pero no se fuerza sin ese dato real en el ambiente');
    anotar(testInfo, 'E13 (MedicamentoFormModal)', 'El rechazo de servidor se mostraría con el mismo <Alert variant="error"> genérico que cualquier error 409, sin un mensaje dedicado ni indicación de "cómo registrar una dosis subsecuente" visible en el código revisado.');
  });
});
