// | Fecha      | Nombre      | Que se hizo                                                                     |
// |------------|-------------|---------------------------------------------------------------------------------|
// | 2026-11-17 | Laura032005 | TC-DIS-292 RF-107: aviso de éxito (5 s) y aviso de error persistente con acción correctiva |
/**
 * TC-DIS-292 — Verificar accesibilidad WCAG 2.1 AA de los banners de confirmación exitosa (verde, 5 s) y
 * de error con acción correctiva (rojo, persistente) [CRÍTICO]
 * RF-107 · CU-05 Proveer retroalimentación visual de acciones del sistema · Rol: Administrador · Prioridad: Alta
 * Ruta: /finanzas/cierre (acción representativa: cierre de período, con éxito y con error)
 *
 * Criterio: 0 violaciones axe A/AA en 4.1.3 (éxito como status y error como alert, sin mover el foco);
 * 1.4.1 (color + ícono + texto); 1.4.3; 2.2.1 (el aviso de 5 s se puede cerrar o conservar); 2.1.1
 * (acción correctiva y cierre por teclado); 3.3.1 (mensaje sin códigos HTTP ni términos técnicos).
 *
 * Los avisos son globales (ToastHost + Alert del DS): se prueban con una acción que los dispara en las
 * dos variantes. El cierre de período es irreversible, así que la acción y sus respuestas se simulan
 * igual que en M06 TC-DIS-243 ("Datos simulados"); ninguna escritura llega al backend.
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_292_VIEWPORTS=escritorio
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, desviacion, escanear } from '../../../_shared/sigabA11y';
import {
  EXITO_CIERRE, PERIODOS, abrirSesionM08, confirmarCierre, describirFocoDialogo, errorApi, irFinanzas, prepararCierre, quitarSimulaciones,
  simularEscritura,
} from '../../_shared/m08';

const TC_ID = 'TC-DIS-292';
const VIEWPORTS = (process.env.TC_DIS_292_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['aviso-exito', 'aviso-error'];

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe('TC-DIS-292 — Avisos de éxito y de error', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionM08(browser, testInfo, 'admin'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_292_VIEWPORTS.`);
  });
  test.afterEach(async () => { if (page) await quitarSimulaciones(page); });

  /** Rol, aria-live, ícono, botón de cerrar y texto del primer aviso visible en `selector`. */
  async function leerAviso(selector: string) {
    const aviso = page.locator(selector).first();
    await aviso.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
    if (!(await aviso.isVisible().catch(() => false))) return null;
    return aviso.evaluate((a) => ({
      rol: a.getAttribute('role'), live: a.getAttribute('aria-live'), icono: !!a.querySelector('svg'),
      cerrar: [...a.querySelectorAll('button')].map((b) => b.getAttribute('aria-label') ?? b.textContent ?? '').join(' | '),
      texto: (a as HTMLElement).innerText.replace(/\s+/g, ' ').trim(),
    }));
  }

  test('a. [4.1.3 / 2.2.1 / 1.4.1] Éxito: aviso verde anunciado como estado, sin mover el foco y con 5 s o cierre (Datos simulados)', async ({}, testInfo) => {
    await prepararCierre(page, PERIODOS);
    await simularEscritura(page, /\/cierre$/, 200, EXITO_CIERRE, 1500);
    anotar(testInfo, 'Datos simulados', 'Cierre de noviembre 2026 respondido como COMPLETADO tras 1,5 s.');
    await irFinanzas(page, 'cierre', /Cierre del período/);
    await confirmarCierre(page);
    const aviso = await leerAviso('.ds-toasts .ds-alert--success, .ds-toasts [role="alert"], .ds-toasts [role="status"]');
    const inicio = Date.now();
    const foco = await describirFocoDialogo(page);
    anotar(testInfo, 'Aviso de éxito', `${JSON.stringify(aviso)} · foco: ${foco}`);
    expect(aviso, 'No aparece el aviso de éxito tras el cierre').not.toBeNull();
    if (!aviso) return;
    await page.locator('.ds-toasts > *').first().waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => {});
    const duracion = (Date.now() - inicio) / 1000;
    anotar(testInfo, 'Duración del aviso', `${duracion.toFixed(1)} s`);
    desviacion(aviso.rol === 'status' || aviso.live === 'polite', `4.1.3: el éxito se anuncia como role="${aviso.rol}" aria-live="${aviso.live}" (interrumpe al lector); el criterio pide role="status"`);
    expect.soft(aviso.icono, '1.4.1: el aviso de éxito no lleva ícono').toBe(true);
    expect.soft(aviso.texto, '3.3.1: el aviso muestra códigos internos').not.toMatch(/[A-Z]{3,}_[A-Z_]+|\b[2-5]\d\d\b/);
    desviacion(duracion >= 4.5 && duracion <= 6.5, `RF-107: el aviso de éxito dura ${duracion.toFixed(1)} s, no 5 s`);
    desviacion(!!aviso.cerrar, '2.2.1: el aviso de éxito no se puede cerrar ni conservar');
    // El escaneo necesita el aviso en pantalla: se repite el cierre simulado y se escanea en cuanto aparece.
    await confirmarCierre(page);
    await page.locator('.ds-toasts > *').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
    await escanear(page, TC_ID, __dirname, 'aviso-exito', testInfo, LH);
  });

  test('b. [4.1.3 / 3.3.1 / 2.1.1] Error: aviso persistente en lenguaje natural, con acción correctiva y cierre por teclado (Datos simulados)', async ({}, testInfo) => {
    await prepararCierre(page, PERIODOS);
    await simularEscritura(page, /\/cierre$/, 422, errorApi('PERIODO_SIN_PRECIOS', 'Hay activos sin precio de mercado vigente. Registre el precio o exclúyalos del cierre.'), 800);
    anotar(testInfo, 'Datos simulados', 'Cierre respondido con 422 (activos sin precio de mercado), un error recuperable.');
    await irFinanzas(page, 'cierre', /Cierre del período/);
    await confirmarCierre(page);
    const aviso = await leerAviso('main [role="alert"]');
    anotar(testInfo, 'Aviso de error', JSON.stringify(aviso));
    expect(aviso, 'El error del cierre no se muestra en un aviso role="alert"').not.toBeNull();
    if (!aviso) return;
    await escanear(page, TC_ID, __dirname, 'aviso-error', testInfo, LH);
    await page.waitForTimeout(6000);
    expect.soft(await page.locator('main [role="alert"]').filter({ hasText: /precio/ }).count(), 'El aviso de error desaparece solo (debe ser persistente)').toBeGreaterThan(0);
    expect.soft(aviso.texto, '3.3.1: el aviso de error muestra el código HTTP o el código interno').not.toMatch(/PERIODO_SIN_PRECIOS|\b422\b/);
    expect.soft(aviso.icono, '1.4.1: el aviso de error no lleva ícono').toBe(true);
    const accion = page.locator('main [role="alert"]').first().locator('a, button:not([aria-label="Cerrar alerta"])');
    desviacion(await accion.count() > 0, '2.1.1: el aviso de error no ofrece una acción correctiva (p. ej. ir a registrar el precio)');
    desviacion(!!aviso.cerrar, '2.1.1: el aviso de error no se puede cerrar con el teclado');
  });
});
