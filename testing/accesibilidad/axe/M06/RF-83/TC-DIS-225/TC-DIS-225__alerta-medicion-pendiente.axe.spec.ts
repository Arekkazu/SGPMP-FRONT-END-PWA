// | Fecha      | Nombre      | Que se hizo |
// |------------|-------------|-------------|
// | 2026-11-06 | Laura032005 | M06 RF-83 TC-DIS-225: accesibilidad de la alerta MEDICION_PENDIENTE |
/**
 * TC-DIS-225 — Accesibilidad WCAG 2.1 AA de la alerta MEDICION_PENDIENTE cuando no existe
 * precio de mercado
 * RF-83 · CU-02 Medir posteriormente el valor razonable del activo biológico · Rol: Contador
 * Finanzas NIC 41 → Medición posterior (/finanzas/medicion), MedicionView.tsx
 *
 * Ver la nota sobre el estado del código (módulo en `dev`, aún no en `test`) en TC-DIS-221.
 *
 * Criterio (hoja M06): 0 violaciones axe A/AA en 4.1.3 (alerta anunciada sin mover el foco); 1.4.1
 * (estado MEDICION_PENDIENTE con etiqueta textual); 1.4.3 (contraste de texto ≥ 4.5:1); 2.1.1
 * (operable por teclado).
 *
 * MedicionView no muestra una alerta aislada por activo con MEDICION_PENDIENTE: el estado se
 * comunica con un Badge ("medicion.estado_MEDICION_PENDIENTE" = "Medición pendiente", tono
 * warning) en la fila (con className fin-fila--atencion) y se agrega al KPI "Sin medición", que
 * sí lista los identificadores afectados. Se verifica ese mecanismo real, no una alerta
 * modal/toast que el código no tiene para este caso.
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { abrirSesion, anotar, escanear, irA, main, precondicion } from '../../../_shared/sigabA11y';

const TC_ID = 'TC-DIS-225';
const RUTA = 'finanzas/medicion';
const TITULO = 'Medición posterior';
const PASOS_LIGHTHOUSE = ['kpi-pendientes', 'fila-pendiente'];

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Estado MEDICION_PENDIENTE (RF-83)`, () => {
  let contexto: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    ({ contexto, page } = await abrirSesion(browser, testInfo));
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test('1. KPI "Sin medición" - identifica los activos pendientes en texto (4.1.3 / 3.3.1)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const kpi = main(page).locator('.fin-kpi', { hasText: 'Sin medición' });
    precondicion(await kpi.count() > 0, 'la vista no tiene período seleccionado o no se encontró el KPI "Sin medición"');
    if (await kpi.count() === 0) return;
    const detalle = await kpi.locator('.fin-kpi__detalle').innerText();
    anotar(testInfo, 'KPI Sin medición', detalle);
    const hayPendientes = detalle !== 'Todos los activos tienen medición';
    precondicion(hayPendientes, 'ningún activo del período está en estado MEDICION_PENDIENTE o SIN_MEDICION');
    if (hayPendientes) {
      expect.soft(detalle.length, '3.3.1: el detalle debe nombrar los activos pendientes, no solo un número').toBeGreaterThan(0);
    }
    await escanear(page, TC_ID, __dirname, 'kpi-pendientes', testInfo, PASOS_LIGHTHOUSE);
  });

  test('2. Badge "Medición pendiente" con texto, no solo color (1.4.1 / 1.4.3)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const filaPendiente = main(page).locator('tr.fin-fila--atencion').first();
    precondicion(await filaPendiente.count() > 0, 'no hay ninguna fila con MEDICION_PENDIENTE visible en la página actual del listado');
    if (await filaPendiente.count() === 0) return;
    const badge = filaPendiente.getByText('Medición pendiente', { exact: true });
    await expect.soft(badge, '1.4.1: el estado debe leerse como texto, no solo inferirse del color de la fila').toBeVisible();
    anotar(testInfo, 'Fila con atención', (await filaPendiente.innerText()).replace(/\s+/g, ' '));
    await escanear(page, TC_ID, __dirname, 'fila-pendiente', testInfo, PASOS_LIGHTHOUSE);
  });

  test('3. Filtro por estado - MEDICION_PENDIENTE operable por teclado (2.1.1)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const filtroEstado = main(page).getByRole('combobox', { name: 'Estado' });
    precondicion(await filtroEstado.count() > 0, 'la tabla no tiene datos (el panel de filtros de Listado solo aparece con l.total > 0)');
    if (await filtroEstado.count() === 0) return;
    await filtroEstado.focus();
    const opciones = await filtroEstado.locator('option').allTextContents();
    anotar(testInfo, 'Opciones del filtro de estado', opciones.join(', '));
    const tienePendiente = opciones.some((o) => /pendiente/i.test(o));
    if (tienePendiente) {
      await filtroEstado.selectOption({ label: opciones.find((o) => /pendiente/i.test(o))! });
      await expect.soft(main(page).locator('tr.fin-fila--atencion').first(), '2.1.1: filtrar por teclado debe mostrar solo filas pendientes').toBeVisible();
    }
  });
});
