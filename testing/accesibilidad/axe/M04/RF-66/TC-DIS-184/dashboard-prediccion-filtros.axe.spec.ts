/**
 * TC-DIS-184 — Verificar accesibilidad WCAG 2.1 AA de la navegación por teclado del panel de
 * filtros del Dashboard de Predicción Sanitaria
 * RF-66 · CU-03 - Ejecutar Inferencia Sanitaria · Rol: Veterinario · Prioridad: Media
 * Ruta: /prediccion/monitor — MonitorInferenciaView (Predicción IA → Monitor)
 *
 * Primera ejecución sobre el ambiente TEST nuevo (app en /sigab-test, API en /api-sgpmp-test).
 *
 * Precondiciones (hoja "CASOS DE PRUEBA UI/UX"):
 *   - Rol: Veterinario o Productor. Se usa la cuenta Veterinario de Finca Prueba Alfa creada con
 *     los datos semilla del 2026-10-22.
 *   - Datos para al menos dos combinaciones de filtros (área productiva, tipo de
 *     modelo/paradigma, nivel de riesgo, fecha).
 *
 * Criterios de aceptación: 0 violaciones axe A/AA en
 *   2.1.1 / 2.4.7 — filtros por área productiva, tipo de modelo/paradigma, nivel de riesgo y
 *                   rango de fechas operables por teclado, con foco visible;
 *   2.4.3 — orden de foco lógico entre filtros y tarjetas de resultado (INDIVIDUAL y POBLACIONAL).
 * Nota del caso: incluir el acceso por teclado a la tarjeta de detalle de un activo del listado.
 * Herramientas: @axe-core/playwright + Lighthouse en modo snapshot sobre la misma sesión
 * (resultados/). Una auditoría fallida de Lighthouse es un defecto aunque tenga peso 0.
 *
 * ESTADO DE LA VISTA (2026-10-22): MonitorInferenciaView pinta datos fijos de `monitorMock.ts` con
 * el banner "Datos simulados" y NO tiene panel de filtros. Tiene dos pestañas ("Activos
 * monitoreados" / "Feed de inferencias") y una tarjeta-botón por activo que abre el detalle. Se
 * verifica el recorrido por teclado de lo que existe; los filtros ausentes son "DEFECTO".
 * PROTECCIÓN DE DATOS: vista de solo lectura; toda escritura al backend se aborta.
 *
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_184_VIEWPORTS=escritorio
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route, type TestInfo } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { auditarLighthouse, PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';

const TC_ID = 'TC-DIS-184';
const EMAIL = process.env.TEST_VETERINARIO_EMAIL ?? '';
const PASSWORD = process.env.TEST_VETERINARIO_PASSWORD ?? '';
// Ambiente TEST desde 2026-10-20 (subrutas de Dokploy)
const APP = (process.env.APP_URL ?? 'https://api.inmero.co/sigab-test').replace(/\/$/, '');
const API = /\/api-sgpmp-test\//;

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_184_VIEWPORTS ?? 'movil,tablet,escritorio')
  .split(',')
  .map((v) => v.trim());

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/** Filtros que pide el caso, con los rótulos aceptables para cada uno. */
const FILTROS: [string, RegExp][] = [
  ['área productiva', /[áa]rea/i],
  ['tipo de modelo / paradigma', /modelo|paradigma/i],
  ['nivel de riesgo', /riesgo|nivel/i],
  ['rango de fechas', /fecha|desde|hasta/i],
];

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

// Toda escritura al backend se aborta (protección de datos).
async function protegerEscrituras(page: Page) {
  await page.route((url) => API.test(url.href), (route: Route) => {
    const req = route.request();
    const metodo = req.method();
    if (metodo === 'GET' || metodo === 'OPTIONS' || /\/sesiones\/?(refresh)?$/.test(new URL(req.url()).pathname)) return route.fallback();
    return route.abort();
  });
}

async function irAMonitor(page: Page) {
  await page.goto(`${APP}/prediccion/monitor`);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/inferencia/i, { timeout: 60_000 });
  // 2026-10-27: SubPestanas (shared/design-system/SubPestanas.tsx) es un <nav> con <button
  // aria-current>, no un widget ARIA de tabs — no hay role="tab" que buscar.
  await expect(page.getByRole('button', { name: /activos y áreas monitoreados/i })).toBeVisible({ timeout: 60_000 });
}

interface Paso {
  descripcion: string;
  /** Indicador de foco visible: outline o box-shadow distinto del estado sin foco. */
  focoVisible: boolean;
  dentroDeMain: boolean;
}

/** Elemento enfocado: qué es y si muestra un indicador de foco. */
async function enfocado(page: Page): Promise<Paso> {
  return page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null;
    if (!a || a === document.body) return { descripcion: '(body)', focoVisible: false, dentroDeMain: false };
    const cs = getComputedStyle(a);
    const outline = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0;
    const sombra = cs.boxShadow !== 'none';
    const rol = a.getAttribute('role') ?? a.tagName.toLowerCase();
    const nombre = (a.getAttribute('aria-label') ?? a.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
    return { descripcion: `${rol} "${nombre}"`, focoVisible: outline || sombra, dentroDeMain: !!a.closest('main') };
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

test.describe('TC-DIS-184 — Navegación por teclado del Dashboard de Predicción Sanitaria', () => {
  // Cada test inicia sesión por su cuenta: un defecto en uno no debe saltar los demás.
  // 2026-10-27: igual que TC-182/183 — login + 2 esperas de hasta 60s cada una exceden el default
  // de 30s sin que haya ningún selector roto.
  test.describe.configure({ mode: 'default', timeout: 60_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!VIEWPORTS_HABILITADOS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_184_VIEWPORTS.`);
    expect(EMAIL, 'Faltan TEST_VETERINARIO_EMAIL / TEST_VETERINARIO_PASSWORD en testing/.env.test').not.toBe('');
    await protegerEscrituras(page);
    await iniciarSesion(page);
  });

  test('a. Escaneo del dashboard y del panel de filtros', async ({ page }, testInfo) => {
    await irAMonitor(page);
    const simulados = await page.getByRole('note').filter({ hasText: /datos simulados/i }).count();
    testInfo.annotations.push({ type: 'Banner "Datos simulados"', description: simulados ? 'sí' : 'no' });
    const controles = await page.locator('main').locator('select, input, [role="combobox"], [role="listbox"]').evaluateAll((els) => els.map((e) => {
      const id = e.getAttribute('id');
      return (id && document.querySelector(`label[for="${id}"]`)?.textContent) || e.getAttribute('aria-label') || e.tagName.toLowerCase();
    }));
    testInfo.annotations.push({ type: 'Controles de filtro en la vista', description: controles.join(', ') || '(ninguno)' });
    const faltan = FILTROS.filter(([, re]) => !controles.some((c) => re.test(c))).map(([n]) => n);
    expect.soft(faltan, 'DEFECTO 2.1.1: el dashboard no tiene los filtros del caso (no hay panel de filtros)').toEqual([]);
    await escanear(page, 'dashboard', testInfo);
  });

  test('b. [2.1.1 / 2.4.7 / 2.4.3] Recorrido con Tab por el dashboard: foco visible y orden lógico', async ({ page }, testInfo) => {
    await irAMonitor(page);
    // Punto de partida: el encabezado de la vista; de ahí en adelante, Tab
    await page.getByRole('heading', { level: 1 }).evaluate((h) => { h.setAttribute('tabindex', '-1'); (h as HTMLElement).focus(); });
    const recorrido: Paso[] = [];
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      const p = await enfocado(page);
      if (!p.dentroDeMain) break;
      recorrido.push(p);
    }
    testInfo.annotations.push({ type: 'Recorrido con Tab', description: recorrido.map((p) => `${p.descripcion}${p.focoVisible ? '' : ' [SIN FOCO VISIBLE]'}`).join(' → ') });
    expect.soft(recorrido.filter((p) => !p.focoVisible).map((p) => p.descripcion), 'DEFECTO 2.4.7: elementos que reciben foco sin indicador visible').toEqual([]);

    // Orden: pestañas antes que tarjetas, y tarjetas en el orden en que se ven
    // 2026-10-27: SubPestanas no expone role="tab" (ver irAMonitor) — se ubica por su texto.
    const iPestana = recorrido.findIndex((p) => /monitoreados|feed de inferencias/i.test(p.descripcion));
    const iTarjeta = recorrido.findIndex((p) => /^button ".*(BOV|POR|TIL|POL)-\d+/.test(p.descripcion));
    expect.soft(iPestana >= 0 && iTarjeta > iPestana, '2.4.3: el foco pasa por las pestañas antes que por las tarjetas de resultado').toBe(true);
    const tarjetas = recorrido.filter((p) => /(BOV|POR|TIL|POL)-\d+/.test(p.descripcion)).map((p) => p.descripcion.match(/[A-Z]{3}-\d+/)![0]);
    // 2026-10-27: las tarjetas son <article role="button">, no <button> nativo.
    const visual = await page.locator('main').getByRole('button').filter({ hasText: /[A-Z]{3}-\d+/ }).evaluateAll((bs) => bs
      .map((b) => ({ id: (b.textContent ?? '').match(/[A-Z]{3}-\d+/)![0], r: b.getBoundingClientRect() }))
      .sort((x, y) => (Math.abs(x.r.top - y.r.top) > 5 ? x.r.top - y.r.top : x.r.left - y.r.left))
      .map((x) => x.id));
    expect.soft(tarjetas, '2.4.3: el orden de foco de las tarjetas sigue el orden visual').toEqual(visual.slice(0, tarjetas.length));

    // 2026-10-27: SubPestanas no es un widget ARIA de tabs (es un <nav> de botones), así que no
    // se espera soporte de flechas — se registra el comportamiento real, no se exige.
    await page.getByRole('button', { name: /activos y áreas monitoreados/i }).focus();
    await page.keyboard.press('ArrowRight');
    const tras = await enfocado(page);
    testInfo.annotations.push({ type: 'Flecha derecha en las "pestañas" (SubPestanas, no ARIA tabs)', description: tras.descripcion });
  });

  test('c. Abrir por teclado la tarjeta de detalle de un activo y volver', async ({ page }, testInfo) => {
    await irAMonitor(page);
    // 2026-10-27: monitorMock.ts no tiene ninguna unidad "BOV-101" (son BOV-1042/1057/1077,
    // OV-0231/0245) — se usa BOV-1042 (EMITIDO, nivel 3), que sí existe.
    const tarjeta = page.locator('main').getByRole('button').filter({ hasText: /BOV-1042/ });
    await tarjeta.focus();
    await page.keyboard.press('Enter');
    const dialogo = page.getByRole('dialog');
    await expect(dialogo, '2.1.1: Enter sobre la tarjeta abre el detalle').toBeVisible({ timeout: 10_000 });
    const dentro = await dialogo.evaluate((d) => d.contains(document.activeElement));
    expect.soft(dentro, '2.4.3: al abrir el detalle el foco pasa al diálogo').toBe(true);
    await escanear(page, 'detalle-activo', testInfo);
    await page.keyboard.press('Escape');
    await expect(dialogo, 'Escape cierra el detalle').toBeHidden({ timeout: 10_000 });
    const vuelta = await enfocado(page);
    testInfo.annotations.push({ type: 'Foco al cerrar', description: vuelta.descripcion });
    expect.soft(vuelta.descripcion, '2.4.3: al cerrar, el foco vuelve a la tarjeta que abrió el detalle').toMatch(/BOV-1042/);
  });

  test('d. [2.1.1] Aplicar un filtro por teclado y llegar a un resultado', async ({ page }) => {
    await irAMonitor(page);
    const filtros = await page.locator('main').locator('select, [role="combobox"]').count();
    expect(filtros, 'DEFECTO 2.1.1: no hay filtros que aplicar por teclado').toBeGreaterThan(0);
  });

  test('e. [2.4.3] Tarjetas de áreas POBLACIONAL en el orden de foco', async ({ page }) => {
    await irAMonitor(page);
    const texto = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
    expect(/poblacional|[áa]rea\b.*anomal/i.test(texto), 'DEFECTO: no hay tarjetas de áreas POBLACIONAL (RFC-009 v1.1) que recorrer').toBe(true);
  });
});
