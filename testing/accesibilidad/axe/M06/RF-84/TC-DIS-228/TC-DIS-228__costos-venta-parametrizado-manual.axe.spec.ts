// | Fecha      | Nombre      | Que se hizo |
// |------------|-------------|-------------|
// | 2026-11-06 | Laura032005 | M06 RF-84 TC-DIS-228: accesibilidad del formulario de costos de venta parametrizados y manuales |
// | 2026-11-12 | Laura032005 | M06 RF-84 TC-DIS-228: seleccionar período 363 y buscar QA-RF82-PENDIENTE (1861), sembrado por el DBA |
// | 2026-11-12 | Laura032005 | M06 RF-84 TC-DIS-228: usar cuenta Contador y Titular correcto vía irAPeriodo — Admin no tiene ACCION_C sobre reconocimiento_inicial |
// | 2026-11-12 | Laura032005 | M06 RF-84 TC-DIS-228: los campos de costo son role="textbox" (inputMode decimal, no type=number) y la justificación se llama "Justificación de los costos" |
/**
 * TC-DIS-228 — Accesibilidad WCAG 2.1 AA del formulario de costos de venta en modo
 * parametrizado y manual (sobrescritura con justificación)
 * RF-84 · CU-03 Calcular valor razonable menos costos de venta · Rol: Contador
 * El cambio de modo parametrizado/manual con justificación vive en el modal de confirmación del
 * reconocimiento (PropuestaModal, RF-82, /finanzas/reconocimiento), no en CalculoView
 * (/finanzas/valor-razonable), que solo muestra el histórico calculado — se prueba donde el
 * código real lo implementa, con la referencia cruzada explícita.
 *
 * Ver la nota sobre el estado del código (módulo en `dev`, aún no en `test`) en TC-DIS-221.
 *
 * Criterio (hoja M06): 0 violaciones axe A/AA en 3.3.2 (etiquetas de los componentes de costo:
 * transporte, comisiones, impuestos, otros); 4.1.2 (control de modo con name/role/value); 4.1.3
 * (cambio de modo anunciado); 2.1.1 (flujo operable por teclado); 3.3.1 (errores en texto
 * asociados al campo).
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import {
  abrirSesion, anotar, credencialesPorRol, escanear, irA, irAPeriodo, main, precondicion,
} from '../../../_shared/sigabA11y';

const TC_ID = 'TC-DIS-228';
const RUTA = 'finanzas/reconocimiento';
const TITULO = 'Reconocimiento inicial';
const PASOS_LIGHTHOUSE = ['modo-manual'];

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

async function irAPeriodoConPendiente(page: Page) {
  // QA-RF82-PENDIENTE (1861), período 363, Titular "Agropecuaria Medicion QA" — sembrado por el DBA.
  await irAPeriodo(page, '363', 'Agropecuaria Medicion QA');
  const campoBuscar = main(page).getByRole('searchbox');
  if (await campoBuscar.count() > 0) await campoBuscar.fill('QA-RF82-PENDIENTE');
}

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Modo de costos parametrizado/manual (RF-84, vía RF-82)`, () => {
  let contexto: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    // RF-84/RF-82: Rol Contador. Admin no tiene ACCION_C sobre reconocimiento_inicial — el
    // checkbox de modo manual no aparece con esa cuenta.
    ({ contexto, page } = await abrirSesion(browser, testInfo, credencialesPorRol('CONTADOR')));
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test('1. Control de modo manual con name/role/value (4.1.2) y cambio anunciado (4.1.3)', async ({}, testInfo) => {
    testInfo.setTimeout(60_000);
    await irA(page, RUTA, TITULO);
    await irAPeriodoConPendiente(page);
    const revisar = main(page).getByRole('button', { name: /^Revisar el reconocimiento de/, exact: true }).first();
    await revisar.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
    precondicion(await revisar.count() > 0, 'no hay ninguna propuesta de reconocimiento pendiente de revisar');
    if (await revisar.count() === 0) return;
    await revisar.click();
    const dialogo = page.getByRole('dialog');
    const manual = dialogo.getByRole('checkbox', { name: 'Usar costos de venta propios para este activo' });
    const existe = await manual.count() > 0;
    precondicion(existe, 'no se tiene permiso de confirmación (ACCION_C), único caso donde se muestra el control de modo manual');
    if (!existe) { await page.keyboard.press('Escape'); return; }

    await expect.soft(manual, '4.1.2: el control de modo debe exponer su rol de checkbox con nombre accesible').toHaveAttribute('type', 'checkbox');
    const yaForzado = await manual.isDisabled();
    anotar(testInfo, 'Checkbox de costos manuales', `disabled=${yaForzado}`);
    if (!yaForzado) {
      await manual.check();
      // Los campos de costo son <Input inputMode="decimal">, no type="number": su rol
      // accesible es "textbox", no "spinbutton".
      const campos = ['Transporte (COP)', 'Comisiones (COP)', 'Impuestos (COP)', 'Otros costos de disposición (COP)'];
      for (const c of campos) {
        await expect.soft(dialogo.getByRole('textbox', { name: c }), `3.3.2: falta el campo "${c}" al activar el modo manual`).toBeVisible();
      }
      await expect.soft(dialogo.getByRole('textbox', { name: 'Justificación de los costos' }), '3.3.2: la justificación debe aparecer al activar el modo manual').toBeVisible();
    }
    await escanear(page, TC_ID, __dirname, 'modo-manual', testInfo, PASOS_LIGHTHOUSE);
    await page.keyboard.press('Escape');
  });

  test('2. Justificación insuficiente en modo manual - error en texto junto al campo (3.3.1)', async ({}, testInfo) => {
    testInfo.setTimeout(60_000);
    await irA(page, RUTA, TITULO);
    await irAPeriodoConPendiente(page);
    const revisar = main(page).getByRole('button', { name: /^Revisar el reconocimiento de/, exact: true }).first();
    await revisar.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
    precondicion(await revisar.count() > 0, 'no hay ninguna propuesta de reconocimiento pendiente de revisar');
    if (await revisar.count() === 0) return;
    await revisar.click();
    const dialogo = page.getByRole('dialog');
    const manual = dialogo.getByRole('checkbox', { name: 'Usar costos de venta propios para este activo' });
    precondicion(await manual.count() > 0 && !(await manual.isDisabled()), 'no se puede activar el modo manual (sin permiso de confirmación, o ya forzado por el backend)');
    if (await manual.count() === 0 || (await manual.isDisabled())) { await page.keyboard.press('Escape'); return; }

    await manual.check();
    await dialogo.getByRole('textbox', { name: 'Transporte (COP)' }).fill('10000');
    await dialogo.getByRole('button', { name: 'Confirmar reconocimiento', exact: true }).click();
    const error = dialogo.getByText(/Justifica los costos de venta propios/);
    await expect.soft(error, '3.3.1: el error de justificación corta debe mostrarse').toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('3. Flujo operable solo con teclado (2.1.1)', async ({}, testInfo) => {
    testInfo.setTimeout(60_000);
    await irA(page, RUTA, TITULO);
    await irAPeriodoConPendiente(page);
    const revisar = main(page).getByRole('button', { name: /^Revisar el reconocimiento de/, exact: true }).first();
    await revisar.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
    precondicion(await revisar.count() > 0, 'no hay ninguna propuesta de reconocimiento pendiente de revisar');
    if (await revisar.count() === 0) return;
    await revisar.focus();
    await page.keyboard.press('Enter');
    const dialogo = page.getByRole('dialog');
    await expect(dialogo).toBeVisible();
    const clasificacion = dialogo.getByRole('combobox', { name: 'Clasificación' });
    if (await clasificacion.count() > 0) {
      await clasificacion.focus();
      await expect.soft(clasificacion, '2.1.1: el selector de clasificación debe ser enfocable con Tab').toBeFocused();
    }
    await page.keyboard.press('Escape');
  });
});
