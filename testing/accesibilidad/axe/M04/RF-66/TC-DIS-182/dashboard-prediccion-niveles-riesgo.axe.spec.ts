/**
 * TC-DIS-182 — Verificar accesibilidad WCAG 2.1 AA de la redundancia badge + color en los 4
 * niveles de riesgo del Dashboard de Predicción Sanitaria [CRÍTICO]
 * RF-66 · CU-03 - Ejecutar Inferencia Sanitaria · Rol: Productor · Prioridad: Alta
 * Ruta: /prediccion/monitor — MonitorInferenciaView (Predicción IA → Monitor)
 *
 * ESTADO: esqueleto pendiente de ejecución (fase Discovery - Planeación). El módulo todavía no
 * se puede probar en el ambiente TEST; cada paso queda como test.fixme y se implementa cuando
 * el módulo esté disponible. Ningún test de este archivo produce resultados todavía.
 *
 * Precondiciones (hoja "CASOS DE PRUEBA UI/UX"):
 *   - La aplicación debe estar desplegada y accesible en el ambiente de prueba (Dockploy).
 *   - Rol: Veterinario o Productor con acceso al Dashboard de Predicción Sanitaria.
 *   - Modelo activo validado (RF-69/RF-70) y catálogo de patologías (RF-64) activo.
 *   - Datos de prueba congelados con al menos un activo de paradigma INDIVIDUAL en cada uno de
 *     los 4 niveles de nivel_riesgo (0 a 3) y al menos un área con modelo POBLACIONAL cuyo
 *     nivel_riesgo se derive del score_anomalia.
 *   - Herramienta de lectura de pantalla (NVDA/VoiceOver) activa.
 *
 * Criterios de aceptación:
 *   0 violaciones axe A/AA en 1.4.1 (Uso del color): los 4 niveles de nivel_riesgo (0=Normal,
 *   1=Riesgo Bajo, 2=Riesgo Alto, 3=Crítico) se distinguen mediante badge/ícono y etiqueta
 *   textual, no únicamente por el color del indicador; 1.4.3 (contraste de texto ≥ 4.5:1 en
 *   cada badge de riesgo); 4.1.2 (name/role/value del badge expuestos a tecnología de
 *   asistencia); los resultados POBLACIONAL se identifican como resultados de un área (no de un
 *   activo), muestran el score de anomalía con etiqueta textual y no presentan enfermedad
 *   estimada ni probabilidades por clase: donde el dato no aplica se muestra 'No aplica (modelo
 *   poblacional)', nunca vacío ni '0%'
 *
 * Notas:
 *   Caso crítico priorizado en la retroalimentación de QA. Verificación manual con
 *   NVDA/VoiceOver, dado que axe no evalúa de forma completa el criterio 1.4.1. Congelar los 4
 *   niveles de riesgo en datos de prueba antes de ejecutar el escaneo. Actualizado por RFC-009
 *   v1.1 (2026-10-02): se incorpora el paradigma POBLACIONAL (resultado por área con
 *   score_anomalia, sin patología ni probabilidad por clase).
 *
 * Protección de datos: no crear ni modificar registros reales. Las escrituras se abortan por
 * defecto; los estados que exigen datos (alertas, inferencias, errores) se simulan con
 * page.route + route.fulfill y se marcan como "Datos simulados".
 *
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_182_VIEWPORTS=escritorio
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { auditarLighthouse, PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';

const TC_ID = 'TC-DIS-182';
const EMAIL = process.env.TEST_PRODUCTOR_EMAIL ?? '';
const PASSWORD = process.env.TEST_PRODUCTOR_PASSWORD ?? '';
const RUTA = '/prediccion/monitor';

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_182_VIEWPORTS ?? 'movil,tablet,escritorio')
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

test.describe(`TC-DIS-182 — dashboard-prediccion-niveles-riesgo`, () => {
  test.describe.configure({ mode: 'serial', timeout: 120_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!VIEWPORTS_HABILITADOS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_182_VIEWPORTS.`);
    await protegerEscrituras(page);
    await iniciarSesion(page);
    await page.goto(RUTA);
  });

  test.fixme('a. Iniciar sesión y navegar al Dashboard de Predicción Sanitaria con los datos congelados', async ({ page }, testInfo) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });

  test.fixme('b. Ejecutar @axe-core/playwright y Lighthouse CI sobre el dashboard con los 4 niveles de riesgo representados', async ({ page }, testInfo) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });

  test.fixme('c. Verificar visualmente que cada nivel tenga un badge/ícono y etiqueta textual, no solo color', async ({ page }, testInfo) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });

  test.fixme('d. Medir el contraste de texto de cada badge (≥ 4.5:1)', async ({ page }, testInfo) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });

  test.fixme('e. Activar el lector de pantalla y confirmar que cada badge se anuncia con su nivel de riesgo', async ({ page }, testInfo) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });

  test.fixme('f. Verificar que la tarjeta del área POBLACIONAL muestre el nombre del área y el puntaje de anomalía, y que el lector de pantalla los anuncie junto al nivel de riesgo', async ({ page }, testInfo) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });
});
