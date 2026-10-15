/**
 * TC-DIS-146 — Verificar accesibilidad WCAG 2.1 AA de la vista técnica de Estado de Ingesta de
 * Telemetría (datos escalares y observaciones de visión por área)
 * RF-53 · CU-01 - Recibir y Validar Telemetría IoT · Rol: Administrador · Prioridad: Alta
 * Ruta: /telemetria/ingesta — IngestaView (Telemetría → Ingesta)
 *
 * ESTADO: esqueleto pendiente de ejecución (fase Discovery - Planeación). El módulo todavía no
 * se puede probar en el ambiente TEST; cada paso queda como test.fixme y se implementa cuando
 * el módulo esté disponible. Ningún test de este archivo produce resultados todavía.
 *
 * Precondiciones (hoja "CASOS DE PRUEBA UI/UX"):
 *   - La aplicación debe estar desplegada y accesible en el ambiente de prueba (Dockploy).
 *   - Rol: Ingeniero de Campo (o Administrador).
 *   - Al menos un dato de prueba enviado para cada uno de los 9 estados de calidad
 *     (LECTURA_VALIDA, FUERA_DE_RANGO, ERROR_ESTRUCTURA, ERROR_AUTENTICACION, ERROR_DUPLICADO,
 *     ERROR_TIEMPO, ERROR_UNIDAD, ERROR_SENSOR, ERROR_CALIBRACION).
 *   - Al menos una observación estructurada de visión a nivel de área (vector de
 *     comportamiento) aceptada y al menos una rechazada por su validación de integridad o de
 *     coherencia temporal.
 *   - Herramientas @axe-core/playwright y Lighthouse CI configuradas.
 *
 * Criterios de aceptación:
 *   0 violaciones axe A/AA en: 1.3.1 (tabla de estados de ingesta con encabezados
 *   sensor_id/área, tipo de dato, tipo_variable, estado_calidad y timestamp correctamente
 *   asociados; en las filas de visión las celdas que no aplican —tipo_variable, valor, unidad—
 *   muestran el texto 'No aplica', nunca vacías), 1.4.1 (los 9 estados de calidad
 *   —LECTURA_VALIDA, FUERA_DE_RANGO, ERROR_ESTRUCTURA, ERROR_AUTENTICACION, ERROR_DUPLICADO,
 *   ERROR_TIEMPO, ERROR_UNIDAD, ERROR_SENSOR, ERROR_CALIBRACION— y el tipo de dato
 *   escalar/visión deben distinguirse por texto/ícono, no solo color), 4.1.2 (filtros de
 *   estado/tipo de dato/sensor o área/dispositivo con name/role/value; si el detalle del vector
 *   es desplegable, botón con nombre accesible y aria-expanded), 3.3.1 (mensaje de 'sin
 *   resultados' anunciado)
 *
 * Notas:
 *   Vista de uso exclusivamente técnico (Ingeniero de Campo/Administrador); no se incluye UAT
 *   porque no es una pantalla operativa dirigida al Productor. Actualizado por RFC-011 v1.1
 *   (2026-10-02): la ingesta acepta observaciones estructuradas de visión a nivel de área
 *   (vector de comportamiento), sin valor/unidad y con area_id.
 *
 * Protección de datos: no crear ni modificar registros reales. Las escrituras se abortan por
 * defecto; los estados que exigen datos (alertas, inferencias, errores) se simulan con
 * page.route + route.fulfill y se marcan como "Datos simulados".
 *
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_146_VIEWPORTS=escritorio
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { auditarLighthouse, PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';

const TC_ID = 'TC-DIS-146';
const EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';
const RUTA = '/telemetria/ingesta';

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_146_VIEWPORTS ?? 'movil,tablet,escritorio')
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

test.describe(`TC-DIS-146 — estado-ingesta`, () => {
  test.describe.configure({ mode: 'serial', timeout: 120_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!VIEWPORTS_HABILITADOS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_146_VIEWPORTS.`);
    await protegerEscrituras(page);
    await iniciarSesion(page);
    await page.goto(RUTA);
  });

  test.fixme('a. Navegar a la vista técnica de Estado de Ingesta de Telemetría', async ({ page }, testInfo) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });

  test.fixme('b. Ejecutar el escaneo de @axe-core/playwright y Lighthouse CI sobre el listado con los 9 estados de calidad y ambos tipos de dato (escalar y visión) representados', async ({ page }, testInfo) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });

  test.fixme('c. Aplicar un filtro por estado de calidad y repetir el escaneo', async ({ page }, testInfo) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });

  test.fixme('d. Aplicar el filtro por tipo de dato \'Visión\' y repetir el escaneo', async ({ page }, testInfo) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });

  test.fixme('e. Si el registro de visión expone el detalle del vector de comportamiento, abrirlo por teclado y repetir el escaneo', async ({ page }, testInfo) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });

  test.fixme('f. Aplicar un filtro sin resultados y repetir el escaneo sobre el estado vacío', async ({ page }, testInfo) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });

  test.fixme('g. Verificar teclado: filtros, tabla y detalle 100% operables por teclado', async ({ page }, testInfo) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });
});
