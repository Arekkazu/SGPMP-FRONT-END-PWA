// | Fecha      | Nombre          | Que se hizo                                                        |
// |------------|-----------------|--------------------------------------------------------------------|
// | 2026-11-07 | SaraSofGonzalez | TC-DIS-244 RF-87: estados del período sin depender solo del color  |
/**
 * TC-DIS-244 — Verificar accesibilidad WCAG 2.1 AA de los estados del período (Abierto / En cierre /
 * Cerrado) sin depender solo del color [CRÍTICO]
 * RF-87 · CU-06 - Ejecutar cierre del período contable · Rol: Contador y Administrador · Prioridad: Alta
 * Ruta: /finanzas/cierre (selector de período + historial de períodos cerrados)
 *
 * Criterio: 0 violaciones axe A/AA en 1.4.1 (ícono + etiqueta textual por estado; Cerrado dice en
 * texto que el período es inmutable); 1.4.3 (contraste ≥ 4.5:1 de cada badge en tema claro y
 * oscuro); 4.1.2 (controles no disponibles en un período cerrado exponen el motivo); 3.3.1 y 4.1.3
 * (mensajes FA-5 y aviso de permiso FA-4 con role="alert" o aria-live); sin enums crudos ni null.
 *
 * Ambiente: los períodos reales de TEST tienen ABIERTO y CERRADO pero no EN_CIERRE, y no hay cuenta
 * de Contador. El paso a recorre el estado real con Admin (FA-4: Admin no puede iniciar el cierre);
 * los pasos b y c simulan los tres estados y el rechazo FA-5 del backend ("Datos simulados").
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_244_VIEWPORTS=escritorio
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, desviacion, escanear, main } from '../../../_shared/sigabA11y';
import {
  PERIODOS, abrirSesionRol, badges, concederPermisos, elegirPeriodo, errorApi, irFinanzas, prevalidacionLimpia, quitarSimulaciones,
  simularEscritura, simularGet, temaOscuro, textosCrudos,
} from '../../_shared/finanzas';

const TC_ID = 'TC-DIS-244';
const VIEWPORTS = (process.env.TC_DIS_244_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['estados-real', 'estados-simulados', 'estados-oscuro'];

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe('TC-DIS-244 — Estados del período sin depender solo del color', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionRol(browser, testInfo, 'admin'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_244_VIEWPORTS.`);
  });
  test.afterEach(async () => { if (page) { await temaOscuro(page, false); await quitarSimulaciones(page); } });

  test('a. [1.4.1 / FA-4] Estados reales con Admin; aviso inline de permiso en lugar de "Cerrar período"', async ({}, testInfo) => {
    await irFinanzas(page, 'cierre', /Cierre del período/);
    await escanear(page, TC_ID, __dirname, 'estados-real', testInfo, LH);
    const opciones = await page.locator('#fin-periodo option').allInnerTexts();
    const b = await badges(main(page));
    const crudos = await textosCrudos(main(page));
    anotar(testInfo, 'Períodos reales', opciones.join(' ¦ '));
    anotar(testInfo, 'Badges de estado', b.map((x) => `${x.texto}${x.icono ? ' +ícono' : ''}`).join(' ¦ '));
    desviacion(b.every((x) => x.icono), `1.4.1: los badges de estado no llevan ícono, solo texto y color (${b.filter((x) => !x.icono).map((x) => x.texto).join(', ')})`);
    desviacion(crudos.length === 0, `regla de textos visibles: aparecen valores crudos en pantalla → ${crudos.join(' ¦ ')}`);
    const boton = await page.getByRole('button', { name: 'Cerrar período', exact: true }).isVisible();
    const avisoPermiso = page.locator('[role="alert"], [role="status"], [aria-live]').filter({ hasText: /permiso|contador|no puedes|rol/i });
    anotar(testInfo, 'FA-4', `Botón "Cerrar período": ${boton ? 'visible' : 'oculto'} · aviso de permiso: ${(await avisoPermiso.allInnerTexts()).join(' ¦ ') || '(ninguno)'}`);
    desviacion(!boton && (await avisoPermiso.count()) > 0, 'FA-4: Admin no ve el botón de iniciar cierre, pero tampoco un aviso inline anunciado que explique que solo el Contador puede cerrar');
  });

  test('b. [1.4.1 / 1.4.3 / 4.1.2] Los tres estados y el período cerrado (Datos simulados), tema claro y oscuro', async ({}, testInfo) => {
    await concederPermisos(page, [['cierre_periodo', 5]]);
    await simularGet(page, /^\/finanzas\/periodos\/?$/, PERIODOS);
    await simularGet(page, /^\/finanzas\/periodos\/\d+\/prevalidacion$/, prevalidacionLimpia);
    await simularGet(page, /^\/finanzas\/periodos\/\d+\/comprobantes$/, []);
    await simularGet(page, /^\/finanzas\/reconocimientos\/propuestas$/, []);
    anotar(testInfo, 'Datos simulados', 'Septiembre 2026 CERRADO, octubre EN_CIERRE, noviembre ABIERTO (NIT 900123456); permiso cierre_periodo·E.');
    await irFinanzas(page, 'cierre', /Cierre del período/);
    const opciones = await page.locator('#fin-periodo option').allInnerTexts();
    anotar(testInfo, 'Opciones del selector', opciones.join(' ¦ '));
    for (const estado of ['Abierto', 'En cierre', 'Cerrado']) {
      expect.soft(opciones.some((o) => o.includes(estado)), `El estado "${estado}" no aparece en texto en el selector de períodos`).toBe(true);
    }
    await escanear(page, TC_ID, __dirname, 'estados-simulados', testInfo, LH);
    await temaOscuro(page, true);
    await escanear(page, TC_ID, __dirname, 'estados-oscuro', testInfo, LH);
    await temaOscuro(page, false);

    // Período cerrado: sin acciones de escritura y con el motivo en texto.
    await elegirPeriodo(page, 9101);
    const texto = (await main(page).innerText()).replace(/\s+/g, ' ');
    const cerrarVisible = await page.getByRole('button', { name: 'Cerrar período', exact: true }).isVisible();
    expect.soft(cerrarVisible, 'En un período cerrado se ofrece "Cerrar período"').toBe(false);
    desviacion(/inmutable|no se puede (modificar|reabrir)|ajuste/i.test(texto), '1.4.1/4.1.2: el período cerrado no comunica en texto que es inmutable y que las correcciones van como ajuste en el período abierto');
    const b = await badges(main(page));
    anotar(testInfo, 'Badges (período cerrado)', b.map((x) => `${x.texto}${x.icono ? ' +ícono' : ''}`).join(' ¦ '));
    desviacion(b.every((x) => x.icono), '1.4.1: el badge "Cerrado" no lleva ícono');
  });

  test('c. [3.3.1 / 4.1.3 / FA-5] Iniciar el cierre de un período en cierre: rechazo anunciado (Datos simulados)', async ({}, testInfo) => {
    await concederPermisos(page, [['cierre_periodo', 5]]);
    await simularGet(page, /^\/finanzas\/periodos\/?$/, PERIODOS);
    await simularGet(page, /^\/finanzas\/periodos\/\d+\/prevalidacion$/, prevalidacionLimpia);
    await simularGet(page, /^\/finanzas\/periodos\/\d+\/comprobantes$/, []);
    await simularGet(page, /^\/finanzas\/reconocimientos\/propuestas$/, []);
    await simularEscritura(page, /\/cierre$/, 409, errorApi('PERIODO_EN_CIERRE', 'El período ya tiene un cierre en curso. Espera a que termine antes de iniciar otro.'));
    anotar(testInfo, 'Datos simulados', 'Octubre 2026 EN_CIERRE; POST /cierre responde 409 PERIODO_EN_CIERRE (FA-5).');
    await irFinanzas(page, 'cierre', /Cierre del período/);
    await elegirPeriodo(page, 9102);
    const disparador = page.getByRole('button', { name: 'Cerrar período', exact: true });
    const ofrecido = await disparador.isVisible();
    anotar(testInfo, 'Período EN_CIERRE', `Botón "Cerrar período" ${ofrecido ? 'ofrecido' : 'no ofrecido'}`);
    desviacion(!ofrecido, 'FA-5: en un período que ya está en cierre se sigue ofreciendo "Cerrar período"');
    if (ofrecido) {
      await disparador.focus();
      await page.keyboard.press('Enter');
      await page.getByRole('dialog').getByRole('button', { name: 'Cerrar período', exact: true }).click();
      const alerta = page.locator('[role="alert"]').filter({ hasText: /cierre en curso/i });
      await expect.soft(alerta, '3.3.1/4.1.3: el rechazo FA-5 no se anuncia con role="alert"').toBeVisible({ timeout: 10_000 });
      const crudos = await textosCrudos(main(page));
      desviacion(!crudos.some((c) => /PERIODO_EN_CIERRE/.test(c)), 'el código de error interno aparece en pantalla');
    }
  });
});
