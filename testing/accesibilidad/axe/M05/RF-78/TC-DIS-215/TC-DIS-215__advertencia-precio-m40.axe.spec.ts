// | Fecha      | Nombre      | Que se hizo |
// |------------|-------------|-------------|
// | 2026-11-06 | Laura032005 | M05 RF-78 TC-DIS-215: justificación de precio en costeo directo (siempre obligatoria, no condicional) |
// | 2026-11-11 | Laura032005 | M05 RF-78 TC-DIS-215: reejecución con datos reales del DBA; consultarPrimerActivo ya no toma el primero del combobox a ciegas (a veces caía en un activo sin ciclo), ahora apunta a BOV-114-TIL (1627); timeout ampliado a 120s — el "bloqueo" que parecía un 404 real era esta pantalla tardando más de 60s en cargar el acumulado + 80 registros en paralelo, no un problema de backend |
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
  // BOV-114-TIL (id 1627): ciclo "Levante y ceba" real, fase Ceba activa desde el 1/10 (dato del DBA).
  await combo.fill('1627');
  await combo.blur();
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
    testInfo.setTimeout(120_000);
    await irA(page, RUTA, TITULO);
    await consultarPrimerActivo(page);
    const btn = main(page).getByRole('button', { name: 'Registrar costo directo', exact: true });
    // El botón solo se renderiza cuando el acumulado termina de cargar (puedeRegistrar && a):
    // se espera a que aparezca en vez de asumir "sin ciclo" por una comprobación prematura.
    await btn.waitFor({ state: 'visible', timeout: 90_000 }).catch(() => {});
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
    testInfo.setTimeout(120_000);
    await irA(page, RUTA, TITULO);
    await consultarPrimerActivo(page);
    const btn = main(page).getByRole('button', { name: 'Registrar costo directo', exact: true });
    await btn.waitFor({ state: 'visible', timeout: 90_000 }).catch(() => {});
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

  test('3. E2 - desviación: justificacion_precio es obligatoria siempre, no se puede omitir para provocar el 422 real', async ({}, testInfo) => {
    // RF-78 Flujo alterno E2: el 422 solo ocurre si el usuario NO provee justificacion_precio
    // cuando el precio de M40 no está disponible o tiene antigüedad > 30 días. Pero
    // SuministroDirectoFormModal exige justificacion_precio siempre (min 20 caracteres, sin
    // condicionarla al estado del precio) — la misma Causa 3 ya documentada en el test 1. La UI
    // nunca permite enviar el formulario sin justificación, así que el servidor nunca llega a
    // rechazar por este motivo: no es un dato que falte, es que el camino para llegar ahí está
    // bloqueado por el propio formulario.
    anotar(testInfo, 'E2 (SuministroDirectoFormModal)', 'justificacion_precio es un campo requerido por el propio formulario (react-hook-form, validate: minimo(20)) para cualquier envío: no existe una ruta de usuario real que lo deje vacío para reproducir el 422 de "sin justificación".');
  });
});
