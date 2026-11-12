// | Fecha      | Nombre      | Que se hizo |
// |------------|-------------|-------------|
// | 2026-11-06 | Laura032005 | M06 RF-88 TC-DIS-237: accesibilidad de los mensajes de error al pasar un activo a valor razonable |
// | 2026-11-07 | Laura032005 | M06 RF-88 TC-DIS-237: loguear como Contador (Administrador no tiene permiso valoracion_por_costo) |
// | 2026-11-12 | Laura032005 | M06 RF-88 TC-DIS-237: usar datos reales sembrados por el DBA (especie 595, activo 1862 QA-RF88-BAJA) en vez de precondicion(false) |
// | 2026-11-12 | Laura032005 | M06 RF-88 TC-DIS-237: corregir selector de "Ver detalle" — el aria-label real es "Ver el historial financiero de..." |
// | 2026-11-12 | Laura032005 | M06 RF-88 TC-DIS-237: faltaba esperar el botón "Pasar a valor razonable" dentro del diálogo (misma carrera que TC-DIS-238, se me había olvidado aquí) |
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
import {
  abrirSesion, anotar, credencialesPorRol, escanear, irA, main, precondicion, PREFIJO_API,
} from '../../../_shared/sigabA11y';

const TC_ID = 'TC-DIS-237';
const RUTA = 'finanzas/valoracion-costo';
const TITULO = 'Valoración sin mercado activo';
const PASOS_LIGHTHOUSE = ['error-sin-precio'];

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

async function abrirDetalleYPasarAVr(page: Page, buscar?: string) {
  if (buscar) {
    const campoBuscar = main(page).getByRole('searchbox');
    if (await campoBuscar.count() > 0) await campoBuscar.fill(buscar);
  }
  // Accesible name real: "Ver el historial financiero de {activo}" (valor.ver_detalle_aria),
  // no "Ver detalle" (que es solo el texto visible del botón).
  const verDetalle = main(page).getByRole('button', { name: /^Ver el historial financiero de/ }).first();
  // fill() no espera a que useListado (filtro síncrono en React) termine de re-renderizar: sin
  // este waitFor, el conteo se evalúa antes de que la fila filtrada aparezca (carrera, no dato).
  await verDetalle.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
  if (await verDetalle.count() === 0) return null;
  await verDetalle.click();
  const detalle = page.getByRole('dialog');
  await expect(detalle).toBeVisible();
  const pasar = detalle.getByRole('button', { name: 'Pasar a valor razonable', exact: true });
  // El diálogo abre antes de que termine de cargar el contenido del activo (misma carrera que
  // en TC-DIS-238): sin esta espera, el conteo se evalúa antes de que aparezca el botón.
  await pasar.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
  if (await pasar.count() === 0) { await page.keyboard.press('Escape'); return null; }
  return { detalle, pasar };
}

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Errores al pasar a valor razonable (RF-88)`, () => {
  let contexto: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    ({ contexto, page } = await abrirSesion(browser, testInfo, credencialesPorRol('CONTADOR')));
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test('1. Error de "sin precio" al pasar a valor razonable - texto legible, no código HTTP crudo (3.3.1)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    await page.route(`**${PREFIJO_API}/finanzas/activos/*/valor-razonable`, async (route) => {
      await route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ code: 'SIN_PRECIO_VIGENTE', message: 'La especie de este activo no tiene un precio de mercado vigente: no puede pasar a valor razonable.' }) });
    });
    // Sin buscar, ".first()" puede caer en una fila "estimada" (tiene_valor_estimado) en vez de
    // una "al costo" (valorado_por_costo): la vista mezcla ambos tipos. QA-RF88-AL-COSTO (1858)
    // es un activo al costo real, sembrado por el DBA.
    const flujo = await abrirDetalleYPasarAVr(page, 'QA-RF88-AL-COSTO');
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

  test('2. Error de parámetros sin configurar (especie sin vida_util_estimada/tasa_depreciacion, vía intercepción)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    await page.route(`**${PREFIJO_API}/finanzas/activos/*/valor-razonable`, async (route) => {
      await route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ code: 'PARAMETROS_CONTABLES_SIN_CONFIGURAR', message: 'La especie Caprino Sin Contable Qa Rf no tiene configurada la vida útil estimada ni la tasa de depreciación: pide a Configuración contable que la complete antes de continuar.' }) });
    });
    const flujo = await abrirDetalleYPasarAVr(page, 'QA-RF88-AL-COSTO');
    precondicion(flujo !== null, 'no hay un activo al costo con el botón "Pasar a valor razonable" visible');
    if (!flujo) return;

    await flujo.pasar.click();
    const error = flujo.detalle.locator('[role="alert"]').filter({ hasText: /vida útil|depreciaci[óo]n/i });
    await expect.soft(error, '4.1.3 / 3.3.1: el error de parámetros sin configurar debe anunciarse con texto legible').toBeVisible({ timeout: 10_000 });
    const texto = await error.innerText().catch(() => '');
    anotar(testInfo, 'Mensaje de error (parámetros sin configurar)', texto);
    expect.soft(/^\d{3}$/.test(texto.trim()), '3.3.1: el mensaje no debe ser un código HTTP crudo').toBe(false);
    await page.unroute(`**${PREFIJO_API}/finanzas/activos/*/valor-razonable`);
    await page.keyboard.press('Escape');
  });

  test('3. Error de activo en BAJA (vía intercepción)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    await page.route(`**${PREFIJO_API}/finanzas/activos/*/valor-razonable`, async (route) => {
      await route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ code: 'ACTIVO_EN_BAJA', message: 'Este activo está dado de baja: no puede cambiar su método de valoración.' }) });
    });
    const flujo = await abrirDetalleYPasarAVr(page, 'QA-RF88-AL-COSTO');
    precondicion(flujo !== null, 'no hay un activo al costo con el botón "Pasar a valor razonable" visible');
    if (!flujo) return;

    await flujo.pasar.click();
    const error = flujo.detalle.locator('[role="alert"]').filter({ hasText: /baja/i });
    await expect.soft(error, '4.1.3 / 3.3.1: el error de activo en BAJA debe anunciarse con texto legible').toBeVisible({ timeout: 10_000 });
    const texto = await error.innerText().catch(() => '');
    anotar(testInfo, 'Mensaje de error (activo en BAJA)', texto);
    expect.soft(/^\d{3}$/.test(texto.trim()), '3.3.1: el mensaje no debe ser un código HTTP crudo').toBe(false);
    await page.unroute(`**${PREFIJO_API}/finanzas/activos/*/valor-razonable`);
    await page.keyboard.press('Escape');
  });
});
