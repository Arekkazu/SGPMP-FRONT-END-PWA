// | Fecha      | Nombre          | Que se hizo                                                        |
// |------------|-----------------|--------------------------------------------------------------------|
// | 2026-11-07 | SaraSofGonzalez | TC-DIS-265 RF-94: bitácora de auditoría financiera                 |
// | 2026-11-11 | SaraSofGonzalez | TC-DIS-265 RF-94: reejecución con la bitácora real del período #241 |
/**
 * TC-DIS-265 — Verificar accesibilidad WCAG 2.1 AA de la vista legible de la bitácora de Auditoría
 * del Módulo Financiero (tabla, filtros y paginación)
 * RF-94 · CU-013 - Auditoría y Trazabilidad del Módulo Financiero · Rol: Administrador (y Auditor) · Prioridad: Media
 * Ruta: /finanzas/auditoria
 *
 * Criterio: 0 violaciones axe A/AA en 1.3.1 (tabla con encabezados: descripción del evento, fecha y
 * hora local, actor, activo, período, severidad, origen); 1.4.1 (severidad y origen con texto +
 * ícono); 3.3.1 y 4.1.3 (mensaje de "al menos un filtro obligatorio" y número de resultados
 * anunciados); 2.1.1 y 2.4.7 (filtros y paginación por teclado; página actual con aria-current);
 * tipos de evento en lenguaje natural, nunca el código del catálogo.
 *
 * Ambiente: cuenta Admin real. Los períodos reales no tienen eventos (paso a). Los 4 niveles de
 * severidad, orígenes repositorio/contingencia y más de 100 registros se simulan (paso b, "Datos
 * simulados"). No hay cuenta de Auditor externo para la segunda ejecución.
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_265_VIEWPORTS=escritorio
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, auditarTabla, desviacion, escanear, estaEnRegionViva, main, precondicion } from '../../../_shared/sigabA11y';
import { PERIODOS, abrirSesionRol, elegirPeriodo, badges, focoVisible, irFinanzas, quitarSimulaciones, simularGet, textosCrudos } from '../../_shared/finanzas';

const TC_ID = 'TC-DIS-265';
const VIEWPORTS = (process.env.TC_DIS_265_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['bitacora-real', 'bitacora-eventos'];

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

const SEV = ['INFO', 'WARNING', 'ERROR', 'CRITICAL'];
const TIPOS = ['COSTO_REGISTRADO', 'PRECIO_REGISTRADO', 'CIERRE_PERIODO_FALLIDO', 'ERROR_CONCILIACION'];
function pagina(u: URL) {
  const n = Number(u.searchParams.get('pagina') ?? 1);
  const tam = Number(u.searchParams.get('tamano') ?? 25);
  const total = 130;
  const eventos = Array.from({ length: Math.min(tam, total - (n - 1) * tam) }, (_, i) => {
    const k = (n - 1) * tam + i;
    return {
      id_evento: `ev-${k}`, descripcion_evento: `Evento ${k}`, tipo_evento: TIPOS[k % 4], fecha_hora: `2026-11-${String(1 + (k % 28)).padStart(2, '0')}T10:${String(k % 60).padStart(2, '0')}:00`,
      actor: k % 3 ? 'Sara González' : 'Sistema automático', activo: k % 2 ? 'BOV-101' : null, id_periodo_contable: 9103,
      resumen_payload: { origen: k % 5 ? 'REPOSITORIO' : 'FALLBACK' }, monto_afectado: k % 2 ? '180000.00' : null, severidad: SEV[k % 4], integridad_verificable: k % 7 !== 0,
    };
  });
  return { total_registros: total, pagina_actual: n, registros_por_pagina: tam, eventos, resumen_severidad: { INFO: 33, WARNING: 33, ERROR: 32, CRITICAL: 32 } };
}

test.describe('TC-DIS-265 — Bitácora de auditoría financiera', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionRol(browser, testInfo, 'admin'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_265_VIEWPORTS.`);
  });
  test.afterEach(async () => { if (page) await quitarSimulaciones(page); });

  test('a. [3.3.1] Bitácora real; filtro obligatorio y precondición de eventos', async ({}, testInfo) => {
    await irFinanzas(page, 'auditoria', /Bitácora de auditoría/);
    // Reejecución 2026-11-11: período real de Finca El Rosal (NIT 901458732).
    await elegirPeriodo(page, 241);
    await escanear(page, TC_ID, __dirname, 'bitacora-real', testInfo, LH);
    const texto = (await main(page).innerText()).replace(/\s+/g, ' ');
    const total = /EVENTOS DEL PER[IÍ]ODO\s*(\d+)/i.exec(texto)?.[1] ?? '?';
    anotar(testInfo, 'Estado real', `Eventos del período elegido: ${total}`);
    precondicion(total !== '0', 'el período real no tiene eventos de auditoría; la tabla y la paginación se evalúan con datos simulados (b)');
    desviacion(/al menos un filtro/i.test(texto) || (await main(page).locator('#aud-tipo[aria-required="true"], [aria-required="true"]').count()) > 0,
      '3.3.1: la consulta no exige ni anuncia "al menos un filtro obligatorio" (tipo de evento, período o activo): el período se aplica siempre de forma implícita');
  });

  test('b. [1.3.1 / 1.4.1 / 4.1.3 / 2.1.1 / 2.4.7] 130 eventos en 4 severidades y 2 orígenes; filtros y paginación (Datos simulados)', async ({}, testInfo) => {
    await simularGet(page, /^\/finanzas\/periodos\/?$/, PERIODOS);
    await simularGet(page, /^\/finanzas\/auditoria$/, pagina);
    anotar(testInfo, 'Datos simulados', '130 eventos de noviembre 2026: INFO/WARNING/ERROR/CRITICAL, origen repositorio y contingencia, 6 páginas de 25.');
    await irFinanzas(page, 'auditoria', /Bitácora de auditoría/);
    const tabla = main(page).getByRole('region', { name: /Explorar/i }).locator('table');
    await tabla.waitFor({ timeout: 15_000 });
    await escanear(page, TC_ID, __dirname, 'bitacora-eventos', testInfo, LH);
    const t = await auditarTabla(tabla);
    anotar(testInfo, 'Encabezados', t.encabezados.join(' | '));
    for (const [re, nombre] of [[/evento/i, 'evento'], [/fecha/i, 'fecha y hora'], [/actor|usuario|realizado por/i, 'actor'], [/activo/i, 'activo'], [/per[ií]odo/i, 'período'], [/severidad/i, 'severidad'], [/origen/i, 'origen']] as const) {
      desviacion(t.encabezados.some((e) => re.test(e)), `1.3.1: la tabla no tiene la columna "${nombre}"`);
    }
    const b = await badges(tabla);
    desviacion(b.every((x) => x.icono), '1.4.1: la severidad se muestra en un badge sin ícono, solo texto y color');
    const filas = await tabla.locator('tbody tr').allInnerTexts();
    desviacion(filas.some((f) => /contingencia|repositorio central/i.test(f)), '1.4.1: el origen ("Repositorio central" / "Sincronizado desde contingencia") no se muestra');
    const crudos = await textosCrudos(tabla);
    desviacion(crudos.length === 0, `tipos de evento o valores en código interno → ${crudos.join(' ¦ ')}`);

    const filtros = await main(page).locator('.fin-filtros select, .fin-filtros input').evaluateAll((cs) => cs.map((c) => (c as HTMLInputElement).labels?.[0]?.textContent?.trim() ?? c.id));
    anotar(testInfo, 'Filtros', filtros.join(' ¦ '));
    for (const [re, nombre] of [[/fecha|desde|hasta/i, 'fechas'], [/usuario|actor/i, 'usuario'], [/origen/i, 'origen'], [/activo/i, 'activo']] as const) {
      desviacion(filtros.some((f) => re.test(f)), `2.1.1: no hay filtro por ${nombre}`);
    }
    const conteo = main(page).locator('.fin-listado__pie [role="status"]');
    expect.soft(await conteo.count() ? await estaEnRegionViva(conteo) : false, '4.1.3: el número de resultados no se anuncia').toBe(true);
    anotar(testInfo, 'Conteo', await conteo.innerText().catch(() => '(no hay)'));

    const siguiente = main(page).getByRole('button', { name: /Siguiente/i });
    await page.keyboard.press('Shift');
    await siguiente.focus();
    expect.soft(await focoVisible(page), '2.4.7: el botón de página siguiente no muestra foco visible').toBe(true);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(600);
    const actual = await main(page).locator('[aria-current="page"]').count();
    anotar(testInfo, 'Paginación', `${await main(page).getByText(/Página \d+ de \d+/).innerText().catch(() => '—')} · aria-current: ${actual}`);
    desviacion(actual > 0, '2.1.1: la página actual no se indica con aria-current="page" (solo el texto "Página N de M")');
  });
});
