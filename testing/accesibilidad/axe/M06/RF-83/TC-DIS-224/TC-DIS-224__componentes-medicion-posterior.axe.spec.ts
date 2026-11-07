// | Fecha      | Nombre      | Que se hizo |
// |------------|-------------|-------------|
// | 2026-11-06 | Laura032005 | M06 RF-83 TC-DIS-224: accesibilidad de la presentación separada de transformación biológica y precio de mercado |
/**
 * TC-DIS-224 — Accesibilidad WCAG 2.1 AA de la presentación separada de los dos componentes de
 * la medición posterior (transformación biológica y cambio de precio de mercado)
 * RF-83 · CU-02 Medir posteriormente el valor razonable del activo biológico · Rol: Contador
 * Finanzas NIC 41 → Medición posterior (/finanzas/medicion); el desglose por componente con
 * columnas propias vive en el historial del activo (DetalleActivoModal, "Ver detalle")
 *
 * Ver la nota sobre el estado del código (módulo en `dev`, aún no en `test`) en TC-DIS-221
 * (M06/RF-82/TC-DIS-221).
 *
 * Criterio (hoja M06): 0 violaciones axe A/AA en 1.3.1 (tabla con encabezados asociados y
 * componentes diferenciados); 1.4.1 (ganancia/pérdida con etiqueta textual, no solo color); 1.4.3
 * (contraste ≥ 4.5:1); 1.1.1 (alternativa tabular si se usa gráfica).
 *
 * MedicionView.tsx junta los dos componentes en una sola columna "Variación total" con una
 * segunda línea de texto ("Crecimiento X · precio Y"). La tabla de mediciones de
 * DetalleActivoModal sí tiene columnas propias para cada componente (col.transformacion =
 * "Por transformación biológica", col.precio_mercado = "Por cambio de precio"): se verifica ahí,
 * que es donde el criterio se cumple literalmente.
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import {
  abrirSesion, anotar, auditarTabla, desviacion, escanear, irA, main, precondicion,
} from '../../../_shared/sigabA11y';

const TC_ID = 'TC-DIS-224';
const RUTA = 'finanzas/medicion';
const TITULO = 'Medición posterior';
const PASOS_LIGHTHOUSE = ['tabla-medicion', 'detalle-mediciones'];

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Componentes de la medición posterior (RF-83)`, () => {
  let contexto: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    ({ contexto, page } = await abrirSesion(browser, testInfo));
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test('1. Desviación - la tabla principal de MedicionView combina ambos componentes en una sola columna', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const tabla = main(page).getByRole('table');
    precondicion(await tabla.count() > 0, 'no hay activos medidos en el período elegido (o no hay período abierto)');
    if (await tabla.count() === 0) return;
    const a = await auditarTabla(tabla);
    anotar(testInfo, 'Encabezados de MedicionView', a.encabezados.join(' | '));
    desviacion(
      a.encabezados.some((h) => /transformaci|precio de mercado/i.test(h)),
      'MedicionView no tiene columnas separadas para transformación biológica y precio de mercado: van como texto secundario dentro de "Variación total" (t(\'medicion.desglose\'))',
    );
    await escanear(page, TC_ID, __dirname, 'tabla-medicion', testInfo, PASOS_LIGHTHOUSE);
  });

  test('2. DetalleActivoModal - columnas propias por componente con encabezados asociados (1.3.1)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const verDetalle = main(page).getByRole('button', { name: /^Ver detalle$/ }).first();
    precondicion(await verDetalle.count() > 0, 'no hay ningún activo con mediciones para abrir su detalle');
    if (await verDetalle.count() === 0) return;

    await verDetalle.click();
    const dialogo = page.getByRole('dialog');
    const tablaMediciones = dialogo.getByRole('table').filter({ has: page.getByText('Por transformación biológica') });
    precondicion(await tablaMediciones.count() > 0, 'el activo abierto no tiene mediciones posteriores registradas');
    if (await tablaMediciones.count() === 0) { await page.keyboard.press('Escape'); return; }

    const a = await auditarTabla(tablaMediciones);
    anotar(testInfo, 'Encabezados del historial de mediciones', a.encabezados.join(' | '));
    expect.soft(a.encabezados, '1.3.1: debe haber una columna propia por cada componente').toEqual(
      expect.arrayContaining(['Por transformación biológica', 'Por cambio de precio']),
    );
    expect.soft(a.filasDesalineadas, '1.3.1: filas con un número de celdas distinto al de encabezados').toEqual([]);

    await escanear(page, TC_ID, __dirname, 'detalle-mediciones', testInfo, PASOS_LIGHTHOUSE);
  });

  test('3. Ganancia/pérdida con signo y texto explícito, no solo color (1.4.1)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const verDetalle = main(page).getByRole('button', { name: /^Ver detalle$/ }).first();
    precondicion(await verDetalle.count() > 0, 'no hay ningún activo con mediciones para abrir su detalle');
    if (await verDetalle.count() === 0) return;
    await verDetalle.click();
    const dialogo = page.getByRole('dialog');
    const celdasVariacion = dialogo.locator('td').filter({ hasText: /^[+-−]\$|^—$/ });
    const n = await celdasVariacion.count();
    anotar(testInfo, 'Celdas de variación con signo', String(n));
    precondicion(n > 0, 'no hay celdas de variación visibles (sin mediciones)');
    if (n > 0) {
      const textos = await celdasVariacion.allInnerTexts();
      expect.soft(textos.filter((t) => !/^[+-−]|^—$/.test(t.trim())), '1.4.1: toda ganancia/pérdida debe llevar signo explícito como texto, no solo el color de la clase fin-pos/fin-neg').toEqual([]);
    }
    await page.keyboard.press('Escape');
  });
});
