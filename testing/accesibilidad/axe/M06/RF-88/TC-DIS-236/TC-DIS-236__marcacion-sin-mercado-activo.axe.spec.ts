// | Fecha      | Nombre      | Que se hizo |
// |------------|-------------|-------------|
// | 2026-11-06 | Laura032005 | M06 RF-88 TC-DIS-236: no hay formulario de marcación manual SIN_MERCADO_ACTIVO |
// | 2026-11-07 | Laura032005 | M06 RF-88 TC-DIS-236: loguear como Contador (Administrador no tiene permiso valoracion_por_costo) |
// | 2026-11-12 | Laura032005 | M06 RF-88 TC-DIS-236: test1 ya no es desviación — RFC-024 retiró el escenario B de RF-88, ahora documenta conformidad |
/**
 * TC-DIS-236 — Accesibilidad WCAG 2.1 AA del formulario de marcación SIN_MERCADO_ACTIVO con
 * razon_sin_mercado obligatoria y de la advertencia cuando RF-89 sí tiene precio
 * RF-88 · CU-07 Valorar activos biológicos por método de costo · Rol: Contador
 * Finanzas NIC 41 → Valoración sin mercado (/finanzas/valoracion-costo), ValoracionCostoView.tsx
 *
 * Ver la nota sobre el estado del código (módulo en `dev`, aún no en `test`) en TC-DIS-221.
 *
 * Criterio (hoja M06): 0 violaciones axe A/AA en 3.3.2 (razon_sin_mercado con etiqueta e
 * indicación de obligatorio); 3.3.1 (error asociado al campo); 4.1.3 (advertencia anunciada);
 * 1.4.1 (advertencia no solo con color); 2.4.3 (foco al abrir y cerrar).
 *
 * razon_sin_mercado no es un formulario manual: el backend marca el activo al costo
 * automáticamente en el reconocimiento inicial (RF-82, sin precio de mercado vigente) y
 * razon_sin_mercado se muestra de solo lectura en DetalleActivoModal (Alert con
 * costo.razon_sin_mercado como description). No hay ninguna acción de "marcar manualmente" con
 * ese campo obligatorio. La advertencia por activo cuya especie ya tiene precio vigente (el
 * caso inverso al que describe el criterio) sí existe de verdad: se verifica esa.
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import {
  abrirSesion, anotar, credencialesPorRol, escanear, irA, main, precondicion,
} from '../../../_shared/sigabA11y';

const TC_ID = 'TC-DIS-236';
const RUTA = 'finanzas/valoracion-costo';
const TITULO = 'Valoración sin mercado activo';
const PASOS_LIGHTHOUSE = ['aviso-pasar-vr', 'razon-solo-lectura'];

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Marcación SIN_MERCADO_ACTIVO (RF-88)`, () => {
  let contexto: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    // La cuenta Administrador (abrirSesion por defecto) no tiene el permiso valoracion_por_costo
    // (R_COSTO_HISTORICO): ValoracionCostoView responde AccesoDenegado, que irA() no reconoce
    // como un estado válido (solo espera el h1 de la vista o el login) y el test agota el timeout.
    ({ contexto, page } = await abrirSesion(browser, testInfo, credencialesPorRol('CONTADOR')));
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test('1. Alcance - razon_sin_mercado de solo lectura, conforme a RF-88 v2.0 (RFC-024)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const campoRazon = main(page).getByRole('textbox', { name: /raz[óo]n/i });
    anotar(testInfo, 'Campos "razón" editables en la vista', String(await campoRazon.count()));
    anotar(testInfo, 'Alcance', 'RFC-024 retiró el escenario B de RF-88 (marcación manual de SIN_MERCADO_ACTIVO): la marcación al costo la decide el backend automáticamente en el reconocimiento (RF-82), no un formulario del Contador. Que no exista un campo editable es lo correcto, no una desviación.');
  });

  test('2. Advertencia real - activo al costo cuya especie ya tiene precio vigente (1.4.1 / 4.1.3)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const aviso = main(page).getByText(/ya tiene(n)? precio de mercado/i);
    const hay = await aviso.count() > 0;
    precondicion(hay, 'ningún activo valorado al costo tiene una especie con precio de mercado vigente en el ambiente (no se reproduce el caso ¶30 que obliga a pasar a valor razonable)');
    if (hay) {
      const region = aviso.first().locator('xpath=ancestor::*[contains(@class,"fin-avisos") or @role="alert" or @role="status"]');
      await expect.soft(region, '4.1.3: el aviso debe estar en una región que el lector anuncie').toHaveCount(1);
      anotar(testInfo, 'Aviso de activos que deben pasar a VR', await aviso.first().innerText());
    }
    await escanear(page, TC_ID, __dirname, 'aviso-pasar-vr', testInfo, PASOS_LIGHTHOUSE);
  });

  test('3. razon_sin_mercado de solo lectura - columna "Razón" con texto, no solo color (1.4.1)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const tabla = main(page).getByRole('table');
    precondicion(await tabla.count() > 0, 'no hay activos al costo ni con precio estimado en el ambiente');
    if (await tabla.count() === 0) return;
    const columnaRazon = tabla.locator('thead th', { hasText: 'Razón' });
    await expect.soft(columnaRazon, '1.3.1: debe existir la columna "Razón"').toBeVisible();
    await escanear(page, TC_ID, __dirname, 'razon-solo-lectura', testInfo, PASOS_LIGHTHOUSE);
  });
});
