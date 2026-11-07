// | Fecha      | Nombre          | Que se hizo                                                        |
// |------------|-----------------|--------------------------------------------------------------------|
// | 2026-11-07 | SaraSofGonzalez | TC-DIS-255 RF-91: estados de verificación y eslabón fallido        |
/**
 * TC-DIS-255 — Verificar accesibilidad WCAG 2.1 AA de los estados de verificación del asiento con
 * texto + ícono y del eslabón fallido [CRÍTICO]
 * RF-91 · CU-010 · Rol: Contador · Prioridad: Alta
 * Ruta: /finanzas/trazabilidad
 *
 * Criterio: 0 violaciones axe A/AA en 1.4.1 (Verificación pendiente, Verificado y Pendiente de
 * trazabilidad con ícono y etiqueta; eslabón fallido en texto, p. ej. "Nivel 1 — incompleto: lectura
 * no apta para NIC 41"); 1.4.3 (contraste ≥ 4.5:1 en tema claro y oscuro); 1.4.11 (ícono ≥ 3:1);
 * 4.1.3 (resultado de la re-verificación por aria-live sin mover el foco); sin enums crudos.
 *
 * Ambiente: el período real no tiene asientos. Las líneas en los tres estados, la falla FA-1 (lectura
 * IoT no apta) y FA-2 (precio estimado sin aprobación) y la re-verificación (POST /trazabilidad) se
 * simulan ("Datos simulados"). Admin tiene permiso de ejecutar la verificación.
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_255_VIEWPORTS=escritorio
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, desviacion, describirFoco, escanear, main } from '../../../_shared/sigabA11y';
import {
  ACTIVOS, LINEAS, PERIODOS, abrirSesionRol, abrirYAuditarDialogo, anunciosDurante, badges, cadena, cerrarConEscape, concederPermisos, irFinanzas,
  quitarSimulaciones, simularEscritura, simularGet, temaOscuro, textosCrudos,
} from '../../_shared/finanzas';

const TC_ID = 'TC-DIS-255';
const VIEWPORTS = (process.env.TC_DIS_255_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['estados-claro', 'estados-oscuro', 'eslabon-fallido'];

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

async function simular(page: Page) {
  await simularGet(page, /^\/finanzas\/periodos\/?$/, PERIODOS);
  await simularGet(page, /^\/finanzas\/lineas$/, LINEAS);
  await simularGet(page, /^\/finanzas\/activos$/, ACTIVOS);
  await simularGet(page, /^\/finanzas\/lineas\/\d+\/cadena$/, (u: URL) => cadena(Number(u.pathname.match(/lineas\/(\d+)/)![1])));
}

test.describe('TC-DIS-255 — Estados de verificación y eslabón fallido', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionRol(browser, testInfo, 'admin'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_255_VIEWPORTS.`);
  });
  test.afterEach(async () => { if (page) { await temaOscuro(page, false); await quitarSimulaciones(page); } });

  test('a. [1.4.1 / 1.4.3 / 1.4.11] Listado con los 3 estados en tema claro y oscuro (Datos simulados)', async ({}, testInfo) => {
    await simular(page);
    anotar(testInfo, 'Datos simulados', 'Líneas VERIFICADO (#601, #603), VERIFICACION_PENDIENTE (#602) y PENDIENTE_TRAZABILIDAD (#604 lectura IoT no apta, #605 precio estimado).');
    await irFinanzas(page, 'trazabilidad', /Trazabilidad contable/);
    await escanear(page, TC_ID, __dirname, 'estados-claro', testInfo, LH);
    const tabla = main(page).locator('table');
    const b = await badges(tabla);
    const estados = [...new Set(b.map((x) => x.texto))];
    anotar(testInfo, 'Estados en la tabla', estados.join(' ¦ '));
    for (const e of [/Verificad/i, /Por verificar|pendiente/i, /trazabilidad|incomplet/i]) expect.soft(estados.some((x) => e.test(x)), `1.4.1: no aparece el estado ${e} en texto`).toBe(true);
    desviacion(b.every((x) => x.icono), '1.4.1/1.4.11: los badges de estado de verificación no llevan ícono, solo texto y color');
    const opacidad = await tabla.evaluate((t) => [...t.querySelectorAll('*')].filter((e) => Number(getComputedStyle(e).opacity) < 1).length);
    expect.soft(opacidad, 'Design System: un estado se atenúa con opacity (baja el contraste real)').toBe(0);
    await temaOscuro(page, true);
    await escanear(page, TC_ID, __dirname, 'estados-oscuro', testInfo, LH);
    const crudos = await textosCrudos(main(page));
    desviacion(crudos.length === 0, `regla de textos visibles: valores crudos → ${crudos.join(' ¦ ')}`);
  });

  test('b. [1.4.1] Eslabón fallido en texto dentro de la cadena (FA-1 y FA-2, Datos simulados)', async ({}, testInfo) => {
    await simular(page);
    await irFinanzas(page, 'trazabilidad', /Trazabilidad contable/);
    const botones = main(page).getByRole('button', { name: /cadena/i });
    for (const [i, caso] of [[3, 'FA-1 lectura IoT no apta (#604)'], [4, 'FA-2 precio estimado sin aprobación (#605)']] as const) {
      await abrirYAuditarDialogo(page, botones.nth(i));
      await page.waitForTimeout(500);
      if (i === 3) await escanear(page, TC_ID, __dirname, 'eslabon-fallido', testInfo, LH);
      const texto = (await page.getByRole('dialog').innerText()).replace(/\s+/g, ' ');
      anotar(testInfo, caso, texto.slice(0, 400));
      desviacion(/nivel\s*\d/i.test(texto), `1.4.1 (${caso}): el eslabón fallido no indica el nivel de la cadena (p. ej. "Nivel 1 — incompleto")`);
      desviacion(/no apta|estimad|sin aprobaci/i.test(texto), `1.4.1 (${caso}): el motivo del fallo no se explica en texto`);
      await cerrarConEscape(page, botones.nth(i));
    }
  });

  test('c. [4.1.3] Re-verificación con teclado: resultado anunciado sin mover el foco (Datos simulados)', async ({}, testInfo) => {
    await concederPermisos(page, [['trazabilidad_contable', 5]]);
    await simular(page);
    await simularEscritura(page, /\/periodos\/\d+\/trazabilidad$/, 200, { verificadas: 4, pendientes: [{ id_linea: 605, tipo_hecho: 'VARIACION_VR_PM', faltantes: ['precio_documentado'] }] });
    anotar(testInfo, 'Datos simulados', 'POST /periodos/{id}/trazabilidad responde 4 verificadas y 1 pendiente.');
    await irFinanzas(page, 'trazabilidad', /Trazabilidad contable/);
    const boton = page.getByRole('button', { name: /Verificar/i }).first();
    await expect(boton, 'No hay botón de verificación de trazabilidad').toBeVisible();
    await boton.focus();
    await page.keyboard.press('Enter');
    const anuncios = await anunciosDurante(page, 3000);
    const foco = await describirFoco(page);
    anotar(testInfo, 'Anuncios', anuncios.join(' ¦ ') || '(ninguno)');
    anotar(testInfo, 'Foco tras verificar', foco);
    expect.soft(anuncios.some((a) => /verificad/i.test(a)), '4.1.3: el resultado de la re-verificación no se anuncia').toBe(true);
    expect.soft(/Verificar/i.test(foco), `4.1.3: el foco se movió al anunciar el resultado (${foco})`).toBe(true);
  });
});
