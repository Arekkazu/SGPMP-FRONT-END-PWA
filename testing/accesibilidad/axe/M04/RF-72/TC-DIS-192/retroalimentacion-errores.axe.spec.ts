/**
 * TC-DIS-192 — Verificar accesibilidad WCAG 2.1 AA de los mensajes de error del formulario de
 * Retroalimentación Clínica
 * RF-72 · CU-08 - Registrar Retroalimentación Clínica · Rol: Veterinario · Prioridad: Media
 * Ruta: /prediccion/retroalimentacion — RetroalimentacionView + RetroalimentacionFormModal (Predicción IA → Retroalimentación)
 *
 * ESTADO: esqueleto pendiente de ejecución (fase Discovery - Planeación). El módulo todavía no
 * se puede probar en el ambiente TEST; cada paso queda como test.fixme y se implementa cuando
 * el módulo esté disponible. Ningún test de este archivo produce resultados todavía.
 *
 * Precondiciones (hoja "CASOS DE PRUEBA UI/UX"):
 *   - La aplicación debe estar desplegada y accesible en el ambiente de prueba (Dockploy).
 *   - Rol: Veterinario.
 *   - Un resultado de inferencia INDIVIDUAL con retroalimentación previa del mismo usuario
 *     (para provocar E2) y otro resultado con más de 90 días de antigüedad (para provocar E9).
 *
 * Criterios de aceptación:
 *   0 violaciones axe A/AA; verificación manual de 3.3.1 y 4.1.3: los errores de los flujos
 *   alternos E2 (retroalimentación duplicada del mismo usuario), E4 (diagnóstico clínico
 *   obligatorio faltante) y E9 (ventana temporal de 90 días vencida) se anuncian mediante
 *   aria-live/aria-describedby asociado al campo correspondiente
 *
 * Notas:
 *   Incluir el mensaje de error E9 con el detalle de la fecha límite, dado que expone
 *   información dinámica que también debe ser anunciada. Actualizado por RFC-009 v1.1
 *   (2026-10-02): el lazo retroalimentación → etiqueta verificada → reentrenamiento (RF-71)
 *   aplica solo a paradigma INDIVIDUAL; los modelos POBLACIONAL se calibran sin etiquetas
 *   clínicas.
 *
 * PENDIENTE: testing/.env.test no tiene todavía TEST_VETERINARIO_EMAIL/PASSWORD; se necesita
 * una cuenta Veterinario de TEST antes de ejecutar.
 *
 * Protección de datos: no crear ni modificar registros reales. Las escrituras se abortan por
 * defecto; los estados que exigen datos (alertas, inferencias, errores) se simulan con
 * page.route + route.fulfill y se marcan como "Datos simulados".
 *
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_192_VIEWPORTS=escritorio
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { auditarLighthouse, PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';

const TC_ID = 'TC-DIS-192';
const EMAIL = process.env.TEST_VETERINARIO_EMAIL ?? '';
const PASSWORD = process.env.TEST_VETERINARIO_PASSWORD ?? '';
const RUTA = '/prediccion/retroalimentacion';

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_192_VIEWPORTS ?? 'movil,tablet,escritorio')
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

test.describe(`TC-DIS-192 — retroalimentacion-errores`, () => {
  test.describe.configure({ mode: 'serial', timeout: 120_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!VIEWPORTS_HABILITADOS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_192_VIEWPORTS.`);
    await protegerEscrituras(page);
    await iniciarSesion(page);
    await page.goto(RUTA);
  });

  test.fixme('a. Iniciar sesión como Veterinario y abrir el formulario de retroalimentación sobre un resultado ya retroalimentado por el mismo usuario', async ({ page }, testInfo) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });

  test.fixme('b. Enviar el formulario y verificar el anuncio accesible del error E2', async ({ page }, testInfo) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });

  test.fixme('c. Abrir el formulario sobre un resultado fuera de la ventana de 90 días y verificar el anuncio del error E9', async ({ page }, testInfo) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });

  test.fixme('d. Seleccionar estado PARCIAL/INCORRECTO sin diagnóstico real y verificar el anuncio del error E4', async ({ page }, testInfo) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });
});
