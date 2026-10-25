/**
 * TC-DIS-182 — Verificar accesibilidad WCAG 2.1 AA de la redundancia badge + color en los 4
 * niveles de riesgo del Dashboard de Predicción Sanitaria [CRÍTICO]
 * RF-66 · CU-03 - Ejecutar Inferencia Sanitaria · Rol: Veterinario · Prioridad: Alta
 * Ruta: /prediccion/monitor — MonitorInferenciaView (Predicción IA → Monitor)
 *
 * Primera ejecución sobre el ambiente TEST nuevo (app en /sigab-test, API en /api-sgpmp-test).
 *
 * Precondiciones (hoja "CASOS DE PRUEBA UI/UX"):
 *   - Rol: Veterinario o Productor. Se usa la cuenta Veterinario de Finca Prueba Alfa creada con
 *     los datos semilla del 2026-10-22.
 *   - Datos congelados con un activo INDIVIDUAL en cada nivel_riesgo (0 a 3) y un área
 *     POBLACIONAL cuyo nivel se derive del score_anomalia (RFC-009 v1.1).
 *
 * Criterios de aceptación: 0 violaciones axe A/AA en
 *   1.4.1 — los 4 niveles (0=Normal, 1=Riesgo Bajo, 2=Riesgo Alto, 3=Crítico) se distinguen por
 *           badge/ícono y etiqueta textual, no solo por color;
 *   1.4.3 — contraste de texto ≥ 4.5:1 en cada badge de riesgo;
 *   4.1.2 — name/role/value del badge expuestos a la tecnología de asistencia;
 *   POBLACIONAL — resultado identificado como de un área, con score de anomalía rotulado, sin
 *           enfermedad estimada ni probabilidades por clase ('No aplica (modelo poblacional)').
 * La verificación con lector de pantalla se automatiza leyendo el nombre accesible de cada
 * tarjeta (lo que anuncia NVDA/VoiceOver al llegar a ella con Tab).
 * Herramientas: @axe-core/playwright + Lighthouse en modo snapshot sobre la misma sesión
 * (resultados/). Una auditoría fallida de Lighthouse es un defecto aunque tenga peso 0.
 *
 * ESTADO DE LA VISTA (2026-10-22): MonitorInferenciaView pinta datos fijos de `monitorMock.ts` con
 * el banner "Datos simulados" (el motor de inferencia no expone endpoints): 4 activos INDIVIDUAL,
 * uno por nivel 0–3, y ningún resultado POBLACIONAL. Las inferencias semilla del backend no se
 * muestran. Los niveles sí se pueden evaluar sobre el mock; lo que exige datos reales queda en
 * "BLOQUEO" y lo que la vista no implementa, en "DEFECTO".
 * PROTECCIÓN DE DATOS: vista de solo lectura; toda escritura al backend se aborta.
 *
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_182_VIEWPORTS=escritorio
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route, type TestInfo } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { auditarLighthouse, PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';

const TC_ID = 'TC-DIS-182';
const EMAIL = process.env.TEST_VETERINARIO_EMAIL ?? '';
const PASSWORD = process.env.TEST_VETERINARIO_PASSWORD ?? '';
// Ambiente TEST desde 2026-10-20 (subrutas de Dokploy)
const APP = (process.env.APP_URL ?? 'https://api.inmero.co/sigab-test').replace(/\/$/, '');
const API = /\/api-sgpmp-test\//;

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_182_VIEWPORTS ?? 'movil,tablet,escritorio')
  .split(',')
  .map((v) => v.trim());

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/** Etiquetas de nivel_riesgo que define el caso (RF-66). */
const ETIQUETAS_RF = ['Normal', 'Riesgo Bajo', 'Riesgo Alto', 'Crítico'];

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
  await expect(page.getByRole('tab', { name: /activos monitoreados/i })).toBeVisible({ timeout: 60_000 });
}

interface Tarjeta {
  /** Nombre accesible del botón de la tarjeta (lo que anuncia un lector al enfocarla). */
  nombre: string;
  badge: string;
  colorTexto: string;
  fondo: string;
  contraste: number;
  icono: boolean;
}

/** Tarjetas de activos: botones de la grilla con su badge de nivel. */
async function leerTarjetas(page: Page): Promise<Tarjeta[]> {
  return page.locator('main button').filter({ has: page.locator('span[style*="border-radius: var(--r-full)"], span[style*="9999px"]') }).evaluateAll((botones) => {
    const rgb = (c: string) => (c.match(/[\d.]+/g) ?? []).map(Number);
    const lum = ([r, g, b]: number[]) => {
      const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    /** Fondo efectivo: el primer ancestro con fondo opaco. */
    const fondoDe = (el: Element | null): string => {
      while (el) {
        const bg = getComputedStyle(el).backgroundColor;
        const [, , , a = 1] = rgb(bg);
        if (bg && !/transparent/.test(bg) && a > 0) return bg;
        el = el.parentElement;
      }
      return 'rgb(255, 255, 255)';
    };
    const textoAccesible = (n: Node): string => {
      if (n.nodeType === Node.TEXT_NODE) return n.textContent ?? '';
      const el = n as Element;
      if (el.getAttribute?.('aria-hidden') === 'true') return '';
      if (el.getAttribute?.('aria-label')) return ` ${el.getAttribute('aria-label')} `;
      return [...el.childNodes].map(textoAccesible).join(' ');
    };
    return botones.map((b) => {
      const pill = [...b.querySelectorAll('span')].find((s) => /9999px|r-full/.test(s.getAttribute('style') ?? '') || getComputedStyle(s).borderRadius === '9999px')!;
      const color = getComputedStyle(pill).color;
      const fondo = fondoDe(pill);
      const [l1, l2] = [lum(rgb(color)), lum(rgb(fondo))].sort((x, y) => y - x);
      return {
        nombre: (b.getAttribute('aria-label') ?? textoAccesible(b)).replace(/\s+/g, ' ').trim(),
        badge: (pill.textContent ?? '').trim(),
        colorTexto: color,
        fondo,
        contraste: Math.round(((l1 + 0.05) / (l2 + 0.05)) * 100) / 100,
        icono: !!pill.querySelector('svg'),
      };
    });
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

test.describe('TC-DIS-182 — Niveles de riesgo en el Dashboard de Predicción Sanitaria', () => {
  // Cada test inicia sesión por su cuenta: un defecto en uno no debe saltar los demás
  test.describe.configure({ mode: 'default', timeout: 300_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!VIEWPORTS_HABILITADOS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_182_VIEWPORTS.`);
    expect(EMAIL, 'Faltan TEST_VETERINARIO_EMAIL / TEST_VETERINARIO_PASSWORD en testing/.env.test').not.toBe('');
    await protegerEscrituras(page);
    await iniciarSesion(page);
  });

  test('a. Navegar al dashboard; precondición de datos congelados', async ({ page }, testInfo) => {
    await irAMonitor(page);
    const simulados = await page.getByRole('note').filter({ hasText: /datos simulados/i }).count();
    const tarjetas = await leerTarjetas(page);
    testInfo.annotations.push({ type: 'Datos', description: `${tarjetas.length} tarjetas · badges: ${tarjetas.map((t) => t.badge).join(', ')} · banner "Datos simulados": ${simulados ? 'sí' : 'no'}` });
    expect.soft(new Set(tarjetas.map((t) => t.badge)).size, 'Precondición: los 4 niveles de riesgo representados').toBe(4);
    expect.soft(simulados, 'BLOQUEO: el dashboard muestra datos fijos de ejemplo (banner "Datos simulados"); las inferencias semilla del backend no se ven').toBe(0);

    // KPI "Paquetes hoy": es un conteo
    const paquetes = await page.locator('main').getByText('Paquetes hoy', { exact: true }).locator('xpath=..').innerText();
    testInfo.annotations.push({ type: 'Paquetes hoy', description: paquetes.replace(/\s+/g, ' ') });
    expect.soft(paquetes, 'DEFECTO: el indicador "Paquetes hoy" muestra una fecha en vez del número de paquetes').not.toMatch(/\d{1,2}\/\d{1,2}\/\d{2,4}|19(69|70)/);
  });

  test('b. [1.4.1] Escaneo del dashboard; cada nivel con badge y etiqueta textual del RF', async ({ page }, testInfo) => {
    await irAMonitor(page);
    const tarjetas = await leerTarjetas(page);
    const sinTexto = tarjetas.filter((t) => !t.badge).length;
    expect.soft(sinTexto, '1.4.1: cada tarjeta lleva un badge con texto').toBe(0);
    testInfo.annotations.push({ type: 'Ícono en el badge', description: `${tarjetas.filter((t) => t.icono).length}/${tarjetas.length}` });

    const etiquetas = [...new Set(tarjetas.map((t) => t.badge))];
    const fueraDelRF = etiquetas.filter((e) => !ETIQUETAS_RF.includes(e));
    expect.soft(fueraDelRF, `DEFECTO 1.4.1: etiquetas de nivel que no son las del RF-66 (${ETIQUETAS_RF.join(' / ')})`).toEqual([]);
    await escanear(page, 'dashboard-activos', testInfo);
  });

  test('c. [1.4.3] Contraste de texto de cada badge ≥ 4.5:1', async ({ page }, testInfo) => {
    await irAMonitor(page);
    const tarjetas = await leerTarjetas(page);
    testInfo.annotations.push({ type: 'Contraste por badge', description: tarjetas.map((t) => `${t.badge}: ${t.contraste}:1 (${t.colorTexto} sobre ${t.fondo})`).join(' ‖ ') });
    const bajos = tarjetas.filter((t) => t.contraste < 4.5).map((t) => `${t.badge} ${t.contraste}:1`);
    expect.soft(bajos, 'DEFECTO 1.4.3: badges con contraste de texto menor a 4.5:1').toEqual([]);
  });

  test('d. [4.1.2] Lo que anuncia el lector al llegar a cada tarjeta incluye el nivel de riesgo', async ({ page }, testInfo) => {
    await irAMonitor(page);
    const tarjetas = await leerTarjetas(page);
    testInfo.annotations.push({ type: 'Nombre accesible de cada tarjeta', description: tarjetas.map((t) => `"${t.nombre}"`).join(' ‖ ') });
    const sinNivel = tarjetas.filter((t) => !t.nombre.includes(t.badge)).map((t) => t.nombre);
    expect.soft(sinNivel, '4.1.2: el nombre accesible de la tarjeta incluye su nivel de riesgo').toEqual([]);
    // El nivel llega como texto suelto dentro de un nombre largo; se registra si se anuncia como "riesgo"
    const sinContexto = tarjetas.filter((t) => !/riesgo|nivel|cr[ií]tico|normal/i.test(t.nombre)).map((t) => t.badge);
    testInfo.annotations.push({ type: 'Tarjetas cuyo anuncio no dice "riesgo"/"nivel"', description: sinContexto.join(', ') || '(ninguna)' });

    // Pestaña "Feed de inferencias": mismo badge en tabla; las filas abren el detalle
    await page.getByRole('tab', { name: /feed de inferencias/i }).click();
    await expect(page.locator('main tbody tr').first()).toBeVisible();
    const filas = await page.locator('main tbody tr').evaluateAll((trs) => trs.map((tr) => ({ tabindex: tr.getAttribute('tabindex'), rol: tr.getAttribute('role'), clic: (tr as HTMLElement).style.cursor === 'pointer' })));
    testInfo.annotations.push({ type: 'Filas del feed', description: JSON.stringify(filas[0]) });
    expect.soft(filas.filter((f) => f.clic && f.tabindex === null).length, 'DEFECTO 2.1.1: las filas del feed abren el detalle con clic pero no son enfocables ni operables con teclado').toBe(0);
    await escanear(page, 'feed-inferencias', testInfo);
  });

  test('e. Tarjeta del área POBLACIONAL: nombre del área, score de anomalía y "No aplica"', async ({ page }, testInfo) => {
    await irAMonitor(page);
    const texto = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
    const poblacional = /poblacional|[áa]rea\b.*anomal|score de anomal|puntaje de anomal/i.test(texto);
    testInfo.annotations.push({ type: 'Resultado POBLACIONAL en la vista', description: poblacional ? 'sí' : 'no' });
    expect.soft(poblacional, 'DEFECTO: el dashboard no presenta resultados POBLACIONAL (área con score de anomalía, RFC-009 v1.1); solo activos individuales').toBe(true);
    expect.soft(/no aplica \(modelo poblacional\)/i.test(texto), 'DEFECTO: no aparece "No aplica (modelo poblacional)" donde no aplican enfermedad estimada ni probabilidades por clase').toBe(true);
  });
});
