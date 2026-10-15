/**
 * TC-DIS-184 — Verificar accesibilidad WCAG 2.1 AA de la navegación por teclado del panel de
 * filtros del Dashboard de Predicción Sanitaria
 * RF-66 · CU-03 - Ejecutar Inferencia Sanitaria · Rol: Productor · Prioridad: Media
 * Ruta: /prediccion/monitor — MonitorInferenciaView (Predicción IA → Monitor)
 *
 * ESTADO: esqueleto pendiente de ejecución (fase Discovery - Planeación). El módulo todavía no
 * se puede probar en el ambiente TEST; cada paso queda como test.fixme y se implementa cuando
 * el módulo esté disponible. Ningún test de este archivo produce resultados todavía.
 *
 * Precondiciones (hoja "CASOS DE PRUEBA UI/UX"):
 *   - La aplicación debe estar desplegada y accesible en el ambiente de prueba (Dockploy).
 *   - Rol: Veterinario o Productor.
 *   - Dashboard con datos de prueba disponibles para al menos dos combinaciones de filtros
 *     (área productiva, tipo de modelo/paradigma, nivel de riesgo, fecha).
 *
 * Criterios de aceptación:
 *   0 violaciones axe A/AA en 2.1.1 y 2.4.7 (filtros por área productiva, tipo de
 *   modelo/paradigma, nivel de riesgo y rango de fechas totalmente operables por teclado, con
 *   foco visible); 2.4.3 (orden de foco lógico entre filtros y tarjetas de resultado, tanto de
 *   activos INDIVIDUAL como de áreas POBLACIONAL)
 *
 * Notas:
 *   Incluir en el recorrido por teclado el acceso a la tarjeta de detalle de un activo desde el
 *   listado filtrado. Actualizado por RFC-009 v1.1 (2026-10-02): se incorpora el paradigma
 *   POBLACIONAL (resultado por área con score_anomalia, sin patología ni probabilidad por
 *   clase).
 *
 * Protección de datos: no crear ni modificar registros reales. Las escrituras se abortan por
 * defecto; los estados que exigen datos (alertas, inferencias, errores) se simulan con
 * page.route + route.fulfill y se marcan como "Datos simulados".
 *
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_184_VIEWPORTS=escritorio
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { auditarLighthouse, PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';

const TC_ID = 'TC-DIS-184';
const EMAIL = process.env.TEST_PRODUCTOR_EMAIL ?? '';
const PASSWORD = process.env.TEST_PRODUCTOR_PASSWORD ?? '';
const RUTA = '/prediccion/monitor';

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_184_VIEWPORTS ?? 'movil,tablet,escritorio')
  .split(',')
  .map((v) => v.trim());

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

test.use({ launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

// ── Navegación ───────────────────────────────────────────────────────────────

// Un solo intento de login: si falla, la prueba se detiene (la cuenta se bloquea a los 5 intentos).
async function iniciarSesion(page: Page) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill(EMAIL);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 });
}

// Toda escritura al backend se aborta por defecto (protección de datos).
async function protegerEscrituras(page: Page) {
  await page.route(/back-sigab-test/, (route) => {
    const metodo = route.request().method();
    if (metodo === 'GET' || metodo === 'OPTIONS' || /\/sesiones\/?(refresh)?$/.test(new URL(route.request().url()).pathname)) return route.fallback();
    return route.abort();
  });
}

// ── Escaneo ──────────────────────────────────────────────────────────────────

// Mismo patrón que TC-DIS-58: axe + Lighthouse sobre la misma sesión; una auditoría fallida
// de Lighthouse es un defecto aunque tenga peso 0 en el puntaje.
async function escanear(page: Page, estado: string, testInfo: TestInfo) {
  const paso = `${estado}-${testInfo.project.name}`;
  await page.evaluate(() => document.fonts.ready);
  const axe = await new AxeBuilder({ page }).withTags(ETIQUETAS_WCAG).analyze();
  guardarResultadoAxe(TC_ID, __dirname, paso, axe);
  const lh = await auditarLighthouse(page, TC_ID, __dirname, paso);
  await testInfo.attach(`lighthouse-${paso}.html`, { path: lh.archivoHtml, contentType: 'text/html' });
  expect.soft(axe.violations.map((v) => v.id), `Violaciones axe A/AA en "${paso}"`).toEqual([]);
  expect.soft(lh.auditoriasFallidas.map((a) => a.id), `DEFECTO: auditorías fallidas en Lighthouse ("${paso}")`).toEqual([]);
}

test.describe(`TC-DIS-184 — dashboard-prediccion-filtros`, () => {
  test.describe.configure({ mode: 'serial', timeout: 120_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!VIEWPORTS_HABILITADOS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_184_VIEWPORTS.`);
    await protegerEscrituras(page);
    await iniciarSesion(page);
    await page.goto(RUTA);
  });

  test.fixme('a. Iniciar sesión y navegar al Dashboard de Predicción Sanitaria', async ({ page }, testInfo) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });

  test.fixme('b. Ejecutar @axe-core/playwright y Lighthouse CI sobre el panel de filtros', async ({ page }, testInfo) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });

  test.fixme('c. Recorrer los filtros únicamente con teclado (Tab/Shift+Tab/Enter/flechas) verificando el foco visible', async ({ page }, testInfo) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });

  test.fixme('d. Aplicar un filtro por teclado y acceder a la tarjeta de detalle de un activo resultante, también por teclado', async ({ page }, testInfo) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });
});
