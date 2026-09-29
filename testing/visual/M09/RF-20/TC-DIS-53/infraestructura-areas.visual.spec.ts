/**
 * TC-DIS-53 — Consistencia visual del listado y formulario de Infraestructura Productiva
 * RF-20 · CU-04 Gestionar Infraestructura Productiva · Rol: Administrador
 * Configuración → Fincas → sección "Infraestructura Productiva"
 *
 * Baselines ("listado de áreas agrupado por finca" + formulario registrar/editar):
 *   - selector de fincas de la sección,
 *   - áreas de la finca #1 (activas + inactiva) y de la finca #2,
 *   - formulario "Registrar área productiva" y "Editar área".
 *
 * BLOQUEOS DEL AMBIENTE (2026-09-28, ver TC-DIS-49/52):
 *   - GET /configuracion/fincas → 400 VEREDA_REQUERIDO (finca #34 sin departamento/vereda);
 *   - GET /configuracion/tipos-area → 403 ACCESO_DENEGADO (también para el Administrador).
 * El test "0" verifica ambos y falla mientras sigan. Las baselines se toman con
 * fixtures fijos de datos reales servidos por page.route (fincas #1–#5, áreas de
 * las fincas #1 y #2, y los tipos "Estanque" / "Invernadero" observados en ellas),
 * lo que además las hace independientes de los cambios de datos del ambiente.
 *
 * Viewports: el script contempla movil / tablet / escritorio, pero solo se
 * ejecuta ESCRITORIO por el defecto abierto de sidebar/scroll (TC-DIS-07/08/10/11).
 * Para habilitarlos: TC_DIS_53_VIEWPORTS=movil,tablet,escritorio
 */
import { expect, test, type Locator, type Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_53_VIEWPORTS ?? 'escritorio')
  .split(',')
  .map((v) => v.trim());

// page.route compara la URL completa (con query): se filtra por pathname
const RUTA_FINCAS = /\/configuracion\/fincas$/;
const RUTA_TIPOS = /\/configuracion\/tipos-area$/;
const RUTA_AREAS = /\/configuracion\/infraestructuras$/;
const porRuta = (patron: RegExp) => (url: URL) => patron.test(url.pathname);

// ── Fixtures: datos reales del ambiente TEST (2026-09-28) ────────────────────

const FINCAS_FIXTURE = [
  { id_finca: 1, nombre: 'Finca Acuícola El Remanso', ubicacion: { departamento: 'Huila', municipio: 'Neiva', vereda: 'El Remanso', latitud: '2.9273', longitud: '-75.2819' }, tamano_h: '12.50', es_activo: true, fecha_creacion: '2026-04-28T14:42:28Z', fecha_actualizacion: '2026-04-28T14:42:28.213141Z', id_usuario: 2 },
  { id_finca: 2, nombre: 'Piscícola Los Esteros', ubicacion: { departamento: 'Valle del Cauca', municipio: 'Cartago', vereda: 'Los Esteros', latitud: '3.8654', longitud: '-76.4920' }, tamano_h: '8.75', es_activo: true, fecha_creacion: '2026-04-28T14:42:28Z', fecha_actualizacion: '2026-04-28T14:42:28.213141Z', id_usuario: 2 },
  { id_finca: 3, nombre: 'Camaronera Costa Azul', ubicacion: { departamento: 'Cordoba', municipio: 'Monteria', vereda: 'Costa Azul', latitud: '8.7479', longitud: '-75.8814' }, tamano_h: '25.00', es_activo: true, fecha_creacion: '2026-04-28T14:42:28Z', fecha_actualizacion: '2026-04-28T14:42:28.213141Z', id_usuario: 2 },
  { id_finca: 4, nombre: 'Granja Piscícola La Esperanza', ubicacion: { departamento: 'Caldas', municipio: 'Manizales', vereda: 'La Esperanza', latitud: '5.0689', longitud: '-75.5174' }, tamano_h: '6.30', es_activo: true, fecha_creacion: '2026-04-28T14:42:28Z', fecha_actualizacion: '2026-04-28T14:42:28.213141Z', id_usuario: 2 },
  { id_finca: 5, nombre: 'Finca El Paraiso Norte', ubicacion: { departamento: 'Antioquia', municipio: 'Medellin', vereda: 'La Estrella', latitud: '6.30', longitud: '-75.60' }, tamano_h: '120.00', es_activo: false, fecha_creacion: '2026-06-21T16:13:31Z', fecha_actualizacion: '2026-06-21T16:13:31.510491Z', id_usuario: 2 },
];

const AREAS_FIXTURE: Record<number, object[]> = {
  1: [
    { id_infraestructura: 3, nombre_infraestructura: 'Alevinera-01', tipo_area: 'Estanque', superficie: '500.00', id_finca: 1, descripcion_infraestructura: 'Área de alevinaje y larvicultura de tilapia', es_activo: true, fecha_actualizacion: null },
    { id_infraestructura: 1, nombre_infraestructura: 'Estanque-01', tipo_area: 'Estanque', superficie: '2500.00', id_finca: 1, descripcion_infraestructura: 'Estanque principal de engorde de tilapia con aireación artificial', es_activo: true, fecha_actualizacion: '2026-09-26T07:22:58.409459Z' },
    { id_infraestructura: 2, nombre_infraestructura: 'Estanque-02', tipo_area: 'Estanque', superficie: '1800.00', id_finca: 1, descripcion_infraestructura: 'Estanque secundario para fase juvenil de tilapia', es_activo: true, fecha_actualizacion: null },
    { id_infraestructura: 10, nombre_infraestructura: 'Invernadero Norte', tipo_area: 'Invernadero', superficie: '500.00', id_finca: 1, descripcion_infraestructura: 'Zona controlada para cultivos', es_activo: false, fecha_actualizacion: null },
  ],
  2: [
    { id_infraestructura: 4, nombre_infraestructura: 'Canal-Trucha-01', tipo_area: 'Estanque', superficie: '1200.00', id_finca: 2, descripcion_infraestructura: 'Estanque de trucha arcoíris con flujo de agua continuo', es_activo: true, fecha_actualizacion: null },
    { id_infraestructura: 5, nombre_infraestructura: 'Canal-Trucha-02', tipo_area: 'Estanque', superficie: '1200.00', id_finca: 2, descripcion_infraestructura: 'Estanque de engorde de trucha con alta oxigenación', es_activo: true, fecha_actualizacion: null },
  ],
};

const TIPOS_FIXTURE = [
  { id_tipo_area: 1, nombre: 'Estanque', es_activo: true, fecha_creacion: '2026-04-28T14:42:28Z', fecha_actualizacion: null },
  { id_tipo_area: 2, nombre: 'Invernadero', es_activo: true, fecha_creacion: '2026-04-28T14:42:28Z', fecha_actualizacion: null },
];

const AREA_EDITAR = 'Estanque-01';
const OPCIONES_CAPTURA = { fullPage: true, animations: 'disabled' as const, caret: 'hide' as const };

// ── Navegación ───────────────────────────────────────────────────────────────

async function iniciarSesionAdmin(page: Page) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill(ADMIN_EMAIL);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 });
}

async function servirFixtures(page: Page) {
  const json = (cuerpo: unknown) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(cuerpo) });
  await page.route(porRuta(RUTA_FINCAS), (r) => (r.request().method() === 'GET' ? r.fulfill(json(FINCAS_FIXTURE)) : r.fallback()));
  await page.route(porRuta(RUTA_TIPOS), (r) => (r.request().method() === 'GET' ? r.fulfill(json(TIPOS_FIXTURE)) : r.fallback()));
  await page.route(porRuta(RUTA_AREAS), (r) => {
    if (r.request().method() !== 'GET') return r.fallback();
    const idFinca = Number(new URL(r.request().url()).searchParams.get('finca_id'));
    const items = AREAS_FIXTURE[idFinca] ?? [];
    return r.fulfill(json({ total: items.length, items }));
  });
}

/** /configuracion → Fincas → sección Infraestructura (queda en el selector de fincas). */
async function abrirSeccion(page: Page) {
  await page.goto('/configuracion');
  await page.getByRole('button', { name: 'Fincas', exact: true }).click();
  const titulo = page.getByRole('heading', { name: 'Infraestructura Productiva' });
  await titulo.scrollIntoViewIfNeeded();
  await expect(titulo).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  return titulo;
}

/** Bloque de la sección Infraestructura que contiene `contenido` (el más interno). */
function seccion(page: Page, contenido: Locator): Locator {
  return page
    .locator('div')
    .filter({ has: page.getByRole('heading', { name: 'Infraestructura Productiva' }) })
    .filter({ has: contenido })
    .last();
}

function botonFinca(page: Page, nombre: string) {
  return page.getByRole('button').filter({ has: page.getByText(nombre, { exact: true }) }).first();
}

/** Bloque de áreas de la finca seleccionada (la pestaña también tiene la tabla de fincas). */
function seccionAreas(page: Page): Locator {
  return seccion(page, page.getByRole('button', { name: 'Cambiar finca' }));
}

async function abrirAreas(page: Page, nombreFinca: string, cantidad: number) {
  await botonFinca(page, nombreFinca).click();
  await expect(page.getByRole('button', { name: 'Cambiar finca' })).toBeVisible();
  await expect(seccionAreas(page).locator('table tbody tr')).toHaveCount(cantidad);
}

/** "Tipos de área" (fondo de los modales) muestra "Acceso denegado": defecto aparte, se enmascara. */
function mascarasFondo(page: Page): Locator[] {
  return [page.getByRole('alert'), page.getByText('No hay tipos de área registrados.')];
}

// ── Casos ────────────────────────────────────────────────────────────────────

test.describe('TC-DIS-53 - Consistencia visual - Infraestructura Productiva / Áreas (RF-20)', () => {
  // workers: 1 en el config; timeout amplio por la latencia del login en TEST
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      !VIEWPORTS_HABILITADOS.includes(testInfo.project.name),
      `Viewport "${testInfo.project.name}" deshabilitado: defecto abierto de sidebar/scroll en móvil y tablet (TC-DIS-07/08/10/11). Solo se evalúa escritorio.`,
    );
    expect(ADMIN_EMAIL, 'Falta TEST_ADMIN_EMAIL en testing/.env.test').not.toBe('');
    expect(ADMIN_PASSWORD, 'Falta TEST_ADMIN_PASSWORD en testing/.env.test').not.toBe('');
    await iniciarSesionAdmin(page);
  });

  test('0. Precondición - el ambiente entrega fincas y catálogo de tipos de área', async ({ page }) => {
    const fincas = page.waitForResponse((r) => r.request().method() === 'GET' && RUTA_FINCAS.test(new URL(r.url()).pathname));
    const tipos = page.waitForResponse((r) => r.request().method() === 'GET' && RUTA_TIPOS.test(new URL(r.url()).pathname));
    await abrirSeccion(page);

    expect.soft((await fincas).status(), 'BLOQUEO: GET /configuracion/fincas no responde 200 (400 VEREDA_REQUERIDO por la finca #34)').toBe(200);
    expect.soft((await tipos).status(), 'BLOQUEO: GET /configuracion/tipos-area no responde 200 (403 ACCESO_DENEGADO para el Administrador)').toBe(200);
  });

  test('1. Selector de fincas de la sección', async ({ page }) => {
    await servirFixtures(page);
    await abrirSeccion(page);
    const primera = botonFinca(page, FINCAS_FIXTURE[0].nombre);
    await expect(primera).toBeVisible();

    await expect(seccion(page, primera)).toHaveScreenshot('areas-selector-fincas.png', { animations: 'disabled' });
  });

  test('1-2. Áreas agrupadas por finca - finca #1 (activas e inactiva)', async ({ page }) => {
    await servirFixtures(page);
    await abrirSeccion(page);
    await abrirAreas(page, FINCAS_FIXTURE[0].nombre, AREAS_FIXTURE[1].length);

    await expect(seccionAreas(page)).toHaveScreenshot('areas-listado-finca-1.png', { animations: 'disabled' });
  });

  test('1-2. Áreas agrupadas por finca - finca #2', async ({ page }) => {
    await servirFixtures(page);
    await abrirSeccion(page);
    await abrirAreas(page, FINCAS_FIXTURE[1].nombre, AREAS_FIXTURE[2].length);

    await expect(seccionAreas(page)).toHaveScreenshot('areas-listado-finca-2.png', { animations: 'disabled' });
  });

  test('3. Formulario "Registrar área productiva"', async ({ page }) => {
    await servirFixtures(page);
    await abrirSeccion(page);
    await abrirAreas(page, FINCAS_FIXTURE[0].nombre, AREAS_FIXTURE[1].length);
    await page.getByRole('button', { name: 'Nueva área' }).click();
    const dialogo = page.getByRole('dialog', { name: 'Registrar área productiva' });
    await expect(dialogo).toBeVisible();
    await expect(dialogo.getByRole('combobox').first()).toHaveValue('Estanque');

    await expect(page).toHaveScreenshot('areas-form-registrar.png', { ...OPCIONES_CAPTURA, mask: mascarasFondo(page) });
  });

  test('3. Formulario "Editar área"', async ({ page }) => {
    await servirFixtures(page);
    await abrirSeccion(page);
    await abrirAreas(page, FINCAS_FIXTURE[0].nombre, AREAS_FIXTURE[1].length);
    await seccionAreas(page).locator('table tbody tr').filter({ hasText: AREA_EDITAR }).getByRole('button', { name: /^Editar / }).click();
    const dialogo = page.getByRole('dialog', { name: `Editar área — ${AREA_EDITAR}` });
    await expect(dialogo).toBeVisible();
    await expect(dialogo.getByRole('textbox', { name: 'Nombre del área', exact: true })).toHaveValue(AREA_EDITAR);

    await expect(page).toHaveScreenshot('areas-form-editar.png', { ...OPCIONES_CAPTURA, mask: mascarasFondo(page) });
  });
});
