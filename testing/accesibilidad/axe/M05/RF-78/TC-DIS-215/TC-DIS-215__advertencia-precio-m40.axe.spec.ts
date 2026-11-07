// | Fecha      | Nombre      | Que se hizo |
// |------------|-------------|-------------|
// | 2026-11-06 | Laura032005 | M05 RF-78 TC-DIS-215: justificación de precio en costeo directo (siempre obligatoria, no condicional) |
/**
 * TC-DIS-215 — Accesibilidad WCAG 2.1 AA de la advertencia de precio M40 no disponible o
 * desactualizado y del ingreso de precio manual con justificación
 * RF-78 · CU-04 Acumular Inversión y Proveer Costos a M06 · Rol: Gestor de Granja
 * (en este frontend, el recurso RECURSO_COSTEO/ACCION_C se evalúa por permiso, no por un rol
 * fijo "Gestor de Granja")
 * Suministros → Costos del ciclo (/suministros/costos), modal "Registrar costo directo"
 * (SuministroDirectoFormModal)
 *
 * Criterio (hoja M05): verificación manual de 4.1.3 (la advertencia de precio y el rechazo E2 —
 * HTTP 422— se anuncian mediante aria-live); 0 violaciones axe A/AA en 3.3.2 (el cambio de
 * justificacion_precio a obligatorio se comunica en texto y con aria-required); 3.3.1 (error
 * identificado junto al campo); 1.4.1 (la advertencia no depende únicamente del color).
 *
 * SuministroDirectoFormModal.tsx no condiciona justificacion_precio a la antigüedad o
 * disponibilidad del precio en M40: el campo es obligatorio siempre (validate: longitud ≥ 20),
 * para cualquier SERVICIO_VETERINARIO o INSEMINACION. No hay una advertencia visual específica
 * de "precio M40 no disponible/desactualizado" en el código revisado — se reporta como
 * desviación en vez de simular esa advertencia con datos inventados.
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { abrirSesion, anotar, desviacion, escanear, irA, main, precondicion } from '../../../_shared/sigabA11y';

const TC_ID = 'TC-DIS-215';
const RUTA = 'suministros/costos';
const TITULO = 'Costos del ciclo productivo';
const PASOS_LIGHTHOUSE = ['formulario-costo-directo'];

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

async function consultarPrimerActivo(page: Page) {
  const combo = main(page).getByRole('combobox', { name: 'Activo biológico' });
  await combo.focus();
  await combo.press('ArrowDown');
  await combo.press('Enter');
  await main(page).getByRole('button', { name: 'Consultar', exact: true }).click();
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
}

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Justificación de precio en costeo directo (RF-78)`, () => {
  let contexto: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    ({ contexto, page } = await abrirSesion(browser, testInfo));
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test('1. Desviación - no hay advertencia condicional de precio M40 no disponible o desactualizado', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    await consultarPrimerActivo(page);
    const btn = main(page).getByRole('button', { name: 'Registrar costo directo', exact: true });
    precondicion(await btn.count() > 0 && await btn.isEnabled(), 'el activo consultado no tiene un ciclo productivo activo, o el botón está deshabilitado (sin permiso de creación)');
    if (await btn.count() === 0 || !(await btn.isEnabled())) return;
    await btn.click();

    const dialogo = page.getByRole('dialog');
    await expect(dialogo).toBeVisible();
    const avisoM40 = dialogo.getByText(/precio.*(no disponible|desactualizad|antig[üu]edad)/i);
    anotar(testInfo, 'Aviso de precio M40', await avisoM40.count() > 0 ? await avisoM40.first().innerText() : 'no existe: el aviso visible es genérico ("Alimento y medicamentos entran solos")');
    desviacion(await avisoM40.count() > 0, 'el formulario no muestra una advertencia específica de precio M40 no disponible o desactualizado; la justificación del precio es obligatoria siempre, independientemente del estado del precio en M40');

    await escanear(page, TC_ID, __dirname, 'formulario-costo-directo', testInfo, PASOS_LIGHTHOUSE);
  });

  test('2. Justificación del precio - obligatoria con aria-required y error asociado al campo (3.3.1 / 3.3.2)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    await consultarPrimerActivo(page);
    const btn = main(page).getByRole('button', { name: 'Registrar costo directo', exact: true });
    precondicion(await btn.count() > 0 && await btn.isEnabled(), 'no hay un ciclo activo sobre el que registrar un costo directo');
    if (await btn.count() === 0 || !(await btn.isEnabled())) return;
    await btn.click();

    const dialogo = page.getByRole('dialog');
    const justificacion = dialogo.getByRole('textbox', { name: 'Justificación del precio' });
    await expect.soft(justificacion, '3.3.2: la justificación debe exponer aria-required="true"').toHaveAttribute('aria-required', 'true');
    await justificacion.fill('precio de catálogo');
    await justificacion.blur();
    const error = dialogo.getByText(/Escribe al menos \d+ caracteres/);
    await expect.soft(error, '3.3.1: el error de justificación corta debe mostrarse junto al campo').toBeVisible();
    await expect.soft(justificacion, '4.1.2: aria-invalid="true" en justificación insuficiente').toHaveAttribute('aria-invalid', 'true');
  });

  test('3. E2 - rechazo del servidor (precondición de datos; sin simular una respuesta 422 inventada)', async ({}, testInfo) => {
    precondicion(false, 'forzar el HTTP 422 real (E2) requiere un escenario de datos específico en el backend; el formulario solo expone el Alert genérico (error.status === 409 ? "error" : "warning") para cualquier rechazo del servidor, sin distinguir E2 visualmente');
  });
});
