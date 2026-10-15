/**
 * TC-DIS-152 — [CRÍTICO] Verificar accesibilidad WCAG 2.1 AA del Dashboard de Monitoreo en
 * Tiempo Real (riesgo de semaforización solo-color)
 * RF-58 · CU-04 - Monitorear y Consultar Telemetría · Rol: Productor · Prioridad: Alta
 * Ruta: /telemetria/monitoreo — MonitoreoView (Telemetría → Monitoreo)
 *
 * ESTADO: esqueleto pendiente de ejecución (fase Discovery - Planeación). El módulo todavía no
 * se puede probar en el ambiente TEST; cada paso queda como test.fixme y se implementa cuando
 * el módulo esté disponible. Ningún test de este archivo produce resultados todavía.
 *
 * Precondiciones (hoja "CASOS DE PRUEBA UI/UX"):
 *   - La aplicación debe estar desplegada y accesible en el ambiente de prueba (Dockploy).
 *   - Rol: Productor.
 *   - Al menos una variable en cada estado del semáforo (VERDE/AMARILLO/ROJO/GRIS) disponible
 *     en los datos de prueba.
 *   - Herramientas @axe-core/playwright y Lighthouse CI configuradas, más verificación manual
 *     del criterio 1.4.1.
 *
 * Criterios de aceptación:
 *   0 violaciones axe A/AA, con énfasis CRÍTICO en 1.4.1 (Uso del color): cada estado del
 *   semáforo VERDE/AMARILLO/ROJO/GRIS debe comunicarse también con texto o ícono distintivo,
 *   dado que el usuario Productor tiene perfil de baja alfabetización digital y puede tener
 *   daltonismo; además 1.4.3 (contraste ≥4.5:1 en cada tarjeta de variable), 4.1.2
 *   (name/role/value en cada tarjeta), 4.1.3 (indicador de degradación —'Actualización con
 *   retraso' / 'Trabajando sin conexión'— anunciado vía aria-live)
 *
 * Notas:
 *   Caso priorizado por riesgo: el perfil Productor rural es el más expuesto a este riesgo, ya
 *   que el semáforo es su única forma de interpretar el estado del entorno sin conocimiento
 *   técnico
 *
 * Protección de datos: no crear ni modificar registros reales. Las escrituras se abortan por
 * defecto; los estados que exigen datos (alertas, inferencias, errores) se simulan con
 * page.route + route.fulfill y se marcan como "Datos simulados".
 *
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_152_VIEWPORTS=escritorio
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { auditarLighthouse, PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';

const TC_ID = 'TC-DIS-152';
const EMAIL = process.env.TEST_PRODUCTOR_EMAIL ?? '';
const PASSWORD = process.env.TEST_PRODUCTOR_PASSWORD ?? '';
const RUTA = '/telemetria/monitoreo';

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_152_VIEWPORTS ?? 'movil,tablet,escritorio')
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

test.describe(`TC-DIS-152 — dashboard-monitoreo`, () => {
  test.describe.configure({ mode: 'serial', timeout: 120_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!VIEWPORTS_HABILITADOS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_152_VIEWPORTS.`);
    await protegerEscrituras(page);
    await iniciarSesion(page);
    await page.goto(RUTA);
  });

  test.fixme('a. Navegar al Dashboard de Monitoreo en Tiempo Real con variables en los 4 estados del semáforo', async ({ page }, testInfo) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });

  test.fixme('b. Ejecutar el escaneo de @axe-core/playwright y Lighthouse CI sobre el dashboard', async ({ page }, testInfo) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });

  test.fixme('c. Verificar manualmente (sin herramienta automatizada) que cada estado del semáforo tenga una etiqueta de texto o ícono además del color', async ({ page }, testInfo) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });

  test.fixme('d. Simular el indicador de degradación (Nivel 2/3) y repetir la verificación manual sobre ese aviso', async ({ page }, testInfo) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });
});
