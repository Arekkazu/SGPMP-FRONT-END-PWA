/**
 * TC-DIS-146 — Verificar accesibilidad WCAG 2.1 AA de la vista técnica de Estado de Ingesta de
 * Telemetría (datos escalares y observaciones de visión por área)
 * RF-53 · CU-01 - Recibir y Validar Telemetría IoT · Rol: Administrador · Prioridad: Alta
 * Ruta: /telemetria/ingesta — IngestaView (Telemetría → Ingesta)
 *
 * Primera ejecución sobre el ambiente TEST nuevo (app en /sigab-test, API en /api-sgpmp-test).
 *
 * Precondiciones (hoja "CASOS DE PRUEBA UI/UX"):
 *   - Rol: Ingeniero de Campo (o Administrador). Se usa Administrador (no hay cuenta Ingeniero
 *     en .env.test).
 *   - Al menos un dato para cada uno de los 9 estados de calidad (LECTURA_VALIDA,
 *     FUERA_DE_RANGO, ERROR_ESTRUCTURA, ERROR_AUTENTICACION, ERROR_DUPLICADO, ERROR_TIEMPO,
 *     ERROR_UNIDAD, ERROR_SENSOR, ERROR_CALIBRACION).
 *   - Al menos una observación de visión a nivel de área (vector de comportamiento) aceptada y
 *     una rechazada (RFC-011 v1.1).
 *
 * Criterios de aceptación: 0 violaciones axe A/AA en
 *   1.3.1 — encabezados sensor_id/área, tipo de dato, tipo_variable, estado_calidad y timestamp
 *           asociados; en filas de visión las celdas que no aplican muestran 'No aplica';
 *   1.4.1 — los 9 estados de calidad y el tipo de dato escalar/visión se distinguen por
 *           texto/ícono, no solo color;
 *   4.1.2 — filtros de estado / tipo de dato / sensor o área / dispositivo con name/role/value;
 *           detalle del vector desplegable con nombre accesible y aria-expanded;
 *   3.3.1 — mensaje de 'sin resultados' anunciado.
 * Herramientas: @axe-core/playwright + Lighthouse en modo snapshot sobre la misma sesión
 * (resultados/). Una auditoría fallida de Lighthouse es un defecto aunque tenga peso 0.
 *
 * ESTADO DE LA VISTA (2026-10-22): IngestaView pinta datos fijos de `ingestaMock.ts` con el banner
 * "Datos simulados" (sin endpoint de lectura del equipo AIOT). Trae 7 lecturas escalares con solo
 * 3 calidades (VALIDA, FUERA_DE_RANGO, ERROR), sin filas de visión, sin filtros y sin estado vacío.
 * Como los datos no viajan por la red, no se pueden reconstruir con page.route: los pasos que
 * dependen de ellos fallan con "BLOQUEO" y lo que sí existe se escanea y se verifica.
 * PROTECCIÓN DE DATOS: vista de solo lectura; toda escritura al backend se aborta.
 *
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_146_VIEWPORTS=escritorio
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route, type TestInfo } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { auditarLighthouse, PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';

const TC_ID = 'TC-DIS-146';
const EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';
// Ambiente TEST desde 2026-10-20 (subrutas de Dokploy)
const APP = (process.env.APP_URL ?? 'https://api.inmero.co/sigab-test').replace(/\/$/, '');
const API = /\/api-sgpmp-test\//;

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_146_VIEWPORTS ?? 'movil,tablet,escritorio')
  .split(',')
  .map((v) => v.trim());

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

const ESTADOS_CALIDAD = [
  'LECTURA_VALIDA', 'FUERA_DE_RANGO', 'ERROR_ESTRUCTURA', 'ERROR_AUTENTICACION', 'ERROR_DUPLICADO',
  'ERROR_TIEMPO', 'ERROR_UNIDAD', 'ERROR_SENSOR', 'ERROR_CALIBRACION',
];

/** Encabezados que pide el 1.3.1 del caso, con los rótulos aceptables para cada uno. */
const ENCABEZADOS_ESPERADOS: [string, RegExp][] = [
  ['sensor_id / área', /sensor|área|area/i],
  ['tipo de dato', /tipo de dato|tipo_dato/i],
  ['tipo_variable', /variable/i],
  ['estado_calidad', /calidad/i],
  ['timestamp', /timestamp|capturad|fecha|hora/i],
];

const norm = (s: string) => s.trim().replace(/\s+/g, '_').toUpperCase();

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

async function irAIngesta(page: Page) {
  await page.goto(`${APP}/telemetria/ingesta`);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/ingesta/i, { timeout: 60_000 });
  await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 60_000 });
}

interface Fila {
  celdas: string[];
  calidad: string;
  iconoCalidad: boolean;
}

async function leerTabla(page: Page) {
  const encabezados = (await page.locator('thead th').allInnerTexts()).map((t) => t.trim());
  const iCalidad = encabezados.findIndex((h) => /calidad/i.test(h));
  const filas: Fila[] = await page.locator('tbody tr').evaluateAll((trs, i) => trs.map((tr) => {
    const td = [...tr.querySelectorAll('td')];
    return {
      celdas: td.map((c) => (c.textContent ?? '').trim()),
      calidad: (td[i]?.textContent ?? '').trim(),
      iconoCalidad: !!td[i]?.querySelector('svg'),
    };
  }), iCalidad);
  return { encabezados, filas };
}

/** Controles de filtro de la vista (selects, comboboxes, búsquedas). */
async function contarFiltros(page: Page) {
  return page.locator('main').locator('select, [role="combobox"], input[type="search"], input[type="text"]').count();
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

test.describe('TC-DIS-146 — Estado de Ingesta de Telemetría', () => {
  // Cada test inicia sesión por su cuenta: un bloqueo en uno no debe saltar los demás
  test.describe.configure({ mode: 'default', timeout: 300_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!VIEWPORTS_HABILITADOS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_146_VIEWPORTS.`);
    await protegerEscrituras(page);
    await iniciarSesion(page);
  });

  test('a. Navegar a la vista técnica de Estado de Ingesta; precondición de datos', async ({ page }, testInfo) => {
    await irAIngesta(page);
    const simulados = await page.getByRole('note').filter({ hasText: /datos simulados/i }).count();
    const { filas } = await leerTabla(page);
    const estados = [...new Set(filas.map((f) => norm(f.calidad)))];
    testInfo.annotations.push({ type: 'Datos', description: `${filas.length} lecturas · calidades presentes: ${estados.join(', ')} · banner "Datos simulados": ${simulados ? 'sí' : 'no'}` });

    expect.soft(simulados, 'BLOQUEO: la vista muestra datos fijos de ejemplo (banner "Datos simulados"); no hay lectura real de la ingesta').toBe(0);
    const faltantes = ESTADOS_CALIDAD.filter((e) => !estados.includes(e));
    expect.soft(faltantes, 'BLOQUEO: estados de calidad de la precondición que no aparecen en la vista').toEqual([]);
    const vision = filas.filter((f) => f.celdas.some((c) => /visi[oó]n/i.test(c))).length;
    expect.soft(vision, 'BLOQUEO: no hay observaciones de visión a nivel de área (RFC-011)').toBeGreaterThan(0);
  });

  test('b. [1.3.1 / 1.4.1] Escaneo del listado; encabezados y distinción de estados por texto', async ({ page }, testInfo) => {
    await irAIngesta(page);
    const { encabezados, filas } = await leerTabla(page);
    testInfo.annotations.push({ type: 'Encabezados', description: encabezados.join(' | ') });

    // 1.3.1: encabezados reales (th) y los que pide el caso
    const thEnTbody = await page.locator('tbody th').count();
    const celdasVacias = filas.flatMap((f, i) => f.celdas.map((c, j) => (c.replace(/[—-]/g, '').trim() ? null : `fila ${i + 1} · ${encabezados[j]}`))).filter(Boolean);
    const faltan = ENCABEZADOS_ESPERADOS.filter(([, re]) => !encabezados.some((h) => re.test(h))).map(([n]) => n);
    expect.soft(faltan, 'DEFECTO 1.3.1: encabezados del caso que la tabla no tiene').toEqual([]);
    // La regla "No aplica" del caso es para filas de visión (no las hay); las celdas escalares sin
    // dato solo se registran
    testInfo.annotations.push({ type: 'Celdas sin dato (vacías o con guion)', description: celdasVacias.join(', ') || '(ninguna)' });
    testInfo.annotations.push({ type: 'th en tbody', description: String(thEnTbody) });

    // 1.4.1: cada estado lleva texto; los errores se diferencian por tipo
    const sinTexto = filas.filter((f) => !f.calidad).length;
    expect.soft(sinTexto, '1.4.1: toda fila expone su estado de calidad con texto').toBe(0);
    const genericos = filas.filter((f) => norm(f.calidad) === 'ERROR').length;
    expect.soft(genericos, 'DEFECTO 1.4.1: los errores se muestran como "ERROR" genérico; no se distingue cuál de los 7 tipos de error es').toBe(0);
    testInfo.annotations.push({ type: 'Ícono en el estado', description: `${filas.filter((f) => f.iconoCalidad).length}/${filas.length} filas` });

    // Tipo de dato escalar / visión con texto
    const tipoDato = encabezados.findIndex((h) => /tipo de dato|tipo_dato/i.test(h));
    expect.soft(tipoDato, 'DEFECTO 1.4.1: no hay columna "tipo de dato" que distinga escalar / visión').toBeGreaterThanOrEqual(0);

    await escanear(page, 'listado', testInfo);
  });

  test('c. Filtro por estado de calidad y nuevo escaneo', async ({ page }) => {
    await irAIngesta(page);
    const filtro = page.getByRole('combobox', { name: /calidad|estado/i });
    expect(await filtro.count(), 'BLOQUEO: la vista no tiene filtro por estado de calidad').toBeGreaterThan(0);
  });

  test('d. Filtro por tipo de dato "Visión" y nuevo escaneo', async ({ page }) => {
    await irAIngesta(page);
    const filtro = page.getByRole('combobox', { name: /tipo de dato|tipo/i });
    expect(await filtro.count(), 'BLOQUEO: la vista no tiene filtro por tipo de dato (escalar / visión)').toBeGreaterThan(0);
  });

  test('e. Detalle del vector de comportamiento abierto por teclado', async ({ page }) => {
    await irAIngesta(page);
    const desplegables = page.locator('main [aria-expanded]');
    const vision = await page.locator('tbody tr').filter({ hasText: /visi[oó]n/i }).count();
    expect(vision + (await desplegables.count()), 'BLOQUEO: no hay registros de visión ni detalle desplegable del vector de comportamiento').toBeGreaterThan(0);
  });

  test('f. [3.3.1] Filtro sin resultados: estado vacío anunciado', async ({ page }) => {
    await irAIngesta(page);
    expect(await contarFiltros(page), 'BLOQUEO: sin filtros no se puede producir el estado "sin resultados"').toBeGreaterThan(0);
  });

  test('g. [2.1.1] Teclado: filtros, tabla y detalle operables', async ({ page }, testInfo) => {
    await irAIngesta(page);
    const filtros = await contarFiltros(page);
    testInfo.annotations.push({ type: 'Controles de filtro', description: String(filtros) });

    // Si la tabla desborda horizontalmente, su contenedor debe poder recibir foco para desplazarse
    const contenedor = page.locator('table').first().locator('xpath=..');
    const desborde = await contenedor.evaluate((el) => ({
      desborda: el.scrollWidth > el.clientWidth + 1,
      tabindex: el.getAttribute('tabindex'),
      rol: el.getAttribute('role'),
      nombre: el.getAttribute('aria-label') ?? el.getAttribute('aria-labelledby'),
    }));
    testInfo.annotations.push({ type: 'Contenedor de la tabla', description: JSON.stringify(desborde) });
    if (desborde.desborda) {
      expect.soft(desborde.tabindex, 'DEFECTO 2.1.1: la tabla desborda y su contenedor no es enfocable, así que no se puede desplazar con el teclado').toBe('0');
      expect.soft(desborde.nombre, 'DEFECTO 4.1.2: el contenedor desplazable de la tabla no tiene nombre accesible (role="region" + aria-label, como ScrollRegion)').toBeTruthy();
    }
    expect.soft(filtros, 'BLOQUEO: no hay filtros que operar por teclado').toBeGreaterThan(0);
  });
});
