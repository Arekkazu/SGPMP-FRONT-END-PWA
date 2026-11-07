// | Fecha      | Nombre          | Que se hizo                                                        |
// |------------|-----------------|--------------------------------------------------------------------|
// | 2026-11-07 | SaraSofGonzalez | TC-DIS-251 RF-COT: formulario de registro de cotización de venta   |
/**
 * TC-DIS-251 — Verificar accesibilidad WCAG 2.1 AA del formulario de registro de cotización de venta
 * y de sus mensajes de error por campo
 * RF-COT · CU-COT - Registro de Cotizaciones de Venta de Activos Biológicos · Rol: Contador (y Administrador) · Prioridad: Media
 * Ruta: /finanzas/cotizaciones → "Registrar cotización"
 *
 * Criterio: 0 violaciones axe A/AA en 1.3.1 y 3.3.2 (labels visibles; requeridos con asterisco y
 * aria-required; el valor razonable de referencia como texto o campo readonly etiquetado); 4.1.2
 * (selector múltiple de activos con name/role/value y número de seleccionados); 3.3.1 y 4.1.3
 * (errores FA-2, FA-4, FA-5, FA-6 debajo del campo con role="alert", indicando el activo); 2.1.1 y
 * 2.4.7 (operable por teclado con foco visible, incluido el selector de fecha); sin enums crudos.
 *
 * Ambiente: Admin abre el formulario real con los activos reales de TEST. Los errores del backend
 * FA-2 (activo no disponible), FA-4 (sin valor razonable vigente) y FA-5 (vencimiento anterior a la
 * emisión) se simulan como respuesta del POST; FA-6 (valor ≤ 0) lo frena el cliente. Ninguna
 * cotización se registra ("Datos simulados").
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_251_VIEWPORTS=escritorio
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, camposSinNombre, desviacion, describirFoco, escanear } from '../../../_shared/sigabA11y';
import { abrirSesionRol, errorApi, focoVisible, irFinanzas, quitarSimulaciones, textosCrudos } from '../../_shared/finanzas';

const TC_ID = 'TC-DIS-251';
const VIEWPORTS = (process.env.TC_DIS_251_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['formulario-cotizacion'];

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

const ERRORES: [string, string, string, number][] = [
  ['ACTIVO_NO_DISPONIBLE', 'El activo BOV-001 no está disponible para cotizar: está dado de baja.', 'activos_cotizados', 422],
  ['VALOR_RAZONABLE_NO_DISPONIBLE', 'El activo BOV-001 no tiene un valor razonable vigente para el período.', 'activos_cotizados', 422],
  ['FECHA_VENCIMIENTO_INVALIDA', 'La fecha de vencimiento no puede ser anterior a la fecha de emisión.', 'fecha_vencimiento', 400],
];

async function abrir(page: Page) {
  await irFinanzas(page, 'cotizaciones', /Cotizaciones/);
  const boton = page.getByRole('button', { name: 'Registrar cotización', exact: true });
  await boton.focus();
  await page.keyboard.press('Enter');
  const dialogo = page.getByRole('dialog');
  await expect(dialogo).toBeVisible();
  await page.waitForTimeout(400);
  return dialogo;
}

test.describe('TC-DIS-251 — Formulario de registro de cotización de venta', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionRol(browser, testInfo, 'admin'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_251_VIEWPORTS.`);
  });
  test.afterEach(async () => { if (page) await quitarSimulaciones(page); });

  test('a. [1.3.1 / 3.3.2 / 4.1.2 / 2.1.1 / 2.4.7] Formulario real: activos, valor de referencia, vencimiento vacío', async ({}, testInfo) => {
    const dialogo = await abrir(page);
    await escanear(page, TC_ID, __dirname, 'formulario-cotizacion', testInfo, LH);
    const casillas = dialogo.getByRole('checkbox');
    const etiquetas = await casillas.evaluateAll((cs) => cs.map((c) => (c as HTMLInputElement).labels?.[0]?.textContent?.trim() ?? ''));
    anotar(testInfo, 'Activos a cotizar', etiquetas.join(' ¦ ') || '(ninguno)');
    expect.soft(etiquetas.length, 'No hay activos para cotizar').toBeGreaterThan(0);
    expect.soft(await camposSinNombre(dialogo), '1.3.1: campos sin nombre accesible').toEqual([]);

    // Selección por teclado y número de seleccionados.
    for (let i = 0; i < Math.min(2, etiquetas.length); i++) { await casillas.nth(i).focus(); await page.keyboard.press('Space'); }
    const textoDialogo = (await dialogo.innerText()).replace(/\s+/g, ' ');
    desviacion(/\d+ (activos? )?seleccionad/i.test(textoDialogo), '4.1.2: el selector de activos no expone cuántos activos van seleccionados');
    const referencia = dialogo.getByText(/valor razonable( de referencia)?/i);
    const readonly = await dialogo.locator('input[readonly], output').count();
    anotar(testInfo, 'Valor razonable de referencia', `${await referencia.count()} rótulo(s) · ${readonly} campo(s) readonly/output`);
    desviacion((await referencia.count()) > 0 || readonly > 0,
      '1.3.1/3.3.2: el valor razonable de referencia no se presenta como dato de solo lectura etiquetado; solo va pegado al nombre de cada casilla');

    const valor = dialogo.locator('#cot-valor');
    const v = await valor.evaluate((i) => ({ label: (i as HTMLInputElement).labels?.[0]?.textContent ?? '', aria: i.getAttribute('aria-required') }));
    expect.soft(v.aria === 'true' && /\*/.test(v.label), `3.3.2: "Valor propuesto" requerido sin asterisco o sin aria-required (label="${v.label}", aria-required=${v.aria})`).toBe(true);
    const venc = dialogo.locator('#cot-vencimiento');
    const vencInfo = await venc.evaluate((i) => {
      const ids = (i.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
      return ids.map((id) => document.getElementById(id)?.textContent ?? '').join(' ') + ' ' + (i.closest('.ds-field')?.textContent ?? '');
    });
    desviacion(/sin vencimiento/i.test(vencInfo), '3.3.2: con el vencimiento vacío no se indica "Sin vencimiento"');

    const sinFoco: string[] = [];
    await valor.focus();
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      if (!(await focoVisible(page))) sinFoco.push(await describirFoco(page));
    }
    expect.soft([...new Set(sinFoco)], '2.4.7: controles sin foco visible (incluido el selector de fecha)').toEqual([]);
  });

  test('b. [3.3.1 / 4.1.3] FA-6 en el cliente y FA-2 / FA-4 / FA-5 del backend (Datos simulados)', async ({}, testInfo) => {
    let actual = ERRORES[0];
    await page.route((u) => /\/finanzas\/cotizaciones$/.test(u.pathname), (r) => (r.request().method() === 'POST'
      ? r.fulfill({ status: actual[3], json: errorApi(actual[0], actual[1], actual[2]) }) : r.fallback()));
    const dialogo = await abrir(page);
    await dialogo.getByRole('checkbox').first().check();
    await dialogo.locator('#cot-valor').fill('0');
    await dialogo.getByRole('button', { name: 'Guardar', exact: true }).click();
    const fa6 = (await dialogo.locator('[role="alert"]').allInnerTexts()).join(' ¦ ');
    const fa6Campo = await dialogo.locator('#cot-valor-err').count();
    anotar(testInfo, 'FA-6 (valor ≤ 0)', `${fa6 || '(sin anuncio)'} · bajo el campo: ${fa6Campo}`);
    expect.soft(fa6, '3.3.1: el valor propuesto ≤ 0 no se anuncia').not.toBe('');
    desviacion(fa6Campo > 0, '3.3.1: el error de valor propuesto aparece en la alerta global del formulario, no debajo del campo');

    await dialogo.locator('#cot-valor').fill('4600000');
    await dialogo.locator('#cot-vencimiento').fill('2026-01-01');
    for (const e of ERRORES) {
      actual = e;
      await dialogo.getByRole('button', { name: 'Guardar', exact: true }).click();
      await page.waitForTimeout(700);
      const alertas = (await dialogo.locator('[role="alert"]').allInnerTexts()).map((a) => a.replace(/\s+/g, ' ').trim());
      const campo = e[2] === 'fecha_vencimiento' ? '#cot-vencimiento-err' : 'fieldset [role="alert"]';
      const bajo = await dialogo.locator(campo).count();
      anotar(testInfo, `${e[0]} (Datos simulados)`, `${alertas.join(' ¦ ') || '(sin anuncio)'} · junto al campo: ${bajo}`);
      expect.soft(alertas.some((a) => a.includes(e[1].slice(0, 25))), `3.3.1: ${e[0]} no se anuncia con role="alert"`).toBe(true);
      desviacion(bajo > 0, `3.3.1: ${e[0]} sale en la alerta global, no junto al campo afectado (${e[2]})`);
      const crudos = await textosCrudos(dialogo);
      desviacion(!crudos.some((c) => c.includes(e[0])), `el código interno ${e[0]} aparece en pantalla`);
    }
  });
});
