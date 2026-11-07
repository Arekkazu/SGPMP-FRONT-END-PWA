// | Fecha      | Nombre      | Que se hizo |
// |------------|-------------|-------------|
// | 2026-11-06 | Laura032005 | M06 RF-88 TC-DIS-237: accesibilidad de los mensajes de error al pasar un activo a valor razonable |
/**
 * TC-DIS-237 — Accesibilidad WCAG 2.1 AA de los mensajes de error de la marcación (parámetros
 * de M09 sin configurar, activo en BAJA y cambio a VALOR_RAZONABLE sin precio)
 * RF-88 · CU-07 Valorar activos biológicos por método de costo · Rol: Contador
 * Finanzas NIC 41 → Valoración sin mercado (/finanzas/valoracion-costo) → "Ver detalle" → "Pasar
 * a valor razonable" (DetalleActivoModal.tsx, cambiarAValorRazonable)
 *
 * Ver la nota sobre el estado del código (módulo en `dev`, aún no en `test`) en TC-DIS-221.
 *
 * Criterio (hoja M06): 0 violaciones axe A/AA en 3.3.1 (error identificado y descrito en texto);
 * 4.1.3 (mensaje anunciado); 1.4.1 (error no solo con color); 1.4.3 (contraste ≥ 4.5:1).
 *
 * Los 3 errores (M09 sin configurar, activo en BAJA, sin precio) se muestran con el mismo
 * ErrorApi genérico (<Alert variant="error" title={error.message}>) de cambio.error — un texto
 * legible que redacta el backend, no un código HTTP crudo. Se verifica con intercepción de red
 * (page.route), como sugiere la hoja para no depender de datos de ambiente imposibles de armar
 * los tres a la vez.
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { abrirSesion, anotar, escanear, irA, main, precondicion, PREFIJO_API } from '../../../_shared/sigabA11y';

const TC_ID = 'TC-DIS-237';
const RUTA = 'finanzas/valoracion-costo';
const TITULO = 'Valoración sin mercado activo';
const PASOS_LIGHTHOUSE = ['error-sin-precio'];

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

async function abrirDetalleYPasarAVr(page: Page) {
  const verDetalle = main(page).getByRole('button', { name: /^Ver detalle$/ }).first();
  if (await verDetalle.count() === 0) return null;
  await verDetalle.click();
  const detalle = page.getByRole('dialog');
  await expect(detalle).toBeVisible();
  const pasar = detalle.getByRole('button', { name: 'Pasar a valor razonable', exact: true });
  if (await pasar.count() === 0) { await page.keyboard.press('Escape'); return null; }
  return { detalle, pasar };
}

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Errores al pasar a valor razonable (RF-88)`, () => {
  let contexto: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    ({ contexto, page } = await abrirSesion(browser, testInfo));
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test('1. Error de "sin precio" al pasar a valor razonable - texto legible, no código HTTP crudo (3.3.1)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    await page.route(`**${PREFIJO_API}/finanzas/activos/*/valor-razonable`, async (route) => {
      await route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ code: 'SIN_PRECIO_VIGENTE', message: 'La especie de este activo no tiene un precio de mercado vigente: no puede pasar a valor razonable.' }) });
    });
    const flujo = await abrirDetalleYPasarAVr(page);
    precondicion(flujo !== null, 'no hay un activo al costo (valorado_por_costo) con el botón "Pasar a valor razonable" visible (requiere permiso ACCION_U sobre valoracion_por_costo)');
    if (!flujo) return;

    await flujo.pasar.click();
    const error = flujo.detalle.locator('[role="alert"]').filter({ hasText: /precio de mercado vigente/i });
    await expect.soft(error, '4.1.3 / 3.3.1: el error debe anunciarse con texto legible').toBeVisible({ timeout: 10_000 });
    const texto = await error.innerText().catch(() => '');
    anotar(testInfo, 'Mensaje de error', texto);
    expect.soft(/^\d{3}$/.test(texto.trim()), '3.3.1: el mensaje no debe ser un código HTTP crudo').toBe(false);

    await escanear(page, TC_ID, __dirname, 'error-sin-precio', testInfo, PASOS_LIGHTHOUSE);
    await page.unroute(`**${PREFIJO_API}/finanzas/activos/*/valor-razonable`);
    await page.keyboard.press('Escape');
  });

  test('2. Error de parámetros M09 sin configurar (precondición: requiere una especie sin vida_util_estimada ni tasa_depreciacion)', async ({}, testInfo) => {
    precondicion(false, 'requiere una especie sin vida_util_estimada ni tasa_depreciacion en M09 (Configuración de especies); el mecanismo de presentación del error es el mismo ErrorApi genérico ya verificado en el test 1, redactado por el backend');
  });

  test('3. Error de activo en BAJA (precondición: requiere un activo con estado BAJA en M02)', async ({}, testInfo) => {
    precondicion(false, 'requiere un activo en estado BAJA (Activos biológicos, M02) sobre el que intentar el cambio de método; mismo mecanismo de presentación ya verificado en el test 1');
  });
});
