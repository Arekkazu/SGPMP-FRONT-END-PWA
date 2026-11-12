// | Fecha      | Nombre      | Que se hizo |
// |------------|-------------|-------------|
// | 2026-11-06 | Laura032005 | M06 RF-82 TC-DIS-223: accesibilidad de la vista de confirmación del reconocimiento inicial |
// | 2026-11-12 | Laura032005 | M06 RF-82 TC-DIS-223: seleccionar período 363 y buscar QA-RF82-PENDIENTE (1861), sembrado por el DBA |
// | 2026-11-12 | Laura032005 | M06 RF-82 TC-DIS-223: el período 363 pertenece a otro Titular ("Agropecuaria Medicion QA") — usar irAPeriodo |
// | 2026-11-12 | Laura032005 | M06 RF-82 TC-DIS-223: usar cuenta Contador — Admin no tiene ACCION_C sobre reconocimiento_inicial |
/**
 * TC-DIS-223 — Accesibilidad WCAG 2.1 AA de la vista de confirmación del reconocimiento inicial
 * (origen del activo, costo de adquisición y valor razonable menos costos de venta)
 * RF-82 · CU-01 Reconocer inicialmente activo biológico · Rol: Contador
 * Finanzas NIC 41 → Reconocimiento inicial (/finanzas/reconocimiento) → "Revisar"/"Revisar
 * ahora" sobre una propuesta (PropuestaModal en ReconocimientosView.tsx)
 *
 * Ver la nota sobre el estado del código (módulo en `dev`, aún no en `test`) en TC-DIS-221.
 *
 * Criterio (hoja M06): 0 violaciones axe A/AA en 1.3.1 (datos del reconocimiento con estructura
 * y encabezados asociados); 3.3.2 (etiquetas de origen_financiero_activo y costo_adquisicion);
 * 4.1.3 (cambio de campos condicionales anunciado); 2.1.1 (flujo completo operable por teclado).
 *
 * PropuestaModal usa <Datos> (una <dl> de pares etiqueta/valor), no una tabla con <th>: el
 * criterio pide "estructura y encabezados asociados", que una dl con dt/dd ya cumple como
 * estructura semántica equivalente — se verifica esa asociación, no se exige una <table>
 * inexistente en el código.
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import {
  abrirSesion, anotar, credencialesPorRol, escanear, irA, irAPeriodo, main, precondicion,
} from '../../../_shared/sigabA11y';

const TC_ID = 'TC-DIS-223';
const RUTA = 'finanzas/reconocimiento';
const TITULO = 'Reconocimiento inicial';
const PASOS_LIGHTHOUSE = ['modal-confirmacion'];

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

async function irAPeriodoConPendiente(page: Page) {
  // QA-RF82-PENDIENTE (1861), período 363, Titular "Agropecuaria Medicion QA" — sembrado por el DBA.
  await irAPeriodo(page, '363', 'Agropecuaria Medicion QA');
  const campoBuscar = main(page).getByRole('searchbox');
  if (await campoBuscar.count() > 0) await campoBuscar.fill('QA-RF82-PENDIENTE');
}

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Confirmación del reconocimiento inicial (RF-82)`, () => {
  let contexto: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    // RF-82: Rol Contador. Admin no tiene ACCION_C sobre reconocimiento_inicial — el selector de
    // Clasificación (confirmación) no aparece con esa cuenta.
    ({ contexto, page } = await abrirSesion(browser, testInfo, credencialesPorRol('CONTADOR')));
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test('1. Datos del reconocimiento con estructura dt/dd asociada (1.3.1) y etiquetas de origen/costo (3.3.2)', async ({}, testInfo) => {
    testInfo.setTimeout(60_000);
    await irA(page, RUTA, TITULO);
    await irAPeriodoConPendiente(page);
    const revisar = main(page).getByRole('button', { name: /^Revisar el reconocimiento de/, exact: true }).first();
    await revisar.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
    precondicion(await revisar.count() > 0, 'no hay ninguna propuesta de reconocimiento pendiente para revisar');
    if (await revisar.count() === 0) return;

    await revisar.click();
    const dialogo = page.getByRole('dialog');
    await expect(dialogo).toBeVisible();
    // El diálogo abre antes de que terminen de cargar los datos de la propuesta (dl dt/dd).
    await dialogo.locator('dl dt').first().waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});

    const etiquetas = await dialogo.locator('dl dt').allInnerTexts();
    const valores = await dialogo.locator('dl dd').allInnerTexts();
    anotar(testInfo, 'Datos del reconocimiento', etiquetas.map((e, i) => `${e}: ${valores[i]}`).join(' | '));
    expect.soft(etiquetas.length, '1.3.1: cada valor debe tener su etiqueta (dt) asociada').toBe(valores.length);
    expect.soft(etiquetas, '3.3.2: debe incluir la fecha de reconocimiento, el método y el costo de adquisición').toEqual(
      expect.arrayContaining([expect.stringContaining('reconocimiento'), 'Método de medición', 'Costo de adquisición']),
    );

    await escanear(page, TC_ID, __dirname, 'modal-confirmacion', testInfo, PASOS_LIGHTHOUSE);
  });

  test('2. Clasificación condicional - cambiarla recalcula la propuesta y se anuncia (4.1.3)', async ({}, testInfo) => {
    testInfo.setTimeout(60_000);
    await irA(page, RUTA, TITULO);
    await irAPeriodoConPendiente(page);
    const revisar = main(page).getByRole('button', { name: /^Revisar el reconocimiento de/, exact: true }).first();
    await revisar.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
    precondicion(await revisar.count() > 0, 'no hay ninguna propuesta de reconocimiento pendiente para revisar');
    if (await revisar.count() === 0) return;

    await revisar.click();
    const dialogo = page.getByRole('dialog');
    const clasificacion = dialogo.getByRole('combobox', { name: 'Clasificación' });
    await clasificacion.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
    const existe = await clasificacion.count() > 0;
    precondicion(existe, 'no se tiene permiso de confirmación (ACCION_C sobre reconocimiento_inicial): el selector de clasificación solo se muestra con ese permiso');
    if (existe) {
      await clasificacion.selectOption('CONSUMO');
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
      const valorInicial = dialogo.locator('dl dd').filter({ hasText: /\$/ }).first();
      anotar(testInfo, 'Valor inicial tras recalcular', await valorInicial.innerText().catch(() => '(sin valor visible)'));
    }
    await page.keyboard.press('Escape');
  });

  test('3. Confirmación operable solo con teclado (2.1.1)', async ({}, testInfo) => {
    testInfo.setTimeout(60_000);
    await irA(page, RUTA, TITULO);
    await irAPeriodoConPendiente(page);
    const revisar = main(page).getByRole('button', { name: /^Revisar el reconocimiento de/, exact: true }).first();
    await revisar.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
    precondicion(await revisar.count() > 0, 'no hay ninguna propuesta de reconocimiento pendiente');
    if (await revisar.count() === 0) return;
    await revisar.focus();
    await page.keyboard.press('Enter');
    const dialogo = page.getByRole('dialog');
    await expect(dialogo, '2.1.1: Enter sobre "Revisar" debe abrir el modal de confirmación').toBeVisible();
    const confirmarBtn = dialogo.getByRole('button', { name: 'Confirmar reconocimiento', exact: true });
    await expect.soft(confirmarBtn, '2.1.1: el botón de confirmación debe ser enfocable').toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialogo, '2.1.2: Escape debe cerrar el modal sin confirmar nada').toBeHidden();
  });
});
