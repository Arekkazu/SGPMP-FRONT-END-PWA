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
 * ESTADO DE LA VISTA (2026-10-29, 1.4.0-rc.11, tercera ejecución): IngestaView (prototipo v2,
 * RFC-011) sigue pintando datos fijos de `ingestaMock.ts`, ahora marcados con la etiqueta discreta
 * "DEMO" (EtiquetaDemo, role="note") en vez del banner "Datos simulados". Trae 17 lecturas con los 9
 * estados de calidad, filas de visión (vector de comportamiento), filtros por búsqueda / estado /
 * origen / tipo de dato / orden, estado vacío y detalle por lectura. La precondición de datos reales
 * sigue en "BLOQUEO"; todos los pasos se ejecutan sobre los datos de ejemplo de la vista.
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

// 2026-10-27: las etiquetas reales (telemetry.json "ingesta.estado_*") no son el código
// normalizado — "ERROR_SENSOR" se muestra como "Valor imposible", no "Error sensor" — así que
// no se pueden reconstruir con norm(). Se compara contra el rótulo real de cada código.
const ETIQUETA_CALIDAD: Record<string, string> = {
  LECTURA_VALIDA: 'Válida',
  FUERA_DE_RANGO: 'Fuera de rango',
  ERROR_ESTRUCTURA: 'Estructura inválida',
  ERROR_AUTENTICACION: 'Autenticación fallida',
  ERROR_DUPLICADO: 'Duplicado',
  ERROR_TIEMPO: 'Error temporal',
  ERROR_UNIDAD: 'Unidad inválida',
  ERROR_SENSOR: 'Valor imposible',
  ERROR_CALIBRACION: 'Error de calibración',
};

/** Encabezados que pide el 1.3.1 del caso, con los rótulos aceptables para cada uno. */
const ENCABEZADOS_ESPERADOS: [string, RegExp][] = [
  ['sensor_id / área', /sensor|área|area/i],
  ['tipo de dato', /^tipo(\s+de\s+dato)?$/i],
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

/** Marca de datos de ejemplo: etiqueta "DEMO" (desde 1.4.0) o el banner "Datos simulados" anterior. */
async function marcaDatosDeEjemplo(page: Page) {
  return page.locator('main').getByRole('note').filter({ hasText: /datos simulados|datos de ejemplo|\bDEMO\b/i }).count();
}

/** Texto de la región viva que anuncia el número de lecturas ("Mostrando n lecturas"). */
async function anuncioConteo(page: Page) {
  return (await page.locator('main [aria-live]').allInnerTexts()).map((t) => t.trim()).filter(Boolean).join(' | ');
}

/** Elemento enfocado y si muestra un indicador de foco. */
async function enfocado(page: Page) {
  return page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null;
    if (!a || a === document.body) return { descripcion: '(body)', focoVisible: false };
    const cs = getComputedStyle(a);
    const label = a.id ? document.querySelector(`label[for="${a.id}"]`)?.textContent : '';
    return {
      descripcion: `${(a.getAttribute('role') ?? a.tagName).toLowerCase()} "${(label || a.getAttribute('aria-label') || a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30)}"`,
      focoVisible: (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== 'none',
    };
  });
}

/** Aplica un filtro de la vista con teclado (foco en el select y elección de la opción). */
async function filtrarConTeclado(page: Page, id: string, valor: string) {
  await page.keyboard.press('Shift');
  await page.locator(`#${id}`).focus();
  await page.locator(`#${id}`).selectOption(valor);
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
  // Cada test inicia sesión por su cuenta: un bloqueo en uno no debe saltar los demás.
  // El timeout global (30 s) no alcanza para login + axe + Lighthouse.
  test.describe.configure({ mode: 'default', timeout: 300_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!VIEWPORTS_HABILITADOS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_146_VIEWPORTS.`);
    await protegerEscrituras(page);
    await iniciarSesion(page);
  });

  test('a. Navegar a la vista técnica de Estado de Ingesta; precondición de datos', async ({ page }, testInfo) => {
    await irAIngesta(page);
    const simulados = await marcaDatosDeEjemplo(page);
    const { filas } = await leerTabla(page);
    const etiquetas = [...new Set(filas.map((f) => f.calidad.trim()))];
    testInfo.annotations.push({ type: 'Datos', description: `${filas.length} lecturas · calidades presentes: ${etiquetas.join(', ')} · marca de datos de ejemplo (DEMO): ${simulados ? 'sí' : 'no'}` });

    expect.soft(simulados, 'BLOQUEO: la vista muestra datos fijos de ejemplo (etiqueta "DEMO"); no hay lectura real de la ingesta').toBe(0);
    const faltantes = ESTADOS_CALIDAD.filter((e) => !etiquetas.includes(ETIQUETA_CALIDAD[e]));
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
    const tipoDato = encabezados.findIndex((h) => /^tipo(\s+de\s+dato)?$|tipo_dato/i.test(h));
    expect.soft(tipoDato, 'DEFECTO 1.4.1: no hay columna "tipo de dato" que distinga escalar / visión').toBeGreaterThanOrEqual(0);

    await escanear(page, 'listado', testInfo);
  });

  test('c. [4.1.2] Filtro por estado de calidad (teclado) y nuevo escaneo', async ({ page }, testInfo) => {
    await irAIngesta(page);
    const filtro = page.locator('#ing-estado');
    await expect(filtro, '4.1.2: el filtro de estado tiene nombre accesible').toHaveAccessibleName(/estado/i);
    const opciones = await filtro.locator('option').evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value).filter(Boolean));
    testInfo.annotations.push({ type: 'Opciones del filtro de estado', description: opciones.join(', ') });
    expect.soft(ESTADOS_CALIDAD.filter((e) => !opciones.includes(e)), '4.1.2: el filtro ofrece los 9 estados de calidad').toEqual([]);

    await filtrarConTeclado(page, 'ing-estado', 'ERROR_SENSOR');
    await expect.poll(async () => {
      const { filas } = await leerTabla(page);
      return filas.length > 0 && filas.every((f) => f.calidad === ETIQUETA_CALIDAD.ERROR_SENSOR);
    }, { timeout: 10_000, message: 'El filtro deja solo lecturas "Valor imposible" (ERROR_SENSOR)' }).toBe(true);
    const anuncio = await anuncioConteo(page);
    testInfo.annotations.push({ type: 'Anuncio tras filtrar', description: anuncio || '(ninguno)' });
    expect.soft(anuncio, '4.1.3: el número de lecturas filtradas se anuncia (aria-live)').toMatch(/\d+/);
    await escanear(page, 'filtro-estado', testInfo);
  });

  test('d. [1.3.1 / 1.4.1] Filtro por tipo de dato "Vector de comportamiento" y nuevo escaneo', async ({ page }, testInfo) => {
    await irAIngesta(page);
    await expect(page.locator('#ing-tipo'), '4.1.2: el filtro de tipo de dato tiene nombre accesible').toHaveAccessibleName(/tipo/i);
    await filtrarConTeclado(page, 'ing-tipo', 'VECTOR_COMPORTAMIENTO');
    const { encabezados, filas } = await (async () => {
      await expect.poll(async () => (await leerTabla(page)).filas.every((f) => f.celdas.some((c) => /vector de comportamiento/i.test(c))), { timeout: 10_000 }).toBe(true);
      return leerTabla(page);
    })();
    const iValor = encabezados.findIndex((h) => /valor/i.test(h));
    const iVariable = encabezados.findIndex((h) => /variable/i.test(h));
    const filasVision = filas.map((f) => ({ estado: f.calidad, variable: f.celdas[iVariable], valor: f.celdas[iValor] }));
    testInfo.annotations.push({ type: 'Filas de visión', description: JSON.stringify(filasVision) });
    // Aceptada y rechazada presentes
    expect.soft(filasVision.some((f) => f.estado === ETIQUETA_CALIDAD.LECTURA_VALIDA), 'Hay una observación de visión aceptada').toBe(true);
    expect.soft(filasVision.some((f) => f.estado !== ETIQUETA_CALIDAD.LECTURA_VALIDA), 'Hay una observación de visión rechazada').toBe(true);
    // 1.3.1: lo que no aplica a una fila de visión dice "No aplica", nunca vacío ni "—"
    const sinDato = filasVision.filter((f) => !f.valor.trim() || /^[—-]$/.test(f.valor.trim())).map((f) => `${f.estado}: valor="${f.valor}"`);
    expect.soft(sinDato, 'DEFECTO 1.3.1: en filas de visión el valor que no aplica se muestra vacío o como "—" en vez de "No aplica"').toEqual([]);
    await escanear(page, 'filtro-vision', testInfo);
  });

  test('e. Detalle del vector de comportamiento abierto por teclado', async ({ page }, testInfo) => {
    await irAIngesta(page);
    await filtrarConTeclado(page, 'ing-tipo', 'VECTOR_COMPORTAMIENTO');
    const fila = page.locator('main tbody tr').filter({ hasText: /válida/i }).first();
    await expect(fila).toBeVisible({ timeout: 10_000 });
    const sensorFila = (await fila.locator('td').first().locator('div').first().innerText()).trim();
    await fila.focus();
    await page.keyboard.press('Enter');
    const dialogo = page.getByRole('dialog');
    await expect(dialogo, '2.1.1: Enter sobre la fila abre el detalle del vector').toBeVisible({ timeout: 10_000 });
    await expect(dialogo, 'El diálogo tiene nombre accesible').toHaveAccessibleName(/vector de comportamiento/i);
    expect.soft(await dialogo.evaluate((d) => d.contains(document.activeElement)), 'El foco pasa al detalle').toBe(true);
    testInfo.annotations.push({ type: 'Detalle del vector', description: (await dialogo.innerText()).replace(/\s+/g, ' ').slice(0, 300) });
    await escanear(page, 'detalle-vector', testInfo);
    await page.keyboard.press('Escape');
    await expect(dialogo).toBeHidden({ timeout: 10_000 });
    const vuelta = await enfocado(page);
    testInfo.annotations.push({ type: 'Foco al cerrar', description: vuelta.descripcion });
    expect.soft(vuelta.descripcion, '2.4.3: al cerrar, el foco vuelve a la fila que abrió el detalle').toMatch(new RegExp(`^tr "${sensorFila}`));
  });

  test('f. [3.3.1 / 4.1.3] Filtro sin resultados: estado vacío anunciado', async ({ page }, testInfo) => {
    await irAIngesta(page);
    await page.locator('#ing-q').fill('zzz-sin-coincidencias');
    const vacio = page.locator('main').getByText(/ninguna lectura coincide/i);
    await expect(vacio, 'Se muestra el estado sin resultados').toBeVisible({ timeout: 10_000 });
    const anuncio = await anuncioConteo(page);
    const mensajeEnRegionViva = await vacio.evaluate((el) => !!el.closest('[aria-live]:not([aria-live="off"]), [role="status"], [role="alert"]'));
    testInfo.annotations.push({ type: 'Sin resultados', description: `mensaje: "${(await vacio.innerText()).trim()}" · en región viva: ${mensajeEnRegionViva ? 'sí' : 'no'} · región viva anuncia: "${anuncio}"` });
    expect.soft(anuncio, '4.1.3: la región viva anuncia que hay 0 lecturas').toMatch(/\b0\b/);
    await escanear(page, 'sin-resultados', testInfo);
  });

  test('g. [2.1.1] Teclado: filtros, tabla y detalle operables', async ({ page }, testInfo) => {
    await irAIngesta(page);
    const filtros = await contarFiltros(page);
    testInfo.annotations.push({ type: 'Controles de filtro', description: String(filtros) });
    // Recorrido con Tab desde la búsqueda: los 5 filtros, la región de la tabla y las filas
    await page.keyboard.press('Shift');
    await page.locator('#ing-q').focus();
    const recorrido = [await enfocado(page)];
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
      recorrido.push(await enfocado(page));
    }
    testInfo.annotations.push({ type: 'Recorrido con Tab', description: recorrido.map((p) => `${p.descripcion}${p.focoVisible ? '' : ' [SIN FOCO VISIBLE]'}`).join(' → ') });
    expect.soft(recorrido.filter((p) => !p.focoVisible && p.descripcion !== '(body)').map((p) => p.descripcion), 'DEFECTO 2.4.7: elementos que reciben foco sin indicador visible').toEqual([]);
    expect.soft(recorrido.some((p) => /^row|^tr/.test(p.descripcion)), '2.1.1: las filas de la tabla se alcanzan con Tab').toBe(true);

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
    expect.soft(filtros, 'Hay filtros que operar por teclado').toBeGreaterThan(0);
  });
});
