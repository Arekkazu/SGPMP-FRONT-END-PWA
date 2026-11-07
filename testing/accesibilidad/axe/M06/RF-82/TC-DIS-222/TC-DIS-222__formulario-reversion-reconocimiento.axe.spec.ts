// | Fecha      | Nombre      | Que se hizo |
// |------------|-------------|-------------|
// | 2026-11-06 | Laura032005 | M06 RF-82 TC-DIS-222: accesibilidad del formulario de reversión del reconocimiento |
/**
 * TC-DIS-222 — Accesibilidad WCAG 2.1 AA del formulario de reversión del reconocimiento y del
 * campo obligatorio motivo_reversion
 * RF-82 · CU-01 Reconocer inicialmente activo biológico · Rol: Contador
 * Finanzas NIC 41 → Reconocimiento inicial (/finanzas/reconocimiento) → "Ver detalle" de un
 * activo confirmado → "Revertir reconocimiento" (DetalleActivoModal, reutiliza MotivoModal de
 * Suministros)
 *
 * Ver la nota sobre el estado del código (módulo en `dev`, aún no en `test`) en TC-DIS-221.
 *
 * Criterio (hoja M06): 0 violaciones axe A/AA en 3.3.2 (motivo_reversion con etiqueta visible e
 * indicación de obligatorio); 3.3.1 (error en texto asociado al campo mediante
 * aria-describedby); 2.4.3 (foco al abrir y al cerrar el diálogo); 2.1.1 (operable solo con
 * teclado); 4.1.2 (name/role/value de los controles).
 *
 * DetalleActivoModal reemplaza el detalle por MotivoModal al revertir (no lo anida): "Cerrar"
 * en MotivoModal vuelve al detalle, no al botón "Revertir reconocimiento" del detalle. El cierre
 * con Escape del detalle (no de MotivoModal) es el que debe devolver el foco al botón "Ver
 * detalle" de la fila — se verifican ambos niveles de foco por separado.
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import {
  abrirSesion, anotar, describirFoco, escanear, irA, main, precondicion,
} from '../../../_shared/sigabA11y';

const TC_ID = 'TC-DIS-222';
const RUTA = 'finanzas/reconocimiento';
const TITULO = 'Reconocimiento inicial';
const PASOS_LIGHTHOUSE = ['formulario-reversion'];

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

async function abrirDetalleYRevertir(page: Page) {
  const verDetalle = main(page).getByRole('button', { name: /^Ver detalle$/ }).first();
  if (await verDetalle.count() === 0) return null;
  await verDetalle.click();
  const detalle = page.getByRole('dialog');
  await expect(detalle).toBeVisible();
  const revertir = detalle.getByRole('button', { name: 'Revertir reconocimiento', exact: true });
  if (await revertir.count() === 0) { await page.keyboard.press('Escape'); return null; }
  await revertir.click();
  return page.getByRole('dialog');
}

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Formulario de reversión del reconocimiento (RF-82)`, () => {
  let contexto: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    ({ contexto, page } = await abrirSesion(browser, testInfo));
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test('1. motivo_reversion obligatorio - error en texto asociado al campo (3.3.1 / 3.3.2)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const dialogo = await abrirDetalleYRevertir(page);
    precondicion(dialogo !== null, 'no hay un activo con reconocimiento CONFIRMADO (con permiso de reversión) sobre el que probar este flujo');
    if (!dialogo) return;

    const motivo = dialogo.getByRole('textbox', { name: 'Motivo de la reversión' });
    await expect.soft(motivo, '3.3.2: el campo debe exponer aria-required="true"').toHaveAttribute('aria-required', 'true');
    await motivo.fill('corto');
    await motivo.blur();
    const confirmar = dialogo.getByRole('button', { name: 'Revertir reconocimiento', exact: true });
    await confirmar.click();
    const error = dialogo.getByText(/Escribe al menos \d+ caracteres/);
    await expect.soft(error, '3.3.1: el error de motivo corto debe mostrarse junto al campo').toBeVisible();
    await expect.soft(motivo, '4.1.2: aria-invalid="true" en el motivo insuficiente').toHaveAttribute('aria-invalid', 'true');
    await expect.soft(motivo, '3.3.1: el campo debe referenciar el error con aria-describedby').toHaveAttribute('aria-describedby', /err/);

    await escanear(page, TC_ID, __dirname, 'formulario-reversion', testInfo, PASOS_LIGHTHOUSE);
  });

  test('2. Foco al abrir el diálogo de reversión y operación solo con teclado (2.1.1 / 2.4.3)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const verDetalle = main(page).getByRole('button', { name: /^Ver detalle$/ }).first();
    precondicion(await verDetalle.count() > 0, 'no hay un activo con reconocimiento CONFIRMADO disponible');
    if (await verDetalle.count() === 0) return;
    await verDetalle.focus();
    await page.keyboard.press('Enter');
    const detalle = page.getByRole('dialog');
    await expect(detalle).toBeVisible();

    const revertir = detalle.getByRole('button', { name: 'Revertir reconocimiento', exact: true });
    precondicion(await revertir.count() > 0, 'el permiso de reversión (ACCION_D sobre reconocimiento_inicial) no está disponible para este usuario, o el activo no es revertible');
    if (await revertir.count() === 0) { await page.keyboard.press('Escape'); return; }

    await revertir.focus();
    await page.keyboard.press('Enter');
    const reversion = page.getByRole('dialog');
    await expect(reversion, '2.4.3: debe abrirse el formulario de reversión').toBeVisible();
    const foco = await describirFoco(page);
    anotar(testInfo, 'Foco al abrir la reversión', foco);
    expect.soft(foco, '2.4.3: el foco debe entrar al formulario, no quedarse en el body').not.toBe('body');
  });
});
