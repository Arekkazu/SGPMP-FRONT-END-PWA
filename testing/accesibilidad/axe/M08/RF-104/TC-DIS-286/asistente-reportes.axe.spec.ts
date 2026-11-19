// | Fecha      | Nombre      | Que se hizo                                                                     |
// |------------|-------------|---------------------------------------------------------------------------------|
// | 2026-11-19 | Laura032005 | TC-DIS-286 RF-104: asistente de reportes por rol, filtros, validaciones y teclado |
/**
 * TC-DIS-286 — Verificar accesibilidad WCAG 2.1 AA del asistente de generación de reportes (selección de tipo,
 * filtros por reporte y validaciones)
 * RF-104 · CU-02 Generar y exportar reportes del sistema · Rol: Contador, Veterinario y Productor · Prioridad: Alta
 * Ruta: /reportes
 *
 * Criterio: 0 violaciones axe A/AA en 3.3.2 (etiquetas de tipo y filtros); 3.3.1 (errores asociados al campo);
 * 2.1.1 (flujo por teclado); 4.1.3 (cambio de filtros anunciado); 4.1.2 (name/role/value de selects y fechas).
 * Solo se listan los reportes permitidos al rol (p. ej. vacunación y medicamentos: Veterinario y Productor).
 *
 * Desbloqueado el 2026-11-19: la pantalla /reportes llegó con el commit 606c7239 (RF-104).
 * La vista previa solo lee y se deja pasar al backend. El rechazo "El período no está en estado CERRADO" no se
 * puede provocar desde la pantalla (el filtro de período de los reportes contables solo ofrece cerrados), así que
 * se simula con la respuesta 422 del backend ("Datos simulados").
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_286_VIEWPORTS=escritorio
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { PREFIJO_API, anotar, camposSinNombre, desviacion, escanear, main, precondicion } from '../../../_shared/sigabA11y';
import {
  abrirSesionM08, anunciosDurante, elegirReporte, errorApi, focoVisible, irReportes, llenarFiltrosObligatorios, permitirReportes,
  quitarSimulaciones, textosCrudos, tiposReporte, type RolM08,
} from '../../_shared/m08';

const TC_ID = 'TC-DIS-286';
const VIEWPORTS = (process.env.TC_DIS_286_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['seleccion', 'filtros-errores', 'periodo-abierto'];
const VACUNACION = 'REPORTE_VACUNACION_MEDICAMENTOS';
const VALORACION = 'REPORTE_VALORACION_NIC41';

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

/** Estado accesible de un campo de filtro: etiqueta, obligatorio, inválido y el texto asociado por aria-describedby. */
function leerCampo(page: Page, id: string) {
  return page.locator(`#${id}`).evaluate((c) => {
    const ids = (c.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
    return {
      etiqueta: (c as HTMLInputElement).labels?.[0]?.textContent?.trim() ?? '',
      requerido: c.getAttribute('aria-required') === 'true' || (c as HTMLInputElement).required,
      invalido: c.getAttribute('aria-invalid') === 'true',
      descripcion: ids.map((x) => document.getElementById(x)?.textContent ?? '').join(' ').trim(),
    };
  });
}

test.describe('TC-DIS-286 — Asistente de generación de reportes', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionM08(browser, testInfo, 'contador'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_286_VIEWPORTS.`);
  });
  test.afterEach(async () => { if (page) await quitarSimulaciones(page); });

  test('a. [RF-104] Cada rol ve solo sus reportes (Contador, Veterinario y Productor reales)', async ({ browser }, testInfo) => {
    const porRol: Record<string, string[]> = {};
    for (const rol of ['contador', 'veterinario', 'productor'] as RolM08[]) {
      const s = rol === 'contador' ? { page, contexto: null } : await abrirSesionM08(browser, testInfo, rol);
      try {
        await irReportes(s.page);
        const tipos = await tiposReporte(s.page);
        porRol[rol] = tipos.map((x) => x.valor);
        anotar(testInfo, `Reportes de ${rol}`, tipos.map((x) => `${x.rotulo} [${x.grupo}]`).join(' | ') || '(ninguno)');
        if (rol === 'contador') await escanear(s.page, TC_ID, __dirname, 'seleccion', testInfo, LH);
      } finally {
        await s.contexto?.close();
      }
    }
    precondicion(porRol.contador.length > 0, 'el Contador de TEST no tiene permiso de ejecutar ningún reporte');
    expect.soft(porRol.veterinario, 'RF-104: el Veterinario no ve el reporte de vacunación y medicamentos').toContain(VACUNACION);
    expect.soft(porRol.productor, 'RF-104: el Productor no ve el reporte de vacunación y medicamentos').toContain(VACUNACION);
    expect.soft(porRol.contador, 'RF-104: el Contador ve el reporte de vacunación y medicamentos').not.toContain(VACUNACION);
    expect.soft(porRol.contador, 'RF-104: el Contador no ve el reporte de valoración').toContain(VALORACION);
  });

  test('b. [3.3.2 / 3.3.1 / 2.1.1 / 4.1.3] Filtros por teclado, obligatorios vacíos y cambio de tipo anunciado (Contador real)', async ({}, testInfo) => {
    await permitirReportes(page);
    await irReportes(page);
    const tipos = await tiposReporte(page);
    precondicion(tipos.length > 1, 'el Contador necesita al menos dos reportes para probar el cambio de tipo');
    const tipo = tipos.find((x) => x.valor === VALORACION)?.valor ?? tipos[0].valor;
    const tipoSel = page.locator('#tipo-reporte');
    const tipoInfo = await leerCampo(page, 'tipo-reporte');
    anotar(testInfo, 'Selector "Reporte"', JSON.stringify(tipoInfo));
    expect.soft(tipoInfo.etiqueta, '3.3.2: el selector de reporte no tiene etiqueta').toMatch(/Reporte/);
    expect.soft(tipoInfo.requerido, '3.3.2: el selector de reporte no se marca como obligatorio').toBe(true);
    await tipoSel.focus();
    expect.soft(await focoVisible(page), '2.4.7: el selector de reporte no muestra el foco').toBe(true);

    const anunciosTipo = anunciosDurante(page, 2500);
    await elegirReporte(page, tipo);
    const vistosTipo = await anunciosTipo;
    const filtros = await main(page).locator('[id^="filtro-"]').evaluateAll((es) => es.map((e) => e.id));
    anotar(testInfo, `Filtros de ${tipo}`, filtros.join(', '));
    expect.soft(await camposSinNombre(main(page)), '3.3.2: filtros sin etiqueta').toEqual([]);
    desviacion(vistosTipo.some((a) => /filtro|campo|complet/i.test(a)), '4.1.3: al elegir el tipo de reporte no se anuncia que cambiaron los filtros');

    // Vista previa con los obligatorios vacíos: cada error queda bajo su campo.
    const obligatorios = await main(page).locator('[id^="filtro-"]').evaluateAll((es) => es
      .filter((e) => e.getAttribute('aria-required') === 'true' || (e as HTMLInputElement).required).map((e) => e.id));
    anotar(testInfo, 'Filtros obligatorios', obligatorios.join(', ') || '(ninguno)');
    const previa = main(page).getByRole('button', { name: 'Ver vista previa' });
    await previa.focus();
    const anunciosError = anunciosDurante(page, 2500);
    await page.keyboard.press('Enter');
    const vistosError = await anunciosError;
    await escanear(page, TC_ID, __dirname, 'filtros-errores', testInfo, LH);
    for (const id of obligatorios) {
      const c = await leerCampo(page, id);
      anotar(testInfo, `Campo ${id} vacío`, JSON.stringify(c));
      expect.soft(c.invalido, `3.3.1: "${c.etiqueta}" vacío no queda marcado como inválido`).toBe(true);
      expect.soft(c.descripcion, `3.3.1: el error de "${c.etiqueta}" no queda asociado al campo`).toMatch(/Completa/);
    }
    if (obligatorios.length) expect.soft(vistosError.some((a) => /Completa/.test(a)), '4.1.3: los errores de los filtros no se anuncian').toBe(true);
    expect.soft(await textosCrudos(main(page)), 'regla de textos visibles: valores crudos en la pantalla').toEqual([]);
  });

  test('c. [3.3.1 / 4.1.3] Período abierto: el rechazo "no está en estado CERRADO" se anuncia en lenguaje claro (Datos simulados)', async ({}, testInfo) => {
    await page.route((u) => u.pathname.startsWith(PREFIJO_API) && /\/reportes\/vista-previa$/.test(u.pathname), (route) =>
      route.fulfill({ status: 422, contentType: 'application/json', json: errorApi('PERIODO_NO_CERRADO', 'El período Noviembre 2026 no está en estado CERRADO.', 'filtros.id_periodo') }));
    anotar(testInfo, 'Datos simulados', 'La vista previa responde 422 como lo haría con un período abierto (el selector solo ofrece cerrados).');
    await irReportes(page);
    const tipos = await tiposReporte(page);
    precondicion(tipos.some((x) => x.valor === VALORACION), 'el Contador de TEST no tiene el reporte de valoración');
    if (!tipos.some((x) => x.valor === VALORACION)) return;
    await elegirReporte(page, VALORACION);
    await llenarFiltrosObligatorios(page);
    const previa = main(page).getByRole('button', { name: 'Ver vista previa' });
    await previa.focus();
    const anuncios = anunciosDurante(page, 3000);
    await page.keyboard.press('Enter');
    const vistos = await anuncios;
    await escanear(page, TC_ID, __dirname, 'periodo-abierto', testInfo, LH);
    const alerta = (await main(page).locator('[role="alert"]').allInnerTexts()).join(' ¦ ').replace(/\s+/g, ' ');
    anotar(testInfo, 'Rechazo por período abierto', `aviso: ${alerta || '(ninguno)'} · anuncios: ${vistos.join(' ¦ ') || '(ninguno)'}`);
    expect.soft(alerta, '4.1.3: el rechazo no se anuncia').toMatch(/no est[aá] en estado CERRADO|cerrado/i);
    expect.soft(alerta, 'regla de textos visibles: el aviso muestra el código interno o el HTTP').not.toMatch(/PERIODO_NO_CERRADO|\b422\b/);
    const periodo = main(page).locator('#filtro-id_periodo');
    if (await periodo.count()) {
      const c = await leerCampo(page, 'filtro-id_periodo');
      anotar(testInfo, 'Campo período tras el rechazo', JSON.stringify(c));
      desviacion(c.invalido && /CERRADO|cerrad/i.test(c.descripcion), '3.3.1: el rechazo no queda asociado al campo del período');
    }
    desviacion(!/CERRADO/.test(alerta), 'regla de textos visibles: el mensaje del backend muestra el estado en mayúsculas («CERRADO»)');
  });
});
