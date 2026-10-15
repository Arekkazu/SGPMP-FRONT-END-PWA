/**
 * TC-DIS-187 — Verificar accesibilidad WCAG 2.1 AA de la alternativa en tabla para la gráfica
 * de evolución del riesgo en el Historial Diagnóstico [CRÍTICO]
 * RF-67 · CU-04 - Consultar Historial Diagnóstico del Activo · Rol: Productor · Prioridad: Alta
 * Ruta: /prediccion/historial — HistorialView + LineChartPrediccion (Predicción IA → Historial)
 *
 * ESTADO: esqueleto pendiente de ejecución (fase Discovery - Planeación). El módulo todavía no
 * se puede probar en el ambiente TEST; cada paso queda como test.fixme y se implementa cuando
 * el módulo esté disponible. Ningún test de este archivo produce resultados todavía.
 *
 * Precondiciones (hoja "CASOS DE PRUEBA UI/UX"):
 *   - La aplicación debe estar desplegada y accesible en el ambiente de prueba (Dockploy).
 *   - Rol: Veterinario o Productor con un activo biológico que tenga historial de inferencias
 *     previas (RF-66) y catálogo de patologías (RF-64) disponible.
 *   - Datos de prueba con al menos 3-4 puntos de evolución del riesgo para que la gráfica sea
 *     significativa.
 *   - Un área POBLACIONAL con al menos 3-4 puntos de evolución del score_anomalia.
 *   - Herramienta de lectura de pantalla (NVDA/VoiceOver) activa.
 *
 * Criterios de aceptación:
 *   0 violaciones axe A/AA en 1.1.1 (Contenido no textual): si el Historial expone una
 *   gráfica/timeline visual de evolución del nivel de riesgo, existe una alternativa en formato
 *   de tabla de datos con encabezados de columna asociados según el paradigma (INDIVIDUAL:
 *   fecha, nivel_riesgo, enfermedad_estimada, confianza; POBLACIONAL: fecha, nivel_riesgo,
 *   score_anomalia), sin columnas vacías por datos que no aplican, accesible mediante teclado y
 *   lector de pantalla, con la misma información que la gráfica
 *
 * Notas:
 *   Caso crítico priorizado en la retroalimentación de QA. Verificar con NVDA/VoiceOver que la
 *   tabla alternativa comunique la misma tendencia que la gráfica, no solo el valor puntual de
 *   cada evento. Actualizado por RFC-009 v1.1 (2026-10-02): se incorpora el paradigma
 *   POBLACIONAL (resultado por área con score_anomalia, sin patología ni probabilidad por
 *   clase).
 *
 * Protección de datos: no crear ni modificar registros reales. Las escrituras se abortan por
 * defecto; los estados que exigen datos (alertas, inferencias, errores) se simulan con
 * page.route + route.fulfill y se marcan como "Datos simulados".
 *
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_187_VIEWPORTS=escritorio
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { auditarLighthouse, PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';

const TC_ID = 'TC-DIS-187';
const EMAIL = process.env.TEST_PRODUCTOR_EMAIL ?? '';
const PASSWORD = process.env.TEST_PRODUCTOR_PASSWORD ?? '';
const RUTA = '/prediccion/historial';

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_187_VIEWPORTS ?? 'movil,tablet,escritorio')
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

test.describe(`TC-DIS-187 — historial-grafica-tabla`, () => {
  test.describe.configure({ mode: 'serial', timeout: 120_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!VIEWPORTS_HABILITADOS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_187_VIEWPORTS.`);
    await protegerEscrituras(page);
    await iniciarSesion(page);
    await page.goto(RUTA);
  });

  test.fixme('a. Iniciar sesión y navegar al Historial Diagnóstico de un activo con datos de evolución de riesgo', async ({ page }, testInfo) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });

  test.fixme('b. Ejecutar @axe-core/playwright y Lighthouse CI sobre la vista con la gráfica de evolución', async ({ page }, testInfo) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });

  test.fixme('c. Localizar la alternativa en tabla y verificar que contenga los mismos datos que la gráfica y encabezados asociados: INDIVIDUAL (fecha, nivel_riesgo, enfermedad_estimada, confianza); POBLACIONAL (fecha, nivel_riesgo, score_anomalia)', async ({ page }, testInfo) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });

  test.fixme('d. Activar el lector de pantalla y recorrer la tabla alternativa, confirmando que comunica la tendencia de la gráfica', async ({ page }, testInfo) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });
});
