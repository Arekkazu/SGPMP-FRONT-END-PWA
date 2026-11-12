// | Fecha      | Nombre      | Que se hizo |
// |------------|-------------|-------------|
// | 2026-11-06 | Laura032005 | M06 RF-86 TC-DIS-234: accesibilidad de la tabla de líneas de asiento (débito/crédito) |
// | 2026-11-12 | Laura032005 | M06 RF-86 TC-DIS-234: corregir selector "Ver detalle" y buscar QA-RF83-MEDIDO (1859) en período 363, sembrado por el DBA |
// | 2026-11-12 | Laura032005 | M06 RF-86 TC-DIS-234: el período 363 pertenece a otro Titular ("Agropecuaria Medicion QA") — usar irAPeriodo; esperar tabla async en el diálogo |
/**
 * TC-DIS-234 — Accesibilidad WCAG 2.1 AA de la tabla de líneas de asiento (cuenta débito y
 * cuenta crédito) generadas por RF-86
 * RF-86 · CU-05 Registrar variación de valor razonable en resultados (generador único de líneas
 * de asiento NIC 41) · Rol: Contador
 * Finanzas NIC 41 → Medición posterior o Valor razonable neto → "Ver detalle" de un activo →
 * sección "Líneas de asiento" (DetalleActivoModal.tsx, compartida por todas las vistas de
 * valoración; no hay una vista de líneas de asiento independiente)
 *
 * Ver la nota sobre el estado del código (módulo en `dev`, aún no en `test`) en TC-DIS-221.
 *
 * Criterio (hoja M06): 0 violaciones axe A/AA en 1.3.1 (encabezados con scope asociados a sus
 * celdas); 1.3.2 (orden de lectura coherente); 2.1.1 (ordenar y paginar por teclado); 4.1.2
 * (controles de ordenamiento con name/role/value).
 *
 * La tabla de líneas de asiento de DetalleActivoModal no tiene ordenamiento ni paginación propios
 * (es una lista completa del activo, sin controles de orden): se verifica lo que existe
 * (encabezados asociados, lectura con la cuenta débito/crédito en una sola columna "Débito /
 * crédito") y se reporta como desviación la ausencia de controles de orden/paginación.
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import {
  abrirSesion, anotar, auditarTabla, desviacion, escanear, irA, irAPeriodo, main, precondicion,
} from '../../../_shared/sigabA11y';

const TC_ID = 'TC-DIS-234';
const RUTA = 'finanzas/medicion';
const TITULO = 'Medición posterior';
const PASOS_LIGHTHOUSE = ['lineas-asiento'];

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Tabla de líneas de asiento (RF-86)`, () => {
  let contexto: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    ({ contexto, page } = await abrirSesion(browser, testInfo));
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test('1. Tabla de líneas de asiento - encabezados asociados, cuenta débito/crédito legible (1.3.1 / 1.3.2)', async ({}, testInfo) => {
    testInfo.setTimeout(60_000);
    await irA(page, RUTA, TITULO);
    // QA-RF83-MEDIDO (1859), período 363, Titular "Agropecuaria Medicion QA" — 5 mediciones
    // reales sembradas por el DBA.
    await irAPeriodo(page, '363', 'Agropecuaria Medicion QA');
    const campoBuscar = main(page).getByRole('searchbox');
    if (await campoBuscar.count() > 0) await campoBuscar.fill('QA-RF83-MEDIDO');
    const verDetalle = main(page).getByRole('button', { name: /^Ver el historial financiero de/ }).first();
    await verDetalle.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
    precondicion(await verDetalle.count() > 0, 'no hay ningún activo medido para abrir su detalle');
    if (await verDetalle.count() === 0) return;

    await verDetalle.click();
    const dialogo = page.getByRole('dialog');
    await dialogo.getByRole('table').first().waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
    const tablaLineas = dialogo.getByRole('table').filter({ has: page.getByText('Débito / crédito') });
    precondicion(await tablaLineas.count() > 0, 'el activo abierto no tiene líneas de asiento registradas');
    if (await tablaLineas.count() === 0) { await page.keyboard.press('Escape'); return; }

    const a = await auditarTabla(tablaLineas);
    anotar(testInfo, 'Encabezados de líneas de asiento', a.encabezados.join(' | '));
    expect.soft(a.encabezados, '1.3.1: debe incluir hecho contable, sentido, valor, cuentas y estado').toEqual(
      expect.arrayContaining(['Hecho contable', 'Sentido', 'Valor', 'Débito / crédito', 'Estado']),
    );
    expect.soft(a.filasDesalineadas, '1.3.1: filas con un número de celdas distinto al de encabezados').toEqual([]);

    await escanear(page, TC_ID, __dirname, 'lineas-asiento', testInfo, PASOS_LIGHTHOUSE);
    await page.keyboard.press('Escape');
  });

  test('2. Desviación - sin controles de orden ni paginación propios para esta tabla', async ({}, testInfo) => {
    testInfo.setTimeout(60_000);
    await irA(page, RUTA, TITULO);
    await irAPeriodo(page, '363', 'Agropecuaria Medicion QA');
    const campoBuscar = main(page).getByRole('searchbox');
    if (await campoBuscar.count() > 0) await campoBuscar.fill('QA-RF83-MEDIDO');
    const verDetalle = main(page).getByRole('button', { name: /^Ver el historial financiero de/ }).first();
    await verDetalle.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
    precondicion(await verDetalle.count() > 0, 'no hay ningún activo medido para abrir su detalle');
    if (await verDetalle.count() === 0) return;
    await verDetalle.click();
    const dialogo = page.getByRole('dialog');
    await dialogo.getByRole('table').first().waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
    const ordenar = dialogo.getByRole('button', { name: /ordenar/i });
    anotar(testInfo, 'Controles de orden en la tabla de líneas', String(await ordenar.count()));
    desviacion(await ordenar.count() > 0, 'DetalleActivoModal no ofrece ordenar ni paginar la tabla de líneas de asiento: muestra la lista completa del activo');
    await page.keyboard.press('Escape');
  });
});
