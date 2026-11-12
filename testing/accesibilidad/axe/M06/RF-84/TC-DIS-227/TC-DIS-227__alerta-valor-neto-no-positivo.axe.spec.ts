// | Fecha      | Nombre      | Que se hizo |
// |------------|-------------|-------------|
// | 2026-11-06 | Laura032005 | M06 RF-84 TC-DIS-227: accesibilidad de la alerta de valor neto no positivo y REVISION_REQUERIDA |
// | 2026-11-12 | Laura032005 | M06 RF-84 TC-DIS-227: seleccionar período 363/241 con datos reales sembrados por el DBA (activos reconocidos, cálculo 836) |
// | 2026-11-12 | Laura032005 | M06 RF-84 TC-DIS-227: el período 363 pertenece a otro Titular ("Agropecuaria Medicion QA") — usar irAPeriodo; el 241 es del Titular por defecto |
// | 2026-11-12 | Laura032005 | M06 RF-84 TC-DIS-227: corregir selector "Activo" (no "Selecciona un activo") y acotar el badge de estado a la tabla, no al filtro |
// | 2026-11-12 | Laura032005 | M06 RF-84 TC-DIS-227: la causa 2 era un bug de test — el campo de justificación SÍ existe, en ValidarCalculoModal (botón "Validar"); test3 reescrito para verificarlo ahí |
// | 2026-11-12 | Laura032005 | M06 RF-84 TC-DIS-227: usar cuenta Contador — Admin no tiene ACCION_C sobre valor razonable (sin botón "Validar") |
/**
 * TC-DIS-227 — [CRÍTICO] Accesibilidad WCAG 2.1 AA de la alerta crítica de valor neto ≤ 0, del
 * estado REVISION_REQUERIDA y de la justificación obligatoria del Contador
 * RF-84 · CU-03 Calcular valor razonable menos costos de venta · Rol: Contador
 * Finanzas NIC 41 → Valor razonable neto (/finanzas/valor-razonable), CalculoView.tsx
 *
 * Ver la nota sobre el estado del código (módulo en `dev`, aún no en `test`) en TC-DIS-221.
 *
 * Criterio (hoja M06): 0 violaciones axe A/AA en 4.1.3 (alerta crítica anunciada); 1.4.1
 * (severidad crítica y estado REVISION_REQUERIDA con etiqueta textual, no solo color); 3.3.1 y
 * 3.3.2 (campo de justificación con etiqueta, obligatorio y error asociado); 2.4.3 (el foco
 * llega a la alerta o al campo de justificación).
 *
 * "Valor neto ≤ 0" es el motivo VALOR_NETO_NO_POSITIVO ("Los costos de venta igualan o superan
 * el valor razonable.") que CalculoView muestra en un Alert warning dentro de la simulación.
 * El estado REVISION_REQUERIDA aparece en EstadoBadge sobre el historial de cálculos. No existe
 * en el código un campo de justificación del Contador para resolver REVISION_REQUERIDA — ni en
 * CalculoView ni en DetalleActivoModal: se reporta como desviación real, no se inventa el campo.
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import {
  abrirSesion, anotar, credencialesPorRol, escanear, irA, irAPeriodo, main, precondicion,
} from '../../../_shared/sigabA11y';

const TC_ID = 'TC-DIS-227';
const RUTA = 'finanzas/valor-razonable';
const TITULO = 'Valor razonable menos costos de venta';
const PASOS_LIGHTHOUSE = ['simulacion-valor-neto', 'historial-revision-requerida'];

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Valor neto no positivo y REVISION_REQUERIDA (RF-84)`, () => {
  let contexto: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    // RF-84: Rol Contador. Admin no tiene ACCION_C sobre valor razonable — "Validar" no aparece.
    ({ contexto, page } = await abrirSesion(browser, testInfo, credencialesPorRol('CONTADOR')));
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test('1. Motivo VALOR_NETO_NO_POSITIVO en la simulación - Alert con texto, no solo color (1.4.1 / 4.1.3)', async ({}, testInfo) => {
    testInfo.setTimeout(60_000);
    await irA(page, RUTA, TITULO);
    // Período 363, Titular "Agropecuaria Medicion QA" — activos reconocidos sembrados por el DBA.
    await irAPeriodo(page, '363', 'Agropecuaria Medicion QA');
    // Accesible name real: "Activo" (col.activo), no "Selecciona un activo".
    const selector = main(page).getByRole('combobox', { name: 'Activo', exact: true });
    precondicion(await selector.count() > 0, 'no hay activos reconocidos disponibles para simular su valor');
    if (await selector.count() === 0) return;

    const opciones = await selector.locator('option').count();
    precondicion(opciones > 1, 'el catálogo de activos reconocidos está vacío');
    if (opciones <= 1) return;
    await selector.selectOption({ index: 1 });
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    const alertaInvalida = main(page).locator('[role="alert"]').filter({ hasText: /costos de venta igualan o superan|no se pudo calcular/i });
    const hay = await alertaInvalida.count() > 0;
    anotar(testInfo, 'Alerta de valor neto no positivo', hay ? await alertaInvalida.first().innerText() : 'el activo elegido sí tiene valor neto positivo');
    precondicion(hay, 'el primer activo probado no reproduce VALOR_NETO_NO_POSITIVO; se necesita un activo cuyos costos de venta igualen o superen el valor razonable bruto');
    if (hay) {
      await expect.soft(alertaInvalida.first(), '4.1.3: debe estar en role="alert"').toHaveAttribute('role', 'alert');
    }
    await escanear(page, TC_ID, __dirname, 'simulacion-valor-neto', testInfo, PASOS_LIGHTHOUSE);
  });

  test('2. Estado REVISION_REQUERIDA en el historial - con texto, no solo color (1.4.1)', async ({}, testInfo) => {
    testInfo.setTimeout(60_000);
    await irA(page, RUTA, TITULO);
    // Cálculo 836 (BOV-115-TIL, Finca El Rosal) ya existía en estado REVISION_REQUERIDA,
    // período 241 — bajo el Titular por defecto (Agropecuaria El Rosal), sin cambiar Titular.
    const periodo = main(page).getByRole('combobox', { name: 'Período contable' });
    if (await periodo.count() > 0) await periodo.selectOption('241', { timeout: 5_000 }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    // "Requiere revisión" también aparece como <option> del filtro de Estado (antes que la
    // tabla en el DOM, nunca "visible" por sí misma): se acota al badge dentro de la tabla.
    const badge = main(page).getByRole('table').getByText('Requiere revisión', { exact: true });
    await badge.first().waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
    const hay = await badge.count() > 0;
    precondicion(hay, 'ningún cálculo del período quedó en estado REVISION_REQUERIDA');
    if (hay) {
      await expect.soft(badge.first(), '1.4.1: el estado debe leerse como texto').toBeVisible();
      await escanear(page, TC_ID, __dirname, 'historial-revision-requerida', testInfo, PASOS_LIGHTHOUSE);
    }
  });

  test('3. Campo de justificación del Contador en ValidarCalculoModal, obligatorio (3.3.2)', async ({}, testInfo) => {
    testInfo.setTimeout(60_000);
    await irA(page, RUTA, TITULO);
    const periodo = main(page).getByRole('combobox', { name: 'Período contable' });
    if (await periodo.count() > 0) await periodo.selectOption('241', { timeout: 5_000 }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    // El campo vive en ValidarCalculoModal (botón "Validar", visible con permiso de
    // confirmación sobre un cálculo REVISION_REQUERIDA), no directamente en CalculoView.
    const validar = main(page).getByRole('button', { name: /^Validar el cálculo de/ }).first();
    await validar.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
    precondicion(await validar.count() > 0, 'no se tiene permiso de confirmación (ACCION_C), único caso donde se muestra el botón "Validar"');
    if (await validar.count() === 0) return;

    await validar.click();
    const dialogo = page.getByRole('dialog');
    await expect(dialogo).toBeVisible();
    const justificacion = dialogo.getByRole('textbox', { name: 'Justificación', exact: true });
    await justificacion.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
    const existe = await justificacion.count() > 0;
    anotar(testInfo, 'Campo de justificación en ValidarCalculoModal', String(existe));
    expect.soft(existe, '3.3.2: ValidarCalculoModal debe tener un campo de justificación con etiqueta').toBe(true);
    if (existe) {
      await expect.soft(justificacion, '3.3.2: debe ser obligatorio').toHaveAttribute('aria-required', 'true');
    }
    await page.keyboard.press('Escape');
  });
});
