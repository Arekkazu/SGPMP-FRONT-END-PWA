/**
 * TC-DIS-178 — Verificar accesibilidad WCAG 2.1 AA del formulario de Registro y Edición de
 * Patologías en el Catálogo
 * RF-64 · CU-01 - Gestionar Catálogo de Patologías · Rol: Administrador · Prioridad: Alta
 * Ruta: /prediccion/patologias — PatologiasView + PatologiaFormModal (Predicción IA → Patologías)
 *
 * ESTADO: esqueleto pendiente de ejecución (fase Discovery - Planeación). El módulo todavía no
 * se puede probar en el ambiente TEST; cada paso queda como test.fixme y se implementa cuando
 * el módulo esté disponible. Ningún test de este archivo produce resultados todavía.
 *
 * Precondiciones (hoja "CASOS DE PRUEBA UI/UX"):
 *   - La aplicación debe estar desplegada y accesible en el ambiente de prueba (Dockploy).
 *   - Rol: Veterinario o Administrador, con sesión activa.
 *   - Catálogo de especies (RF-15) y catálogo de variables I3P-1 (RF-16) configurados en M09,
 *     con al menos una especie y sus variables sensóricas disponibles.
 *   - Existir al menos una patología base (es_base=true) en el catálogo.
 *   - Herramientas @axe-core/playwright y Lighthouse CI configuradas.
 *
 * Criterios de aceptación:
 *   0 violaciones axe A/AA en: 1.3.1 (relación programática entre etiquetas de
 *   especie_aplicable, checklist de variables_sensoricas_asociadas y el campo
 *   descripcion_clinica), 2.1.1 y 2.4.7 (navegación completa por teclado del checklist de
 *   variables sensóricas y foco visible), 3.3.1 y 4.1.3 (errores de validación —nombre
 *   duplicado, mínimo 2 variables, descripcion_clinica < 50 caracteres— anunciados mediante
 *   aria-live/aria-describedby), 4.1.2 (name/role/value correctos en los controles del
 *   formulario)
 *
 * Notas:
 *   Cubrir en el escaneo tanto el flujo de creación de una patología no base (es_base=false)
 *   como el intento de editar una patología base, que debe estar deshabilitado/bloqueado de
 *   forma accesible y no solo visualmente.
 *
 * Protección de datos: no crear ni modificar registros reales. Las escrituras se abortan por
 * defecto; los estados que exigen datos (alertas, inferencias, errores) se simulan con
 * page.route + route.fulfill y se marcan como "Datos simulados".
 *
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_178_VIEWPORTS=escritorio
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { auditarLighthouse, PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';

const TC_ID = 'TC-DIS-178';
const EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';
const RUTA = '/prediccion/patologias';

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_178_VIEWPORTS ?? 'movil,tablet,escritorio')
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

test.describe(`TC-DIS-178 — formulario-patologias`, () => {
  test.describe.configure({ mode: 'serial', timeout: 120_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!VIEWPORTS_HABILITADOS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_178_VIEWPORTS.`);
    await protegerEscrituras(page);
    await iniciarSesion(page);
    await page.goto(RUTA);
  });

  test.fixme('a. Iniciar sesión con un usuario Veterinario o Administrador', async ({ page }, testInfo) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });

  test.fixme('b. Navegar al Catálogo de Patologías y abrir el formulario de \'Agregar patología\'', async ({ page }, testInfo) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });

  test.fixme('c. Ejecutar el escaneo de @axe-core/playwright y Lighthouse CI sobre el formulario vacío', async ({ page }, testInfo) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });

  test.fixme('d. Recorrer el checklist de variables sensóricas y los demás campos únicamente con teclado (Tab/Shift+Tab/Espacio), verificando el foco visible', async ({ page }, testInfo) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });

  test.fixme('e. Intentar editar una patología base (es_base=true) y verificar que el bloqueo se comunique de forma accesible, no solo visual', async ({ page }, testInfo) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });
});
