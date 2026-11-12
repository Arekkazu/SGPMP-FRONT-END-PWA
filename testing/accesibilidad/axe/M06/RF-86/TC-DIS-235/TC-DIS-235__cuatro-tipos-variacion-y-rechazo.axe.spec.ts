// | Fecha      | Nombre      | Que se hizo |
// |------------|-------------|-------------|
// | 2026-11-06 | Laura032005 | M06 RF-86 TC-DIS-235: accesibilidad de los 4 tipos de variación y del mensaje de rechazo |
// | 2026-11-12 | Laura032005 | M06 RF-86 TC-DIS-235: seleccionar período 363, con los 4 tipos de variación reales sembrados por el DBA |
// | 2026-11-12 | Laura032005 | M06 RF-86 TC-DIS-235: el período 363 pertenece a otro Titular ("Agropecuaria Medicion QA") — usar irAPeriodo |
// | 2026-11-12 | Laura032005 | M06 RF-86 TC-DIS-235: buscar QA-RF83-MEDIDO (evita paginación) y usar cuenta Contador (Admin no tiene ACCION_E sobre valoracion_activos) |
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
  abrirSesion, anotar, credencialesPorRol, desviacion, escanear, irA, irAPeriodo, main, precondicion, PREFIJO_API,
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
    // RF-86: Rol Contador. Admin no tiene ACCION_E sobre valoracion_activos — "Procesar eventos
    // pendientes" no aparece con esa cuenta.
    ({ contexto, page } = await abrirSesion(browser, testInfo, credencialesPorRol('CONTADOR')));
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test('1. Los 4 tipos de variación con Badge de texto, no solo color (1.4.1 / 1.4.3)', async ({}, testInfo) => {
    testInfo.setTimeout(60_000);
    await irA(page, RUTA, TITULO);
    // Período 363, Titular "Agropecuaria Medicion QA", activo 1859 (QA-RF83-MEDIDO): los 4
    // tipos sembrados por el DBA (406-410; 407/408 duplicados por un bug de backend ya
    // reportado, no afecta esta prueba).
    await irAPeriodo(page, '363', 'Agropecuaria Medicion QA');
    // Acotado a QA-RF83-MEDIDO (1859): el período completo puede tener muchas más variaciones
    // de otros activos y la paginación del Listado dejaría algún tipo fuera de la página actual.
    const campoBuscar = main(page).getByRole('searchbox');
    if (await campoBuscar.count() > 0) {
      await campoBuscar.fill('QA-RF83-MEDIDO');
      await page.waitForTimeout(500);
    }
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
    testInfo.setTimeout(60_000);
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
    testInfo.setTimeout(60_000);
    await irA(page, RUTA, TITULO);
    const formulario = main(page).getByRole('button', { name: /registrar variaci[óo]n/i });
    anotar(testInfo, 'Botón de registro manual de variación', String(await formulario.count()));
    desviacion(await formulario.count() > 0, 'VariacionesView es de solo lectura: las variaciones se generan automáticamente al procesar eventos, sin un formulario manual que referencie evento_origen_id');
  });
});
