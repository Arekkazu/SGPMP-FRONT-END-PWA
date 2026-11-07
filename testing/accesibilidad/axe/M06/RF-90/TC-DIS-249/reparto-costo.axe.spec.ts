// | Fecha      | Nombre          | Que se hizo                                                        |
// |------------|-----------------|--------------------------------------------------------------------|
// | 2026-11-07 | SaraSofGonzalez | TC-DIS-249 RF-90: reparto de un costo compartido entre activos     |
/**
 * TC-DIS-249 — Verificar accesibilidad WCAG 2.1 AA del reparto de un costo compartido entre varios
 * activos (por cabezas o por biomasa)
 * RF-90 · CU-09 · Rol: Contador · Prioridad: Media
 * Ruta: /finanzas/costos → "Registrar costo" → Destino "Varios activos"
 *
 * Criterio: 0 violaciones axe A/AA en 1.3.1 (vista previa del reparto en tabla: activo, tipo
 * individual/poblacional, participación, importe; fila del residuo en texto); 4.1.2 (selector de
 * activos y de método con name/role/value; "Quitar" identifica al activo); 4.1.3 (recálculo y cambio
 * automático a "por cabezas" anunciados); 3.3.1 (REPARTO_INVALIDO junto a la lista con role="alert"
 * e identificando el activo); 2.4.3 (al quitar un activo el foco pasa al siguiente elemento lógico).
 *
 * Ambiente: activos simulados (dos individuales y un POBLACIONAL sin peso). El POST se responde con
 * 422 REPARTO_INVALIDO ("Datos simulados"); ningún costo se registra.
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_249_VIEWPORTS=escritorio
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, camposSinNombre, desviacion, describirFoco, escanear } from '../../../_shared/sigabA11y';
import { ACTIVOS, PERIODOS, abrirSesionRol, anunciosDurante, errorApi, irFinanzas, quitarSimulaciones, simularEscritura, simularGet } from '../../_shared/finanzas';

const TC_ID = 'TC-DIS-249';
const VIEWPORTS = (process.env.TC_DIS_249_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['reparto-cabezas', 'reparto-biomasa'];

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe('TC-DIS-249 — Reparto de un costo compartido', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionRol(browser, testInfo, 'admin'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_249_VIEWPORTS.`);
  });
  test.afterEach(async () => { if (page) await quitarSimulaciones(page); });

  test('a. [1.3.1 / 4.1.2 / 4.1.3] Reparto por cabezas y por biomasa con un activo sin peso (Datos simulados)', async ({}, testInfo) => {
    await simularGet(page, /^\/finanzas\/activos$/, ACTIVOS);
    await simularGet(page, /^\/finanzas\/periodos\/?$/, PERIODOS);
    anotar(testInfo, 'Datos simulados', 'Activos BOV-101 y BOV-102 (individuales) y LOTE-TIL-07 (poblacional, sin peso).');
    await irFinanzas(page, 'costos', /Costos del período/);
    await page.getByRole('button', { name: 'Registrar costo', exact: true }).click();
    const dialogo = page.getByRole('dialog');
    await dialogo.locator('#co-monto').fill('120000');
    const destino = dialogo.locator('#co-destino');
    await destino.focus();
    await destino.selectOption('reparto');
    const casillas = dialogo.getByRole('group', { name: /activos/i }).getByRole('checkbox');
    const n = await casillas.count();
    anotar(testInfo, 'Selector de activos', `${n} casillas: ${(await casillas.evaluateAll((cs) => cs.map((c) => (c as HTMLInputElement).labels?.[0]?.textContent?.trim()))).join(' ¦ ')}`);
    for (let i = 0; i < n; i++) { await casillas.nth(i).focus(); await page.keyboard.press('Space'); }
    const metodo = dialogo.locator('#co-metodo');
    await metodo.selectOption('POR_CABEZAS');
    await escanear(page, TC_ID, __dirname, 'reparto-cabezas', testInfo, LH);
    expect.soft(await camposSinNombre(dialogo), '4.1.2: controles del reparto sin nombre accesible').toEqual([]);

    const previa = dialogo.locator('table');
    const tieneTabla = await previa.count();
    anotar(testInfo, 'Vista previa del reparto', tieneTabla ? (await previa.first().innerText()).replace(/\s+/g, ' ') : '(no hay)');
    desviacion(tieneTabla > 0, '1.3.1: no hay vista previa del reparto (tabla activo · tipo · participación · importe, con la fila del residuo)');
    const tipos = (await dialogo.innerText());
    desviacion(/poblacional/i.test(tipos), '1.3.1: el selector no indica si cada activo es individual o poblacional');

    await metodo.selectOption('POR_BIOMASA');
    const anuncios = await anunciosDurante(page, 1500);
    await escanear(page, TC_ID, __dirname, 'reparto-biomasa', testInfo, LH);
    anotar(testInfo, 'Anuncios al cambiar a biomasa', anuncios.join(' ¦ ') || '(ninguno)');
    desviacion(anuncios.some((a) => /cabezas|sin peso/i.test(a)), '4.1.3: no se anuncia que, por un activo sin peso, el reparto se hará por cabezas');

    const quitar = dialogo.getByRole('button', { name: /Quitar/i });
    desviacion((await quitar.count()) > 0, '4.1.2/2.4.3: no hay botón "Quitar" por activo; el activo se desmarca en la casilla (el criterio de foco al quitar no aplica)');
    await casillas.nth(1).focus();
    await page.keyboard.press('Space');
    const foco = await describirFoco(page);
    anotar(testInfo, 'Foco tras quitar un activo', foco);
    expect.soft(foco, '2.4.3: el foco se pierde al quitar un activo').not.toBe('body');
  });

  test('b. [3.3.1] Reparto inválido (activo de otro titular): anuncio junto a la lista (Datos simulados)', async ({}, testInfo) => {
    await simularGet(page, /^\/finanzas\/activos$/, ACTIVOS);
    await simularGet(page, /^\/finanzas\/periodos\/?$/, PERIODOS);
    await simularEscritura(page, /^\/finanzas\/costos$/, 422, errorApi('REPARTO_INVALIDO', 'El activo LOTE-TIL-07 pertenece a otro titular tributario y no puede compartir este costo.', 'activos_reparto'));
    anotar(testInfo, 'Datos simulados', 'POST /costos responde 422 REPARTO_INVALIDO identificando LOTE-TIL-07.');
    await irFinanzas(page, 'costos', /Costos del período/);
    await page.getByRole('button', { name: 'Registrar costo', exact: true }).click();
    const dialogo = page.getByRole('dialog');
    await dialogo.locator('#co-monto').fill('120000');
    await dialogo.locator('#co-destino').selectOption('reparto');
    const casillas = dialogo.getByRole('group', { name: /activos/i }).getByRole('checkbox');
    for (let i = 0; i < (await casillas.count()); i++) await casillas.nth(i).check();

    // Con un solo activo marcado: validación del cliente.
    await casillas.nth(0).uncheck();
    await casillas.nth(1).uncheck();
    await dialogo.getByRole('button', { name: 'Guardar', exact: true }).click();
    const cliente = (await dialogo.locator('[role="alert"]').allInnerTexts()).join(' ¦ ');
    anotar(testInfo, 'Reparto con un solo activo', cliente || '(sin anuncio)');
    expect.soft(cliente, '3.3.1: elegir un solo activo para repartir no se anuncia').not.toBe('');

    for (let i = 0; i < 2; i++) await casillas.nth(i).check();
    await dialogo.getByRole('button', { name: 'Guardar', exact: true }).click();
    await page.waitForTimeout(800);
    const alerta = dialogo.locator('[role="alert"]').filter({ hasText: /LOTE-TIL-07/ });
    await expect.soft(alerta, '3.3.1: REPARTO_INVALIDO no se anuncia con role="alert" identificando el activo').toBeVisible();
    const junto = await alerta.evaluate((a) => !!a.closest('fieldset')).catch(() => false);
    desviacion(junto, '3.3.1: el error de reparto aparece en la alerta global del formulario, no junto a la lista de activos');
  });
});
