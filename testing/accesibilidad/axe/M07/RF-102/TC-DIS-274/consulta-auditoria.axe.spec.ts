// | Fecha      | Nombre      | Que se hizo                                                                  |
// |------------|-------------|------------------------------------------------------------------------------|
// | 2026-11-17 | Laura032005 | TC-DIS-274 RF-102: consulta de auditoría con filtros, paginación y estado vacío |
/**
 * TC-DIS-274 — Verificar accesibilidad WCAG 2.1 AA de la consulta del historial de auditoría (filtros,
 * resultados paginados y estado vacío)
 * RF-102 · CU-07 Gestionar auditoría y trazabilidad del módulo de integración · Rol: Administrador · Prioridad: Alta
 * Ruta: /integracion/auditoria
 *
 * Criterio: 0 violaciones axe A/AA en 3.3.2 (etiquetas de los filtros); 1.3.1 (tabla con encabezados
 * asociados); 2.1.1 (filtros y paginación por teclado); 4.1.3 (cantidad de resultados y estado vacío
 * anunciados); 1.4.3; integridad (Íntegro / Alterado) con texto y no solo color. RF-102 pide filtrar por
 * tipo de evento, cliente, período, endpoint y estado HTTP.
 *
 * Datos reales: 120 eventos + 1 alterado (Datos_Semilla §5). Los pasos c y d simulan la consulta con
 * la misma forma para controlar la paginación y el estado vacío ("Datos simulados").
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_274_VIEWPORTS=escritorio
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, auditarTabla, camposSinNombre, desviacion, escanear, estaEnRegionViva, main, precondicion, textosColumna } from '../../../_shared/sigabA11y';
import {
  abrirSesionM07, accesoDenegado, anunciosDurante, badges, focoVisible, irIntegracion, quitarSimulaciones, simularAuditoria, textosCrudos,
} from '../../_shared/integracion';

const TC_ID = 'TC-DIS-274';
const VIEWPORTS = (process.env.TC_DIS_274_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['auditoria-real', 'auditoria-filtrada', 'auditoria-vacia'];

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe('TC-DIS-274 — Consulta del historial de auditoría de la integración', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionM07(browser, testInfo, 'admin'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_274_VIEWPORTS.`);
  });
  test.afterEach(async () => { if (page) await quitarSimulaciones(page); });

  const tabla = () => main(page).locator('table').first();

  test('a. [1.3.1 / 1.4.1 / 3.3.2] Auditoría real: tabla, integridad y filtros', async ({}, testInfo) => {
    await irIntegracion(page, 'auditoria', /Auditoría de la integración/);
    const denegado = await accesoDenegado(page).isVisible();
    precondicion(!denegado, 'el Administrador de TEST no tiene permiso sobre auditoria_integracion');
    await escanear(page, TC_ID, __dirname, 'auditoria-real', testInfo, LH);
    if (denegado) return;
    const t = await auditarTabla(tabla());
    const paginas = (await main(page).getByText(/Página \d+ de \d+/).first().innerText().catch(() => '')).trim();
    anotar(testInfo, 'Tabla real', `Encabezados: ${t.encabezados.join(' | ')} · filas: ${t.filas} · ${paginas || 'sin paginación'}`);
    precondicion(/de [2-9]|\d{3} registros/.test(paginas), 'hay menos de 51 eventos: no se puede probar la paginación con datos reales (Datos_Semilla §5.1)');
    expect.soft(t.filasDesalineadas, '1.3.1: filas desalineadas con los encabezados').toEqual([]);
    const integridad = await textosColumna(tabla(), 'Integridad');
    const b = await badges(tabla());
    anotar(testInfo, 'Integridad', [...new Set(integridad)].join(', '));
    expect.soft(integridad.every((x) => /Íntegro|Alterado/.test(x)), '1.4.1: la integridad no se muestra en texto').toBe(true);
    desviacion(b.every((x) => x.icono), '1.4.1: los badges de integridad y resultado no llevan ícono');
    precondicion(integridad.some((x) => /Alterado/.test(x)), 'no hay ningún registro alterado (Datos_Semilla §5.2)');
    expect.soft(await camposSinNombre(main(page)), '3.3.2: filtros sin etiqueta').toEqual([]);
    const filtros = await main(page).locator('label').allInnerTexts();
    anotar(testInfo, 'Filtros disponibles', filtros.join(' | '));
    desviacion(filtros.some((f) => /cliente|sistema/i.test(f)), 'RF-102: no hay filtro por cliente');
    desviacion(filtros.some((f) => /endpoint|ruta|recurso/i.test(f)), 'RF-102: no hay filtro por endpoint');
    const crudos = await textosCrudos(main(page));
    desviacion(crudos.length === 0, `regla de textos visibles: valores crudos → ${crudos.join(' ¦ ')}`);
  });

  test('b. [2.1.1 / 2.4.7 / 4.1.3] Filtros por teclado y anuncio de la cantidad de resultados (Datos simulados)', async ({}, testInfo) => {
    await simularAuditoria(page);
    anotar(testInfo, 'Datos simulados', '121 eventos (120 + 1 alterado) con la forma de RF-102.');
    await irIntegracion(page, 'auditoria', /Auditoría de la integración/);
    const tipo = main(page).getByLabel('Evento');
    await tipo.focus();
    expect.soft(await focoVisible(page), '2.4.7: el filtro "Evento" no muestra el foco').toBe(true);
    const anuncios = anunciosDurante(page, 3000);
    await tipo.selectOption({ label: await tipo.locator('option').nth(1).innerText() });
    const vistos = await anuncios;
    await escanear(page, TC_ID, __dirname, 'auditoria-filtrada', testInfo, LH);
    anotar(testInfo, 'Al filtrar por tipo de evento', vistos.join(' ¦ ') || '(sin anuncio)');
    desviacion(vistos.some((a) => /\d+\s+(registros|eventos|resultados)/i.test(a)), '4.1.3: al filtrar no se anuncia la cantidad de resultados');
    const respuesta = main(page).getByLabel('Respuesta');
    await respuesta.focus();
    await respuesta.selectOption('401');
    await page.waitForTimeout(600);
    expect.soft(await focoVisible(page), '2.4.7: el filtro "Respuesta" no muestra el foco').toBe(true);
  });

  test('c. [2.1.1 / 4.1.3] Paginación con teclado: página actual y total anunciados (Datos simulados)', async ({}, testInfo) => {
    await simularAuditoria(page);
    await irIntegracion(page, 'auditoria', /Auditoría de la integración/);
    const nav = main(page).getByRole('navigation', { name: 'Páginas de la auditoría' });
    await expect.soft(nav, 'No aparece la paginación con 121 eventos').toBeVisible();
    const siguiente = nav.getByRole('button', { name: 'Página siguiente' });
    await siguiente.focus();
    const anuncios = anunciosDurante(page, 3000);
    await page.keyboard.press('Enter');
    const vistos = await anuncios;
    const texto = (await nav.innerText()).replace(/\s+/g, ' ');
    anotar(testInfo, 'Tras "Página siguiente"', `${texto} · anuncios: ${vistos.join(' ¦ ') || '(ninguno)'}`);
    expect.soft(texto, 'La paginación no muestra la página 2').toMatch(/Página 2 de 3/);
    desviacion(await estaEnRegionViva(nav.getByText(/Página \d+ de/)), '4.1.3: el cambio de página ("Página 2 de 3 · 121 registros") no se anuncia');
    desviacion(await nav.locator('[aria-current]').count() > 0, '2.1.1: la página actual no se indica con aria-current');
  });

  test('d. [4.1.3] Filtro sin resultados: estado vacío anunciado (Datos simulados)', async ({}, testInfo) => {
    await simularAuditoria(page, []);
    await irIntegracion(page, 'auditoria', /Auditoría de la integración/);
    const vacio = main(page).getByText('No hay eventos con estos filtros.');
    await expect.soft(vacio, 'El estado vacío no aparece').toBeVisible();
    await escanear(page, TC_ID, __dirname, 'auditoria-vacia', testInfo, LH);
    expect.soft(await estaEnRegionViva(vacio), '4.1.3: el estado vacío no se anuncia').toBe(true);
    desviacion(/coincid|filtro/i.test(await vacio.innerText()), 'regla de filtros: el estado vacío no distingue "no hay registros" de "ningún registro coincide con los filtros"');
  });
});
