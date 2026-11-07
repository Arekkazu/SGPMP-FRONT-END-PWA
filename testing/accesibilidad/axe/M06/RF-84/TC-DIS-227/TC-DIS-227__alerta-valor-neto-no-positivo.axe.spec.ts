// | Fecha      | Nombre      | Que se hizo |
// |------------|-------------|-------------|
// | 2026-11-06 | Laura032005 | M06 RF-84 TC-DIS-227: accesibilidad de la alerta de valor neto no positivo y REVISION_REQUERIDA |
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
import { abrirSesion, anotar, desviacion, escanear, irA, main, precondicion } from '../../../_shared/sigabA11y';

const TC_ID = 'TC-DIS-227';
const RUTA = 'finanzas/valor-razonable';
const TITULO = 'Valor razonable menos costos de venta';
const PASOS_LIGHTHOUSE = ['simulacion-valor-neto', 'historial-revision-requerida'];

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Valor neto no positivo y REVISION_REQUERIDA (RF-84)`, () => {
  let contexto: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    ({ contexto, page } = await abrirSesion(browser, testInfo));
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test('1. Motivo VALOR_NETO_NO_POSITIVO en la simulación - Alert con texto, no solo color (1.4.1 / 4.1.3)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const selector = main(page).getByRole('combobox', { name: 'Selecciona un activo' });
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
    await irA(page, RUTA, TITULO);
    const badge = main(page).getByText('Requiere revisión', { exact: true });
    const hay = await badge.count() > 0;
    precondicion(hay, 'ningún cálculo del período quedó en estado REVISION_REQUERIDA');
    if (hay) {
      await expect.soft(badge.first(), '1.4.1: el estado debe leerse como texto').toBeVisible();
      await escanear(page, TC_ID, __dirname, 'historial-revision-requerida', testInfo, PASOS_LIGHTHOUSE);
    }
  });

  test('3. Desviación - no existe un campo de justificación del Contador para REVISION_REQUERIDA', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const justificacion = main(page).getByRole('textbox', { name: /justificaci[óo]n/i });
    anotar(testInfo, 'Campos de justificación en CalculoView', String(await justificacion.count()));
    desviacion(
      await justificacion.count() > 0,
      'ni CalculoView ni DetalleActivoModal (RF-84) tienen un campo de justificación para que el Contador valide/resuelva un cálculo en REVISION_REQUERIDA; el estado es de solo lectura en este flujo',
    );
  });
});
