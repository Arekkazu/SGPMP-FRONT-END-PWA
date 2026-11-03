/**
 * TC-DIS-183 — Verificar accesibilidad WCAG 2.1 AA de aria-live en los contadores
 * auto-actualizables del Dashboard de Predicción Sanitaria [CRÍTICO]
 * RF-66 · CU-03 - Ejecutar Inferencia Sanitaria · Rol: Veterinario · Prioridad: Alta
 * Ruta: /prediccion/monitor — MonitorInferenciaView (Predicción IA → Monitor)
 *
 * Primera ejecución sobre el ambiente TEST nuevo (app en /sigab-test, API en /api-sgpmp-test).
 *
 * Precondiciones (hoja "CASOS DE PRUEBA UI/UX"):
 *   - Rol: Veterinario o Productor. Se usa la cuenta Veterinario de Finca Prueba Alfa creada con
 *     los datos semilla del 2026-10-22.
 *   - Capacidad de generar/simular una nueva inferencia o alerta INDIVIDUAL y una alerta
 *     POBLACIONAL de área (umbral_score_anomalia) durante la prueba.
 *
 * Criterios de aceptación: 0 violaciones axe A/AA; verificación de 4.1.3 (Status Messages): los
 * contadores que se actualizan solos (activos en Riesgo Alto/Crítico, alertas de predicción)
 * están en una región aria-live="polite" (o "assertive" para una alerta crítica nueva) y se
 * anuncian sin mover el foco; el contador de áreas en riesgo / alertas POBLACIONAL también.
 * La verificación con lector se automatiza: se inspecciona en el DOM la región viva que contiene
 * cada contador y se observa la vista con el foco fuera de los contadores para detectar si cambian.
 * Herramientas: @axe-core/playwright + Lighthouse en modo snapshot sobre la misma sesión
 * (resultados/). Una auditoría fallida de Lighthouse es un defecto aunque tenga peso 0.
 *
 * ESTADO DE LA VISTA (2026-10-22): MonitorInferenciaView pinta datos fijos de `monitorMock.ts` con
 * el banner "Datos simulados" (el motor de inferencia no expone endpoints). Los contadores
 * (MONITOR_KPIS) son constantes: la vista no consulta nada periódicamente, así que no hay forma de
 * provocar ni simular una actualización (ni con page.route, porque no viajan por la red). El
 * anuncio queda en "BLOQUEO"; la estructura que lo haría posible (aria-live) se verifica igual.
 * PROTECCIÓN DE DATOS: vista de solo lectura; toda escritura al backend se aborta.
 *
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_183_VIEWPORTS=escritorio
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route, type TestInfo } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { auditarLighthouse, PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';

const TC_ID = 'TC-DIS-183';
const EMAIL = process.env.TEST_VETERINARIO_EMAIL ?? '';
const PASSWORD = process.env.TEST_VETERINARIO_PASSWORD ?? '';
// Ambiente TEST desde 2026-10-20 (subrutas de Dokploy)
const APP = (process.env.APP_URL ?? 'https://api.inmero.co/sigab-test').replace(/\/$/, '');
const API = /\/api-sgpmp-test\//;

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_183_VIEWPORTS ?? 'movil,tablet,escritorio')
  .split(',')
  .map((v) => v.trim());

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/** Contadores que el caso pide anunciar. */
const CONTADORES = ['Riesgo alto', 'Alertas activas'];
/** Tiempo que se observa la vista esperando una actualización automática. */
const OBSERVACION_MS = 45_000;

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

/** Solo lecturas; cuenta las peticiones GET que hace la vista (para detectar consulta periódica). */
async function interceptar(page: Page) {
  const lecturas: { t: number; p: string }[] = [];
  await page.route((url) => API.test(url.href), (route: Route) => {
    const req = route.request();
    const metodo = req.method();
    const p = new URL(req.url()).pathname;
    if (metodo === 'GET') lecturas.push({ t: Date.now(), p: p.replace(/^.*\/api-sgpmp-test/, '') });
    if (metodo === 'GET' || metodo === 'OPTIONS' || /\/sesiones\/?(refresh)?$/.test(p)) return route.fallback();
    return route.abort();
  });
  return lecturas;
}

async function irAMonitor(page: Page) {
  // 1.4.0: el monitor lee datos reales de GET /prediccion/inferencias; se espera esa respuesta
  // para no leer la vista antes de que pinte los resultados
  const inferencias = page.waitForResponse((r) => /\/prediccion\/inferencias/.test(r.url()) && r.request().method() === 'GET', { timeout: 60_000 }).catch(() => null);
  await page.goto(`${APP}/prediccion/monitor`);
  await inferencias;
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/inferencia/i, { timeout: 60_000 });
  // 2026-10-27: SubPestanas es un <nav> de botones, no un widget ARIA de tabs.
  await expect(page.getByRole('button', { name: /activos y áreas monitoreados/i })).toBeVisible({ timeout: 60_000 });
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
}

interface Contador {
  etiqueta: string;
  valor: string;
  /** Región viva más cercana que lo contiene (aria-live o rol con live implícito). */
  region: string | null;
}

async function leerContadores(page: Page, etiquetas: string[]): Promise<Contador[]> {
  return page.evaluate((etqs) => {
    const vivo = (el: Element | null): string | null => {
      while (el) {
        const live = el.getAttribute('aria-live');
        const rol = el.getAttribute('role');
        if (live && live !== 'off') return `aria-live="${live}"`;
        if (rol && ['status', 'alert', 'log', 'marquee', 'timer'].includes(rol)) return `role="${rol}"`;
        el = el.parentElement;
      }
      return null;
    };
    const main = document.querySelector('main')!;
    return etqs.map((e) => {
      const nodo = [...main.querySelectorAll('div')].find((d) => d.children.length === 0 && d.textContent?.trim() === e);
      const tarjeta = nodo?.parentElement ?? null;
      return {
        etiqueta: e,
        valor: (tarjeta?.firstElementChild?.textContent ?? '').trim(),
        region: vivo(tarjeta),
      };
    });
  }, etiquetas);
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

test.describe('TC-DIS-183 — aria-live en los contadores del Dashboard de Predicción Sanitaria', () => {
  // Cada test inicia sesión por su cuenta: un defecto en uno no debe saltar los demás.
  // 2026-10-27: igual que TC-182 — login + 2 esperas de hasta 60s cada una exceden el default de
  // 30s sin que haya ningún selector roto. El test c ya ajusta su propio timeout (45s de espera).
  test.describe.configure({ mode: 'default', timeout: 300_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!VIEWPORTS_HABILITADOS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_183_VIEWPORTS.`);
    expect(EMAIL, 'Faltan TEST_VETERINARIO_EMAIL / TEST_VETERINARIO_PASSWORD en testing/.env.test').not.toBe('');
  });

  test('a. Navegar al dashboard y escanearlo', async ({ page }, testInfo) => {
    await interceptar(page);
    await iniciarSesion(page);
    await irAMonitor(page);
    const simulados = await page.getByRole('note').filter({ hasText: /datos simulados/i }).count();
    testInfo.annotations.push({ type: 'Banner "Datos simulados"', description: simulados ? 'sí' : 'no' });
    await escanear(page, 'dashboard', testInfo);
  });

  test('b. [4.1.3] Los contadores están en una región aria-live (inspección del DOM)', async ({ page }, testInfo) => {
    await interceptar(page);
    await iniciarSesion(page);
    await irAMonitor(page);
    const contadores = await leerContadores(page, CONTADORES);
    testInfo.annotations.push({ type: 'Contadores', description: contadores.map((c) => `${c.etiqueta}=${c.valor} · ${c.region ?? 'sin región viva'}`).join(' ‖ ') });
    const regiones = await page.locator('main [aria-live], main [role="status"], main [role="alert"], main [role="log"]').evaluateAll((els) => els.map((e) => `${e.tagName.toLowerCase()} ${e.getAttribute('aria-live') ?? e.getAttribute('role')}: "${(e.textContent ?? '').trim().slice(0, 50)}"`));
    testInfo.annotations.push({ type: 'Regiones vivas en <main>', description: regiones.join(' ‖ ') || '(ninguna)' });
    expect.soft(contadores.filter((c) => !c.valor).map((c) => c.etiqueta), 'Precondición: los contadores existen en el dashboard').toEqual([]);
    expect.soft(contadores.filter((c) => !c.region).map((c) => c.etiqueta), 'DEFECTO 4.1.3: contadores del dashboard fuera de cualquier región aria-live; un lector no anunciaría su cambio').toEqual([]);
  });

  test('c. [4.1.3] Actualización automática anunciada sin mover el foco', async ({ page }, testInfo) => {
    // La prueba observa la vista 45 s en busca de un cambio automático; margen real, no un cuelgue.
    testInfo.setTimeout(300_000);
    const lecturas = await interceptar(page);
    await iniciarSesion(page);
    await irAMonitor(page);
    // Foco fuera de la región de contadores: en la pestaña "Activos monitoreados"
    await page.getByRole('button', { name: /activos y áreas monitoreados/i }).focus();
    const antes = await leerContadores(page, CONTADORES);
    const desde = Date.now();
    await page.waitForTimeout(OBSERVACION_MS);
    const despues = await leerContadores(page, CONTADORES);
    const consultas = lecturas.filter((l) => l.t >= desde).map((l) => l.p);
    testInfo.annotations.push({ type: 'Observación', description: `${OBSERVACION_MS / 1000} s · antes ${JSON.stringify(antes.map((c) => c.valor))} · después ${JSON.stringify(despues.map((c) => c.valor))} · GET a la API en ese lapso: ${consultas.length ? consultas.join(', ') : 'ninguno'}` });
    const cambio = antes.some((c, i) => c.valor !== despues[i].valor);
    expect(cambio || consultas.length > 0, `BLOQUEO: en ${OBSERVACION_MS / 1000} s los contadores no cambiaron ni la vista volvió a consultar la API: el monitor (datos reales de GET /prediccion/inferencias) se carga una sola vez y no se refresca solo, así que no hay actualización automática que provocar ni anunciar`).toBe(true);
  });

  test('d. [4.1.3] Contador de áreas en riesgo / alertas POBLACIONAL con aria-live', async ({ page }, testInfo) => {
    await interceptar(page);
    await iniciarSesion(page);
    await irAMonitor(page);
    const texto = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
    const existe = /[áa]reas? en riesgo|poblacional/i.test(texto);
    testInfo.annotations.push({ type: 'Contador POBLACIONAL', description: existe ? 'sí' : 'no' });
    expect(existe, 'DEFECTO: el dashboard no tiene contador de áreas en riesgo / alertas POBLACIONAL (RFC-009 v1.1)').toBe(true);
  });
});
