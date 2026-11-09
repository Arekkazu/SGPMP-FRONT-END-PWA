// | Fecha      | Nombre          | Que se hizo                                                        |
// |------------|-----------------|--------------------------------------------------------------------|
// | 2026-11-07 | SaraSofGonzalez | TC-DIS-263 RF-93: filtros de generación del estado de resultados   |
/**
 * TC-DIS-263 — Verificar accesibilidad WCAG 2.1 AA de los filtros de generación del Estado de
 * Resultados y de sus mensajes de error
 * RF-93 · CU-012 · Rol: Contador · Prioridad: Media
 * Ruta: /finanzas/estado-resultados → "Generar estado de resultados"
 *
 * Criterio: 0 violaciones axe A/AA en 2.1.1 y 2.4.7 (filtros y "Limpiar filtros" por teclado con foco
 * visible); 4.1.2 (cada filtro con name/role/value; Combobox del DS con ARIA 1.2); 3.3.1 y 4.1.3
 * (error "Período no cerrado" y alerta crítica de conciliación con el componente discrepante con
 * role="alert"); 4.1.3 (generación en curso por aria-live); sin enums crudos ni null.
 *
 * Ambiente: Admin no tiene permiso para generar. Con permiso visual simulado (estado_resultados·C)
 * y activos simulados de varias especies, individuales y POBLACIONAL, se recorren los filtros. FA-1
 * (período abierto) y FA-2 (ERROR_CONCILIACION) se simulan en la respuesta del POST ("Datos
 * simulados"); ningún estado se genera.
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_263_VIEWPORTS=escritorio
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, camposSinNombre, desviacion, describirFoco, escanear, main } from '../../../_shared/sigabA11y';
import {
  abrirSesionRol, anunciosDurante, concederPermisos, elegirPeriodo, errorApi, focoVisible, irFinanzas, quitarSimulaciones, simularEscritura, simularEstados, textosCrudos,
} from '../../_shared/finanzas';

const TC_ID = 'TC-DIS-263';
const VIEWPORTS = (process.env.TC_DIS_263_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['filtros', 'error-conciliacion'];

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

async function preparar(page: Page) {
  await concederPermisos(page, [['estado_resultados', 1]]);
  await simularEstados(page);
}

test.describe('TC-DIS-263 — Filtros de generación del Estado de Resultados', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionRol(browser, testInfo, 'admin'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_263_VIEWPORTS.`);
  });
  test.afterEach(async () => { if (page) await quitarSimulaciones(page); });

  test('a. [2.1.1 / 2.4.7 / 4.1.2] Filtros combinados por teclado y "Limpiar filtros" (Datos simulados)', async ({}, testInfo) => {
    await preparar(page);
    anotar(testInfo, 'Datos simulados', 'Permiso estado_resultados·C; septiembre 2026 CERRADO; activos BOV-101/BOV-102 (Bovino) y LOTE-TIL-07 (Tilapia, poblacional).');
    await irFinanzas(page, 'estado-resultados', /Estado de resultados/);
    await elegirPeriodo(page, 9101);
    const panel = main(page).locator('section[aria-labelledby="er-generar"]');
    await expect(panel, 'No aparece el panel de generación con el permiso simulado').toBeVisible();
    await escanear(page, TC_ID, __dirname, 'filtros', testInfo, LH);
    expect.soft(await camposSinNombre(panel), '4.1.2: filtros sin nombre accesible').toEqual([]);
    const etiquetas = await panel.locator('select, input, [role="combobox"]').evaluateAll((cs) => cs.map((c) => (c as HTMLInputElement).labels?.[0]?.textContent?.trim() ?? c.getAttribute('aria-label') ?? c.id));
    anotar(testInfo, 'Filtros disponibles', etiquetas.join(' ¦ '));
    desviacion(etiquetas.some((e) => /infraestructura/i.test(e)), '4.1.2: no hay filtro por infraestructura');
    desviacion(etiquetas.some((e) => /poblacional/i.test(e)) && etiquetas.some((e) => /individual/i.test(e)),
      '4.1.2: no se distinguen los filtros de activo individual y activo POBLACIONAL (un solo selector "Activo o lote")');

    const sinFoco: string[] = [];
    for (const id of ['#er-especie', '#er-finca', '#er-activo']) {
      const c = panel.locator(id);
      await page.keyboard.press('Shift');
      await c.focus();
      if (!(await focoVisible(page))) sinFoco.push(id);
      if (await c.isEnabled()) await c.selectOption({ index: 1 }).catch(() => {});
    }
    expect.soft(sinFoco, '2.4.7: filtros sin foco visible').toEqual([]);
    const limpiar = panel.getByRole('button', { name: /Limpiar filtros/i });
    desviacion(await limpiar.count() > 0, '2.1.1: el panel de generación no ofrece "Limpiar filtros" con filtros activos');
    anotar(testInfo, 'Foco tras elegir filtros', await describirFoco(page));
  });

  test('b. [3.3.1 / 4.1.3] FA-1 período no cerrado y FA-2 error de conciliación; generación en curso (Datos simulados)', async ({}, testInfo) => {
    await preparar(page);
    await simularEscritura(page, /\/periodos\/\d+\/estados-resultados$/, 422,
      errorApi('ERROR_CONCILIACION', 'Alerta crítica: el estado no concilia con el cierre. Componente discrepante: costos de mantenimiento ($ 1.095.000 frente a $ 1.100.000).'), 2500);
    await irFinanzas(page, 'estado-resultados', /Estado de resultados/);

    // FA-1: período abierto.
    await elegirPeriodo(page, 9103);
    const generar = main(page).getByRole('button', { name: /Generar/ });
    const habilitado = await generar.isEnabled();
    const fa1 = await main(page).locator('[role="alert"]').filter({ hasText: /cerrad/i }).allInnerTexts();
    anotar(testInfo, 'FA-1 (período abierto)', `botón Generar ${habilitado ? 'habilitado' : 'deshabilitado'} · anuncio: ${fa1.join(' ¦ ') || '(ninguno)'}`);
    expect.soft(fa1.length, '3.3.1/4.1.3: el aviso "Período no cerrado" no se anuncia con role="alert"').toBeGreaterThan(0);
    const describe = await generar.getAttribute('aria-describedby');
    desviacion(habilitado || !!describe, '4.1.2: el botón "Generar" deshabilitado no expone su motivo (aria-describedby)');

    // FA-2: conciliación.
    await elegirPeriodo(page, 9101);
    await generar.focus();
    await page.keyboard.press('Enter');
    const anuncios = await anunciosDurante(page, 4000);
    const busy = await generar.getAttribute('aria-busy');
    anotar(testInfo, 'Durante la generación', `aria-busy=${busy} · anuncios: ${anuncios.join(' ¦ ') || '(ninguno)'}`);
    desviacion(anuncios.some((a) => /generando|en curso|procesando/i.test(a)), '4.1.3: el estado de generación en curso no se anuncia por aria-live');
    await escanear(page, TC_ID, __dirname, 'error-conciliacion', testInfo, LH);
    const fa2 = main(page).locator('[role="alert"]').filter({ hasText: /concilia/i });
    await expect.soft(fa2, '3.3.1/4.1.3: la alerta crítica de conciliación no se anuncia con role="alert"').toBeVisible();
    const crudos = await textosCrudos(main(page));
    desviacion(!crudos.some((c) => /ERROR_CONCILIACION/.test(c)), 'el código interno ERROR_CONCILIACION aparece en pantalla');
  });
});
