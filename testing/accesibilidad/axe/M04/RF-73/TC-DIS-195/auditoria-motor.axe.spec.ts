/**
 * TC-DIS-195 — Verificar accesibilidad WCAG 2.1 AA de la bitácora de Auditoría y Trazabilidad
 * del Motor de Predicción
 * RF-73 · CU-09 - Auditar y Trazar Eventos del Motor · Rol: Administrador · Prioridad: Alta
 * Ruta: /prediccion/auditoria — AuditoriaView + AuditoriaTable + EventoAuditoriaModal (Predicción IA → Auditoría)
 *
 * ESTADO: esqueleto pendiente de ejecución (fase Discovery - Planeación). El módulo todavía no
 * se puede probar en el ambiente TEST; cada paso queda como test.fixme y se implementa cuando
 * el módulo esté disponible. Ningún test de este archivo produce resultados todavía.
 *
 * Precondiciones (hoja "CASOS DE PRUEBA UI/UX"):
 *   - La aplicación debe estar desplegada y accesible en el ambiente de prueba (Dockploy).
 *   - Rol: Administrador o Auditor.
 *   - Bitácora de auditoría con eventos de prueba en los 4 niveles de severidad (INFO, WARNING,
 *     ERROR, CRITICAL).
 *   - Eventos VERSION_APROBADA, REENTRENAMIENTO_COMPLETADO y DEGRADACION_DETECTADA de un modelo
 *     POBLACIONAL y de uno INDIVIDUAL.
 *
 * Criterios de aceptación:
 *   0 violaciones axe A/AA en 1.3.1 (tabla de eventos con encabezados —id_evento, tipo_evento,
 *   severidad_evento, timestamp_evento, actor— correctamente asociados a sus celdas); 1.4.1
 *   (los niveles de severidad_evento INFO/WARNING/ERROR/CRITICAL no dependen únicamente del
 *   color); 2.1.1 y 2.4.7 (filtros por tipo de evento, actor y rango de fechas operables por
 *   teclado); 1.3.1 en el detalle del payload: las métricas se presentan con su etiqueta según
 *   el paradigma (INDIVIDUAL: f1_score_global, recall_clase_riesgo_alto; POBLACIONAL:
 *   calibración, tasa de falsos positivos en rutina, tasa de detección en eventos clínicos),
 *   nunca como 'F1: —' o vacías; 4.1.2 (el filtro tipo_modelo expone los 6 valores con
 *   name/role/value)
 *
 * Notas:
 *   Vista de uso exclusivamente técnico (Administrador/Auditor); no se incluye UAT porque no es
 *   una pantalla operativa dirigida al Productor. Actualizado por RFC-009 v1.1 (2026-10-02):
 *   tipo_modelo pasa a 6 valores (MODELO_AVES, MODELO_PORCINOS, MODELO_ACUICULTURA,
 *   MODELO_ESPECIES_MEDIANAS, MODELO_ESPECIES_GRANDES, MODELO_RIESGO_CONTAGIO) y los eventos de
 *   modelos POBLACIONAL registran métricas poblacionales equivalentes.
 *
 * Protección de datos: no crear ni modificar registros reales. Las escrituras se abortan por
 * defecto; los estados que exigen datos (alertas, inferencias, errores) se simulan con
 * page.route + route.fulfill y se marcan como "Datos simulados".
 *
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_195_VIEWPORTS=escritorio
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { auditarLighthouse, PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';

const TC_ID = 'TC-DIS-195';
const EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';
const RUTA = '/prediccion/auditoria';

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_195_VIEWPORTS ?? 'movil,tablet,escritorio')
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

test.describe(`TC-DIS-195 — auditoria-motor`, () => {
  test.describe.configure({ mode: 'serial', timeout: 120_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!VIEWPORTS_HABILITADOS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_195_VIEWPORTS.`);
    await protegerEscrituras(page);
    await iniciarSesion(page);
    await page.goto(RUTA);
  });

  test.fixme('a. Iniciar sesión como Administrador o Auditor y navegar a la bitácora de Auditoría y Trazabilidad', async ({ page }, testInfo) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });

  test.fixme('b. Ejecutar @axe-core/playwright y Lighthouse CI sobre la tabla de eventos', async ({ page }, testInfo) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });

  test.fixme('c. Verificar que los encabezados de columna estén correctamente asociados a las celdas de datos', async ({ page }, testInfo) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });

  test.fixme('d. Recorrer los filtros por tipo de evento, actor, tipo_modelo (6 valores) y rango de fechas únicamente con teclado', async ({ page }, testInfo) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });

  test.fixme('e. Verificar que la severidad de cada evento no dependa únicamente del color', async ({ page }, testInfo) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });

  test.fixme('f. Abrir por teclado el detalle (payload) de un evento POBLACIONAL y de uno INDIVIDUAL y verificar sus métricas', async ({ page }, testInfo) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });
});
