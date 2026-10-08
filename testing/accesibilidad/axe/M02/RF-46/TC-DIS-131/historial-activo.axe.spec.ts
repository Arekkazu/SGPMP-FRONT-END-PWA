/**
 * TC-DIS-131 — Accesibilidad WCAG 2.1 AA de la vista de Consulta de Historial del Activo
 * RF-46 · CU-10 Gestionar Transferencias y Consultar Historial · Rol: Productor
 * Activos biológicos → ficha del activo → pestaña "Historial"
 *
 * Herramientas: @axe-core/playwright (reporte axe-<TC>.html/json) + Lighthouse en
 * modo snapshot sobre la misma sesión (lighthouse-<TC>-<paso>-<viewport>.html/json),
 * ambos en ./resultados. Una auditoría fallida de Lighthouse es un defecto aunque tenga
 * peso 0 en el puntaje.
 *
 * Datos: activo #281 (lote del Productor de prueba) con 5 registros en 4 categorías:
 * TRANSFERENCIA (2), ESTADO, FASE_PRODUCTIVA y BAJA.
 *
 * Errores:
 *   - Reales: 422 RANGO_FECHAS_INVALIDO (fecha inicio posterior a fecha fin) y
 *     404 ACTIVO_NO_ENCONTRADO (activo inexistente). Estado vacío real (EVENTO_BIOLOGICO).
 *   - 403 SIMULADO con el formato estándar del backend (el Productor tiene permiso).
 * Paginación: ningún activo del ambiente supera los 20 registros por página que pide el
 * frontend, así que la consulta se envía con page_size=2 (route.continue): paginación real
 * del backend sobre datos reales (5 registros → 3 páginas).
 *
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_131_VIEWPORTS=escritorio
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { auditarLighthouse, PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';

const TC_ID = 'TC-DIS-131';
const USER_EMAIL = process.env.TEST_USER_EMAIL ?? '';
const USER_PASSWORD = process.env.TEST_USER_PASSWORD ?? '';

const ID_ACTIVO = 281;
const TOTAL_REGISTROS = 5;

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_131_VIEWPORTS ?? 'movil,tablet,escritorio')
  .split(',')
  .map((v) => v.trim());

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const URL_HISTORIAL = (url: URL) => /\/activos-biologicos\/\d+\/historial$/.test(url.pathname);
const ENCABEZADOS = ['Fecha', 'Categoría', 'Descripción', 'Responsable', 'Origen'];

// 403 SIMULADO con el formato estándar del backend
const ERROR_403 = { error_code: 'ACCESO_DENEGADO', message: 'Acceso denegado. Su rol no tiene permisos para realizar esta operación.', fields: [] };

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

// ── Navegación ───────────────────────────────────────────────────────────────

async function iniciarSesionProductor(page: Page) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill(USER_EMAIL);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(USER_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 });
}

function esperarHistorial(page: Page) {
  return page.waitForResponse((r) => URL_HISTORIAL(new URL(r.url())) && ['xhr', 'fetch'].includes(r.request().resourceType()));
}

/** Ficha del activo → pestaña "Historial"; devuelve la respuesta de la primera consulta. */
async function abrirHistorial(page: Page, idActivo = ID_ACTIVO) {
  await page.goto(`/activos-biologicos/${idActivo}`);
  const secciones = page.getByRole('navigation', { name: 'Secciones del activo' });
  await expect(secciones).toBeVisible({ timeout: 20_000 });
  const respuesta = esperarHistorial(page);
  await secciones.getByRole('button', { name: 'Historial', exact: true }).click();
  const r = await respuesta;
  await page.evaluate(() => document.fonts.ready);
  return r;
}

function filtros(page: Page) {
  return {
    categoria: page.getByRole('combobox', { name: 'Categoría', exact: true }),
    desde: page.getByLabel('Desde', { exact: true }),
    hasta: page.getByLabel('Hasta', { exact: true }),
  };
}

function tabla(page: Page): Locator {
  return page.getByRole('table');
}

/** Aplica un cambio de filtro y espera la consulta que dispara. */
async function filtrar(page: Page, accion: () => Promise<void>) {
  const respuesta = esperarHistorial(page);
  await accion();
  const r = await respuesta;
  await expect(page.getByText('Error al cargar el historial').or(tabla(page)).or(page.getByText(/Sin registros/)).first()).toBeVisible();
  return r;
}

// ── Escaneo axe + Lighthouse ─────────────────────────────────────────────────

function resumenViolaciones(violaciones: { id: string; impact?: string | null; help: string; nodes: unknown[] }[]) {
  return violaciones.map((v) => `${v.id} (${v.impact}): ${v.help} [${v.nodes.length} nodo(s)]`).join('\n');
}

async function escanear(page: Page, pasoBase: string, testInfo: TestInfo) {
  const paso = `${pasoBase}-${testInfo.project.name}`;
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
  // Una auditoría fallida es un defecto aunque Lighthouse le asigne peso 0 en el puntaje
  expect.soft(lh.auditoriasFallidas.map((a) => a.id), `DEFECTO: auditorías de accesibilidad fallidas en Lighthouse ("${paso}")`).toEqual([]);
}

/** ¿El texto está dentro de una región viva (role alert/status o aria-live)? */
function anunciado(page: Page, texto: string | RegExp): Promise<boolean> {
  return page.getByText(texto).first().evaluate((e) => !!e.closest('[role="alert"],[role="status"],[aria-live]:not([aria-live="off"])'));
}

// ── Casos ────────────────────────────────────────────────────────────────────

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Historial del activo (RF-46)`, () => {
  // Modo por defecto (no serial): un paso con violaciones no debe impedir evaluar los demás.
  // workers: 1 en el config, así que los logins siguen siendo secuenciales.
  test.describe.configure({ timeout: 180_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      !VIEWPORTS_HABILITADOS.includes(testInfo.project.name),
      `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_131_VIEWPORTS.`,
    );
    expect(USER_EMAIL, 'Falta TEST_USER_EMAIL en testing/.env.test').not.toBe('');
    expect(USER_PASSWORD, 'Falta TEST_USER_PASSWORD en testing/.env.test').not.toBe('');
    await iniciarSesionProductor(page);
  });

  test('1-2. Listado con datos - 0 violaciones axe, tabla 1.3.1, filtros 4.1.2 y categorías 2.4.6', async ({ page }, testInfo) => {
    const r = await abrirHistorial(page);
    const cuerpo = await r.json();
    const categorias = [...new Set((cuerpo.registros ?? []).map((x: { categoria: string }) => x.categoria))];
    testInfo.annotations.push({ type: 'Datos', description: `activo #${ID_ACTIVO}: ${cuerpo.total_registros} registros · categorías: ${categorias.join(', ')}` });
    expect(categorias.length, 'Precondición: el activo debe tener historial de al menos 3 categorías').toBeGreaterThanOrEqual(3);
    await expect(tabla(page).getByRole('row')).toHaveCount(TOTAL_REGISTROS + 1);

    // 1.3.1: tabla con encabezados de columna
    const encabezados = (await tabla(page).getByRole('columnheader').allInnerTexts()).map((h) => h.trim().toLowerCase());
    expect(encabezados, 'DEFECTO: 1.3.1: la tabla debe tener encabezados categoría/fecha/descripción/responsable/origen').toEqual(ENCABEZADOS.map((h) => h.toLowerCase()));
    const conCaption = await tabla(page).evaluate((t) => !!t.querySelector('caption') || t.hasAttribute('aria-label') || t.hasAttribute('aria-labelledby'));
    expect.soft(conCaption, 'DEFECTO: 1.3.1: la tabla no tiene nombre accesible (caption/aria-label) que la identifique como "Historial consolidado"').toBe(true);

    // 4.1.2: filtros con name/role/value
    const f = filtros(page);
    await expect(f.categoria, 'DEFECTO: 4.1.2: filtro categoria_evento con nombre accesible').toBeVisible();
    await expect(f.categoria).toHaveValue('');
    await expect(f.desde, 'DEFECTO: 4.1.2: filtro fecha_inicio con nombre accesible').toHaveAttribute('type', 'date');
    await expect(f.hasta, 'DEFECTO: 4.1.2: filtro fecha_fin con nombre accesible').toHaveAttribute('type', 'date');

    // 2.4.6 / 1.4.1: la categoría se identifica con texto, no solo con color
    for (const c of categorias) {
      await expect(tabla(page).getByRole('cell', { name: String(c), exact: true }).first(), `DEFECTO: 2.4.6: la categoría ${c} debe mostrarse como texto`).toBeVisible();
    }

    await escanear(page, 'listado', testInfo);
  });

  test('3. Filtro por categoría y rango de fechas - 0 violaciones axe', async ({ page }, testInfo) => {
    await abrirHistorial(page);
    const f = filtros(page);

    await filtrar(page, () => f.categoria.selectOption('TRANSFERENCIA'));
    await filtrar(page, () => f.desde.fill('2026-09-01'));
    const r = await filtrar(page, () => f.hasta.fill('2026-09-30'));
    const url = new URL(r.url());
    expect(url.searchParams.get('categoria_evento')).toBe('TRANSFERENCIA');
    expect(url.searchParams.get('fecha_inicio')).toBe('2026-09-01');
    expect(url.searchParams.get('fecha_fin')).toBe('2026-09-30');

    const filas = tabla(page).getByRole('row');
    await expect(filas).toHaveCount(3);
    for (const celda of await tabla(page).locator('tbody td:nth-child(2)').allInnerTexts()) expect(celda.trim()).toBe('TRANSFERENCIA');

    // El resultado del filtro debería anunciarse (conteo de registros en región viva)
    expect.soft(await anunciado(page, /registro\(s\)/), 'DEFECTO: 4.1.3: el conteo de resultados tras filtrar no está en una región viva (aria-live/status)').toBe(true);

    await escanear(page, 'filtro-categoria-fechas', testInfo);
  });

  test('4. Filtro sin resultados (estado vacío) - anunciado y 0 violaciones axe', async ({ page }, testInfo) => {
    await abrirHistorial(page);
    const r = await filtrar(page, () => filtros(page).categoria.selectOption('EVENTO_BIOLOGICO'));
    expect((await r.json()).total_registros, 'Precondición: el activo no tiene eventos de categoría EVENTO_BIOLOGICO').toBe(0);

    const vacio = page.getByText('Sin registros para los filtros seleccionados.');
    await expect(vacio, 'El estado vacío debe mostrarse').toBeVisible();
    await expect(tabla(page)).toHaveCount(0);
    expect.soft(await anunciado(page, 'Sin registros para los filtros seleccionados.'), 'DEFECTO: 3.3.1/4.1.3: el estado sin resultados es un <p> sin role="status"/aria-live; el lector de pantalla no lo anuncia').toBe(true);

    await escanear(page, 'estado-vacio', testInfo);
  });

  test('3.3.1. Errores anunciados: 422 rango de fechas y 404 (reales), 403 (simulado)', async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'Datos simulados', description: '403 inyectado con el formato estándar del backend (el Productor tiene permiso); 422 y 404 reales.' });

    // 422 real: fecha de inicio posterior a la de fin
    await abrirHistorial(page);
    const f = filtros(page);
    await filtrar(page, () => f.desde.fill('2026-09-20'));
    const r422 = await filtrar(page, () => f.hasta.fill('2026-01-01'));
    expect(r422.status(), 'El backend debe rechazar el rango invertido').toBe(422);
    const alerta422 = page.getByRole('alert').filter({ hasText: 'Error al cargar el historial' });
    await expect(alerta422, 'DEFECTO: 3.3.1: el 422 debe anunciarse').toContainText('no puede ser posterior');
    await expect.soft(f.desde, 'DEFECTO: 3.3.1: el filtro "Desde" debe marcarse como inválido (aria-invalid) con el error de campo del backend (field: fecha_inicio)').toHaveAttribute('aria-invalid', 'true');
    await expect.soft(tabla(page), 'DEFECTO: 3.3.1: tras el error se siguen mostrando los registros de la consulta anterior como si fueran el resultado del filtro').toHaveCount(0);
    await escanear(page, 'error-422-rango-fechas', testInfo);

    // 404 real: activo inexistente
    const r404 = await abrirHistorial(page, 999999);
    expect(r404.status()).toBe(404);
    await expect(page.getByRole('alert').filter({ hasText: 'Error al cargar el historial' }), 'DEFECTO: 3.3.1: el 404 debe anunciarse').toContainText('no fue encontrado');

    // 403 simulado
    await page.route(URL_HISTORIAL, (r) => r.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify(ERROR_403) }));
    await abrirHistorial(page);
    await expect(page.getByRole('alert').filter({ hasText: 'Error al cargar el historial' }), 'DEFECTO: 3.3.1: el 403 debe anunciarse').toContainText('Acceso denegado');
    await escanear(page, 'error-403', testInfo);
  });

  test('5. Teclado - filtros y paginación operables y anunciados', async ({ page }, testInfo) => {
    // Paginación real del backend con page_size=2 (5 registros → 3 páginas)
    await page.route(URL_HISTORIAL, (r) => {
      const url = new URL(r.request().url());
      url.searchParams.set('page_size', '2');
      return r.continue({ url: url.toString() });
    });
    testInfo.annotations.push({ type: 'Petición modificada', description: 'page_size=2 en la consulta de historial para obtener paginación real (5 registros → 3 páginas).' });
    await abrirHistorial(page);
    const estadoPagina = page.getByText(/Página \d+ de \d+/);
    await expect(estadoPagina).toContainText('Página 1 de 3');

    // Paginación con teclado
    const siguiente = page.getByRole('button', { name: 'Siguiente', exact: true });
    const anterior = page.getByRole('button', { name: 'Anterior', exact: true });
    await expect(anterior, 'En la página 1 "Anterior" debe estar deshabilitado').toBeDisabled();
    await siguiente.focus();
    let respuesta = esperarHistorial(page);
    await page.keyboard.press('Enter');
    expect(new URL((await respuesta).url()).searchParams.get('pagina')).toBe('2');
    await expect(estadoPagina, 'DEFECTO: 2.1.1: Enter en "Siguiente" debe avanzar de página').toContainText('Página 2 de 3');
    const focoTrasPaginar = await page.evaluate(() => document.activeElement?.textContent?.trim() ?? 'ninguno');
    testInfo.annotations.push({ type: 'Foco tras paginar', description: focoTrasPaginar });
    expect.soft(await anunciado(page, /Página \d+ de \d+/), 'DEFECTO: 4.1.3: el cambio de página ("Página 2 de 3") no se anuncia (sin aria-live/status)').toBe(true);
    const navPaginacion = await page.getByRole('navigation', { name: /pagina/i }).count();
    expect.soft(navPaginacion, 'DEFECTO: 1.3.1: la paginación no está agrupada como navegación con nombre (nav aria-label="Paginación")').toBeGreaterThan(0);

    await anterior.focus();
    respuesta = esperarHistorial(page);
    await page.keyboard.press('Space');
    await respuesta;
    await expect(estadoPagina, 'DEFECTO: 2.1.1: Espacio en "Anterior" debe retroceder de página').toContainText('Página 1 de 3');

    // Filtros con teclado: recorrido con Tab desde la pestaña Historial
    const f = filtros(page);
    await page.getByRole('navigation', { name: 'Secciones del activo' }).getByRole('button', { name: 'Historial', exact: true }).focus();
    const recorrido: string[] = [];
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      recorrido.push(await page.evaluate(() => { const e = document.activeElement as HTMLElement; return `${e.tagName}${e.id ? `#${e.id}` : ''}`; }));
      if (recorrido.at(-1) === 'SELECT#hist-cat') break;
    }
    testInfo.annotations.push({ type: 'Recorrido de Tab hasta el filtro', description: recorrido.join(' → ') });
    await expect(f.categoria, 'DEFECTO: 2.1.1: el filtro de categoría debe alcanzarse con Tab').toBeFocused();

    // Categoría con flechas del teclado
    respuesta = esperarHistorial(page);
    await page.keyboard.press('ArrowDown'); // Todas → ESTADO
    expect(new URL((await respuesta).url()).searchParams.get('categoria_evento'), 'DEFECTO: 2.1.1: el filtro de categoría debe operarse con flechas').toBe('ESTADO');

    // Fechas escritas con teclado
    await page.keyboard.press('Tab');
    await expect(f.desde, 'DEFECTO: 2.1.1: "Desde" debe alcanzarse con Tab').toBeFocused();
    respuesta = esperarHistorial(page);
    await page.keyboard.type('01092026'); // dd/mm/aaaa en es-CO
    await expect.poll(async () => f.desde.inputValue(), { message: 'DEFECTO: 2.1.1: "Desde" debe poder escribirse con teclado' }).toBe('2026-09-01');
    await respuesta;
    // Tab recorre los segmentos del campo de fecha (dd/mm/aaaa) antes de pasar al siguiente
    for (let i = 0; i < 4 && !(await f.hasta.evaluate((e) => e === document.activeElement)); i++) await page.keyboard.press('Tab');
    await expect(f.hasta, 'DEFECTO: 2.1.1: "Hasta" debe alcanzarse con Tab').toBeFocused();
  });
});
