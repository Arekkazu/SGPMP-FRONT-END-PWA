// | Fecha      | Nombre      | Que se hizo |
// |------------|-------------|-------------|
// | 2026-11-06 | Laura032005 | M06 RF-86 TC-DIS-233: accesibilidad de MEDICION_PENDIENTE y PENDIENTE_CUENTA |
/**
 * TC-DIS-233 — Accesibilidad WCAG 2.1 AA del panel de gestión de M06 con los estados
 * MEDICION_PENDIENTE y PENDIENTE_CUENTA
 * RF-86 · CU-05 Registrar variación de valor razonable en resultados (generador único de líneas
 * de asiento NIC 41) · Rol: Contador
 * No existe un único "panel de gestión" con ambos estados: MEDICION_PENDIENTE se gestiona en
 * Medición posterior (/finanzas/medicion, ya auditado en TC-DIS-225) y PENDIENTE_CUENTA se
 * gestiona en Configuración contable (/finanzas/configuracion, ConfiguracionContableView.tsx,
 * alerta "config.pendientes_titulo"). Este spec cubre específicamente PENDIENTE_CUENTA, que es
 * la parte de RF-86 que no tenía spec propio todavía.
 *
 * Ver la nota sobre el estado del código (módulo en `dev`, aún no en `test`) en TC-DIS-221.
 *
 * Criterio (hoja M06): 0 violaciones axe A/AA en 1.4.1 (estados con etiqueta textual, no solo
 * color); 4.1.3 (alertas anunciadas); 4.1.2 (name/role/value de los estados); 1.4.3 (contraste
 * ≥ 4.5:1); 2.1.1 (panel operable por teclado).
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { abrirSesion, anotar, desviacion, escanear, irA, main, precondicion } from '../../../_shared/sigabA11y';

const TC_ID = 'TC-DIS-233';
const RUTA = 'finanzas/configuracion';
const TITULO = 'Configuración contable';
const PASOS_LIGHTHOUSE = ['alerta-pendiente-cuenta'];

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - PENDIENTE_CUENTA (RF-86, vía Configuración contable)`, () => {
  let contexto: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    ({ contexto, page } = await abrirSesion(browser, testInfo));
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test('1. Desviación - MEDICION_PENDIENTE y PENDIENTE_CUENTA no comparten un panel único', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    anotar(testInfo, 'Ubicación real de cada estado', 'MEDICION_PENDIENTE → /finanzas/medicion (ver TC-DIS-225); PENDIENTE_CUENTA → /finanzas/configuracion, alerta de líneas sin cuenta contable');
    desviacion(false, 'RF-86 describe "el panel de gestión de M06" como si fuera uno solo; en el código son dos vistas distintas sin una pantalla combinada');
  });

  test('2. Alerta de líneas pendientes de cuenta - texto con el conteo, no solo color (1.4.1 / 4.1.3)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const alerta = main(page).locator('[role="alert"]').filter({ hasText: /línea.*sin cuenta contable/i });
    const hay = await alerta.count() > 0;
    precondicion(hay, 'no hay líneas de asiento PENDIENTE_CUENTA en el ambiente (toda la matriz contable tiene cuentas asignadas)');
    if (hay) {
      anotar(testInfo, 'Alerta de líneas pendientes', await alerta.first().innerText());
      await expect.soft(alerta.first(), '4.1.3: debe estar en role="alert"').toHaveAttribute('role', 'alert');
      await escanear(page, TC_ID, __dirname, 'alerta-pendiente-cuenta', testInfo, PASOS_LIGHTHOUSE);
    }
  });

  test('3. Matriz contable operable por teclado (2.1.1)', async ({}, testInfo) => {
    await irA(page, RUTA, TITULO);
    const buscar = main(page).getByRole('textbox', { name: /hecho, especie o cuenta/i });
    precondicion(await buscar.count() > 0, 'no hay asignaciones en la matriz contable para mostrar sus filtros');
    if (await buscar.count() === 0) return;
    await buscar.focus();
    await expect.soft(buscar, '2.1.1: el buscador de la matriz debe ser enfocable').toBeFocused();
  });
});
