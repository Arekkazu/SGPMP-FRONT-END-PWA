/**
 * TC-DIS-148 — Verificar accesibilidad WCAG 2.1 AA del Panel de Estado del Buffer Local
 * RF-54 · CU-01 - Recibir y Validar Telemetría IoT (RF-54 - Buffer de Persistencia Local) · Rol: Administrador · Prioridad: Alta
 * Ruta: /telemetria/buffer — BufferView (Telemetría → Buffer)
 *
 * Tercera ejecución (2026-10-29) sobre 1.4.0-rc.11, ambiente TEST (app en /sigab-test, API en
 * /api-sgpmp-test).
 *
 * Precondiciones (hoja "CASOS DE PRUEBA UI/UX"):
 *   - Rol: Ingeniero de Campo (o Administrador). Se usa Administrador (no hay cuenta Ingeniero
 *     en .env.test).
 *   - Dispositivo de prueba en modo offline (o simulado) con datos pendientes en el buffer.
 *
 * Criterios de aceptación: 0 violaciones axe A/AA en
 *   1.3.1 — indicadores capacidad_total / capacidad_utilizada / porcentaje_ocupacion /
 *           datos_pendientes correctamente etiquetados;
 *   1.4.1 — el estado NORMAL / WARNING (≥80%) / CRITICO (≥95%) del buffer se comunica también
 *           por texto, no solo color;
 *   4.1.2 — indicador de política activa (POLITICA_RECHAZO / POLITICA_SOBRESCRITURA) con
 *           name/role/value, legible por lector de pantalla.
 * Herramientas: @axe-core/playwright + Lighthouse en modo snapshot sobre la misma sesión
 * (resultados/). Una auditoría fallida de Lighthouse es un defecto aunque tenga peso 0.
 *
 * ESTADO DE LA VISTA (1.4.0-rc.11): BufferView lee datos REALES de GET /iot/buffer (commit 88929166)
 * y pinta una tarjeta <section aria-labelledby> por dispositivo con su estado (pastilla con texto e
 * ícono), un <meter> de ocupación y los indicadores en un <dl> (rótulo dt / valor dd). En TEST la
 * respuesta trae ~549 dispositivos; solo los que reportan métricas (metricas_disponibles) muestran
 * capacidad, ocupación y política, y ninguno está en WARNING ni CRITICO. Para el paso c (umbral
 * ≥80%) se modifica la respuesta REAL antes de pintarla: dos dispositivos con métricas pasan a
 * WARNING (85%) y CRITICO (97%) ("Datos simulados"; no se escribe nada en el backend).
 * PROTECCIÓN DE DATOS: vista de solo lectura; toda escritura al backend se aborta.
 *
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_148_VIEWPORTS=escritorio
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page, type Route, type TestInfo } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { auditarLighthouse, PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';

const TC_ID = 'TC-DIS-148';
const EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';
// Ambiente TEST desde 2026-10-20 (subrutas de Dokploy)
const APP = (process.env.APP_URL ?? 'https://api.inmero.co/sigab-test').replace(/\/$/, '');
const API = /\/api-sgpmp-test\//;

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_148_VIEWPORTS ?? 'movil,tablet,escritorio')
  .split(',')
  .map((v) => v.trim());

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/** Indicadores que pide el 1.3.1 del caso, con el rótulo (dt) aceptable para cada uno. */
const INDICADORES: [string, RegExp][] = [
  ['capacidad_total', /capacidad total/i],
  ['capacidad_utilizada', /capacidad utilizada/i],
  ['porcentaje_ocupacion', /ocupaci[oó]n/i],
  ['datos_pendientes', /pendientes/i],
];

/** Rótulos del estado de ocupación (telemetry.json bufferview.estado_*). */
const ESTADO_TEXTO: Record<string, RegExp> = { NORMAL: /^Normal$/, WARNING: /Advertencia/, CRITICO: /Cr[ií]tico/ };

interface DispositivoBuffer {
  id_dispositivo_iot: number;
  serial: string | null;
  estado_local_buffer: string | null;
  datos_pendientes: number | null;
  metricas_disponibles: boolean;
  capacidad_total: number | null;
  capacidad_utilizada: number | null;
  porcentaje_ocupacion: number | null;
  estado_buffer: string | null;
  politica_buffer_activa: string | null;
}

test.use({ launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

// ── Sesión, datos reales y simulación del umbral ─────────────────────────────

// Un solo intento de login: si falla, la prueba se detiene (la cuenta se bloquea a los 5 intentos).
async function iniciarSesion(page: Page) {
  await page.goto(`${APP}/login`);
  await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill(EMAIL);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 });
}

/**
 * Lecturas reales; guarda la respuesta de GET /iot/buffer. Con `umbral`, los dos primeros
 * dispositivos con métricas pasan a WARNING (85%) y CRITICO (97%) antes de pintarse.
 */
async function interceptar(page: Page, opciones: { umbral?: boolean } = {}) {
  const estado = { dispositivos: [] as DispositivoBuffer[], simulados: [] as string[] };
  await page.route((url) => API.test(url.href), async (route: Route) => {
    const req = route.request();
    const metodo = req.method();
    const p = new URL(req.url()).pathname;
    if (metodo === 'OPTIONS' || /\/sesiones\/?(refresh)?$/.test(p)) return route.fallback();
    if (metodo !== 'GET') return route.abort();
    if (/\/iot\/buffer\/?$/.test(p)) {
      const res = await route.fetch();
      const json = (await res.json()) as DispositivoBuffer[];
      if (opciones.umbral) {
        const conMetricas = json.filter((d) => d.metricas_disponibles && d.capacidad_total);
        for (const [d, pct, est] of [[conMetricas[0], 85, 'WARNING'], [conMetricas[1], 97, 'CRITICO']] as const) {
          if (!d) continue;
          d.porcentaje_ocupacion = pct;
          d.capacidad_utilizada = Math.round((d.capacidad_total ?? 0) * pct / 100);
          d.estado_buffer = est;
          // En TEST solo hay POLITICA_SOBRESCRITURA: el crítico pasa a RECHAZO para verificar ese rótulo
          if (est === 'CRITICO') d.politica_buffer_activa = 'POLITICA_RECHAZO';
          estado.simulados.push(`${d.serial}: ${est} ${pct}% ${d.politica_buffer_activa}`);
        }
      }
      estado.dispositivos = json;
      return route.fulfill({ response: res, json });
    }
    return route.fallback();
  });
  return estado;
}

async function irABuffer(page: Page) {
  await page.goto(`${APP}/telemetria/buffer`);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/buffer/i, { timeout: 60_000 });
  await expect(page.locator('main section[aria-labelledby]').first()).toBeVisible({ timeout: 60_000 });
}

/** Tarjeta del dispositivo `serial` (región con nombre = su h2). */
function tarjeta(page: Page, serial: string): Locator {
  return page.locator('main').getByRole('region', { name: serial, exact: true });
}

/** Pares rótulo → valor del <dl> de una tarjeta, y su estado de ocupación. */
async function leerTarjeta(t: Locator) {
  return t.evaluate((s) => {
    const dts = [...s.querySelectorAll('dl dt')];
    const pares = dts.map((dt) => {
      const dd = dt.nextElementSibling;
      return { rotulo: (dt.textContent ?? '').trim(), valor: dd?.tagName === 'DD' ? (dd.textContent ?? '').trim() : null };
    });
    const pastilla = s.querySelector('h2')?.parentElement?.querySelector('span');
    const meter = s.querySelector('meter');
    return {
      pares,
      estado: pastilla ? { texto: (pastilla.textContent ?? '').trim(), icono: !!pastilla.querySelector('svg') } : null,
      meter: meter ? { nombre: meter.getAttribute('aria-label'), valor: meter.getAttribute('value') } : null,
    };
  });
}

// ── Escaneo ──────────────────────────────────────────────────────────────────

function resumenViolaciones(violaciones: { id: string; impact?: string | null; nodes: { target: unknown }[] }[]) {
  return violaciones.map((v) => `  - ${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => JSON.stringify(n.target)).join(', ')}`).join('\n');
}

async function escanear(page: Page, estado: string, testInfo: TestInfo) {
  const paso = `${estado}-${testInfo.project.name}`;
  await page.mouse.move(1, 1);
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

test.describe('TC-DIS-148 — Panel de Estado del Buffer Local', () => {
  // Cada test inicia sesión por su cuenta; el timeout global (30 s) no alcanza para login + axe +
  // Lighthouse sobre ~549 tarjetas
  test.describe.configure({ mode: 'default', timeout: 300_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!VIEWPORTS_HABILITADOS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_148_VIEWPORTS.`);
    await iniciarSesion(page);
  });

  test('a. Navegar al panel del buffer; precondición: dispositivo offline con datos pendientes', async ({ page }, testInfo) => {
    const estado = await interceptar(page);
    await irABuffer(page);
    const conPendientes = estado.dispositivos.filter((d) => (d.estado_local_buffer === 'A' || d.estado_local_buffer === 'L') && (d.datos_pendientes ?? 0) > 0);
    const conMetricas = estado.dispositivos.filter((d) => d.metricas_disponibles);
    const demo = await page.locator('main').getByRole('note').filter({ hasText: /datos simulados|datos de ejemplo|\bDEMO\b/i }).count();
    testInfo.annotations.push({ type: 'Datos reales (GET /iot/buffer)', description: `${estado.dispositivos.length} dispositivos · en buffer con pendientes: ${conPendientes.length} · con métricas de capacidad: ${conMetricas.length} (${conMetricas.map((d) => `${d.serial} ${d.porcentaje_ocupacion}% ${d.estado_buffer}`).join(', ')}) · marca DEMO: ${demo ? 'sí' : 'no'}` });
    expect.soft(conPendientes.length, 'Precondición: al menos un dispositivo en modo buffer con datos pendientes').toBeGreaterThan(0);
    expect.soft(demo, 'El panel usa datos reales (sin marca DEMO)').toBe(0);
    // Las tarjetas pintadas corresponden a la respuesta real
    await expect(page.locator('main section[aria-labelledby]')).toHaveCount(estado.dispositivos.length, { timeout: 30_000 });
  });

  test('b. [1.3.1 / 1.4.1] Escaneo del panel en estado NORMAL; indicadores y estado del buffer', async ({ page }, testInfo) => {
    const estado = await interceptar(page);
    await irABuffer(page);
    const conMetricas = estado.dispositivos.find((d) => d.metricas_disponibles);
    expect(conMetricas, 'BLOQUEO: ningún dispositivo reporta métricas de capacidad').toBeTruthy();
    const info = await leerTarjeta(tarjeta(page, conMetricas!.serial!));
    testInfo.annotations.push({ type: `Tarjeta ${conMetricas!.serial}`, description: JSON.stringify(info) });

    // 1.3.1: cada indicador con su rótulo (dt) y su valor (dd)
    const faltan = INDICADORES.filter(([, re]) => !info.pares.some((p) => re.test(p.rotulo) && p.valor)).map(([n]) => n);
    expect.soft(faltan, 'DEFECTO 1.3.1: indicadores sin rótulo dt / valor dd en la tarjeta').toEqual([]);
    // 1.4.1: el estado de ocupación con texto e ícono
    expect.soft(info.estado?.texto ?? '', `1.4.1: el estado ${conMetricas!.estado_buffer} se comunica con texto`).toMatch(ESTADO_TEXTO[conMetricas!.estado_buffer ?? 'NORMAL']);
    expect.soft(info.estado?.icono, '1.4.1: el estado lleva ícono además del color').toBe(true);
    // El medidor de ocupación expone nombre y valor
    expect.soft(info.meter?.nombre, '4.1.2: el medidor de ocupación tiene nombre').toMatch(/ocupaci[oó]n/i);

    // Un dispositivo sin métricas: lo dice con texto
    const sinMetricas = estado.dispositivos.find((d) => !d.metricas_disponibles && d.serial);
    if (sinMetricas) testInfo.annotations.push({ type: `Tarjeta sin métricas ${sinMetricas.serial}`, description: JSON.stringify(await leerTarjeta(tarjeta(page, sinMetricas.serial!))) });
    await escanear(page, 'panel-normal', testInfo);
  });

  test('c. [1.4.1] Buffer en umbral de advertencia (≥80%) y crítico (≥95%); nuevo escaneo (Datos simulados)', async ({ page }, testInfo) => {
    const estado = await interceptar(page, { umbral: true });
    await irABuffer(page);
    testInfo.annotations.push({ type: 'Datos simulados', description: `Respuesta REAL de GET /iot/buffer con estos dispositivos modificados antes de pintarse: ${estado.simulados.join(' · ') || '(ninguno: no hay dispositivos con métricas)'}` });
    expect(estado.simulados.length, 'BLOQUEO: no hay dispositivos con métricas para llevar al umbral').toBeGreaterThan(0);
    for (const s of estado.simulados) {
      const [serial, resto] = s.split(': ');
      const est = resto.split(' ')[0];
      const info = await leerTarjeta(tarjeta(page, serial));
      testInfo.annotations.push({ type: `Tarjeta ${serial} en ${est}`, description: JSON.stringify(info) });
      expect.soft(info.estado?.texto ?? '', `1.4.1: el estado ${est} se comunica con texto`).toMatch(ESTADO_TEXTO[est]);
      expect.soft(info.estado?.icono, `1.4.1: el estado ${est} lleva ícono`).toBe(true);
      expect.soft(info.meter?.valor, `El medidor refleja la ocupación de ${est}`).toBe(resto.split(' ')[1].replace('%', ''));
      const politica = info.pares.find((p) => /pol[ií]tica/i.test(p.rotulo))?.valor ?? '';
      expect.soft(politica, `4.1.2: la política ${resto.split(' ')[2]} se lee con su rótulo`).toMatch(/RECHAZO/.test(resto) ? /rechaza/i : /sobrescribe/i);
    }
    // El KPI de críticos (región viva) lo cuenta
    const kpis = (await page.locator('main [aria-live]').first().innerText()).replace(/\s+/g, ' ');
    testInfo.annotations.push({ type: 'KPIs (aria-live)', description: kpis });
    await escanear(page, 'panel-umbral', testInfo);
  });

  test('d. [4.1.2] Política activa legible por lector de pantalla', async ({ page }, testInfo) => {
    const estado = await interceptar(page);
    await irABuffer(page);
    const conPolitica = estado.dispositivos.filter((d) => d.politica_buffer_activa);
    testInfo.annotations.push({ type: 'Políticas reales', description: conPolitica.map((d) => `${d.serial}: ${d.politica_buffer_activa}`).join(' · ') || '(ninguna)' });
    expect(conPolitica.length, 'BLOQUEO: ningún dispositivo reporta política activa').toBeGreaterThan(0);
    for (const d of conPolitica) {
      const t = tarjeta(page, d.serial!);
      const info = await leerTarjeta(t);
      const politica = info.pares.find((p) => /pol[ií]tica/i.test(p.rotulo));
      testInfo.annotations.push({ type: `Política ${d.serial}`, description: JSON.stringify(politica) });
      expect.soft(politica?.valor ?? '', `4.1.2: la política de ${d.serial} se lee con rótulo y valor`).toMatch(/rechaza|sobrescribe/i);
      // Lo que recorre un lector dentro de la región de la tarjeta
      const arbol = await t.ariaSnapshot();
      expect.soft(arbol, `4.1.2: el árbol de accesibilidad de ${d.serial} expone "Política activa" y su valor`).toMatch(/Política activa[\s\S]*(Rechaza|Sobrescribe)/);
    }
    await escanear(page, 'politica', testInfo);
  });
});
