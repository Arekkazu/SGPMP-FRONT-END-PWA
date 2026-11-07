// | Fecha      | Nombre      | Que se hizo |
// |------------|-------------|-------------|
// | 2026-11-06 | Laura032005 | M06 RF-89 TC-DIS-240: la evidencia es texto (no archivo) y no existe el estado PENDIENTE_CONFIRMACION |
/**
 * TC-DIS-240 — Accesibilidad WCAG 2.1 AA de la carga de evidencia documental y de los estados
 * PROGRAMADO, PENDIENTE_CONFIRMACION, vigente y vencido en el historial de precios
 * RF-89 · CU-08 Gestionar precios de mercado de referencia · Rol: Contador
 * Finanzas NIC 41 → Precios de referencia (/finanzas/precios), PreciosView.tsx / PrecioModal
 *
 * Ver la nota sobre el estado del código (módulo en `dev`, aún no en `test`) en TC-DIS-221.
 *
 * Criterio (hoja M06): 0 violaciones axe A/AA en 2.1.1 (carga operable por teclado); 3.3.2
 * (control de archivo con etiqueta); 4.1.3 (resultado de la carga anunciado); 1.4.1 (estados
 * PROGRAMADO/PENDIENTE_CONFIRMACION/vigente/vencido con texto); 1.4.3 (contraste ≥ 4.5:1).
 *
 * El campo "evidencia" de PrecioModal es un <Input> de texto (boletín, cotización o fuente
 * consultada), no un control de carga de archivo (<input type="file">): no hay nada que
 * "adjuntar". El estado del dominio PENDIENTE_CONFIRMACION tampoco existe en finanzas.json ni
 * en el código de Precio — los únicos estados reales son ACTIVO ("Vigente"), PROGRAMADO,
 * VENCIDO y SUPERADO ("Reemplazado"). Ambos se reportan como desviaciones reales; se verifican
 * los 3 estados que sí existen.
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { abrirSesion, anotar, desviacion, escanear, irA, main, precondicion } from '../../../_shared/sigabA11y';

const TC_ID = 'TC-DIS-240';
const RUTA = 'finanzas/precios';
const TITULO = 'Precios de referencia';
const PASOS_LIGHTHOUSE = ['historial-estados'];

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Evidencia y estados del historial de precios (RF-89)`, () => {
  let contexto: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    ({ contexto, page } = await abrirSesion(browser, testInfo));
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test('1. Desviación - la evidencia es un campo de texto, no una carga de archivo', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const btn = main(page).getByRole('button', { name: 'Registrar precio', exact: true });
    precondicion(await btn.isEnabled().catch(() => false), 'el botón "Registrar precio" está deshabilitado o sin permiso');
    if (!(await btn.isEnabled().catch(() => false))) return;
    await btn.click();
    const dialogo = page.getByRole('dialog');
    const archivo = dialogo.locator('input[type="file"]');
    anotar(testInfo, 'Controles de carga de archivo en PrecioModal', String(await archivo.count()));
    desviacion(await archivo.count() > 0, 'PrecioModal no tiene input[type="file"]: "Evidencia" (col.evidencia) es un <Input> de texto libre ("Boletín, cotización o fuente consultada"), no una carga de documento');
    await page.keyboard.press('Escape');
  });

  test('2. Desviación - no existe el estado PENDIENTE_CONFIRMACION en el dominio de precios', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const estado = main(page).getByText('Pendiente de confirmación', { exact: false });
    anotar(testInfo, 'Ocurrencias de "pendiente de confirmación" en la vista', String(await estado.count()));
    desviacion(await estado.count() > 0, 'finanzas.json no define una traducción para PENDIENTE_CONFIRMACION y Precio.estado (types.ts) no incluye ese valor; los estados reales de precio son ACTIVO, PROGRAMADO, VENCIDO y SUPERADO');
  });

  test('3. Estados PROGRAMADO, vigente y vencido - con texto, no solo color (1.4.1 / 1.4.3)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const tabla = main(page).getByRole('table');
    precondicion(await tabla.count() > 0, 'no hay precios registrados en el ambiente');
    if (await tabla.count() === 0) return;

    const estados = ['Vigente', 'Programado', 'Vencido', 'Reemplazado'];
    const presentes: string[] = [];
    for (const e of estados) {
      if (await tabla.getByText(e, { exact: true }).count() > 0) presentes.push(e);
    }
    anotar(testInfo, 'Estados de precio presentes', presentes.join(', ') || 'ninguno');
    precondicion(presentes.length > 0, 'ningún estado de precio (Vigente/Programado/Vencido/Reemplazado) está representado en la tabla visible');
    expect.soft(presentes.length, '1.4.1: cada estado presente debe leerse como texto en el Badge').toBeGreaterThan(0);

    await escanear(page, TC_ID, __dirname, 'historial-estados', testInfo, PASOS_LIGHTHOUSE);
  });
});
