/**
 * TC-DIS-187 — Verificar accesibilidad WCAG 2.1 AA de la alternativa en tabla para la gráfica
 * de evolución del riesgo en el Historial Diagnóstico [CRÍTICO]
 * RF-67 · CU-04 - Consultar Historial Diagnóstico del Activo · Rol: Veterinario · Prioridad: Alta
 * Ruta: /prediccion/historial — HistorialView + LineChartPrediccion (pestaña "Tendencia de riesgo")
 *
 * Primera ejecución sobre el ambiente TEST nuevo (app en /sigab-test, API en /api-sgpmp-test).
 *
 * Precondiciones (hoja "CASOS DE PRUEBA UI/UX"):
 *   - Rol: Veterinario o Productor con un activo con historial de inferencias. Se usa la cuenta
 *     Veterinario de Finca Prueba Alfa (datos semilla del 2026-10-22).
 *   - Datos REALES: activo INDIVIDUAL #876 (49 inferencias, niveles 0–3) y área POBLACIONAL #878
 *     (5 inferencias). Ambos se consultan desde 2020-01-01 para incluir las fechas variadas.
 *
 * Criterio (1.1.1 Contenido no textual): si el Historial expone una gráfica de evolución del
 * nivel de riesgo, existe una alternativa en tabla de datos con encabezados asociados según el
 * paradigma (INDIVIDUAL: fecha, nivel_riesgo, enfermedad_estimada, confianza; POBLACIONAL: fecha,
 * nivel_riesgo, score_anomalia), sin columnas vacías por datos que no aplican, accesible con
 * teclado y lector de pantalla, con la misma información que la gráfica (incluida la tendencia).
 * Herramientas: @axe-core/playwright + Lighthouse en modo snapshot sobre la misma sesión
 * (resultados/). Una auditoría fallida de Lighthouse es un defecto aunque tenga peso 0.
 *
 * Selector de activo: en TEST la lista `/activos-biologicos/?por_pagina=200` responde 307 hacia
 * una URL sin el prefijo /api-sgpmp-test (404), y la vista cae al campo numérico "ID de activo".
 * La prueba escribe el ID en el campo, o lo elige en la lista si esa vez cargó.
 * PROTECCIÓN DE DATOS: vista de solo lectura; toda escritura al backend se aborta.
 *
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_187_VIEWPORTS=escritorio
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page, type Route, type TestInfo } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { auditarLighthouse, PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';

const TC_ID = 'TC-DIS-187';
const EMAIL = process.env.TEST_VETERINARIO_EMAIL ?? '';
const PASSWORD = process.env.TEST_VETERINARIO_PASSWORD ?? '';
// Ambiente TEST desde 2026-10-20 (subrutas de Dokploy)
const APP = (process.env.APP_URL ?? 'https://api.inmero.co/sigab-test').replace(/\/$/, '');
const API = /\/api-sgpmp-test\//;

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_187_VIEWPORTS ?? 'movil,tablet,escritorio')
  .split(',')
  .map((v) => v.trim());

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

const ACTIVO_INDIVIDUAL = 876;
const AREA_POBLACIONAL = 878;
const DESDE = '2020-01-01';

const ENCABEZADOS: Record<'INDIVIDUAL' | 'POBLACIONAL', [string, RegExp][]> = {
  INDIVIDUAL: [['fecha', /fecha/i], ['nivel_riesgo', /nivel|riesgo/i], ['enfermedad_estimada', /enfermedad|patolog/i], ['confianza', /confianza/i]],
  POBLACIONAL: [['fecha', /fecha/i], ['nivel_riesgo', /nivel|riesgo/i], ['score_anomalia', /anomal|score/i]],
};

test.use({ launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

// ── Sesión y protección de escrituras ────────────────────────────────────────

// Un solo intento de login: si falla, la prueba se detiene (la cuenta se bloquea a los 5 intentos).
async function iniciarSesion(page: Page) {
  await page.goto(`${APP}/login`);
  await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill(EMAIL);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 });
}

/** Solo lecturas; guarda los eventos reales que devuelve el historial. */
async function interceptar(page: Page) {
  const estado = { eventos: [] as { fecha_evento: string; tipo_evento: string; payload: Record<string, unknown> | null }[] };
  await page.route((url) => API.test(url.href), async (route: Route) => {
    const req = route.request();
    const metodo = req.method();
    const p = new URL(req.url()).pathname;
    if (metodo === 'OPTIONS' || /\/sesiones\/?(refresh)?$/.test(p)) return route.fallback();
    if (metodo !== 'GET') return route.abort();
    if (/\/prediccion\/historial\/\d+$/.test(p)) {
      const res = await route.fetch();
      const json = await res.json();
      estado.eventos = json.eventos ?? json.items ?? [];
      return route.fulfill({ response: res, json });
    }
    return route.fallback();
  });
  return estado;
}

/** Consulta el historial de `id` desde DESDE y abre la pestaña "Tendencia de riesgo". */
async function consultarTendencia(page: Page, id: number): Promise<Locator> {
  await page.goto(`${APP}/prediccion/historial`);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/historial/i, { timeout: 60_000 });
  const campo = page.locator('#hist-activo');
  await campo.waitFor({ timeout: 60_000 });
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  if ((await campo.evaluate((e) => e.tagName)) === 'SELECT') await campo.selectOption(String(id));
  else await campo.fill(String(id));
  await page.locator('#hist-desde').fill(DESDE);
  await page.getByRole('button', { name: /consultar/i }).click();
  await expect(page.getByText(/consultando historial/i)).toBeHidden({ timeout: 60_000 });
  await page.getByRole('tab', { name: /tendencia de riesgo/i }).click();
  const panel = page.locator('main').locator('div').filter({ has: page.getByRole('heading', { name: /evoluci[oó]n del nivel de riesgo/i }) }).last();
  await expect(panel).toBeVisible({ timeout: 15_000 });
  await expect(panel.locator('svg.recharts-surface')).toBeVisible({ timeout: 30_000 });
  return panel;
}

/** Gráfica y posibles alternativas dentro del panel de tendencia. */
async function leerPanel(panel: Locator) {
  return panel.evaluate((p) => {
    const svg = p.querySelector('svg.recharts-surface');
    const tabla = p.querySelector('table') ?? p.parentElement?.querySelector('table') ?? null;
    return {
      puntos: p.querySelectorAll('.recharts-line-dot, .recharts-dot').length,
      svgRol: svg?.getAttribute('role') ?? null,
      svgNombre: svg?.getAttribute('aria-label') ?? svg?.querySelector('title')?.textContent ?? svg?.querySelector('desc')?.textContent ?? null,
      descritoPor: svg?.getAttribute('aria-describedby') ?? null,
      tabla: !!tabla,
      encabezados: tabla ? [...tabla.querySelectorAll('th')].map((th) => (th.textContent ?? '').trim()) : [],
      filas: tabla ? tabla.querySelectorAll('tbody tr').length : 0,
    };
  });
}

// ── Escaneo ──────────────────────────────────────────────────────────────────

function resumenViolaciones(violaciones: { id: string; impact?: string | null; nodes: { target: unknown }[] }[]) {
  return violaciones.map((v) => `  - ${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => JSON.stringify(n.target)).join(', ')}`).join('\n');
}

async function escanear(page: Page, estado: string, testInfo: TestInfo) {
  const paso = `${estado}-${testInfo.project.name}`;
  await page.evaluate(() => document.fonts.ready);
  const axe = await new AxeBuilder({ page }).withTags(ETIQUETAS_WCAG).analyze();
  guardarResultadoAxe(TC_ID, __dirname, paso, axe);
  const lh = await auditarLighthouse(page, TC_ID, __dirname, paso);
  testInfo.annotations.push({
    type: `Lighthouse ${paso}`,
    description:
      `Puntaje accesibilidad: ${lh.puntaje === null ? 'N/A' : Math.round(lh.puntaje * 100)}` +
      (lh.auditoriasFallidas.length ? ` · Fallidas: ${lh.auditoriasFallidas.map((a) => a.id).join(', ')}` : ' · 0 auditorías fallidas'),
  });
  await testInfo.attach(`lighthouse-${paso}.html`, { path: lh.archivoHtml, contentType: 'text/html' });
  expect.soft(axe.violations, `Violaciones axe A/AA en "${paso}":\n${resumenViolaciones(axe.violations)}`).toEqual([]);
  expect.soft(lh.auditoriasFallidas.map((a) => a.id), `DEFECTO: auditorías de accesibilidad fallidas en Lighthouse ("${paso}")`).toEqual([]);
}

// ── Pruebas ──────────────────────────────────────────────────────────────────

test.describe('TC-DIS-187 — Alternativa en tabla para la gráfica de evolución del riesgo', () => {
  // Cada test inicia sesión por su cuenta: un defecto en uno no debe saltar los demás
  test.describe.configure({ mode: 'default' });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!VIEWPORTS_HABILITADOS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_187_VIEWPORTS.`);
    expect(EMAIL, 'Faltan TEST_VETERINARIO_EMAIL / TEST_VETERINARIO_PASSWORD en testing/.env.test').not.toBe('');
    await iniciarSesion(page);
  });

  test(`a. Activo INDIVIDUAL #${ACTIVO_INDIVIDUAL}: gráfica de evolución y escaneo`, async ({ page }, testInfo) => {
    const estado = await interceptar(page);
    const panel = await consultarTendencia(page, ACTIVO_INDIVIDUAL);
    const inferencias = estado.eventos.filter((e) => typeof e.payload?.nivel_riesgo === 'number');
    const niveles = [...new Set(inferencias.map((e) => e.payload!.nivel_riesgo))].sort();
    testInfo.annotations.push({ type: 'Datos', description: `${estado.eventos.length} eventos reales · ${inferencias.length} con nivel_riesgo · niveles ${JSON.stringify(niveles)}` });
    expect.soft(inferencias.length, 'Precondición: al menos 3-4 puntos de evolución del riesgo').toBeGreaterThanOrEqual(3);
    const info = await leerPanel(panel);
    testInfo.annotations.push({ type: 'Gráfica', description: JSON.stringify(info) });
    await escanear(page, 'tendencia-individual', testInfo);
  });

  test(`b. [1.1.1] Alternativa en tabla de la gráfica INDIVIDUAL con sus encabezados`, async ({ page }, testInfo) => {
    const estado = await interceptar(page);
    const panel = await consultarTendencia(page, ACTIVO_INDIVIDUAL);
    const info = await leerPanel(panel);
    testInfo.annotations.push({ type: 'Panel de tendencia', description: JSON.stringify(info) });
    // La gráfica (un SVG de recharts) no tiene nombre ni descripción para el lector
    expect.soft(!!info.svgNombre || !!info.descritoPor, 'DEFECTO 1.1.1: la gráfica no tiene texto alternativo (ni aria-label, title, desc ni aria-describedby)').toBe(true);
    expect.soft(info.tabla, 'DEFECTO 1.1.1: la gráfica de evolución no tiene alternativa en tabla de datos').toBe(true);
    if (info.tabla) {
      const faltan = ENCABEZADOS.INDIVIDUAL.filter(([, re]) => !info.encabezados.some((h) => re.test(h))).map(([n]) => n);
      expect.soft(faltan, '1.3.1: encabezados INDIVIDUAL de la tabla alternativa').toEqual([]);
    }

    // La línea de tiempo es la otra lectura textual: ¿lleva la confianza que trae cada inferencia?
    await page.getByRole('tab', { name: /l[ií]nea de tiempo/i }).click();
    const conConfianzaEnDatos = estado.eventos.filter((e) => e.payload && ['confianza', 'confianza_global'].some((k) => typeof e.payload![k] === 'number')).length;
    const conConfianzaEnPantalla = await page.locator('main').getByText(/^Confianza:/).count();
    testInfo.annotations.push({ type: 'Confianza', description: `eventos con confianza en los datos: ${conConfianzaEnDatos} · mostrados con "Confianza:" en la línea de tiempo: ${conConfianzaEnPantalla}` });
  });

  test(`c. Área POBLACIONAL #${AREA_POBLACIONAL}: alternativa en tabla con score_anomalia`, async ({ page }, testInfo) => {
    const estado = await interceptar(page);
    const panel = await consultarTendencia(page, AREA_POBLACIONAL);
    const claves = [...new Set(estado.eventos.flatMap((e) => Object.keys(e.payload ?? {})))];
    const conScore = estado.eventos.filter((e) => e.payload && 'score_anomalia' in e.payload).length;
    testInfo.annotations.push({ type: 'Datos', description: `${estado.eventos.length} eventos reales · con score_anomalia: ${conScore} · claves del payload: ${claves.join(', ')}` });
    const info = await leerPanel(panel);
    testInfo.annotations.push({ type: 'Panel de tendencia', description: JSON.stringify(info) });
    expect.soft(info.tabla, 'DEFECTO 1.1.1: la gráfica POBLACIONAL no tiene alternativa en tabla (fecha, nivel_riesgo, score_anomalia)').toBe(true);
    const texto = await page.locator('main').innerText();
    expect.soft(/anomal/i.test(texto), 'DEFECTO: la vista no muestra el score de anomalía del área POBLACIONAL en ninguna parte').toBe(true);
    await escanear(page, 'tendencia-poblacional', testInfo);
  });

  test('d. Tabla alternativa recorrible con teclado y lector; comunica la tendencia', async ({ page }, testInfo) => {
    await interceptar(page);
    const panel = await consultarTendencia(page, ACTIVO_INDIVIDUAL);
    const info = await leerPanel(panel);
    // Dentro del panel, ¿llega el teclado a algo? (la tabla alternativa o la propia gráfica)
    const enfocables = await panel.locator('table, [tabindex="0"], svg[tabindex], a, button').count();
    testInfo.annotations.push({ type: 'Elementos enfocables en el panel', description: String(enfocables) });
    expect(info.tabla && info.filas > 0, 'DEFECTO 1.1.1: no hay tabla alternativa que recorrer con teclado y lector; la tendencia solo se percibe viendo la gráfica').toBe(true);
  });
});
