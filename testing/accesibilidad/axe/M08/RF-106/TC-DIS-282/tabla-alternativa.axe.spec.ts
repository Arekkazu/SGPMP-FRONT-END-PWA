// | Fecha      | Nombre      | Que se hizo                                                                     |
// |------------|-------------|---------------------------------------------------------------------------------|
// | 2026-11-17 | Laura032005 | TC-DIS-282 RF-106: tabla alternativa a la gráfica de evolución del riesgo        |
/**
 * TC-DIS-282 — Verificar accesibilidad WCAG 2.1 AA de la tabla alternativa a la gráfica de evolución
 * del riesgo en el Historial Clínico Predictivo [CRÍTICO]
 * RF-106 · CU-04 Visualizar historial clínico predictivo de activo biológico · Rol: Veterinario · Prioridad: Alta
 * Ruta: /prediccion/historial → "Tendencia de riesgo" (decisión 2026-11-17: la vista de RF-106 es el
 * historial de Predicción)
 *
 * Criterio: 0 violaciones axe A/AA en 1.1.1 (la gráfica tiene nombre y una tabla alternativa con la
 * misma información); 1.3.1 (encabezados: fecha y hora, nivel de riesgo, evento sanitario,
 * retroalimentación, conflicto; la relación inferencia ↔ evento sanitario en texto, p. ej. "Evento
 * sanitario 10 h después"); 1.3.2 (orden cronológico); 4.1.3 (al filtrar se anuncia cuántos registros
 * quedan). Mismo criterio que TC-DIS-187 (M04), con lo que RF-106 agrega.
 *
 * Datos reales: BOV-M08-001 «Lucero» (Datos_Semilla §7.1). El paso b simula la misma línea de tiempo con
 * eventos sanitarios y retroalimentaciones para ver qué hace la tabla con ellos ("Datos simulados").
 *
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_282_VIEWPORTS=escritorio
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';
import { anotar, auditarTabla, desviacion, escanear, precondicion } from '../../../_shared/sigabA11y';
import {
  EVENTOS_LUCERO, LUCERO, NIVELES, RANGO_LUCERO, abrirSesionM08, abrirTendencia, anunciosDurante, consultarHistorial, irHistorial,
  quitarSimulaciones, simularHistorial,
} from '../../_shared/m08';

const TC_ID = 'TC-DIS-282';
const VIEWPORTS = (process.env.TC_DIS_282_VIEWPORTS ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
const LH = ['tendencia-real', 'tendencia-simulada', 'tendencia-filtrada'];

const COLUMNAS_RF106: [string, RegExp][] = [
  ['fecha y hora', /fecha/i], ['nivel de riesgo', /nivel|riesgo/i], ['evento sanitario', /evento sanitario|evento/i],
  ['retroalimentación', /retroalimentaci|valoraci/i], ['conflicto', /conflicto/i],
];

test.use({ actionTimeout: 15_000, launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

test.describe('TC-DIS-282 — Tabla alternativa a la gráfica de evolución del riesgo', () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  let contexto: BrowserContext | undefined;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    if (!VIEWPORTS.includes(testInfo.project.name)) return;
    ({ contexto, page } = await abrirSesionM08(browser, testInfo, 'veterinario'));
  });
  test.afterAll(async () => { await contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!VIEWPORTS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_282_VIEWPORTS.`);
  });
  test.afterEach(async () => { if (page) await quitarSimulaciones(page); });

  /** Gráfica (nombre, descripción, puntos) y tabla alternativa del panel de tendencia. */
  async function leerPanel() {
    const panel = await abrirTendencia(page);
    await panel.locator('svg').first().waitFor({ timeout: 30_000 }).catch(() => {});
    const grafica = await panel.evaluate((p) => {
      const svg = p.querySelector('svg.recharts-surface') ?? p.querySelector('svg');
      const fig = svg?.closest('[role="img"], figure') ?? svg;
      const ref = (ids: string | null) => (ids ?? '').split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? '').join(' ').trim();
      return {
        nombre: fig?.getAttribute('aria-label') ?? ref(fig?.getAttribute('aria-labelledby') ?? null) ?? '',
        descripcion: ref(fig?.getAttribute('aria-describedby') ?? null),
        puntos: p.querySelectorAll('.recharts-line-dot, .recharts-dot').length,
      };
    });
    const tabla = panel.locator('table').first();
    const hayTabla = (await tabla.count()) > 0;
    const t = hayTabla ? await auditarTabla(tabla) : null;
    const fechas = hayTabla ? await tabla.locator('tbody tr td:first-child').allInnerTexts() : [];
    return { panel, grafica, tabla, hayTabla, t, fechas };
  }

  test('a. [1.1.1 / 1.3.1 / 1.3.2] Lucero real: gráfica con nombre y tabla alternativa con las columnas de RF-106', async ({}, testInfo) => {
    await irHistorial(page);
    const ok = await consultarHistorial(page, LUCERO, RANGO_LUCERO.desde, RANGO_LUCERO.hasta);
    precondicion(ok, `${LUCERO} no aparece en el selector de activos del Veterinario (Datos_Semilla §7.1)`);
    if (!ok) return;
    const p = await leerPanel();
    await escanear(page, TC_ID, __dirname, 'tendencia-real', testInfo, LH);
    anotar(testInfo, 'Gráfica', JSON.stringify(p.grafica));
    anotar(testInfo, 'Tabla alternativa', p.t ? `Encabezados: ${p.t.encabezados.join(' | ')} · filas: ${p.t.filas}` : '(no hay tabla)');
    precondicion((p.t?.filas ?? 0) >= 9, `${LUCERO} tiene menos de las 9 inferencias de Datos_Semilla §7.1 en el rango`);
    expect.soft(!!p.grafica.nombre || !!p.grafica.descripcion, '1.1.1: la gráfica no tiene nombre ni descripción').toBe(true);
    expect.soft(p.hayTabla, '1.1.1: la gráfica no tiene tabla alternativa').toBe(true);
    if (!p.t) return;
    expect.soft(p.t.filasDesalineadas, '1.3.1: filas desalineadas con los encabezados').toEqual([]);
    for (const [nombre, re] of COLUMNAS_RF106) {
      desviacion(p.t.encabezados.some((h) => re.test(h)), `1.3.1: la tabla alternativa no tiene la columna "${nombre}" que pide RF-106`);
    }
    const niveles = await p.tabla.locator('tbody tr td:nth-child(2)').allInnerTexts();
    expect.soft(niveles.every((n) => NIVELES.includes(n.trim())), `1.4.1: la columna de nivel no usa los rótulos ${NIVELES.join(', ')}`).toBe(true);
    // 1.3.2: la tabla se lee en orden cronológico (la primera fila es la más antigua).
    anotar(testInfo, 'Orden de las fechas', p.fechas.join(' → '));
    expect.soft(p.fechas[0] ?? '', '1.3.2: la tabla no empieza por la inferencia más antigua (5 de junio de 2026)').toMatch(/jun|[/-]0?6[/-]/i);
  });

  test('b. [1.3.1] Eventos sanitarios y retroalimentaciones de Lucero en la tabla (Datos simulados)', async ({}, testInfo) => {
    await simularHistorial(page);
    anotar(testInfo, 'Datos simulados', `Línea de tiempo de ${LUCERO} (§7.1): ${EVENTOS_LUCERO.length} eventos, 2 sanitarios, retroalimentaciones en los 4 valores y una en conflicto.`);
    await irHistorial(page);
    await consultarHistorial(page, LUCERO, RANGO_LUCERO.desde, RANGO_LUCERO.hasta);
    const p = await leerPanel();
    await escanear(page, TC_ID, __dirname, 'tendencia-simulada', testInfo, LH);
    const texto = (await p.panel.innerText()).replace(/\s+/g, ' ');
    anotar(testInfo, 'Tabla con datos simulados', p.t ? `Encabezados: ${p.t.encabezados.join(' | ')} · filas: ${p.t.filas}` : '(no hay tabla)');
    desviacion(/Mastitis clínica.*(evento|sanitari)|evento sanitario/i.test(texto), '1.3.1: la tabla no muestra los eventos sanitarios (Mastitis clínica, Fiebre 40,1 °C)');
    desviacion(/\b10\s*h\b|10 horas|despu[eé]s/i.test(texto), '1.3.1: la relación inferencia ↔ evento sanitario (10 h después) no aparece como texto');
    desviacion(/correct|parcial|incorrect|sin evento/i.test(texto), '1.3.1: la tabla no muestra la retroalimentación de cada inferencia');
    desviacion(/conflicto/i.test(texto), '1.3.1: la inferencia en conflicto no se indica en la tabla');
  });

  test('c. [4.1.3] Filtro por nivel "Crítico": la tabla se actualiza y se anuncia cuántos registros quedan (Datos simulados)', async ({}, testInfo) => {
    await simularHistorial(page);
    await irHistorial(page);
    await page.locator('#hist-nivel').selectOption({ label: 'Crítico' });
    const anuncios = anunciosDurante(page, 8000);
    await consultarHistorial(page, LUCERO, RANGO_LUCERO.desde, RANGO_LUCERO.hasta);
    const p = await leerPanel();
    const vistos = await anuncios;
    await escanear(page, TC_ID, __dirname, 'tendencia-filtrada', testInfo, LH);
    anotar(testInfo, 'Con nivel "Crítico"', `filas: ${p.t?.filas ?? 0} · descripción de la gráfica: ${p.grafica.descripcion || '(ninguna)'} · anuncios: ${vistos.join(' ¦ ') || '(ninguno)'}`);
    expect.soft(p.t?.filas, 'La tabla no quedó con las 2 inferencias críticas de Lucero').toBe(2);
    desviacion(vistos.some((a) => /\b2\b.*(registro|inferencia|evento|resultado)/i.test(a)), '4.1.3: al filtrar no se anuncia cuántos registros quedan');
  });
});
