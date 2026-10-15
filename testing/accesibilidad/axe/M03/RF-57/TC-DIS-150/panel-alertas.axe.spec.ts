/**
 * TC-DIS-150 — [CRÍTICO] Verificar accesibilidad WCAG 2.1 AA del Panel de Alertas en Tiempo
 * Real (aria-live obligatorio)
 * RF-57 · CU-03 - Generar y Gestionar Alertas de Monitoreo · Rol: Productor · Prioridad: Alta
 * Ruta: /telemetria/alertas — AlertasView (Telemetría → Alertas)
 *
 * ESTADO: esqueleto pendiente de ejecución (fase Discovery - Planeación). El módulo todavía no
 * se puede probar en el ambiente TEST; cada paso queda como test.fixme y se implementa cuando
 * el módulo esté disponible. Ningún test de este archivo produce resultados todavía.
 *
 * Precondiciones (hoja "CASOS DE PRUEBA UI/UX"):
 *   - La aplicación debe estar desplegada y accesible en el ambiente de prueba (Dockploy).
 *   - Rol: Productor (o Veterinario/Administrador).
 *   - Lector de pantalla activo (NVDA/VoiceOver) durante la prueba.
 *   - Al menos un evento de prueba capaz de disparar una alerta CRITICA mientras el foco del
 *     usuario está en otra parte de la pantalla.
 *
 * Criterios de aceptación:
 *   0 violaciones axe A/AA, con énfasis CRÍTICO en: 4.1.3 (toda alerta nueva —especialmente
 *   severidad CRITICO— debe anunciarse mediante una región aria-live=assertive, sin que el
 *   usuario necesite tener el foco en el panel de alertas), 1.4.1 (la severidad
 *   LEVE/MODERADO/CRITICO debe distinguirse también por texto/ícono, no solo color), 2.4.3
 *   (orden de foco al aparecer una alerta nueva), 3.3.1 (cada transición del ciclo de vida
 *   ACTIVA→EN_ATENCION→RESUELTA/DESCARTADA/VENCIDA se anuncia)
 *
 * Notas:
 *   Caso priorizado por riesgo: dado el SLA de atención de 5 minutos para alertas CRITICAS, una
 *   alerta que no se anuncie a un usuario con lector de pantalla activo en otra parte de la
 *   pantalla representa un riesgo directo para la salud del activo biológico
 *
 * Protección de datos: no crear ni modificar registros reales. Las escrituras se abortan por
 * defecto; los estados que exigen datos (alertas, inferencias, errores) se simulan con
 * page.route + route.fulfill y se marcan como "Datos simulados".
 *
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_150_VIEWPORTS=escritorio
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { auditarLighthouse, PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';

const TC_ID = 'TC-DIS-150';
const EMAIL = process.env.TEST_PRODUCTOR_EMAIL ?? '';
const PASSWORD = process.env.TEST_PRODUCTOR_PASSWORD ?? '';
const RUTA = '/telemetria/alertas';

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_150_VIEWPORTS ?? 'movil,tablet,escritorio')
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

test.describe(`TC-DIS-150 — panel-alertas`, () => {
  test.describe.configure({ mode: 'serial', timeout: 120_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!VIEWPORTS_HABILITADOS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_150_VIEWPORTS.`);
    await protegerEscrituras(page);
    await iniciarSesion(page);
    await page.goto(RUTA);
  });

  test.fixme('a. Navegar al dashboard con el Panel de Alertas visible pero sin foco puesto en él', async ({ page }, testInfo) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });

  test.fixme('b. Ejecutar el escaneo de @axe-core/playwright y Lighthouse CI sobre el panel en reposo', async ({ page }, testInfo) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });

  test.fixme('c. Disparar una alerta de prueba con severidad CRITICO', async ({ page }, testInfo) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });

  test.fixme('d. Verificar con el lector de pantalla activo que la alerta se anuncia automáticamente (aria-live=assertive) sin necesidad de mover el foco', async ({ page }, testInfo) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });

  test.fixme('e. Repetir el cambio de estado ACTIVA→EN_ATENCION→RESUELTA y verificar que cada transición se anuncia', async ({ page }, testInfo) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });
});
