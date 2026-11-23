// | Fecha      | Nombre      | Que se hizo                                                                     |
// |------------|-------------|---------------------------------------------------------------------------------|
// | 2026-11-17 | Laura032005 | TC-DIS-284 RF-106: marcadores agrupados, filtros y paginación por teclado y estado vacío |
// | 2026-11-22 | SaraSofGonzalez | TC-DIS-284 RF-106: «Cargar más» se alcanza con Tab antes de medir el foco visible |
/**
 * TC-DIS-284 — Verificar accesibilidad WCAG 2.1 AA de la interacción con la línea de tiempo (marcadores
 * agrupados, tooltips, zoom y filtros) y del estado vacío
 * RF-106 · CU-04 Visualizar historial clínico predictivo de activo biológico · Rol: Veterinario · Prioridad: Media
 * Ruta: /prediccion/historial
 *
 * Criterio: 0 violaciones axe A/AA en 2.1.1 y 2.4.7 (marcadores, zoom, desplazamiento y filtros por
 * teclado con foco visible); 4.1.2 (el marcador agrupado expone aria-expanded y "N eventos"; los
 * interruptores "incluir eventos" e "incluir retroalimentación" exponen su estado); 1.4.13 (tooltip con
 * foco, se descarta con Escape y no desaparece al pasar el puntero); 4.1.3 (el mensaje de "sin
 * inferencias en el rango" se anuncia sin errores técnicos). Cubre la restricción 5 y el FA-1 de RF-106.
 *
 * Datos reales: BOV-M08-003 «Tormenta», sin inferencias en los últimos 12 meses (Datos_Semilla §7.2).
 * Los pasos a y c simulan Lucero y Canela para controlar el agrupamiento y la paginación ("Datos simulados").
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_284_VIEWPORTS=escritorio
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, desviacion, escanear, estaEnRegionViva, main, precondicion } from '../../../_shared/sigabA11y';
import {
  CANELA, LUCERO, RANGO_LUCERO, TORMENTA, abrirSesionM08, consultarHistorial, describirFocoDialogo, focoVisible, irHistorial,
  quitarSimulaciones, simularHistorial, textosCrudos,
} from '../../_shared/m08';

const TC_ID = 'TC-DIS-284';
const VIEWPORTS = (process.env.TC_DIS_284_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['linea-filtros', 'sin-inferencias', 'linea-pagina-2'];

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe('TC-DIS-284 — Interacción con la línea de tiempo y estado vacío', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionM08(browser, testInfo, 'veterinario'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_284_VIEWPORTS.`);
  });
  test.afterEach(async () => { if (page) await quitarSimulaciones(page); });

  test('a. [2.1.1 / 2.4.7 / 4.1.2 / 1.4.13] Lucero: marcador agrupado, tooltips, zoom y filtros por teclado (Datos simulados)', async ({}, testInfo) => {
    await simularHistorial(page);
    anotar(testInfo, 'Datos simulados', `${LUCERO} con la inferencia del 2026-09-02 08:00 y la fiebre a las 08:40 (menos de 1 h: marcador "2 eventos").`);
    await irHistorial(page);
    await consultarHistorial(page, LUCERO, RANGO_LUCERO.desde, RANGO_LUCERO.hasta);
    await escanear(page, TC_ID, __dirname, 'linea-filtros', testInfo, LH);

    const agrupado = main(page).locator('[aria-expanded]').filter({ hasText: /\d+\s+eventos/i });
    desviacion(await agrupado.count() > 0, '4.1.2: no hay marcador agrupado "N eventos" con aria-expanded para los eventos a menos de 1 hora (restricción 5 de RF-106)');
    const tooltips = await main(page).locator('[role="tooltip"], [aria-describedby]').count();
    anotar(testInfo, 'Tooltips', `elementos con tooltip accesible: ${tooltips}`);
    desviacion(await main(page).getByRole('button', { name: /acercar|alejar|zoom/i }).count() > 0, '2.1.1: la línea de tiempo no tiene zoom ni desplazamiento operables por teclado');

    // Recorrido de los filtros con Tab: cada parada con foco visible.
    await page.locator('#hist-activo').focus();
    const paradas: string[] = [];
    const sinFoco: string[] = [];
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
      const f = await describirFocoDialogo(page);
      paradas.push(f);
      if (!(await focoVisible(page))) sinFoco.push(f);
    }
    anotar(testInfo, 'Tab desde "Activo o lote"', paradas.join(' → '));
    expect.soft(sinFoco, '2.4.7: filtros sin foco visible').toEqual([]);
    const alertas = main(page).getByRole('checkbox', { name: /Incluir alertas/i });
    expect.soft(await alertas.count(), '4.1.2: "Incluir alertas" no expone su estado como casilla').toBe(1);
    desviacion(await main(page).getByRole('checkbox', { name: /incluir eventos/i }).or(main(page).getByRole('switch', { name: /incluir eventos/i })).count() > 0, '4.1.2: falta el interruptor "incluir eventos" que pide RF-106');
    desviacion(await main(page).getByRole('checkbox', { name: /incluir retroalimentaci/i }).or(main(page).getByRole('switch', { name: /incluir retroalimentaci/i })).count() > 0, '4.1.2: falta el interruptor "incluir retroalimentación" que pide RF-106');
    desviacion(await main(page).getByText(/lineal|agrupad/i).count() > 0, '2.1.1: falta el modo lineal/agrupado que pide RF-106');
  });

  test('b. [4.1.3] Tormenta real: sin inferencias en el rango, mensaje anunciado y rango que se puede cambiar', async ({}, testInfo) => {
    await irHistorial(page);
    const hoy = new Date().toISOString().slice(0, 10);
    const haceUnAno = new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10);
    const ok = await consultarHistorial(page, TORMENTA, haceUnAno, hoy);
    precondicion(ok, `${TORMENTA} no aparece en el selector de activos del Veterinario (Datos_Semilla §7.2)`);
    if (!ok) return;
    await escanear(page, TC_ID, __dirname, 'sin-inferencias', testInfo, LH);
    const vacio = main(page).getByText(/No se encontraron registros/);
    await expect.soft(vacio, 'No aparece el mensaje de "sin inferencias en el rango"').toBeVisible();
    const texto = await vacio.innerText().catch(() => '');
    anotar(testInfo, 'Mensaje sin resultados', texto);
    expect.soft(await estaEnRegionViva(vacio), '4.1.3: el mensaje de "sin inferencias" no se anuncia').toBe(true);
    expect.soft(await textosCrudos(main(page)), 'El mensaje muestra errores técnicos o valores crudos').toEqual([]);
    desviacion(/cambi|ampl[ií]e|rango|otro per[ií]odo/i.test(texto), '3.3.3: el mensaje no orienta a cambiar el rango de fechas (FA-1 de RF-106)');
    // El rango se puede ampliar y la consulta vuelve a correr.
    await consultarHistorial(page, TORMENTA, '2024-01-01', hoy);
    const tras = await main(page).getByText(/No se encontraron registros/).count();
    anotar(testInfo, 'Con el rango desde 2024-01-01', tras ? 'sigue vacío' : 'aparecen las inferencias de marzo de 2024');
    precondicion(tras === 0, `${TORMENTA} no tiene las 2 inferencias de marzo de 2024 (Datos_Semilla §7.2)`);
  });

  test('c. [2.1.1 / 2.4.3] Canela: paginación por teclado y foco al inicio de la página nueva (Datos simulados)', async ({}, testInfo) => {
    await simularHistorial(page);
    anotar(testInfo, 'Datos simulados', `${CANELA}: 25 inferencias (10 por página).`);
    await irHistorial(page);
    await consultarHistorial(page, CANELA, '2026-09-01', '2026-11-17');
    const nav = main(page).getByRole('navigation', { name: 'Paginación del historial' });
    await expect.soft(nav, 'No aparece la paginación con 25 eventos').toBeVisible();
    const siguiente = nav.getByRole('button', { name: 'Cargar más' });
    // Se llega con Tab (Shift+Tab y Tab): tras el clic en «Consultar», un .focus() por programa no activa
    // :focus-visible y daría un falso «sin foco».
    await siguiente.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    expect.soft(await siguiente.evaluate((b) => document.activeElement === b), '2.1.1: "Cargar más" no se alcanza con Tab').toBe(true);
    expect.soft(await focoVisible(page), '2.4.7: "Cargar más" no muestra el foco').toBe(true);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(800);
    const foco = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.tagName ?? '');
    const pagina = (await nav.innerText()).replace(/\s+/g, ' ');
    await escanear(page, TC_ID, __dirname, 'linea-pagina-2', testInfo, LH);
    anotar(testInfo, 'Tras "Cargar más"', `paginación: ${pagina} · foco: ${foco}`);
    expect.soft(pagina, 'La paginación no pasó a la página 2').toMatch(/Página 2/);
    expect.soft(foco, '2.4.3: el foco no queda al inicio de los resultados de la página nueva').toMatch(/Resultados, página 2/);
    desviacion(await nav.locator('[aria-current]').count() > 0, '2.1.1: la página actual no se indica con aria-current');
    desviacion(await estaEnRegionViva(nav.getByText(/Página \d+/)), '4.1.3: el cambio de página no se anuncia');
  });
});
