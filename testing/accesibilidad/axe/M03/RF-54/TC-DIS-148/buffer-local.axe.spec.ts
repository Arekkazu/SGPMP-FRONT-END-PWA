/**
 * TC-DIS-148 — Verificar accesibilidad WCAG 2.1 AA del Panel de Estado del Buffer Local
 * RF-54 · CU-01 - Recibir y Validar Telemetría IoT (RF-54 - Buffer de Persistencia Local) · Rol: Administrador · Prioridad: Alta
 * Ruta: /telemetria/buffer — BufferView (Telemetría → Buffer)
 *
 * Primera ejecución sobre el ambiente TEST nuevo (app en /sigab-test, API en /api-sgpmp-test).
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
 * ESTADO DE LA VISTA (2026-10-22): BufferView pinta datos fijos de `bufferMock.ts` con el banner
 * "Datos simulados" (sin endpoint de lectura del equipo AIOT): 4 KPI, una tarjeta por dispositivo
 * (conexión, política, pendientes, último dato) y la cola de registros. No muestra capacidad,
 * porcentaje de ocupación ni el estado NORMAL/WARNING/CRITICO, y los datos no viajan por la red,
 * así que no se pueden reconstruir con page.route: el umbral ≥80% queda en "BLOQUEO" y lo que sí
 * existe se escanea y se verifica.
 * PROTECCIÓN DE DATOS: vista de solo lectura; toda escritura al backend se aborta.
 *
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_148_VIEWPORTS=escritorio
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route, type TestInfo } from '@playwright/test';
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

/** Indicadores que pide el 1.3.1 del caso, con los rótulos aceptables para cada uno. */
const INDICADORES: [string, RegExp][] = [
  ['capacidad_total', /capacidad total|capacidad_total/i],
  ['capacidad_utilizada', /capacidad utilizada|capacidad_utilizada|utilizad/i],
  ['porcentaje_ocupacion', /ocupaci[oó]n|% ocup|porcentaje/i],
  ['datos_pendientes', /pendientes/i],
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

async function irABuffer(page: Page) {
  await page.goto(`${APP}/telemetria/buffer`);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/buffer/i, { timeout: 60_000 });
  await expect(page.locator('main tbody tr').first()).toBeVisible({ timeout: 60_000 });
}

interface Tarjeta {
  id: string;
  texto: string;
  /** Texto que llega al árbol de accesibilidad (sin lo que está en aria-hidden). */
  textoAccesible: string;
}

/** Tarjetas por dispositivo: las que contienen "Política:". */
async function leerTarjetas(page: Page): Promise<Tarjeta[]> {
  return page.locator('main div').filter({ hasText: /^.*Política:/ }).evaluateAll((els) => els
    .filter((e) => [...e.children].some((c) => /^Política:/.test((c.textContent ?? '').trim())))
    .map((e) => {
      const visible = (n: Node): string => {
        if (n.nodeType === Node.TEXT_NODE) return n.textContent ?? '';
        const el = n as Element;
        if (el.getAttribute?.('aria-hidden') === 'true') return '';
        return [...el.childNodes].map(visible).join(' ');
      };
      return {
        id: (e.firstElementChild?.firstElementChild?.textContent ?? '').trim(),
        texto: (e.textContent ?? '').replace(/\s+/g, ' ').trim(),
        textoAccesible: visible(e).replace(/\s+/g, ' ').trim(),
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

test.describe('TC-DIS-148 — Panel de Estado del Buffer Local', () => {
  // Cada test inicia sesión por su cuenta: un bloqueo en uno no debe saltar los demás

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!VIEWPORTS_HABILITADOS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_148_VIEWPORTS.`);
    await protegerEscrituras(page);
    await iniciarSesion(page);
  });

  test('a. Navegar al panel del buffer; precondición: dispositivo offline con datos pendientes', async ({ page }, testInfo) => {
    await irABuffer(page);
    const simulados = await page.getByRole('note').filter({ hasText: /datos simulados/i }).count();
    const tarjetas = await leerTarjetas(page);
    testInfo.annotations.push({ type: 'Dispositivos', description: tarjetas.map((t) => t.textoAccesible).join(' ‖ ') });
    // textContent pega el id con el badge ("…002Buffer"); el texto accesible los separa
    const offlineConPendientes = tarjetas.filter((t) => /\bBuffer\b/.test(t.textoAccesible) && /Pendientes:\s*[1-9]/.test(t.textoAccesible));
    expect.soft(offlineConPendientes.length, 'Precondición: al menos un dispositivo en modo buffer con datos pendientes').toBeGreaterThan(0);
    expect.soft(simulados, 'BLOQUEO: el panel muestra datos fijos de ejemplo (banner "Datos simulados"); no hay lectura real del buffer').toBe(0);
  });

  test('b. [1.3.1 / 1.4.1] Escaneo del panel en estado NORMAL; indicadores y estado del buffer', async ({ page }, testInfo) => {
    await irABuffer(page);
    const texto = (await page.locator('main').innerText()).replace(/\s+/g, ' ');

    // 1.3.1: los 4 indicadores del caso, con rótulo
    const faltan = INDICADORES.filter(([, re]) => !re.test(texto)).map(([n]) => n);
    expect.soft(faltan, 'DEFECTO 1.3.1: indicadores del buffer que el panel no muestra (ni con rótulo ni sin él)').toEqual([]);

    // 1.4.1: el estado de ocupación se comunica con texto
    const estados = ['NORMAL', 'WARNING', 'ADVERTENCIA', 'CRITICO', 'CRÍTICO'].filter((e) => new RegExp(`\\b${e}\\b`, 'i').test(texto));
    testInfo.annotations.push({ type: 'Estados de ocupación con texto', description: estados.join(', ') || '(ninguno)' });
    const tarjetas = await leerTarjetas(page);
    const sinEstado = tarjetas.filter((t) => !/\b(NORMAL|WARNING|ADVERTENCIA|CR[IÍ]TICO)\b/i.test(t.texto)).map((t) => t.id);
    expect.soft(sinEstado, 'DEFECTO 1.4.1: dispositivos sin estado de ocupación del buffer (NORMAL / WARNING / CRITICO) en texto').toEqual([]);

    // KPI "Sincronizados hoy": es un conteo
    const kpi = await page.locator('main').getByText('Sincronizados hoy', { exact: true }).locator('xpath=..').innerText();
    testInfo.annotations.push({ type: 'KPI Sincronizados hoy', description: kpi.replace(/\s+/g, ' ') });
    expect.soft(kpi, 'DEFECTO: el KPI "Sincronizados hoy" muestra una fecha en vez del número de lecturas sincronizadas').not.toMatch(/\d{1,2}\/\d{1,2}\/\d{2,4}|19(69|70)/);

    await escanear(page, 'panel-normal', testInfo);
  });

  test('c. Buffer en umbral de advertencia (≥80%) y nuevo escaneo', async ({ page }) => {
    await irABuffer(page);
    const porcentaje = await page.locator('main').getByText(/\d+\s*%/).filter({ hasText: /ocupaci|buffer|capacidad/i }).count();
    expect(porcentaje, 'BLOQUEO: el panel no muestra porcentaje de ocupación ni estado WARNING, y los datos fijos no se pueden llevar al 80%').toBeGreaterThan(0);
  });

  test('d. [4.1.2] Política activa legible por lector de pantalla', async ({ page }, testInfo) => {
    await irABuffer(page);
    const tarjetas = await leerTarjetas(page);
    const politicas = tarjetas.map((t) => (t.textoAccesible.match(/Política:\s*(.+?)\s+Pendientes/) ?? [])[1] ?? '');
    testInfo.annotations.push({ type: 'Política que lee el lector', description: tarjetas.map((t, i) => `${t.id}: "${politicas[i]}"`).join(' ‖ ') });
    expect.soft(politicas.filter((p) => !p).length, '4.1.2: cada dispositivo expone su política con texto accesible').toBe(0);
    // El caso nombra POLITICA_RECHAZO / POLITICA_SOBRESCRITURA
    const fueraDelRF = [...new Set(politicas.filter((p) => p && !/rechaz|sobrescrib/i.test(p)))];
    expect.soft(fueraDelRF, 'DEFECTO 4.1.2: políticas mostradas que no corresponden a POLITICA_RECHAZO / POLITICA_SOBRESCRITURA del RF-54').toEqual([]);
    await escanear(page, 'politica', testInfo);
  });
});
