/**
 * TC-DIS-61 — Accesibilidad WCAG 2.1 AA del listado de Plantillas de Configuración
 * RF-30 · CU-07 Gestionar Plantillas de Configuración · Rol: Administrador
 * Configuración → pestaña "Plantillas"
 *
 * Herramientas: @axe-core/playwright (reporte axe-<TC>.html/json) + Lighthouse en
 * modo snapshot sobre la misma sesión (lighthouse-<TC>-<paso>.html/json), ambos
 * en ./resultados.
 *
 * El listado se muestra como tarjetas (no como tabla): el test de 1.3.1 verifica
 * que la estructura nombre / especie / versión se exponga semánticamente.
 *
 * Paso 3 (listado vacío) se simula con page.route devolviendo [].
 * 409 de nombre duplicado: las plantillas no se pueden eliminar, así que no se
 * envía un duplicado desde la UI; se inyecta la respuesta 409 real del backend
 * (NOMBRE_PLANTILLA_DUPLICADO, capturada del ambiente TEST sin crear registros).
 * Ningún test crea, versiona ni aplica plantillas en el ambiente.
 *
 * Viewports: el script contempla movil / tablet / escritorio, pero solo se
 * ejecuta ESCRITORIO por el defecto abierto de sidebar/scroll (TC-DIS-07/08/10/11).
 * Para habilitarlos: TC_DIS_61_VIEWPORTS=movil,tablet,escritorio
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { auditarLighthouse, PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';

const TC_ID = 'TC-DIS-61';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

const PLANTILLA_EXISTENTE = process.env.TC_DIS_61_PLANTILLA ?? 'Plantilla estándar tilapia';

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_61_VIEWPORTS ?? 'escritorio')
  .split(',')
  .map((v) => v.trim());

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const RUTA_PLANTILLAS = /\/configuracion\/plantillas$/;
const URL_PLANTILLAS = (url: URL) => RUTA_PLANTILLAS.test(url.pathname);

// Respuesta 409 real del backend TEST (POST /configuracion/plantillas con nombre existente, 2026-09-28)
const ERROR_409_NOMBRE = {
  error_code: 'NOMBRE_PLANTILLA_DUPLICADO',
  message: `Nombre no disponible: ya existe una plantilla denominada '${PLANTILLA_EXISTENTE}'. Asigne un nombre único, o genere una nueva versión de la plantilla existente.`,
  fields: [{
    field: 'template_name',
    message: `Nombre no disponible: ya existe una plantilla denominada '${PLANTILLA_EXISTENTE}'. Asigne un nombre único, o genere una nueva versión de la plantilla existente.`,
  }],
};

test.use({ launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

// ── Navegación ───────────────────────────────────────────────────────────────

async function iniciarSesionAdmin(page: Page) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill(ADMIN_EMAIL);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 });
}

/** /configuracion → Plantillas, con el listado cargado. */
async function abrirPlantillas(page: Page) {
  await page.goto('/configuracion');
  const listado = page.waitForResponse((r) => r.request().method() === 'GET' && URL_PLANTILLAS(new URL(r.url())), { timeout: 20_000 });
  await page.getByRole('button', { name: 'Plantillas', exact: true }).click();
  expect((await listado).status(), 'El listado de plantillas debe cargar').toBe(200);
  await expect(page.getByRole('heading', { name: 'Plantillas de Configuración' })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

// ── Escaneo axe + Lighthouse ─────────────────────────────────────────────────

function resumenViolaciones(violaciones: { id: string; impact?: string | null; help: string; nodes: unknown[] }[]) {
  return violaciones.map((v) => `${v.id} (${v.impact}): ${v.help} [${v.nodes.length} nodo(s)]`).join('\n');
}

async function escanear(page: Page, paso: string, testInfo: TestInfo) {
  await page.evaluate(() => document.fonts.ready);

  const axe = await new AxeBuilder({ page }).withTags(ETIQUETAS_WCAG).analyze();
  guardarResultadoAxe(TC_ID, __dirname, paso, axe);

  const lh = await auditarLighthouse(page, TC_ID, __dirname, paso);
  testInfo.annotations.push({
    type: `Lighthouse ${paso}`,
    description:
      `Puntaje accesibilidad: ${lh.puntaje === null ? 'N/A' : Math.round(lh.puntaje * 100)}` +
      (lh.auditoriasFallidas.length ? ` · Fallidas: ${lh.auditoriasFallidas.map((a) => a.id).join(', ')}` : ' · 0 auditorías fallidas'),
  });
  await testInfo.attach(`lighthouse-${paso}.html`, { path: lh.archivoHtml, contentType: 'text/html' });

  expect.soft(axe.violations, `Violaciones axe A/AA en "${paso}":\n${resumenViolaciones(axe.violations)}`).toEqual([]);
}

// ── Casos ────────────────────────────────────────────────────────────────────

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Plantillas de Configuración (RF-30)`, () => {
  // Modo por defecto (no serial): un paso con violaciones no debe impedir evaluar los demás.
  // workers: 1 en el config, así que los logins siguen siendo secuenciales.
  test.describe.configure({ timeout: 180_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      !VIEWPORTS_HABILITADOS.includes(testInfo.project.name),
      `Viewport "${testInfo.project.name}" deshabilitado: defecto abierto de sidebar/scroll en móvil y tablet (TC-DIS-07/08/10/11). Solo se evalúa escritorio.`,
    );
    expect(ADMIN_EMAIL, 'Falta TEST_ADMIN_EMAIL en testing/.env.test').not.toBe('');
    expect(ADMIN_PASSWORD, 'Falta TEST_ADMIN_PASSWORD en testing/.env.test').not.toBe('');
    await iniciarSesionAdmin(page);
  });

  test('1-2. Listado con datos - 0 violaciones axe A/AA (1.3.1 estructura, 2.4.4 propósito de acciones)', async ({ page }, testInfo) => {
    await abrirPlantillas(page);
    await expect(page.getByText(PLANTILLA_EXISTENTE, { exact: true }).first(), `Precondición: debe existir "${PLANTILLA_EXISTENTE}"`).toBeVisible();

    await escanear(page, 'listado', testInfo);

    // 1.3.1: nombre / especie / versión deben tener estructura semántica (tabla con
    // encabezados, o al menos lista de tarjetas con el nombre como encabezado)
    const tabla = await page.getByRole('table').count();
    const lista = await page.getByRole('list').filter({ hasText: PLANTILLA_EXISTENTE }).count();
    const nombreComoEncabezado = await page.getByRole('heading', { name: PLANTILLA_EXISTENTE }).count();
    testInfo.annotations.push({
      type: 'Estructura del listado',
      description: `tablas: ${tabla} · listas con plantillas: ${lista} · nombre como encabezado: ${nombreComoEncabezado}`,
    });
    expect.soft(tabla + lista, '1.3.1: el listado no expone estructura (ni tabla con encabezados ni lista); nombre / especie / versión solo se relacionan visualmente').toBeGreaterThan(0);
    expect.soft(nombreComoEncabezado, '1.3.1: el nombre de cada plantilla no es un encabezado; con lector de pantalla no se puede navegar entre plantillas').toBeGreaterThan(0);

    // 2.4.4: las acciones de cada tarjeta deben identificar la plantilla fuera de contexto
    for (const accion of ['Aplicar plantilla', 'Nueva versión']) {
      const iguales = await page.getByRole('button', { name: accion, exact: true }).count();
      testInfo.annotations.push({ type: `2.4.4 "${accion}"`, description: `${iguales} botones con el mismo nombre accesible` });
      expect.soft(iguales, `2.4.4: ${iguales} botones se anuncian solo como "${accion}", sin indicar a qué plantilla corresponden`).toBeLessThanOrEqual(1);
    }

    // 4.1.2: el botón que despliega el historial debe exponer su estado
    await expect
      .soft(page.getByRole('button', { name: 'Historial de aplicaciones' }), '4.1.2: "Historial de aplicaciones" despliega contenido pero no expone aria-expanded')
      .toHaveAttribute('aria-expanded', 'false');
  });

  test('3. Listado vacío (simulado) - 0 violaciones axe A/AA', async ({ page }, testInfo) => {
    await page.route(URL_PLANTILLAS, (r) =>
      r.request().method() === 'GET'
        ? r.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
        : r.fallback());
    testInfo.annotations.push({ type: 'Datos simulados', description: 'GET /configuracion/plantillas servido con [] para evaluar el estado vacío.' });

    await abrirPlantillas(page);
    await expect(page.getByText('Sin plantillas creadas', { exact: true })).toBeVisible();

    await escanear(page, 'listado-vacio', testInfo);
  });

  test('4. Teclado - Tab recorre "Nueva plantilla" y las acciones de cada tarjeta; Enter activa la acción', async ({ page }) => {
    await abrirPlantillas(page);
    // Esperar las tarjetas: mientras se ve el skeleton, Tab salta directo al historial
    await expect(page.getByText(PLANTILLA_EXISTENTE, { exact: true }).first()).toBeVisible();

    // Orden de tabulación: Recargar → Nueva plantilla → (Nueva versión, Aplicar plantilla) de la 1.ª tarjeta → de la 2.ª…
    const nueva = page.getByRole('button', { name: 'Nueva plantilla', exact: true });
    await page.getByRole('button', { name: 'Recargar' }).focus();
    await page.keyboard.press('Tab');
    await expect(nueva, '2.4.3: tras "Recargar" el foco debe pasar a "Nueva plantilla"').toBeFocused();

    const versiones = page.getByRole('button', { name: 'Nueva versión', exact: true });
    const aplicar = page.getByRole('button', { name: 'Aplicar plantilla', exact: true });
    for (let i = 0; i < 2; i++) {
      await page.keyboard.press('Tab');
      await expect(versiones.nth(i), `2.4.3: la tarjeta ${i + 1} debe ofrecer primero "Nueva versión"`).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(aplicar.nth(i), `2.4.3: luego "Aplicar plantilla" de la tarjeta ${i + 1}`).toBeFocused();
    }

    // Enter sobre "Aplicar plantilla" abre el asistente de la tarjeta enfocada (se cierra sin aplicar)
    await page.keyboard.press('Enter');
    const asistente = page.getByRole('dialog', { name: 'Aplicar Plantilla' });
    await expect(asistente, 'Enter debe abrir el asistente de aplicación').toBeVisible();
    await asistente.getByRole('button', { name: 'Cerrar' }).click();
    await expect(asistente).toBeHidden();

    // Enter sobre "Nueva plantilla" abre el formulario de creación (se cierra sin crear)
    await nueva.focus();
    await page.keyboard.press('Enter');
    const modal = page.getByRole('dialog', { name: 'Nueva Plantilla de Configuración' });
    await expect(modal, 'Enter debe abrir el formulario "Nueva plantilla"').toBeVisible();
    await modal.getByRole('button', { name: 'Cerrar' }).click();
  });

  test('3.3.1. Nombre duplicado (HTTP 409 NOMBRE_PLANTILLA_DUPLICADO) - anunciado y 0 violaciones axe A/AA', async ({ page }, testInfo) => {
    // Las plantillas no se pueden eliminar: el alta se intercepta con la respuesta 409 real
    await page.route(URL_PLANTILLAS, (r) =>
      r.request().method() === 'POST'
        ? r.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify(ERROR_409_NOMBRE) })
        : r.fallback());

    await abrirPlantillas(page);
    await page.getByRole('button', { name: 'Nueva plantilla', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'Nueva Plantilla de Configuración' });
    await expect(modal).toBeVisible();

    const nombre = modal.getByRole('textbox', { name: 'Nombre de la plantilla' });
    await nombre.fill(PLANTILLA_EXISTENTE);
    // Tilapia Roja: tiene ciclos, patologías, métricas y umbrales (las categorías vacías quedan deshabilitadas)
    await modal.getByRole('combobox', { name: 'Especie base' }).selectOption({ label: 'Tilapia Roja' });
    const parametro = modal.locator('[role="checkbox"]:not([disabled])').first();
    await expect(parametro, 'La especie debe ofrecer parámetros para incluir').toBeVisible();
    if ((await parametro.getAttribute('aria-checked')) !== 'true') await parametro.click();
    const crear = modal.getByRole('button', { name: 'Crear plantilla' });
    await expect(crear).toBeEnabled();

    const alta = page.waitForRequest((r) => r.method() === 'POST' && URL_PLANTILLAS(new URL(r.url())));
    await crear.click();
    await alta;

    // 3.3.1: el error se anuncia (role="alert") con el motivo
    const alerta = modal.getByRole('alert').filter({ hasText: 'Nombre no disponible' });
    await expect(alerta).toBeVisible();
    await expect.soft(nombre, '3.3.1: el campo "Nombre de la plantilla" debe marcarse con aria-invalid').toHaveAttribute('aria-invalid', 'true');
    await expect.soft(nombre, '3.3.1: el error del backend debe asociarse al campo "Nombre de la plantilla"').toHaveAccessibleDescription(/Nombre no disponible/);

    await escanear(page, 'error-409-nombre', testInfo);
  });
});
