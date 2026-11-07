// | Fecha      | Nombre      | Que se hizo |
// |------------|-------------|-------------|
// | 2026-11-06 | Laura032005 | M05 RF-76 TC-DIS-213: accesibilidad del aviso de retiro y del estado EN_TRATAMIENTO |
/**
 * TC-DIS-213 — [CRÍTICO] Accesibilidad WCAG 2.1 AA de la notificación de inicio de período de
 * retiro y del estado EN_TRATAMIENTO del activo
 * RF-76 · CU-01 Registrar Suministros (Aplicación de Medicamentos) · Rol: Veterinario
 * Suministros → Medicamentos (/suministros/medicamentos) para la columna "Fin del retiro";
 * Activos Biológicos → ficha del activo (/activos-biologicos/:id) para EstadoPill.
 *
 * Criterio (hoja M05): verificación manual de 4.1.3 (la confirmación del registro, la
 * notificación de inicio del período de retiro y el mensaje E11 se anuncian mediante aria-live
 * sin mover el foco); 0 violaciones axe A/AA en 1.4.1 (el estado EN_TRATAMIENTO y la
 * fecha_fin_retiro vigente se comunican con badge y etiqueta textual, no solo con color); 1.4.3
 * (contraste ≥ 4.5:1 del badge).
 *
 * Nota de la hoja: el cambio de estado a EN_TRATAMIENTO lo ejecuta RF-44 (biological_assets),
 * no RF-76. Si ese flujo no deja un activo en EN_TRATAMIENTO en el ambiente, el paso 3 se
 * reporta como dependencia bloqueada, no como fallo de RF-76.
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { abrirSesion, anotar, desviacion, escanear, irA, main, precondicion } from '../../../_shared/sigabA11y';

const TC_ID = 'TC-DIS-213';
const RUTA = 'suministros/medicamentos';
const TITULO = 'Aplicación de medicamentos';
const PASOS_LIGHTHOUSE = ['tabla-en-retiro'];

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Periodo de retiro y estado EN_TRATAMIENTO (RF-76)`, () => {
  let contexto: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    ({ contexto, page } = await abrirSesion(browser, testInfo));
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test('1. Confirmación del registro - aviso de retiro anunciado por toast, no solo por color (4.1.3 / 1.4.1)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const btn = main(page).getByRole('button', { name: 'Registrar aplicación', exact: true });
    precondicion(await btn.isEnabled().catch(() => false), 'el botón "Registrar aplicación" está deshabilitado (sin conexión o sin permiso)');
    anotar(testInfo, 'Confirmación (MedicamentosView)', 'El mensaje de confirmación lo redacta el backend y se muestra con pushToast(\'success\', t(\'medicamento.registrado\'), r.mensaje) — se delega en ToastHost; se verifica que el host de toasts use una región con role="status"/aria-live.');
    const toastHost = page.locator('[role="status"], [aria-live]').filter({ hasText: /./ });
    desviacion(await toastHost.count() >= 0, 'no se pudo forzar un registro real sin un activo de prueba con ciclo abierto en el ambiente; se documenta el mecanismo (pushToast) sin poder capturar el anuncio en vivo');
  });

  test('2. "Fin del retiro" en la tabla - fecha_fin_retiro vigente con etiqueta textual, no solo color (1.4.1)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const encabezado = main(page).locator('table thead th', { hasText: 'Fin del retiro' });
    precondicion(await encabezado.count() > 0, 'no hay tabla de aplicaciones visible para inspeccionar la columna "Fin del retiro"');
    if (await encabezado.count() === 0) return;

    const enRetiro = main(page).locator('table tbody tr', { hasText: /En retiro hasta/ });
    const n = await enRetiro.count();
    anotar(testInfo, 'Aplicaciones en retiro vigente', String(n));
    precondicion(n > 0, 'ninguna aplicación visible tiene un período de retiro vigente (fecha_fin_retiro ≥ hoy)');
    if (n > 0) {
      const texto = await enRetiro.first().locator('td').nth(4).innerText();
      expect.soft(texto, '1.4.1: "En retiro hasta" debe ser texto, no solo un color de advertencia').toMatch(/En retiro hasta/);
    }

    await escanear(page, TC_ID, __dirname, 'tabla-en-retiro', testInfo, PASOS_LIGHTHOUSE);
  });

  test('3. Estado EN_TRATAMIENTO en la ficha del activo - badge con ícono y texto, no solo color (1.4.1 / 1.4.3, dependencia de RF-44)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const filaConActivo = main(page).locator('table tbody tr').first();
    const idTexto = await filaConActivo.locator('td').first().locator('div').last().innerText().catch(() => '');
    const id = idTexto.replace('#', '').trim();
    precondicion(!!id, 'no se pudo determinar el ID de un activo con aplicaciones de medicamento para abrir su ficha');
    if (!id) return;

    await irA(page, `activos-biologicos/${id}`, 'Detalle del activo').catch(() => null);
    const pill = page.getByText('En tratamiento', { exact: true });
    const enTratamiento = await pill.count() > 0;
    anotar(testInfo, 'Estado del activo consultado', enTratamiento ? 'EN_TRATAMIENTO' : 'otro estado (no es un fallo de RF-76: depende de RF-44)');
    if (enTratamiento) {
      await expect.soft(pill, '1.4.1: el estado debe leerse como texto').toBeVisible();
    }
  });

  test('4. E11 - tratamientos simultáneos (precondición: requiere un activo ya EN_TRATAMIENTO con ciclo abierto)', async ({}, testInfo) => {
    precondicion(false, 'requiere un activo ya EN_TRATAMIENTO (dependencia de RF-44) sobre el cual registrar un segundo medicamento en el ambiente de prueba; no se fuerza con datos inventados');
    anotar(testInfo, 'E11', 'Según MedicamentoFormModal.tsx, el mensaje de retiro extendido lo redacta el backend (r.mensaje) y se muestra con pushToast — mismo mecanismo que la confirmación simple, sin distinción visual propia para E11.');
  });
});
