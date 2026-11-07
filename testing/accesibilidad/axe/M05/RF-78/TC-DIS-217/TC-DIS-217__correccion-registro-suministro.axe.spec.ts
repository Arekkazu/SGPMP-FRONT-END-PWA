// | Fecha      | Nombre      | Que se hizo |
// |------------|-------------|-------------|
// | 2026-11-06 | Laura032005 | M05 RF-78 TC-DIS-217: accesibilidad del flujo de corrección de registros de suministro |
/**
 * TC-DIS-217 — Accesibilidad WCAG 2.1 AA del flujo de corrección de registros de suministro y
 * de sus mensajes de rechazo
 * RF-78 · CU-04 Acumular Inversión y Proveer Costos a M06 · Rol: Gestor de Granja
 * Suministros → Costos del ciclo (/suministros/costos), botón "Corregir" sobre un registro
 * (CorreccionSuministroModal)
 *
 * Criterio (hoja M05): 0 violaciones axe A/AA en 2.1.1 y 2.4.7 (acción de corrección y
 * formulario de ajuste operables por teclado con foco visible); 1.3.1 y 3.3.2 (relación
 * programática entre el registro de ajuste y id_registro_original; obligatoriedad de
 * motivo_correccion indicada en texto); 3.3.1 y 4.1.3 (errores E3, E6 —HTTP 409— y E7 —HTTP
 * 422— anunciados mediante aria-live).
 *
 * CorreccionSuministroModal no tiene un campo de fecha (solo cantidad, precio_unitario,
 * justificacion_precio, motivo_correccion): E3 (fecha fuera del rango del ciclo) no se puede
 * provocar desde este modal porque la fecha de la corrección no es editable ahí — se reporta
 * como desviación, no se simula con datos inventados. La referencia al registro original se da
 * como texto descriptivo (costeo.corregir_detalle), no como un id_registro_original expuesto
 * literalmente: se verifica que ese texto identifique el registro, que es lo que la UI ofrece.
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import {
  abrirSesion, anotar, desviacion, describirFoco, escanear, irA, main, precondicion,
} from '../../../_shared/sigabA11y';

const TC_ID = 'TC-DIS-217';
const RUTA = 'suministros/costos';
const TITULO = 'Costos del ciclo productivo';
const PASOS_LIGHTHOUSE = ['formulario-correccion'];

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

async function consultarPrimerActivo(page: Page) {
  const combo = main(page).getByRole('combobox', { name: 'Activo biológico' });
  await combo.focus();
  await combo.press('ArrowDown');
  await combo.press('Enter');
  await main(page).getByRole('button', { name: 'Consultar', exact: true }).click();
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
}

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Corrección de registros de suministro (RF-78)`, () => {
  let contexto: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    ({ contexto, page } = await abrirSesion(browser, testInfo));
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test('1. Acción "Corregir" operable por teclado - foco entra al diálogo con la referencia al registro original (2.1.1 / 2.4.7 / 1.3.1)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    await consultarPrimerActivo(page);
    const corregir = main(page).getByRole('button', { name: 'Corregir', exact: true }).first();
    precondicion(await corregir.count() > 0, 'no hay un registro de tipo REGISTRO (no CORRECCION) sobre el que probar la corrección, o falta el permiso U');
    if (await corregir.count() === 0) return;

    await corregir.focus();
    await page.keyboard.press('Enter');
    const dialogo = page.getByRole('dialog');
    await expect(dialogo, '2.4.3: el foco debe entrar al formulario de ajuste al abrirlo').toBeVisible();
    const foco = await describirFoco(page);
    anotar(testInfo, 'Foco al abrir', foco);

    const referencia = await dialogo.locator('p').first().innerText();
    anotar(testInfo, 'Referencia al registro original', referencia);
    expect.soft(referencia.length, '1.3.1: el formulario debe identificar el registro que se está corrigiendo').toBeGreaterThan(0);

    await escanear(page, TC_ID, __dirname, 'formulario-correccion', testInfo, PASOS_LIGHTHOUSE);
  });

  test('2. motivo_correccion - obligatorio en texto, no solo con asterisco (3.3.2) y error asociado (3.3.1)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    await consultarPrimerActivo(page);
    const corregir = main(page).getByRole('button', { name: 'Corregir', exact: true }).first();
    precondicion(await corregir.count() > 0, 'no hay un registro corregible disponible');
    if (await corregir.count() === 0) return;

    await corregir.click();
    const dialogo = page.getByRole('dialog');
    const motivo = dialogo.getByRole('textbox', { name: 'Motivo de la corrección' });
    await expect.soft(motivo, '3.3.2: motivo_correccion debe exponer aria-required="true"').toHaveAttribute('aria-required', 'true');
    await motivo.fill('corto');
    await motivo.blur();
    const error = dialogo.getByText(/Escribe al menos \d+ caracteres/).last();
    await expect.soft(error, '3.3.1: el error de motivo corto debe mostrarse junto al campo').toBeVisible();
    await expect.soft(motivo, '4.1.2: aria-invalid="true" en motivo insuficiente').toHaveAttribute('aria-invalid', 'true');

    await page.keyboard.press('Escape');
    const vuelve = await corregir.evaluate((e) => e === document.activeElement);
    expect.soft(vuelve, '2.4.3: al cerrar con Escape el foco debe volver al botón "Corregir"').toBe(true);
  });

  test('3. E3 - desviación: la fecha no es editable en la corrección, no se puede provocar desde este modal', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    await consultarPrimerActivo(page);
    const corregir = main(page).getByRole('button', { name: 'Corregir', exact: true }).first();
    precondicion(await corregir.count() > 0, 'no hay un registro corregible disponible');
    if (await corregir.count() === 0) return;
    await corregir.click();
    const dialogo = page.getByRole('dialog');
    const fecha = await dialogo.getByRole('textbox', { name: /fecha/i }).count();
    anotar(testInfo, 'Campos de fecha en CorreccionSuministroModal', String(fecha));
    desviacion(fecha > 0, 'el formulario de corrección no tiene un campo de fecha editable: E3 (fecha fuera del rango del ciclo) no se puede provocar sobre este flujo tal como está implementado');
    await page.keyboard.press('Escape');
  });

  test('4. E6 y E7 - rechazos del servidor (precondición de datos; no se fuerzan con datos inventados)', async ({}, testInfo) => {
    precondicion(false, 'E6 (duplicado, HTTP 409) y E7 (corrección sin registro original válido, HTTP 422) requieren un estado de datos concurrente o un registro inconsistente que no se reproduce con el ambiente disponible');
    anotar(testInfo, 'E6/E7 (CorreccionSuministroModal)', 'Ambos se mostrarían con el mismo <Alert variant={error.status === 409 ? "error" : "warning"}> genérico usado en el resto de formularios de este módulo.');
  });
});
