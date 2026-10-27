/**
 * TC-DIS-179 — Accesibilidad WCAG 2.1 AA de la distinción entre patologías base y patologías
 * agregadas por el veterinario en el listado del Catálogo
 * RF-64 v1.1 · CU-01 Gestionar Catálogo de Patologías · Rol: Administrador · Prioridad: Alta
 * Ruta: /prediccion/patologias — PatologiasView + PatologiasTable + PatologiaPills
 * (TipoPatologiaPill, EstadoActivoPill) + PatologiasFiltros
 *
 * Primera ejecución sobre el ambiente TEST nuevo (app en /sigab-test, API en /api-sgpmp-test).
 *
 * Criterios (hoja "CASOS DE PRUEBA UI/UX"): 0 violaciones axe A/AA en
 *   1.4.1 — la distinción base (es_base=true, inmutable) / agregada (es_base=false) y ACTIVA /
 *           INACTIVA no depende solo del color: badge/ícono y etiqueta textual;
 *   4.1.2 — rol y estado de los badges expuestos a la tecnología de asistencia.
 * La verificación manual del 1.4.1 (lector de pantalla y simulación de daltonismo) se automatiza:
 * texto accesible de cada fila (lo que lee un lector) y la tabla vista en escala de grises
 * (CSS filter grayscale), donde la distinción debe seguir siendo legible por texto e ícono.
 * Herramientas: @axe-core/playwright + Lighthouse en modo snapshot sobre la misma sesión
 * (resultados/). Una auditoría fallida de Lighthouse es un defecto aunque tenga peso 0.
 *
 * Datos: catálogo REAL (14 patologías) con los 4 casos representativos: base activa,
 * agregada (Personalizada) activa e inactiva. El rol del caso es Veterinario o Administrador;
 * se usa Administrador (no hay cuenta Veterinario en .env.test).
 * PROTECCIÓN DE DATOS: vista de solo lectura; toda escritura al backend se aborta.
 *
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_179_VIEWPORTS=escritorio
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route, type TestInfo } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { auditarLighthouse, PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';

const TC_ID = 'TC-DIS-179';
const EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';
// Ambiente TEST desde 2026-10-20 (subrutas de Dokploy)
const APP = (process.env.APP_URL ?? 'https://api.inmero.co/sigab-test').replace(/\/$/, '');
const API = /\/api-sgpmp-test\//;

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_179_VIEWPORTS ?? 'movil,tablet,escritorio')
  .split(',')
  .map((v) => v.trim());

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

const ruta = (url: string) => new URL(url).pathname.replace(/^.*\/api-sgpmp-test/, '');

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

/** Solo lecturas; guarda el catálogo real que recibe la tabla. */
async function interceptar(page: Page) {
  const estado = { catalogo: [] as Record<string, unknown>[] };
  await page.route((url) => API.test(url.href), async (route: Route) => {
    const req = route.request();
    const metodo = req.method();
    const p = ruta(req.url());
    if (metodo === 'OPTIONS' || /^\/sesiones\/?(refresh)?$/.test(p)) return route.fallback();
    if (metodo !== 'GET') return route.abort();
    if (p === '/prediccion/patologias') {
      const res = await route.fetch();
      const json = await res.json();
      estado.catalogo = json.items ?? json ?? [];
      return route.fulfill({ response: res, json });
    }
    return route.fallback();
  });
  return estado;
}

async function irAPatologias(page: Page) {
  await page.goto(`${APP}/prediccion/patologias`);
  await expect(page.getByRole('heading', { level: 1, name: 'Catálogo de Patologías' })).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 60_000 });
}

interface Fila {
  nombre: string;
  tipo: string;
  iconoTipo: boolean;
  estado: string;
  iconoEstado: boolean;
  /** Texto accesible completo de la fila (lo que recorre un lector de pantalla). */
  textoAccesible: string;
}

async function leerFilas(page: Page): Promise<Fila[]> {
  return page.locator('tbody tr').evaluateAll((filas) => filas.map((f) => {
    const td = f.querySelectorAll('td');
    return {
      nombre: td[0]?.textContent?.trim() ?? '',
      tipo: td[3]?.textContent?.trim() ?? '',
      iconoTipo: !!td[3]?.querySelector('svg'),
      estado: td[4]?.textContent?.trim() ?? '',
      iconoEstado: !!td[4]?.querySelector('svg'),
      textoAccesible: (f.textContent ?? '').replace(/\s+/g, ' ').trim(),
    };
  }));
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

test.describe('TC-DIS-179 — Distinción base / agregada en el listado del Catálogo', () => {
  // Cada test inicia sesión por su cuenta: un defecto en uno no debe saltar los demás
  test.describe.configure({ mode: 'default' });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!VIEWPORTS_HABILITADOS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_179_VIEWPORTS.`);
    await iniciarSesion(page);
  });

  test('a. [1.4.1] Tipo y estado de cada patología con texto e ícono; los 4 casos representados', async ({ page }, testInfo) => {
    const estado = await interceptar(page);
    await irAPatologias(page);

    // Precondición: los 4 casos representativos del caso
    const casos = {
      base: estado.catalogo.filter((p) => p.es_base).length,
      agregada: estado.catalogo.filter((p) => !p.es_base).length,
      activa: estado.catalogo.filter((p) => p.es_activo).length,
      inactiva: estado.catalogo.filter((p) => !p.es_activo).length,
    };
    testInfo.annotations.push({ type: 'Datos', description: `${estado.catalogo.length} patologías reales · ${JSON.stringify(casos)}` });
    for (const [k, n] of Object.entries(casos)) expect(n, `Precondición: al menos una patología ${k}`).toBeGreaterThan(0);

    const filas = await leerFilas(page);
    const malTipo = filas.filter((f) => !/^(Base|Personalizada)$/.test(f.tipo) || !f.iconoTipo).map((f) => `${f.nombre}="${f.tipo}"`);
    const malEstado = filas.filter((f) => !/^(Activa|Inactiva)$/.test(f.estado) || !f.iconoEstado).map((f) => `${f.nombre}="${f.estado}"`);
    expect.soft(malTipo, 'DEFECTO 1.4.1: filas cuyo tipo (base/agregada) no tiene texto + ícono').toEqual([]);
    expect.soft(malEstado, 'DEFECTO 1.4.1: filas cuyo estado (activa/inactiva) no tiene texto + ícono').toEqual([]);

    // Coherencia texto ↔ dato real
    const porNombre = new Map(estado.catalogo.map((p) => [String(p.nombre_patologia), p]));
    const incoherentes = filas.filter((f) => {
      const p = porNombre.get(f.nombre);
      return p && ((p.es_base ? 'Base' : 'Personalizada') !== f.tipo || (p.es_activo ? 'Activa' : 'Inactiva') !== f.estado);
    }).map((f) => f.nombre);
    expect.soft(incoherentes, 'El texto del badge coincide con es_base / es_activo').toEqual([]);

    await escanear(page, 'listado', testInfo);
  });

  test('b. [1.4.1] Lo que lee un lector de pantalla por fila, incluida la marca de variable crítica', async ({ page }, testInfo) => {
    const estado = await interceptar(page);
    await irAPatologias(page);
    const filas = await leerFilas(page);
    testInfo.annotations.push({ type: 'Ejemplo de fila leída', description: filas.slice(0, 3).map((f) => f.textoAccesible).join(' ‖ ') });
    for (const f of filas) {
      expect.soft(f.textoAccesible, `4.1.2: la fila "${f.nombre}" expone su tipo con texto`).toMatch(/Base|Personalizada/);
      expect.soft(f.textoAccesible, `4.1.2: la fila "${f.nombre}" expone su estado con texto`).toMatch(/Activa|Inactiva/);
    }

    // Variables críticas: en la columna "Variables asociadas" se distinguen de las demás
    const criticas = estado.catalogo.flatMap((p) => ((p.variables_sensoricas_asociadas as { es_variable_critica?: boolean }[]) ?? [])
      .filter((v) => v.es_variable_critica).map(() => String(p.nombre_patologia)));
    testInfo.annotations.push({ type: 'Variables críticas en los datos', description: `${criticas.length} (${[...new Set(criticas)].join(', ')})` });
    if (criticas.length) {
      const chips = await page.locator('tbody td:nth-child(3) span[title]').evaluateAll((els) => els.map((e) => ({
        texto: (e.textContent ?? '').trim(),
        title: e.getAttribute('title'),
        icono: !!e.querySelector('svg'),
        etiqueta: e.getAttribute('aria-label') ?? '',
        borde: getComputedStyle(e).borderColor,
      })));
      testInfo.annotations.push({ type: 'Chips de variable crítica', description: JSON.stringify(chips.slice(0, 4)) });
      const soloColor = chips.filter((c) => !c.icono && !/cr[ií]tic/i.test(c.texto) && !/cr[ií]tic/i.test(c.etiqueta));
      expect.soft(soloColor.map((c) => c.texto), 'DEFECTO 1.4.1: las variables críticas se distinguen solo por el color del borde (el texto "Variable crítica" está solo en title)').toEqual([]);
    }
    await escanear(page, 'lectura-filas', testInfo);
  });

  test('c. [1.4.1] Simulación sin color (escala de grises): la distinción sigue siendo legible', async ({ page }, testInfo) => {
    await interceptar(page);
    await irAPatologias(page);
    await page.addStyleTag({ content: 'html { filter: grayscale(1) !important; }' });
    await page.waitForTimeout(500);
    const tabla = page.locator('table').first();
    await testInfo.attach('tabla-escala-de-grises.png', { body: await tabla.screenshot(), contentType: 'image/png' });

    // En grises solo queda texto e ícono: cada badge debe tener ambos y ser distinto entre opciones
    const badges = await page.locator('tbody td:nth-child(4) span, tbody td:nth-child(5) span').evaluateAll((els) => els
      .filter((e) => /^(Base|Personalizada|Activa|Inactiva)$/.test((e.textContent ?? '').trim()))
      .map((e) => ({ texto: (e.textContent ?? '').trim(), icono: e.querySelector('svg')?.getAttribute('class') ?? '' })));
    const iconoPor = new Map<string, Set<string>>();
    for (const b of badges) iconoPor.set(b.texto, (iconoPor.get(b.texto) ?? new Set()).add(b.icono));
    testInfo.annotations.push({ type: 'Ícono por badge', description: JSON.stringify([...iconoPor].map(([k, v]) => [k, [...v]])) });
    expect.soft(iconoPor.get('Base'), 'Base e Personalizada usan íconos distintos').not.toEqual(iconoPor.get('Personalizada'));
    expect.soft(iconoPor.get('Activa'), 'Activa e Inactiva usan íconos distintos').not.toEqual(iconoPor.get('Inactiva'));
    await escanear(page, 'escala-de-grises', testInfo);
  });

  test('d. Filtros por tipo y estado operables por teclado; resultado coherente (2.1.1)', async ({ page }, testInfo) => {
    await interceptar(page);
    await irAPatologias(page);

    // Tipo = Base, por teclado
    const tipo = page.getByLabel('Tipo', { exact: true });
    await tipo.focus();
    await tipo.selectOption('base');
    await page.getByRole('button', { name: 'Aplicar', exact: true }).focus();
    await page.keyboard.press('Enter');
    // Espera a que la tabla refleje el filtro (la recarga no tiene duración fija); mientras recarga la
    // tabla queda sin filas y every() sobre [] es true, así que se exige al menos una fila
    await expect.poll(async () => { const f = await leerFilas(page); return f.length > 0 && f.every((x) => x.tipo === 'Base'); }, { timeout: 20_000 }).toBe(true);
    let filas = await leerFilas(page);
    expect.soft(filas.length, 'El filtro "Base" devuelve filas').toBeGreaterThan(0);
    expect.soft(filas.every((f) => f.tipo === 'Base'), 'El filtro "Base" deja solo patologías base').toBe(true);
    await escanear(page, 'filtro-base', testInfo);

    // Tipo = todos, Estado = Inactivas
    await tipo.selectOption('');
    const estado = page.getByLabel('Estado', { exact: true });
    await estado.focus();
    await estado.selectOption('inactivas');
    await page.getByRole('button', { name: 'Aplicar', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect.poll(async () => { const f = await leerFilas(page); return f.length > 0 && f.every((x) => x.estado === 'Inactiva'); }, { timeout: 20_000 }).toBe(true);
    filas = await leerFilas(page);
    testInfo.annotations.push({ type: 'Filtro inactivas', description: filas.map((f) => `${f.nombre} (${f.tipo}/${f.estado})`).join(', ') });
    expect.soft(filas.length, 'El filtro "Inactivas" devuelve filas').toBeGreaterThan(0);
    expect.soft(filas.every((f) => f.estado === 'Inactiva'), 'El filtro "Inactivas" deja solo patologías inactivas').toBe(true);
    // El cambio de resultados se anuncia (no exigido por el caso; se registra)
    const vivas = (await page.locator('[aria-live], [role="status"]').allInnerTexts()).join(' | ').trim();
    testInfo.annotations.push({ type: 'Anuncio del filtrado', description: vivas || '(ninguno)' });
    await escanear(page, 'filtro-inactivas', testInfo);
  });
});
