/**
 * TC-DIS-147 — Verificar consistencia visual de la vista técnica de Estado de Ingesta de
 * Telemetría frente a baseline
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
 *   - Datos de prueba con los 9 estados de calidad ya representados en el listado.
 *   - Al menos una observación de visión por área aceptada y una rechazada presentes en el
 *     listado antes de tomar la baseline.
 *   - Baseline vigente aprobada para la vista técnica.
 *
 * Criterios de aceptación:
 *   0 diferencias no aprobadas vs. baseline vigente en los 3 viewports (móvil, tablet,
 *   escritorio), cubriendo al menos un registro representativo de cada uno de los 9 estados de
 *   calidad del dato, al menos una observación de visión aceptada y una rechazada (con las
 *   celdas 'No aplica' visibles) y, en móvil, sin desbordamiento horizontal fuera de la región
 *   de scroll de la tabla
 *
 * Notas:
 *   Preparar datos de prueba con los 9 estados representados antes de tomar la baseline, para
 *   que un futuro cambio de estilos no rompa la distinción visual entre estados. Actualizado
 *   por RFC-011 v1.1 (2026-10-02): la ingesta acepta observaciones estructuradas de visión a
 *   nivel de área (vector de comportamiento), sin valor/unidad y con area_id.
 *
 * Protección de datos: no crear ni modificar registros reales. Las escrituras se abortan por
 * defecto; los estados que exigen datos (alertas, inferencias, errores) se simulan con
 * page.route + route.fulfill y se marcan como "Datos simulados".
 *
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_147_VIEWPORTS=escritorio
 */
import { expect, test, type Page } from '@playwright/test';

const TC_ID = 'TC-DIS-147';
const EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';
const RUTA = '/telemetria/ingesta';

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_147_VIEWPORTS ?? 'movil,tablet,escritorio')
  .split(',')
  .map((v) => v.trim());

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

test.describe(`TC-DIS-147 — estado-ingesta`, () => {
  test.describe.configure({ mode: 'serial', timeout: 120_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!VIEWPORTS_HABILITADOS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_147_VIEWPORTS.`);
    await protegerEscrituras(page);
    await iniciarSesion(page);
    await page.goto(RUTA);
  });

  test.fixme('a. Navegar a la vista técnica de Estado de Ingesta con los 9 estados representados', async ({ page }) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });

  test.fixme('b. Ejecutar Playwright Test en los 3 viewports', async ({ page }) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });

  test.fixme('c. Aplicar el filtro por estado de calidad y el filtro por tipo de dato \'Visión\', y capturar ambos estados', async ({ page }) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });

  test.fixme('d. Comparar contra la baseline vigente', async ({ page }) => {
    // TODO: implementar cuando el módulo esté disponible en TEST
  });
});
