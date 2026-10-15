/**
 * TC-DIS-183 — Verificar accesibilidad WCAG 2.1 AA de aria-live en los contadores
 * auto-actualizables del Dashboard de Predicción Sanitaria [CRÍTICO]
 * RF-66 · CU-03 - Ejecutar Inferencia Sanitaria · Rol: Productor · Prioridad: Alta
 * Ruta: /prediccion/monitor — MonitorInferenciaView (Predicción IA → Monitor)
 *
 * ESTADO: esqueleto pendiente de ejecución (fase Discovery - Planeación). El módulo todavía no
 * se puede probar en el ambiente TEST; cada paso queda como test.fixme y se implementa cuando
 * el módulo esté disponible. Ningún test de este archivo produce resultados todavía.
 *
 * Precondiciones (hoja "CASOS DE PRUEBA UI/UX"):
 *   - La aplicación debe estar desplegada y accesible en el ambiente de prueba (Dockploy).
 *   - Rol: Veterinario o Productor.
 *   - Modelo activo y motor de inferencia configurados; entorno con capacidad de
 *     generar/simular una nueva inferencia o alerta durante la prueba.
 *   - Capacidad de simular una alerta POBLACIONAL de un área al superar el
 *     umbral_score_anomalia.
 *   - Herramienta de lectura de pantalla (NVDA/VoiceOver) activa.
 *
 * Criterios de aceptación:
 *   0 violaciones axe A/AA; verificación manual de 4.1.3 (Status Messages): los contadores del
 *   dashboard que se actualizan automáticamente (p. ej. total de activos en Riesgo
 *   Alto/Crítico, alertas de predicción generadas) están contenidos en una región
 *   aria-live='polite' (o 'assertive' cuando corresponde a una alerta crítica nueva) y son
 *   anunciados por el lector de pantalla sin necesidad de mover el foco; el contador de áreas
 *   en riesgo / alertas POBLACIONAL también se anuncia mediante aria-live sin mover el foco
 *
 * Notas:
 *   Caso crítico priorizado en la retroalimentación de QA. Simular al menos una actualización
 *   automática del contador durante la prueba con NVDA/VoiceOver activo para verificar el
 *   anuncio. Actualizado por RFC-009 v1.1 (2026-10-02): se incorpora el paradigma POBLACIONAL
 *   (resultado por área con score_anomalia, sin patología ni probabilidad por clase).
 *
 * Protección de datos: no crear ni modificar registros reales. Las escrituras se abortan por
 * defecto; los estados que exigen datos (alertas, inferencias, errores) se simulan con
 * page.route + route.fulfill y se marcan como "Datos simulados".
 *
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_183_VIEWPORTS=escritorio
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { auditarLighthouse, PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';

const TC_ID = 'TC-DIS-183';
const EMAIL = process.env.TEST_PRODUCTOR_EMAIL ?? '';
const PASSWORD = process.env.TEST_PRODUCTOR_PASSWORD ?? '';
const RUTA = '/prediccion/monitor';

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_183_VIEWPORTS ?? 'movil,tablet,escritorio')
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

test.describe(`TC-DIS-183 — dashboard-prediccion-aria-live`, () => {
  test.describe.configure({ mode: 'serial', timeout: 120_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!VIEWPORTS_HABILITADOS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_183_VIEWPORTS.`);
    await protegerEscrituras(page);
    await iniciarSesion(page);
    await page.goto(RUTA);
  });

  test.fixme('a. Iniciar sesión y navegar al Dashboard de Predicción Sanitaria', async ({ page }, testInfo) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });

  test.fixme('b. Activar el lector de pantalla y posicionar el foco fuera de la región de contadores', async ({ page }, testInfo) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });

  test.fixme('c. Provocar o simular una nueva inferencia/alerta INDIVIDUAL y otra POBLACIONAL de área que incrementen los contadores del dashboard', async ({ page }, testInfo) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });

  test.fixme('d. Verificar que el lector de pantalla anuncie el cambio del contador sin necesidad de mover el foco', async ({ page }, testInfo) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });

  test.fixme('e. Inspeccionar el código fuente/DOM para confirmar el atributo aria-live y su valor (polite/assertive)', async ({ page }, testInfo) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });
});
