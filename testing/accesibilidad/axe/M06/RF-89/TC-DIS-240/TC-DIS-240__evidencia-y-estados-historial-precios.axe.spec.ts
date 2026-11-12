// | Fecha      | Nombre      | Que se hizo |
// |------------|-------------|-------------|
// | 2026-11-06 | Laura032005 | M06 RF-89 TC-DIS-240: la evidencia es texto (no archivo) y no existe el estado PENDIENTE_CONFIRMACION |
// | 2026-11-12 | Laura032005 | M06 RF-89 TC-DIS-240: usa la cuenta Contador, no Admin — el RF-89 restringe el registro de precios solo a ese rol (CA-1) |
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
 * consultada), no un control de carga de archivo (<input type="file">) — y eso es lo correcto:
 * RF-89 v1.1 (RFC-024) dice explícitamente que evidencia_documental es "texto obligatorio de 1 a
 * 500 caracteres... No es un archivo adjunto". Ya no se reporta como desviación.
 * PENDIENTE_CONFIRMACION sí existe en el RF (CA-9, para origen_registro = API_M07) pero no en
 * finanzas.json ni en el código de Precio.estado; se documenta como alcance diferido, no como
 * desviación, porque M07 todavía no envía precios (ver PR #593) — no es alcanzable hoy.
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { abrirSesion, anotar, credencialesPorRol, escanear, irA, main, precondicion } from '../../../_shared/sigabA11y';

const TC_ID = 'TC-DIS-240';
const RUTA = 'finanzas/precios';
const TITULO = 'Precios de referencia';
const PASOS_LIGHTHOUSE = ['historial-estados'];

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Evidencia y estados del historial de precios (RF-89)`, () => {
  let contexto: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    // RF-89 Restricciones: "Solo el Contador puede registrar... Ningún otro actor tiene permisos
    // de escritura" (CA-1). Con la cuenta Admin el botón no se renderiza (correcto por RBAC).
    ({ contexto, page } = await abrirSesion(browser, testInfo, credencialesPorRol('CONTADOR')));
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test('1. Evidencia documental - campo de texto obligatorio, conforme a RF-89 v1.1 (3.3.2)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const btn = main(page).getByRole('button', { name: 'Registrar precio', exact: true });
    await btn.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
    precondicion(await btn.isEnabled().catch(() => false), 'el botón "Registrar precio" está deshabilitado o sin permiso');
    if (!(await btn.isEnabled().catch(() => false))) return;
    await btn.click();
    const dialogo = page.getByRole('dialog');
    const evidencia = dialogo.getByRole('textbox', { name: 'Evidencia' });
    await expect.soft(evidencia, '3.3.2: "Evidencia" debe exponer aria-required="true"').toHaveAttribute('aria-required', 'true');
    const archivo = dialogo.locator('input[type="file"]');
    anotar(testInfo, 'Controles de carga de archivo en PrecioModal', String(await archivo.count()));
    anotar(testInfo, 'Alcance', 'RF-89 v1.1 (RFC-024) pide evidencia_documental como texto de 1-500 caracteres, "no un archivo adjunto"; PrecioModal cumple eso exactamente (campo de texto, no input[type="file"]).');
    await page.keyboard.press('Escape');
  });

  test('2. PENDIENTE_CONFIRMACION (API_M07) - alcance diferido, no alcanzable hoy', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const estado = main(page).getByText('Pendiente de confirmación', { exact: false });
    anotar(testInfo, 'Ocurrencias de "pendiente de confirmación" en la vista', String(await estado.count()));
    anotar(testInfo, 'Alcance', 'RF-89 CA-9 exige PENDIENTE_CONFIRMACION para origen_registro=API_M07, pero M07 todavía no envía precios (PR #593): no hay ningún precio con ese origen que probar, y finanzas.json/types.ts no incluyen ese estado todavía. Diferido, no es un defecto de esta ronda.');
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
