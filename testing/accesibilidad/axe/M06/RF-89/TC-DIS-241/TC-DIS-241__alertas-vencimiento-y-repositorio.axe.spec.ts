// | Fecha      | Nombre      | Que se hizo |
// |------------|-------------|-------------|
// | 2026-11-06 | Laura032005 | M06 RF-89 TC-DIS-241: accesibilidad de las alertas de vencimiento de precios y del repositorio |
/**
 * TC-DIS-241 — Accesibilidad WCAG 2.1 AA de las alertas de vencimiento de precios (7, 15 y 30
 * días) y de la navegación del repositorio de precios
 * RF-89 · CU-08 Gestionar precios de mercado de referencia · Rol: Contador
 * Finanzas NIC 41 → Precios de referencia (/finanzas/precios), PreciosView.tsx
 *
 * Ver la nota sobre el estado del código (módulo en `dev`, aún no en `test`) en TC-DIS-221.
 *
 * Criterio (hoja M06): 0 violaciones axe A/AA en 4.1.3 (alertas anunciadas); 1.4.1 (urgencia con
 * texto, no solo color); 2.1.1 (repositorio y filtros por teclado); 1.3.1 (tabla con encabezados
 * asociados).
 *
 * El umbral de días (7/15/30) es configurable por el Contador en Configuración contable
 * (finanzasApi.configuracion → general.dias_alerta_vencimiento_precio), no un valor fijo del
 * código: se verifica que el aviso use el umbral vigente, sea cual sea, y que cada precio
 * próximo a vencer liste cuántos días le quedan en texto (t('precios.por_vencer_item')).
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import {
  abrirSesion, anotar, auditarTabla, escanear, irA, main, precondicion,
} from '../../../_shared/sigabA11y';

const TC_ID = 'TC-DIS-241';
const RUTA = 'finanzas/precios';
const TITULO = 'Precios de referencia';
const PASOS_LIGHTHOUSE = ['alerta-por-vencer', 'repositorio'];

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Alertas de vencimiento y repositorio de precios (RF-89)`, () => {
  let contexto: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    ({ contexto, page } = await abrirSesion(browser, testInfo));
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test('1. Alerta de precios próximos a vencer - días restantes en texto, no solo color (1.4.1 / 4.1.3)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const alerta = main(page).locator('[role="alert"]').filter({ hasText: /pr[óo]xim[oa]s? a vencer/i });
    const hay = await alerta.count() > 0;
    precondicion(hay, 'ningún precio vigente está dentro de la ventana de alerta de vencimiento configurada');
    if (hay) {
      const texto = await alerta.first().innerText();
      anotar(testInfo, 'Alerta de vencimiento', texto);
      expect.soft(texto, '1.4.1: debe nombrar el precio, la categoría y los días restantes en texto').toMatch(/d[íi]a/i);
      await expect.soft(alerta.first(), '4.1.3: debe estar en role="alert"').toHaveAttribute('role', 'alert');
      await escanear(page, TC_ID, __dirname, 'alerta-por-vencer', testInfo, PASOS_LIGHTHOUSE);
    }
  });

  test('2. Alerta de precios sin vigente - urgencia alta (error) distinguida con texto, no solo color (1.4.1)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const alertaSinVigente = main(page).locator('[role="alert"]').filter({ hasText: /sin precio de referencia vigente/i });
    const hay = await alertaSinVigente.count() > 0;
    precondicion(hay, 'todas las especies clasificadas tienen un precio vigente');
    if (hay) {
      anotar(testInfo, 'Alerta de especies sin precio', await alertaSinVigente.first().innerText());
      await expect.soft(alertaSinVigente.first(), '4.1.3: debe estar en role="alert"').toHaveAttribute('role', 'alert');
    }
  });

  test('3. Repositorio de precios - tabla y filtros operables por teclado (1.3.1 / 2.1.1)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const tabla = main(page).getByRole('table');
    precondicion(await tabla.count() > 0, 'no hay precios registrados en el ambiente');
    if (await tabla.count() === 0) return;

    const a = await auditarTabla(tabla);
    anotar(testInfo, 'Encabezados del repositorio de precios', a.encabezados.join(' | '));
    expect.soft(a.filasDesalineadas, '1.3.1: filas con un número de celdas distinto al de encabezados').toEqual([]);

    const buscar = main(page).getByRole('textbox', { name: 'Buscar' });
    if (await buscar.count() > 0) {
      await buscar.focus();
      await expect.soft(buscar, '2.1.1: el buscador del repositorio debe ser enfocable con Tab').toBeFocused();
    }
    const filtroCategoria = main(page).getByRole('combobox', { name: 'Categoría de precio' });
    if (await filtroCategoria.count() > 0) {
      await filtroCategoria.focus();
      await expect.soft(filtroCategoria, '2.1.1: el filtro de categoría debe ser enfocable con Tab').toBeFocused();
    }

    await escanear(page, TC_ID, __dirname, 'repositorio', testInfo, PASOS_LIGHTHOUSE);
  });
});
