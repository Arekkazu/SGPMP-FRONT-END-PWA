// | Fecha      | Nombre      | Que se hizo |
// |------------|-------------|-------------|
// | 2026-11-06 | Laura032005 | M05 RF-75 TC-DIS-211: accesibilidad del historial de consumo, anulación y duplicado |
/**
 * TC-DIS-211 — Accesibilidad WCAG 2.1 AA del historial de consumo, del flujo de anulación y del
 * rechazo por registro duplicado
 * RF-75 · CU-01 Registrar Suministros (Consumo de Alimentos) · Rol: Veterinario o Administrador
 * (la anulación está restringida a estos roles — RECURSO_CONSUMO acción D)
 * Suministros → Alimentación (/suministros/alimentacion). No existe una vista de "historial"
 * separada para RF-75: la tabla de AlimentacionView es a la vez el registro y el historial.
 *
 * Criterio (hoja M05): 0 violaciones axe A/AA en 1.4.1 (VALIDADO/ANULADO con etiqueta textual,
 * no solo color); 2.1.1, 2.1.2 y 2.4.3 (diálogo de anulación operable por teclado, sin trampa de
 * foco, cierre con Escape y foco devuelto al disparador); 3.3.1 y 4.1.3 (errores E6 —
 * justificación insuficiente— y E8 —duplicado, HTTP 409— identificados en texto y anunciados
 * mediante aria-live).
 *
 * Nota de la hoja: la Restricción 5 pide 50 caracteres mínimos de justificación y el Proceso/E6
 * piden 20; MotivoModal (consumo.anular) implementa min=20, max=255. Se prueba el valor vigente
 * en el código (20), no el de la Restricción 5.
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import {
  abrirSesion, anotar, desviacion, describirFoco, escanear, irA, main, precondicion,
} from '../../../_shared/sigabA11y';

const TC_ID = 'TC-DIS-211';
const RUTA = 'suministros/alimentacion';
const TITULO = 'Registro de alimentación';
const PASOS_LIGHTHOUSE = ['historial', 'anulacion'];

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Historial de consumo y anulación (RF-75)`, () => {
  let contexto: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    ({ contexto, page } = await abrirSesion(browser, testInfo));
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test('1. VALIDADO/ANULADO se distinguen con etiqueta textual, no solo color (1.4.1)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const filas = main(page).locator('table tbody tr');
    const total = await filas.count();
    precondicion(total > 0, 'no hay consumos registrados para el activo consultado');
    if (total === 0) return;

    const estados = await main(page).locator('table tbody tr td:nth-last-child(2), table tbody tr td:nth-last-child(1)').allInnerTexts();
    const anulados = estados.filter((t) => t.includes('Anulado'));
    const validados = estados.filter((t) => t.includes('Validado'));
    anotar(testInfo, 'Estados en la página', `Validado: ${validados.length} · Anulado: ${anulados.length}`);
    precondicion(anulados.length > 0, 'ningún consumo visible está ANULADO (el historial no tiene un ejemplo con justificación)');

    await escanear(page, TC_ID, __dirname, 'historial', testInfo, PASOS_LIGHTHOUSE);
  });

  test('2. Diálogo de anulación - foco entra al abrir, Escape lo cierra y el foco regresa al botón (2.1.1 / 2.1.2 / 2.4.3)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const botonAnular = main(page).getByRole('button', { name: 'Anular', exact: true }).first();
    precondicion(await botonAnular.count() > 0, 'no hay ningún registro VALIDADO con el que probar la anulación (permiso insuficiente o sin registros)');
    if (await botonAnular.count() === 0) return;

    await botonAnular.focus();
    await page.keyboard.press('Enter');
    const dialogo = page.getByRole('dialog');
    await expect(dialogo, '2.4.3: el foco debe entrar al diálogo de anulación al abrirlo').toBeVisible();
    const foco1 = await describirFoco(page);
    anotar(testInfo, 'Foco al abrir', foco1);
    expect.soft(foco1, 'el foco inicial debe quedar dentro del diálogo, no en el body').not.toBe('body');

    await page.keyboard.press('Escape');
    await expect(dialogo, '2.1.2: Escape debe cerrar el diálogo sin trampa de foco').toBeHidden();
    const vuelve = await botonAnular.evaluate((e) => e === document.activeElement);
    expect.soft(vuelve, '2.4.3: al cerrar, el foco debe volver al botón "Anular" que lo abrió').toBe(true);
  });

  test('3. E6 - justificación por debajo del mínimo se identifica en texto junto al campo (3.3.1)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const botonAnular = main(page).getByRole('button', { name: 'Anular', exact: true }).first();
    precondicion(await botonAnular.count() > 0, 'no hay ningún registro VALIDADO con el que probar la anulación');
    if (await botonAnular.count() === 0) return;

    await botonAnular.click();
    const dialogo = page.getByRole('dialog');
    const area = dialogo.getByRole('textbox', { name: 'Justificación de la anulación' });
    await area.fill('motivo corto');
    await area.blur();
    const confirmar = dialogo.getByRole('button', { name: 'Confirmar anulación', exact: true });
    await confirmar.click();
    const error = dialogo.getByText(/Escribe al menos \d+ caracteres/);
    await expect.soft(error, '3.3.1 (E6): el error de justificación insuficiente debe mostrarse junto al campo').toBeVisible();
    await expect.soft(error, 'el error debe anunciarse con role="alert"').toHaveAttribute('role', 'alert');
    await expect.soft(area, '4.1.2: aria-invalid="true" en la justificación insuficiente').toHaveAttribute('aria-invalid', 'true');

    await escanear(page, TC_ID, __dirname, 'anulacion', testInfo, PASOS_LIGHTHOUSE);
    await page.keyboard.press('Escape');
  });

  test('4. E8 - rechazo por registro duplicado (HTTP 409) anunciado al usuario (4.1.3)', async ({}, testInfo) => {
    precondicion(false, 'requiere reproducir exactamente el mismo activo, fecha_consumo, hora_suministro y tipo de alimento de un registro VALIDADO existente; no se fuerza con datos inventados fuera de un ambiente preparado para esto');
    anotar(testInfo, 'E8 (ConsumoFormModal)', 'El error de servidor se muestra con <Alert variant="error" title={error.message} /> cuando error.status === 409 — es un Alert visible en el flujo del formulario, no una región aria-live independiente; se recomienda confirmar con el escenario real si se anuncia sin mover el foco.');
    desviacion(false, 'no se pudo confirmar si el Alert de duplicado (409) está en una región que el lector anuncie sin mover el foco, por falta de un registro duplicado real en el ambiente');
  });
});
