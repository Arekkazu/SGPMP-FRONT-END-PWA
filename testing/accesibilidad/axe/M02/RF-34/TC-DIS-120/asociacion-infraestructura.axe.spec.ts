/**
 * TC-DIS-120 — Accesibilidad WCAG 2.1 AA de las vistas de Asociación Activa e Historial
 * RF-34 · CU-01 Registrar y Asociar Activo Biológico (vistas de consulta) · Rol: Administrador
 * Activos biológicos → ficha del activo → pestaña "Infraestructura":
 *   "Ubicación actual" (asociación activa) / "Historial de ubicaciones"
 *
 * Herramientas: @axe-core/playwright (reporte axe-<TC>.html/json) + Lighthouse en
 * modo snapshot sobre la misma sesión (lighthouse-<TC>-<paso>-<viewport>.html/json),
 * ambos en ./resultados. Una auditoría fallida de Lighthouse es un defecto aunque tenga
 * peso 0 en el puntaje. RF de solo lectura: no se evalúan formularios de escritura.
 *
 * Datos: activo #765 ("galpon prueba", finca Administrativa de la cuenta Admin).
 * Su historial tiene 1 registro (sin solapamiento, advertencia_integridad: null) y
 * la consulta ACTIVA responde 200.
 *
 * 2026-10-09: el activo #4 original ya no existe en el ambiente (404
 * ACTIVO_NO_ENCONTRADO) — la cuenta Admin quedó momentáneamente sin ningún activo
 * visible (su única finca, "Finca Administrativa", no tenía ninguno registrado);
 * Alex lo corrigió sembrando 10 activos nuevos (#756-765) en esa finca. Se cambia
 * ID_ACTIVO a uno de ellos. El test 1-2 (reconstruida) se mantiene como estaba —
 * sigue sirviendo de control con page.route independientemente del activo real.
 * Si en el futuro el activo real tiene más de un registro de historial con
 * solapamiento, el test 3 lo evalúa automáticamente (advertencia_integridad).
 *
 * 2026-10-10: reejecución sobre la release 1.0.0-rc.48. Sin cambios de datos ni de
 * criterio; solo se corrige la anotación del test 1-2, que todavía hablaba del activo #4.
 *
 * Errores: 404 real (activo inexistente), 400 de ruta inválida y 403 inyectado
 * (el backend responde 404 y no 403 a un activo ajeno, así que el 403 no se
 * alcanza desde la UI; se usa el formato ACCESO_DENEGADO del backend).
 *
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_120_VIEWPORTS=escritorio
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { auditarLighthouse, PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';

const TC_ID = 'TC-DIS-120';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

const ID_ACTIVO = Number(process.env.TC_DIS_120_ACTIVO ?? 765);

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_120_VIEWPORTS ?? 'movil,tablet,escritorio')
  .split(',')
  .map((v) => v.trim());

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const RUTA_ASOCIACION = /\/activos-biologicos\/\d+\/infraestructura$/;
const URL_ASOCIACION = (url: URL) => RUTA_ASOCIACION.test(url.pathname);

// Asociación activa simulada, independiente de ID_ACTIVO: sirve de control fijo para el
// test 1-2 aunque cambien los datos reales del ambiente (igual que 1a, que sí usa datos reales).
const ASOCIACION_ACTIVA_FIXTURE = {
  tipo_consulta: 'ACTIVA',
  id_activo_biologico: ID_ACTIVO,
  asociacion_activa: {
    id_historial: 293, id_activo_biologico: ID_ACTIVO, id_infraestructura: 16,
    nombre_infraestructura: 'QA-G05-Infra-1789005185', tipo_infraestructura: 'Estanque',
    fecha_inicio: '2024-03-10T00:00:00Z', fecha_fin: null,
  },
  historial: [],
  sensores_en_infraestructura: [],
  advertencia_integridad: null,
};

// Formato estándar del backend TEST para 403 (visto en /configuracion/tipos-area, 2026-09-28)
const ERROR_403 = {
  error_code: 'ACCESO_DENEGADO',
  message: 'Acceso denegado. Su rol no tiene permisos para realizar esta operación.',
  fields: [],
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

/** Ficha del activo → pestaña "Infraestructura" (abre en "Ubicación actual"). Devuelve el estado de la consulta ACTIVA. */
async function abrirInfraestructura(page: Page, idActivo = ID_ACTIVO): Promise<number> {
  await page.goto(`/activos-biologicos/${idActivo}`);
  await expect(page.getByRole('navigation', { name: 'Secciones del activo' })).toBeVisible({ timeout: 20_000 });
  const consulta = page.waitForResponse((r) => URL_ASOCIACION(new URL(r.url())) && new URL(r.url()).searchParams.get('tipo_consulta') === 'ACTIVA');
  await page.getByRole('navigation', { name: 'Secciones del activo' }).getByRole('button', { name: 'Infraestructura', exact: true }).click();
  const estado = (await consulta).status();
  await expect(page.getByRole('button', { name: 'Ubicación actual', exact: true })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  return estado;
}

function botonesVista(page: Page): { activa: Locator; historial: Locator } {
  return {
    activa: page.getByRole('button', { name: 'Ubicación actual', exact: true }),
    historial: page.getByRole('button', { name: 'Historial de ubicaciones', exact: true }),
  };
}

/** 4.1.2 / 2.4.4: el control de la vista seleccionada debe exponer su estado (no solo con estilo). */
async function verificarEstadoSeleccion(control: Locator, nombre: string) {
  const estado = await control.evaluate((el) =>
    el.getAttribute('aria-selected') ?? el.getAttribute('aria-pressed') ?? el.getAttribute('aria-current'));
  expect.soft(estado ?? 'sin atributo', `4.1.2: el control "${nombre}" no expone que es la vista seleccionada (aria-selected / aria-pressed / aria-current); solo se distingue por el estilo`).toMatch(/true|page/);
}

// ── Escaneo axe + Lighthouse ─────────────────────────────────────────────────

function resumenViolaciones(violaciones: { id: string; impact?: string | null; help: string; nodes: unknown[] }[]) {
  return violaciones.map((v) => `${v.id} (${v.impact}): ${v.help} [${v.nodes.length} nodo(s)]`).join('\n');
}

async function escanear(page: Page, pasoBase: string, testInfo: TestInfo) {
  const paso = `${pasoBase}-${testInfo.project.name}`;
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
  // Una auditoría fallida es un defecto aunque Lighthouse le asigne peso 0 en el puntaje
  expect.soft(lh.auditoriasFallidas.map((a) => a.id), `DEFECTO: auditorías de accesibilidad fallidas en Lighthouse ("${paso}")`).toEqual([]);
}

// ── Casos ────────────────────────────────────────────────────────────────────

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Asociación Activa e Historial (RF-34)`, () => {
  // Modo por defecto (no serial): un paso con violaciones no debe impedir evaluar los demás.
  // workers: 1 en el config, así que los logins siguen siendo secuenciales.
  test.describe.configure({ timeout: 180_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      !VIEWPORTS_HABILITADOS.includes(testInfo.project.name),
      `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_120_VIEWPORTS.`,
    );
    expect(ADMIN_EMAIL, 'Falta TEST_ADMIN_EMAIL en testing/.env.test').not.toBe('');
    expect(ADMIN_PASSWORD, 'Falta TEST_ADMIN_PASSWORD en testing/.env.test').not.toBe('');
    await iniciarSesionAdmin(page);
  });

  test('1a. Asociación Activa (estado real del ambiente) - 0 violaciones axe A/AA', async ({ page }, testInfo) => {
    const estado = await abrirInfraestructura(page);

    // El error de carga debe anunciarse (3.3.1)
    const alerta = page.getByRole('alert').filter({ hasText: 'Error al cargar la asociación' });
    if (estado !== 200) await expect(alerta).toBeVisible();

    await escanear(page, 'activa-real', testInfo);

    expect(
      estado,
      `BLOQUEO: GET /activos-biologicos/${ID_ACTIVO}/infraestructura?tipo_consulta=ACTIVA responde 404 ASOCIACION_INFRAESTRUCTURA_NO_ENCONTRADA; ningún activo del ambiente tiene asociación activa`,
    ).toBe(200);
  });

  test('1-2. Asociación Activa (reconstruida) - 0 violaciones axe A/AA (1.3.1, 4.1.2 selección de vista)', async ({ page }, testInfo) => {
    await page.route(URL_ASOCIACION, (r) =>
      new URL(r.request().url()).searchParams.get('tipo_consulta') === 'ACTIVA'
        ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ASOCIACION_ACTIVA_FIXTURE) })
        : r.fallback());
    testInfo.annotations.push({
      type: 'Datos simulados',
      description: 'Asociación activa fija servida con page.route (control independiente de los datos del ambiente; el test 1a cubre la asociación real).',
    });

    await abrirInfraestructura(page);
    await expect(page.getByText(ASOCIACION_ACTIVA_FIXTURE.asociacion_activa.nombre_infraestructura)).toBeVisible();
    await expect(page.getByText('ACTUAL', { exact: true })).toBeVisible();

    await verificarEstadoSeleccion(botonesVista(page).activa, 'Ubicación actual');
    await escanear(page, 'activa', testInfo);
  });

  test('3. Historial de Asociaciones - 0 violaciones axe A/AA (1.3.1 estructura, 4.1.2 advertencia_integridad)', async ({ page }, testInfo) => {
    await abrirInfraestructura(page);
    const consulta = page.waitForResponse((r) => URL_ASOCIACION(new URL(r.url())) && new URL(r.url()).searchParams.get('tipo_consulta') === 'HISTORIAL');
    await botonesVista(page).historial.click();
    const respuesta = await (await consulta).json();

    expect(respuesta.historial.length, `Precondición: el activo #${ID_ACTIVO} debe tener historial`).toBeGreaterThan(0);
    // Un área puede repetirse en el historial (varios períodos en la misma infraestructura)
    for (const nombre of new Set<string>(respuesta.historial.map((a: { nombre_infraestructura: string }) => a.nombre_infraestructura))) {
      await expect(page.getByText(nombre, { exact: true }).first()).toBeVisible();
    }
    await verificarEstadoSeleccion(botonesVista(page).historial, 'Historial de ubicaciones');

    // 1.3.1: el historial (varias asociaciones con infraestructura / tipo / período) debe tener estructura
    const tabla = await page.getByRole('table').count();
    const lista = await page.getByRole('list').filter({ hasText: respuesta.historial[0].nombre_infraestructura }).count();
    testInfo.annotations.push({ type: 'Estructura del historial', description: `tablas: ${tabla} · listas: ${lista}` });
    expect.soft(tabla + lista, '1.3.1: el historial no expone estructura (ni tabla con encabezados ni lista); infraestructura, tipo y período solo se relacionan visualmente').toBeGreaterThan(0);

    // 4.1.2: advertencia_integridad del backend debe comunicarse por texto
    testInfo.annotations.push({ type: 'advertencia_integridad (backend)', description: String(respuesta.advertencia_integridad) });
    if (respuesta.advertencia_integridad) {
      await expect
        .soft(page.getByText(/solapamiento/i), '4.1.2: el backend devuelve advertencia_integridad y la UI no la muestra (ni texto ni aria)')
        .toBeVisible();
    }

    await escanear(page, 'historial', testInfo);
  });

  test('4. Errores: activo inexistente (404), ruta inválida (400) y sin permiso (403) - anunciados', async ({ page }, testInfo) => {
    // 404 real: activo inexistente
    await page.goto('/activos-biologicos/999999');
    const alerta404 = page.getByRole('alert').filter({ hasText: 'No se pudo cargar el activo' });
    await expect(alerta404, '3.3.1: el 404 debe anunciarse').toBeVisible({ timeout: 20_000 });
    await expect(alerta404).toContainText('El activo no existe o fue eliminado.');
    await escanear(page, 'error-404', testInfo);

    // Ruta con identificador no numérico
    await page.goto('/activos-biologicos/abc');
    const alertaInvalido = page.getByRole('alert').filter({ hasText: 'Activo inválido' });
    await expect(alertaInvalido, '3.3.1: el identificador inválido debe anunciarse').toBeVisible();

    // 403 inyectado sobre la ficha del activo
    // Solo la llamada a la API (xhr/fetch), no la carga del documento de la SPA con la misma ruta
    await page.route((url) => /\/activos-biologicos\/\d+$/.test(url.pathname), (r) =>
      r.request().method() === 'GET' && ['xhr', 'fetch'].includes(r.request().resourceType())
        ? r.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify(ERROR_403) })
        : r.fallback());
    testInfo.annotations.push({ type: 'Datos simulados', description: '403 inyectado: el backend responde 404 (no 403) a un activo ajeno, así que el 403 no se alcanza desde la UI.' });
    await page.goto(`/activos-biologicos/${ID_ACTIVO}`);
    const alerta403 = page.getByRole('alert').filter({ hasText: 'No se pudo cargar el activo' });
    await expect(alerta403, '3.3.1: el 403 debe anunciarse').toBeVisible({ timeout: 20_000 });
    await expect(alerta403, '3.3.1: el 403 debe explicar que no hay permiso').toContainText(/permiso|Acceso denegado/i);
    await escanear(page, 'error-403', testInfo);
  });

  test('5. Teclado - Tab alterna entre las vistas y Enter muestra el historial', async ({ page }) => {
    await abrirInfraestructura(page);
    const { activa, historial } = botonesVista(page);

    // Desde la pestaña "Infraestructura", Tab recorre las demás pestañas del activo y luego llega a las vistas
    await page.getByRole('navigation', { name: 'Secciones del activo' }).getByRole('button', { name: 'Infraestructura', exact: true }).focus();
    for (let i = 0; i < 10 && !(await activa.evaluate((el) => el === document.activeElement)); i++) {
      await page.keyboard.press('Tab');
    }
    await expect(activa, '2.4.3: Tab debe alcanzar "Ubicación actual" después de las pestañas del activo').toBeFocused();
    await page.keyboard.press('Tab');
    await expect(historial, '2.4.3: luego a "Historial de ubicaciones"').toBeFocused();

    const consulta = page.waitForResponse((r) => URL_ASOCIACION(new URL(r.url())) && new URL(r.url()).searchParams.get('tipo_consulta') === 'HISTORIAL');
    await page.keyboard.press('Enter');
    const respuesta = await (await consulta).json();
    await expect(page.getByText(respuesta.historial[0].nombre_infraestructura, { exact: true }).first(), 'Enter debe mostrar el historial').toBeVisible();

    await page.keyboard.press('Shift+Tab');
    await expect(activa).toBeFocused();
    await page.keyboard.press('Enter');
    // La ubicación actual puede ser la misma infraestructura del historial: se verifica la marca "ACTUAL"
    await expect(page.getByText('ACTUAL', { exact: true }), 'Enter en "Ubicación actual" debe volver a la vista activa').toBeVisible();
  });
});
