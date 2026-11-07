// | Fecha      | Nombre      | Que se hizo |
// |------------|-------------|-------------|
// | 2026-11-06 | Laura032005 | M06 RF-86 TC-DIS-235: accesibilidad de los 4 tipos de variación y del mensaje de rechazo |
/**
 * TC-DIS-235 — Accesibilidad WCAG 2.1 AA de los cuatro tipos de variación (ganancia y pérdida
 * por transformación biológica y por precio de mercado) y del mensaje de rechazo del registro
 * RF-86 · CU-05 Registrar variación de valor razonable en resultados (generador único de líneas
 * de asiento NIC 41) · Rol: Contador
 * Finanzas NIC 41 → Variaciones de valor (/finanzas/variaciones), VariacionesView.tsx
 *
 * Ver la nota sobre el estado del código (módulo en `dev`, aún no en `test`) en TC-DIS-221.
 *
 * Criterio (hoja M06): 0 violaciones axe A/AA en 1.4.1 (tipo de variación con etiqueta textual);
 * 1.4.3 (contraste ≥ 4.5:1); 3.3.1 (mensaje de rechazo con el campo identificado); 4.1.3
 * (rechazo anunciado).
 *
 * Las variaciones se generan solas al procesar eventos (no hay un formulario de "registrar
 * variación" con evento_origen_id como campo editable): el rechazo que puede provocarse es el
 * de "Calcular medición ahora" (procesarEventos) si falla, mostrado con el ErrorApi genérico
 * compartido por todas las vistas del módulo. Se verifica ese mecanismo real.
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import {
  abrirSesion, anotar, desviacion, escanear, irA, main, precondicion, PREFIJO_API,
} from '../../../_shared/sigabA11y';

const TC_ID = 'TC-DIS-235';
const RUTA = 'finanzas/variaciones';
const TITULO = 'Variaciones de valor razonable';
const PASOS_LIGHTHOUSE = ['cuatro-tipos', 'rechazo-procesar'];

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Tipos de variación y rechazo (RF-86)`, () => {
  let contexto: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    ({ contexto, page } = await abrirSesion(browser, testInfo));
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test('1. Los 4 tipos de variación con Badge de texto, no solo color (1.4.1 / 1.4.3)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const tipos = ['Ganancia por crecimiento biológico', 'Pérdida por deterioro biológico', 'Ganancia por alza de precios', 'Pérdida por baja de precios'];
    const presentes: string[] = [];
    for (const tipo of tipos) {
      if (await main(page).getByText(tipo, { exact: true }).count() > 0) presentes.push(tipo);
    }
    anotar(testInfo, 'Tipos de variación presentes en el período', presentes.join(', ') || 'ninguno');
    precondicion(presentes.length === 4, `faltan tipos de variación en el período para cubrir los 4: presentes ${presentes.length}/4`);
    expect.soft(presentes.length, '1.4.1: cada tipo presente debe leerse como texto en el Badge').toBeGreaterThan(0);
    await escanear(page, TC_ID, __dirname, 'cuatro-tipos', testInfo, PASOS_LIGHTHOUSE);
  });

  test('2. Rechazo al procesar eventos - mensaje de error anunciado (3.3.1 / 4.1.3, vía intercepción)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    await page.route(`**${PREFIJO_API}/finanzas/eventos/procesar*`, async (route) => {
      await route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ code: 'EVENTO_SIN_ACTIVO', message: 'El evento productivo no tiene un activo biológico asociado.' }) });
    });
    const procesar = main(page).getByRole('button', { name: /calcular medici[óo]n ahora|procesar eventos pendientes/i });
    precondicion(await procesar.count() > 0, 'esta vista no tiene la acción de procesar eventos visible (sin permiso ACCION_E), o está en otra vista del módulo');
    if (await procesar.count() === 0) return;
    await procesar.click();
    const error = main(page).locator('[role="alert"]').filter({ hasText: /activo biológico asociado/i });
    await expect.soft(error, '4.1.3 / 3.3.1: el rechazo debe anunciarse con el campo/motivo identificado').toBeVisible({ timeout: 10_000 });
    anotar(testInfo, 'Mensaje de rechazo', await error.innerText().catch(() => '(no capturado)'));
    await escanear(page, TC_ID, __dirname, 'rechazo-procesar', testInfo, PASOS_LIGHTHOUSE);
    await page.unroute(`**${PREFIJO_API}/finanzas/eventos/procesar*`);
  });

  test('3. Desviación - no hay formulario de registro manual de variación con evento_origen_id', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const formulario = main(page).getByRole('button', { name: /registrar variaci[óo]n/i });
    anotar(testInfo, 'Botón de registro manual de variación', String(await formulario.count()));
    desviacion(await formulario.count() > 0, 'VariacionesView es de solo lectura: las variaciones se generan automáticamente al procesar eventos, sin un formulario manual que referencie evento_origen_id');
  });
});
