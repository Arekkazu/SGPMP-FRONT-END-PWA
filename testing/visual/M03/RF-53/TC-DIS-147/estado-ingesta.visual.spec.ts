/**
 * TC-DIS-147 — Verificar consistencia visual de la vista técnica de Estado de Ingesta de
 * Telemetría frente a baseline
 * RF-53 · CU-01 - Recibir y Validar Telemetría IoT · Rol: Administrador · Prioridad: Alta
 * Ruta: /telemetria/ingesta — IngestaView (Telemetría → Ingesta)
 *
 * Primera ejecución sobre el ambiente TEST nuevo (app en /sigab-test, API en /api-sgpmp-test).
 *
 * Criterio (hoja M03): 0 diferencias no aprobadas vs. baseline vigente en los 3 viewports,
 * cubriendo un registro de cada uno de los 9 estados de calidad, una observación de visión
 * aceptada y una rechazada (con las celdas 'No aplica' visibles) y, en móvil, sin desbordamiento
 * horizontal fuera de la región de scroll de la tabla. Pasos: listado completo, filtro por estado
 * de calidad y filtro por tipo de dato 'Visión'.
 * No existía baseline vigente: la primera corrida la crea (--update-snapshots).
 *
 * ESTADO DE LA VISTA (2026-10-22): IngestaView pinta datos fijos de `ingestaMock.ts` con el banner
 * "Datos simulados" (sin endpoint de lectura del equipo AIOT): 7 lecturas escalares con solo 3
 * calidades (VALIDA, FUERA_DE_RANGO, ERROR), sin filas de visión y sin filtros. No viajan por la
 * red, así que no se pueden reconstruir con page.route. La precondición y los filtros fallan con
 * "BLOQUEO"; el listado que sí existe se captura (los datos fijos dan una baseline estable) y se
 * revisa contra el Design System v2.0: cada desviación es una aserción "DEFECTO".
 *
 * Estado capturado (contenido de <main>, sin AppBar ni sidebar): listado.
 * Máscaras: ninguna. Las horas y los KPI son fijos en el código.
 * Umbral: el de Playwright por defecto, igual que los visuales de M02 y M09.
 * Captura completa de <main> con captura-completa.css (stylePath): la app hace scroll dentro de <main>.
 * Rol: Administrador (no hay cuenta Ingeniero de Campo en .env.test).
 * Escrituras: ninguna. Todo POST/PUT/PATCH/DELETE a la API se aborta (salvo /sesiones/).
 *
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_147_VIEWPORTS=escritorio
 */
import path from 'path';
import { expect, test, type Page, type Route, type TestInfo } from '@playwright/test';

const EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';
// Ambiente TEST desde 2026-10-20 (subrutas de Dokploy)
const APP = (process.env.APP_URL ?? 'https://api.inmero.co/sigab-test').replace(/\/$/, '');
const API = /\/api-sgpmp-test\//;

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_147_VIEWPORTS ?? 'movil,tablet,escritorio')
  .split(',')
  .map((v) => v.trim());

const ESTADOS_CALIDAD = [
  'LECTURA_VALIDA', 'FUERA_DE_RANGO', 'ERROR_ESTRUCTURA', 'ERROR_AUTENTICACION', 'ERROR_DUPLICADO',
  'ERROR_TIEMPO', 'ERROR_UNIDAD', 'ERROR_SENSOR', 'ERROR_CALIBRACION',
];

const OPCIONES_CAPTURA = {
  animations: 'disabled' as const,
  caret: 'hide' as const,
  stylePath: path.join(__dirname, 'captura-completa.css'),
};

/** Valores del DS v2.0 por rango de ancho (CLAUDE.md: grid y tipografía). */
function esperadoDS(ancho: number) {
  if (ancho < 480) return { pagePad: 18, h1: 18 };
  if (ancho < 768) return { pagePad: 18, h1: 19 };
  if (ancho < 1200) return { pagePad: 24, h1: 20 };
  return { pagePad: 40, h1: 20 };
}

const norm = (s: string) => s.trim().replace(/\s+/g, '_').toUpperCase();

// ── Sesión y navegación ──────────────────────────────────────────────────────

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

function main(page: Page) {
  return page.getByRole('main');
}

/** Abre la vista y la deja lista: tabla visible, red quieta, fuentes cargadas y scroll arriba. */
async function irAIngesta(page: Page) {
  await page.goto(`${APP}/telemetria/ingesta`);
  await expect(main(page).getByRole('heading', { level: 1 })).toContainText(/ingesta/i, { timeout: 60_000 });
  await expect(main(page).locator('tbody tr').first()).toBeVisible({ timeout: 60_000 });
  await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
  await page.evaluate(async () => {
    await document.fonts.ready;
    document.querySelector('main')?.scrollTo(0, 0);
    window.scrollTo(0, 0);
  });
  // Sin toasts ni alertas flotando encima
  await expect(page.locator('.ds-toast, [role="status"]').filter({ hasText: /\S/ })).toHaveCount(0);
}

/** Tema e idioma de la cuenta compartida en el momento de capturar. */
async function registrarEntorno(page: Page, testInfo: TestInfo, estado: string) {
  const entorno = await page.evaluate(() => ({
    tema: document.documentElement.getAttribute('data-theme') ?? '(sin data-theme)',
    idioma: document.documentElement.getAttribute('lang') ?? '(sin lang)',
  }));
  const linea = `[entorno] ${testInfo.project.name} · ${estado} · tema=${entorno.tema} · idioma=${entorno.idioma}`;
  console.log(linea);
  testInfo.annotations.push({ type: 'Entorno', description: linea });
}

// ── Casos ────────────────────────────────────────────────────────────────────

test.describe('TC-DIS-147 - Consistencia visual - Estado de Ingesta de Telemetría (RF-53)', () => {
  // Cada test inicia sesión por su cuenta: un bloqueo en uno no debe saltar la captura
  test.describe.configure({ mode: 'default', timeout: 300_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!VIEWPORTS_HABILITADOS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_147_VIEWPORTS.`);
    expect(EMAIL, 'Faltan TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD en testing/.env.test').not.toBe('');
    await protegerEscrituras(page);
    await iniciarSesion(page);
  });

  test('1. Precondición: 9 estados de calidad y observaciones de visión en el listado', async ({ page }, testInfo) => {
    await irAIngesta(page);
    const simulados = await main(page).getByRole('note').filter({ hasText: /datos simulados/i }).count();
    const filas = await main(page).locator('tbody tr').allInnerTexts();
    const calidades = [...new Set(await main(page).locator('tbody tr td:nth-child(5)').allInnerTexts())].map(norm);
    testInfo.annotations.push({ type: 'Datos', description: `${filas.length} lecturas · calidades: ${calidades.join(', ')} · banner "Datos simulados": ${simulados ? 'sí' : 'no'}` });

    expect.soft(simulados, 'BLOQUEO: la vista muestra datos fijos de ejemplo (banner "Datos simulados"); no hay lectura real de la ingesta').toBe(0);
    expect.soft(ESTADOS_CALIDAD.filter((e) => !calidades.includes(e)), 'BLOQUEO: estados de calidad de la precondición que no aparecen en el listado').toEqual([]);
    expect.soft(filas.filter((f) => /visi[oó]n/i.test(f)).length, 'BLOQUEO: no hay observaciones de visión (aceptada y rechazada) con celdas "No aplica"').toBeGreaterThan(0);
    expect.soft(filas.filter((f) => /no aplica/i.test(f)).length, 'BLOQUEO: ninguna fila muestra celdas "No aplica"').toBeGreaterThan(0);
  });

  test('2. Listado completo frente a baseline; revisión contra el DS', async ({ page }, testInfo) => {
    await irAIngesta(page);
    const ancho = page.viewportSize()?.width ?? 0;
    const ds = esperadoDS(ancho);

    const medidas = await page.evaluate(() => {
      const m = document.querySelector('main')!;
      const h1 = m.querySelector('h1')!;
      const cabecera = h1.parentElement!;
      const tabla = m.querySelector('table')!;
      const wrap = tabla.parentElement!;
      const th = m.querySelector('thead th')!;
      const px = (v: string) => Math.round(parseFloat(v));
      return {
        docDesborda: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        mainDesborda: m.scrollWidth > m.clientWidth + 1,
        tablaDesborda: wrap.scrollWidth > wrap.clientWidth + 1,
        padCabecera: px(getComputedStyle(cabecera).paddingLeft),
        h1: px(getComputedStyle(h1).fontSize),
        th: px(getComputedStyle(th).fontSize),
      };
    });
    testInfo.annotations.push({ type: 'Medidas', description: `ancho=${ancho} · ${JSON.stringify(medidas)} · DS=${JSON.stringify(ds)}` });

    // En móvil la tabla puede desbordar solo dentro de su región de scroll
    expect.soft(medidas.docDesborda || medidas.mainDesborda, 'DEFECTO: la página desborda horizontalmente fuera de la región de scroll de la tabla').toBe(false);
    expect.soft(medidas.padCabecera, `DEFECTO DS: la cabecera usa ${medidas.padCabecera}px de padding lateral fijo en vez de --page-pad (${ds.pagePad}px a ${ancho}px); el título queda desalineado del contenido`).toBe(ds.pagePad);
    expect.soft(medidas.h1, `DEFECTO DS: el H1 mide ${medidas.h1}px fijo; --fs-heading-md a ${ancho}px es ${ds.h1}px`).toBe(ds.h1);
    expect.soft(medidas.th, `DEFECTO DS: los encabezados de la tabla miden ${medidas.th}px; el mínimo de la escala es --fs-label-sm (11px)`).toBeGreaterThanOrEqual(11);

    await registrarEntorno(page, testInfo, 'listado');
    await expect(main(page)).toHaveScreenshot('listado.png', OPCIONES_CAPTURA);
  });

  test('3. Filtro por estado de calidad y por tipo de dato "Visión"', async ({ page }) => {
    await irAIngesta(page);
    const filtros = await main(page).locator('select, [role="combobox"]').count();
    expect.soft(await main(page).getByRole('combobox', { name: /calidad|estado/i }).count(), 'BLOQUEO: la vista no tiene filtro por estado de calidad').toBeGreaterThan(0);
    expect.soft(await main(page).getByRole('combobox', { name: /tipo/i }).count(), 'BLOQUEO: la vista no tiene filtro por tipo de dato (escalar / visión)').toBeGreaterThan(0);
    expect(filtros, 'BLOQUEO: sin filtros no hay estados filtrados que capturar').toBeGreaterThan(0);
  });
});
