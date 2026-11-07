// | Fecha      | Nombre          | Que se hizo                                                        |
// |------------|-----------------|--------------------------------------------------------------------|
// | 2026-11-07 | SaraSofGonzalez | TC-DIS-247 RF-90: registros pendientes de clasificación            |
/**
 * TC-DIS-247 — Verificar accesibilidad WCAG 2.1 AA de los registros pendientes de clasificación
 * señalados en texto en la gestión de costos del período
 * RF-90 · CU-09 - Gestionar costos de mantenimiento, inversiones y costos de venta · Rol: Contador · Prioridad: Media
 * Ruta: /finanzas/costos
 *
 * Criterio: 0 violaciones axe A/AA en 1.4.1 (pendientes y naturalezas por texto e ícono, no solo
 * color); 1.3.1 (tabla con encabezados: activo, subtipo, naturaleza, origen, monto, estado); 4.1.3
 * (número de pendientes y de resultados al filtrar por aria-live); 3.3.2 (aviso de bloqueo del cierre
 * por pendientes visible y vinculado a la lista); sin enums crudos ni null.
 *
 * Ambiente: el período real de TEST no tiene costos. El paso a recorre el estado real; b y c usan
 * costos simulados de las tres naturalezas con dos PENDIENTE_CLASIFICACION (subtipo Otro e inversión
 * sin política) y la clasificación se responde en la prueba ("Datos simulados").
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_247_VIEWPORTS=escritorio
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, auditarTabla, desviacion, escanear, estaEnRegionViva, main, precondicion } from '../../../_shared/sigabA11y';
import {
  ACTIVOS, COSTOS, PERIODOS, abrirSesionRol, abrirYAuditarDialogo, badges, concederPermisos, irFinanzas, quitarSimulaciones, simularEscritura, simularGet, textosCrudos,
} from '../../_shared/finanzas';

const TC_ID = 'TC-DIS-247';
const VIEWPORTS = (process.env.TC_DIS_247_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['costos-real', 'costos-pendientes'];

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

async function simularCostos(page: Page) {
  await simularGet(page, /^\/finanzas\/periodos\/?$/, PERIODOS);
  await simularGet(page, /^\/finanzas\/costos$/, COSTOS);
  await simularGet(page, /^\/finanzas\/activos$/, ACTIVOS);
}

test.describe('TC-DIS-247 — Registros pendientes de clasificación en los costos', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionRol(browser, testInfo, 'admin'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_247_VIEWPORTS.`);
  });
  test.afterEach(async () => { if (page) await quitarSimulaciones(page); });

  test('a. Gestión de costos real; precondición: costos de las 3 naturalezas y 2 pendientes de clasificación', async ({}, testInfo) => {
    await irFinanzas(page, 'costos', /Costos del período/);
    await escanear(page, TC_ID, __dirname, 'costos-real', testInfo, LH);
    const filas = await main(page).locator('table tbody tr').count();
    anotar(testInfo, 'Estado real', `${filas} costo(s) en el período elegido`);
    precondicion(filas > 0, 'el período real no tiene costos registrados; se evalúa con datos simulados (b, c)');
  });

  test('b. [1.4.1 / 1.3.1 / 3.3.2] Listado con pendientes: etiqueta, ícono, resumen y aviso de bloqueo del cierre (Datos simulados)', async ({}, testInfo) => {
    await simularCostos(page);
    anotar(testInfo, 'Datos simulados', '9 costos de noviembre 2026: mantenimiento, inversión capitalizada, venta, reparto en 2 activos y 2 PENDIENTE_CLASIFICACION.');
    await irFinanzas(page, 'costos', /Costos del período/);
    await escanear(page, TC_ID, __dirname, 'costos-pendientes', testInfo, LH);
    const tabla = main(page).getByRole('region', { name: /Registros del período/i }).locator('table');
    const t = await auditarTabla(tabla);
    anotar(testInfo, 'Tabla', `Encabezados: ${t.encabezados.join(' | ')} · ${t.filas} filas`);
    for (const enc of [/activo/i, /subtipo|tipo de costo/i, /naturaleza/i, /origen/i, /monto/i, /estado/i]) {
      expect.soft(t.encabezados.some((e) => enc.test(e)), `1.3.1: falta el encabezado ${enc}`).toBe(true);
    }
    const pendientes = tabla.locator('tbody tr').filter({ hasText: /Pendiente de clasificaci|Por clasificar/i });
    expect.soft(await pendientes.count(), '1.4.1: las filas pendientes no dicen "Por clasificar" / "Pendiente de clasificación" en texto').toBe(2);
    const b = await badges(tabla);
    desviacion(b.every((x) => x.icono), `1.4.1: los badges de naturaleza y estado no llevan ícono (${[...new Set(b.filter((x) => !x.icono).map((x) => x.texto))].join(', ')})`);
    const resumen = main(page).getByText(/pendiente/i).filter({ hasText: /\d/ }).first();
    const resumenTexto = (await resumen.count()) ? await resumen.innerText() : '';
    anotar(testInfo, 'Resumen de pendientes', resumenTexto || '(no hay)');
    expect.soft(/2/.test(resumenTexto), 'No hay un resumen con el número de pendientes').toBe(true);
    const textoMain = (await main(page).innerText()).replace(/\s+/g, ' ');
    desviacion(/no (se )?puede cerrar|bloquea(n)? el cierre|impide(n)? (el )?cierre/i.test(textoMain), '3.3.2: no hay un aviso visible de que el período no puede cerrarse mientras existan pendientes');
    const crudos = await textosCrudos(main(page));
    desviacion(crudos.length === 0, `regla de textos visibles: valores crudos en pantalla → ${crudos.join(' ¦ ')}`);
  });

  test('c. [4.1.3 / 2.1.1] Filtrar "Pendiente de clasificación" con teclado y clasificar un pendiente (Datos simulados)', async ({}, testInfo) => {
    await concederPermisos(page, [['costos_activos', 3]]);
    await simularCostos(page);
    anotar(testInfo, 'Datos simulados', 'Permiso costos_activos·U para mostrar "Clasificar"; clasificación respondida 200.');
    const clasificaciones = await simularEscritura(page, /\/costos\/\d+\/clasificacion$/, 200, { ok: true });
    await irFinanzas(page, 'costos', /Costos del período/);
    const estado = page.locator('#costos-estado');
    await estado.focus();
    await estado.selectOption('PENDIENTE_CLASIFICACION');
    await page.waitForTimeout(400);
    const conteo = main(page).locator('.fin-listado__pie [role="status"]');
    const texto = await conteo.innerText().catch(() => '');
    anotar(testInfo, 'Conteo tras filtrar', texto || '(no hay)');
    expect.soft(/Mostrando 2 de 9/i.test(texto), `4.1.3: el conteo no dice "Mostrando 2 de 9" (${texto})`).toBe(true);
    expect.soft(await conteo.count() ? await estaEnRegionViva(conteo) : false, '4.1.3: el número de resultados no está en una región viva').toBe(true);

    const clasificar = main(page).getByRole('button', { name: /Clasificar/ }).first();
    const nombre = await clasificar.evaluate((b) => b.getAttribute('aria-label') ?? b.textContent ?? '');
    desviacion(/OTRO|Otro|BOV|75/.test(nombre), `4.1.2: el botón "${nombre.trim()}" no identifica qué costo clasifica (todas las filas dicen lo mismo)`);
    const d = await abrirYAuditarDialogo(page, clasificar);
    expect.soft(d.abierto, 'El diálogo de clasificación no abre con teclado').toBe(true);
    await escanear(page, TC_ID, __dirname, 'clasificar', testInfo, LH);
    const dialogo = page.getByRole('dialog');
    await dialogo.getByLabel(/Naturaleza/).selectOption({ index: 0 });
    await dialogo.getByRole('textbox').fill('Gasto de mantenimiento del corral, sin capitalizar.');
    await dialogo.getByRole('button', { name: /Clasificar como/ }).focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(800);
    anotar(testInfo, 'Datos simulados', `POST /costos/{id}/clasificacion respondido 200 (${clasificaciones.length} envío)`);
    expect.soft(clasificaciones.length, '2.1.1: la clasificación no se pudo completar con teclado').toBe(1);
  });
});
