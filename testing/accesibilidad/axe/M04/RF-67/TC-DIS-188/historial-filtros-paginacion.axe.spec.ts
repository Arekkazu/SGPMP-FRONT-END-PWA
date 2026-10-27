/**
 * TC-DIS-188 — Verificar accesibilidad WCAG 2.1 AA de los filtros y la paginación por cursor
 * del Historial Diagnóstico
 * RF-67 · CU-04 - Consultar Historial Diagnóstico del Activo · Rol: Veterinario · Prioridad: Media
 * Ruta: /prediccion/historial — HistorialView + HistorialFiltros + HistorialTimeline
 *
 * Primera ejecución sobre el ambiente TEST nuevo (app en /sigab-test, API en /api-sgpmp-test).
 *
 * Precondiciones (hoja "CASOS DE PRUEBA UI/UX"):
 *   - Rol: Veterinario o Productor. Se usa la cuenta Veterinario de Finca Prueba Alfa (datos
 *     semilla del 2026-10-22; las cuentas Productor de .env.test son de otra finca).
 *   - Activo con más de 50 inferencias para forzar la paginación por cursor: #876 (datos REALES).
 *   - Datos para provocar E1 (sin resultados) y E3 (rango de fechas inválido).
 *   - Área POBLACIONAL con historial: #878 (datos REALES).
 *
 * Criterios de aceptación: 0 violaciones axe A/AA en
 *   2.1.1 / 2.4.7 — filtros de fecha / nivel de riesgo / patología y botones 'siguiente' /
 *                   'anterior' operables por teclado, con foco visible;
 *   4.1.3 — el mensaje E1 'No se encontraron registros de diagnóstico para el periodo y filtros
 *           seleccionados' se anuncia mediante aria-live;
 *   POBLACIONAL — el filtro por patología no ofrece opciones que no aplican: se oculta o se
 *           deshabilita con aria-disabled y un texto que explique el motivo.
 * Nota del caso: verificar también el anuncio accesible del error E3.
 * Herramientas: @axe-core/playwright + Lighthouse en modo snapshot sobre la misma sesión
 * (resultados/). Una auditoría fallida de Lighthouse es un defecto aunque tenga peso 0.
 *
 * Paginación: con #876 el backend devuelve 50 eventos y un `cursor_siguiente` real; la página
 * siguiente es una lectura (GET con cursor_paginacion) y se deja pasar.
 * Selector de activo: en TEST la lista `/activos-biologicos/?por_pagina=200` responde 307 → 404 y
 * la vista cae al campo numérico; la prueba escribe el ID o lo elige si la lista cargó.
 * PROTECCIÓN DE DATOS: vista de solo lectura; toda escritura al backend se aborta.
 *
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_188_VIEWPORTS=escritorio
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route, type TestInfo } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { auditarLighthouse, PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';

const TC_ID = 'TC-DIS-188';
const EMAIL = process.env.TEST_VETERINARIO_EMAIL ?? '';
const PASSWORD = process.env.TEST_VETERINARIO_PASSWORD ?? '';
// Ambiente TEST desde 2026-10-20 (subrutas de Dokploy)
const APP = (process.env.APP_URL ?? 'https://api.inmero.co/sigab-test').replace(/\/$/, '');
const API = /\/api-sgpmp-test\//;

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_188_VIEWPORTS ?? 'movil,tablet,escritorio')
  .split(',')
  .map((v) => v.trim());

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

const ACTIVO_INDIVIDUAL = 876;
const AREA_POBLACIONAL = 878;
const DESDE = '2020-01-01';
const MENSAJE_E1 = /no se encontraron registros de diagn[oó]stico para el periodo y filtros seleccionados/i;

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

/** Solo lecturas. Guarda la primera página del historial y cuenta las peticiones de página siguiente. */
async function interceptar(page: Page) {
  const estado = { eventos: 0, cursorReal: null as unknown, conCursor: [] as string[], pagina2: '' };
  await page.route((url) => API.test(url.href), async (route: Route) => {
    const req = route.request();
    const metodo = req.method();
    const url = new URL(req.url());
    if (metodo === 'OPTIONS' || /\/sesiones\/?(refresh)?$/.test(url.pathname)) return route.fallback();
    if (metodo !== 'GET') return route.abort();
    if (/\/prediccion\/historial\/\d+$/.test(url.pathname)) {
      const res = await route.fetch();
      const json = await res.json().catch(() => ({}));
      if (url.searchParams.has('cursor_paginacion')) {
        estado.conCursor.push(url.search);
        const tipos = (json.eventos ?? []).map((e: { tipo_evento: string }) => e.tipo_evento);
        estado.pagina2 = `HTTP ${res.status()} · ${tipos.length} eventos (${[...new Set(tipos)].join(', ')}) · cursor_siguiente: ${json.cursor_siguiente ? 'sí' : 'no'}${res.status() >= 400 ? ` · ${JSON.stringify(json).slice(0, 160)}` : ''}`;
        return route.fulfill({ response: res, json });
      }
      estado.eventos = (json.eventos ?? []).length;
      estado.cursorReal = json.cursor_siguiente ?? null;
      return route.fulfill({ response: res, json });
    }
    return route.fallback();
  });
  return estado;
}

async function irAHistorial(page: Page) {
  await page.goto(`${APP}/prediccion/historial`);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/historial/i, { timeout: 60_000 });
  await page.locator('#hist-activo').waitFor({ timeout: 60_000 });
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
}

async function elegirActivo(page: Page, id: number) {
  const campo = page.locator('#hist-activo');
  if ((await campo.evaluate((e) => e.tagName)) === 'SELECT') await campo.selectOption(String(id));
  else await campo.fill(String(id));
}

async function consultar(page: Page, id: number, desde = DESDE, hasta?: string) {
  await elegirActivo(page, id);
  await page.locator('#hist-desde').fill(desde);
  if (hasta) await page.locator('#hist-hasta').fill(hasta);
  await page.getByRole('button', { name: /consultar/i }).click();
  await expect(page.getByText(/consultando historial/i)).toBeHidden({ timeout: 60_000 });
}

/** Elemento enfocado y si muestra un indicador de foco. */
async function enfocado(page: Page) {
  return page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null;
    if (!a || a === document.body) return { descripcion: '(body)', focoVisible: false };
    const cs = getComputedStyle(a);
    const id = a.id;
    const label = id ? document.querySelector(`label[for="${id}"]`)?.textContent : '';
    return {
      descripcion: `${a.tagName.toLowerCase()}${a.getAttribute('type') ? `[${a.getAttribute('type')}]` : ''} "${(label || a.getAttribute('aria-label') || a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30)}"`,
      focoVisible: (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== 'none',
    };
  });
}

/** Región viva más cercana que contiene el elemento con `texto`. */
async function regionViva(page: Page, texto: RegExp) {
  return page.locator('main').getByText(texto).first().evaluate((el) => {
    let n: Element | null = el;
    while (n) {
      const live = n.getAttribute('aria-live');
      const rol = n.getAttribute('role');
      if (live && live !== 'off') return `aria-live="${live}"`;
      if (rol && ['status', 'alert', 'log'].includes(rol)) return `role="${rol}"`;
      n = n.parentElement;
    }
    return null;
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

test.describe('TC-DIS-188 — Filtros y paginación por cursor del Historial Diagnóstico', () => {
  // Cada test inicia sesión por su cuenta: un defecto en uno no debe saltar los demás
  test.describe.configure({ mode: 'default' });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!VIEWPORTS_HABILITADOS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_188_VIEWPORTS.`);
    expect(EMAIL, 'Faltan TEST_VETERINARIO_EMAIL / TEST_VETERINARIO_PASSWORD en testing/.env.test').not.toBe('');
    await iniciarSesion(page);
  });

  test(`a. Historial del activo #${ACTIVO_INDIVIDUAL} (>50 inferencias); escaneo de filtros y resultados`, async ({ page }, testInfo) => {
    const estado = await interceptar(page);
    await irAHistorial(page);
    await consultar(page, ACTIVO_INDIVIDUAL);
    testInfo.annotations.push({ type: 'Datos', description: `${estado.eventos} eventos en la primera página · cursor_siguiente real: ${JSON.stringify(estado.cursorReal)}` });
    expect.soft(estado.cursorReal, 'BLOQUEO: el backend no devuelve cursor_siguiente para el activo con >50 inferencias; no hay segunda página que recorrer').not.toBeNull();
    await escanear(page, 'filtros-resultados', testInfo);
  });

  test('b. [2.1.1 / 2.4.7] Filtros recorridos solo con teclado, con foco visible', async ({ page }, testInfo) => {
    await interceptar(page);
    await irAHistorial(page);
    await page.locator('#hist-activo').focus();
    const recorrido = [await enfocado(page)];
    // Un input de fecha tiene varias paradas internas (día, mes, año, calendario)
    for (let i = 0; i < 18 && !/Consultar/.test(recorrido[recorrido.length - 1].descripcion); i++) {
      await page.keyboard.press('Tab');
      recorrido.push(await enfocado(page));
    }
    testInfo.annotations.push({ type: 'Recorrido con Tab', description: recorrido.map((p) => `${p.descripcion}${p.focoVisible ? '' : ' [sin indicador medido]'}`).join(' → ') });
    for (const [nombre, re] of [['fecha desde', /Desde/i], ['fecha hasta', /Hasta/i], ['nivel de riesgo', /Nivel de riesgo/i], ['patología', /Patolog/i]] as const) {
      expect.soft(recorrido.some((p) => re.test(p.descripcion)), `2.1.1: el filtro "${nombre}" se alcanza con Tab`).toBe(true);
    }
    // Por control: basta con que alguna de sus paradas muestre el indicador de foco
    const porControl = new Map<string, boolean>();
    for (const p of recorrido) if (p.descripcion !== '(body)') porControl.set(p.descripcion, (porControl.get(p.descripcion) ?? false) || p.focoVisible);
    const sinFoco = [...porControl].filter(([, v]) => !v).map(([k]) => k);
    expect.soft(sinFoco, 'DEFECTO 2.4.7: controles del panel de filtros que reciben foco sin indicador visible').toEqual([]);

    // Cambiar el nivel de riesgo solo con teclado
    const nivel = page.locator('#hist-nivel');
    await nivel.focus();
    await page.keyboard.press('ArrowDown');
    testInfo.annotations.push({ type: 'Nivel tras flecha abajo', description: await nivel.inputValue() });
  });

  test('c. [2.1.1 / 2.4.7] Paginación por cursor: botones siguiente / anterior por teclado', async ({ page }, testInfo) => {
    const estado = await interceptar(page);
    await irAHistorial(page);
    await consultar(page, ACTIVO_INDIVIDUAL);
    const siguiente = page.locator('main').getByRole('button', { name: /siguiente|cargar m[aá]s/i });
    const anterior = page.locator('main').getByRole('button', { name: /anterior/i });
    testInfo.annotations.push({ type: 'Controles de paginación', description: `cursor real: ${estado.cursorReal ? 'sí' : 'no'} · siguiente/cargar más: ${await siguiente.count()} · anterior: ${await anterior.count()}` });
    await expect(siguiente.first(), 'Con cursor, aparece el control para la página siguiente').toBeVisible({ timeout: 10_000 });
    // Modalidad teclado: Chrome solo pinta :focus-visible en un foco programático si la última interacción fue de teclado
    await page.keyboard.press('Shift');
    await siguiente.first().focus();
    const foco = await enfocado(page);
    testInfo.annotations.push({ type: 'Foco en el control de página', description: `${foco.descripcion}${foco.focoVisible ? '' : ' [SIN FOCO VISIBLE]'}` });
    expect.soft(foco.focoVisible, '2.4.7: el control de página siguiente muestra el foco').toBe(true);
    const textoAntes = (await page.locator('main').innerText()).length;
    await page.keyboard.press('Enter');
    await expect.poll(() => estado.pagina2, { message: '2.1.1: Enter sobre el control pide la página siguiente', timeout: 20_000 }).not.toBe('');
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    const textoDespues = (await page.locator('main').innerText()).length;
    const focoTras = await enfocado(page);
    testInfo.annotations.push({ type: 'Página siguiente', description: `respuesta: ${estado.pagina2} · texto de <main>: ${textoAntes} → ${textoDespues} caracteres · foco en: ${focoTras.descripcion}` });
    expect.soft(estado.pagina2, 'DEFECTO (backend): la página siguiente del historial responde con error; la paginación por cursor no carga más registros').not.toMatch(/^HTTP [45]\d\d/);
    expect.soft(focoTras.descripcion, 'DEFECTO 2.4.3: tras activar "Cargar más" el foco se pierde (queda en el body) en vez de quedar en un punto lógico').not.toBe('(body)');
    expect.soft(await anterior.count(), 'DEFECTO 2.1.1: no hay botón "anterior"; la paginación solo agrega resultados al final ("Cargar más") y no permite volver a la página previa').toBeGreaterThan(0);
  });

  test('d. [4.1.3] Filtro sin resultados: mensaje E1 anunciado con aria-live', async ({ page }, testInfo) => {
    await interceptar(page);
    await irAHistorial(page);
    // Un día sin inferencias para el activo
    await consultar(page, ACTIVO_INDIVIDUAL, '2020-01-01', '2020-01-02');
    const vacio = page.locator('main').getByText(/sin eventos|no se encontraron/i).first();
    await expect(vacio, 'Se muestra el estado sin resultados').toBeVisible({ timeout: 15_000 });
    const texto = (await vacio.innerText()).trim();
    const region = await regionViva(page, /sin eventos|no se encontraron/i);
    testInfo.annotations.push({ type: 'Mensaje E1', description: `"${texto}" · región viva: ${region ?? '(ninguna)'}` });
    expect.soft(region, 'DEFECTO 4.1.3: el mensaje sin resultados no está en una región aria-live; un lector no lo anuncia').not.toBeNull();
    expect.soft(texto, 'DEFECTO: el mensaje E1 no es el definido en el RF-67 ("No se encontraron registros de diagnóstico para el periodo y filtros seleccionados")').toMatch(MENSAJE_E1);
    await escanear(page, 'sin-resultados', testInfo);
  });

  test('e. Rango de fechas inválido: error E3 anunciado', async ({ page }, testInfo) => {
    await interceptar(page);
    await irAHistorial(page);
    await elegirActivo(page, ACTIVO_INDIVIDUAL);
    await page.locator('#hist-desde').fill('2026-10-20');
    await page.locator('#hist-hasta').fill('2026-10-01');
    const error = page.locator('main').getByRole('alert').filter({ hasText: /fecha/i });
    await expect(error, 'E3: el error del rango se anuncia con role="alert"').toBeVisible({ timeout: 10_000 });
    const campos = await page.locator('#hist-desde, #hist-hasta').evaluateAll((els) => els.map((e) => ({ id: e.id, invalido: e.getAttribute('aria-invalid'), describedby: e.getAttribute('aria-describedby') })));
    testInfo.annotations.push({ type: 'Error E3', description: `"${(await error.innerText()).trim()}" · campos: ${JSON.stringify(campos)}` });
    expect.soft(await page.getByRole('button', { name: /consultar/i }).isDisabled(), 'Con el rango inválido no se puede consultar').toBe(true);
    await escanear(page, 'error-rango-fechas', testInfo);
  });

  test(`f. Historial del área POBLACIONAL #${AREA_POBLACIONAL}: estado del filtro de patología`, async ({ page }, testInfo) => {
    const estado = await interceptar(page);
    await irAHistorial(page);
    await consultar(page, AREA_POBLACIONAL);
    const patologia = page.locator('#hist-pat');
    const info = await patologia.evaluate((s) => ({
      visible: !!(s as HTMLElement).offsetParent,
      disabled: (s as HTMLSelectElement).disabled,
      ariaDisabled: s.getAttribute('aria-disabled'),
      opciones: (s as HTMLSelectElement).options.length,
      describedby: s.getAttribute('aria-describedby'),
    }));
    testInfo.annotations.push({ type: 'Filtro de patología en POBLACIONAL', description: `${estado.eventos} eventos reales · ${JSON.stringify(info)}` });
    const ocultoODeshabilitado = !info.visible || info.disabled || info.ariaDisabled === 'true';
    expect.soft(ocultoODeshabilitado, 'DEFECTO: en el historial POBLACIONAL el filtro de patología sigue activo con opciones que no aplican (no se oculta ni se deshabilita con aria-disabled)').toBe(true);
    if (ocultoODeshabilitado && info.visible) expect.soft(info.describedby, 'El filtro deshabilitado explica el motivo (aria-describedby)').toBeTruthy();
    await escanear(page, 'poblacional', testInfo);
  });
});
