/**
 * TC-DIS-50 — Consistencia visual del listado y formulario de Datos de la Finca
 * RF-19 · CU-04 Gestionar Infraestructura Productiva · Rol: Administrador
 *
 * BLOQUEO DEL AMBIENTE (2026-09-28): GET /configuracion/fincas responde
 * 400 VEREDA_REQUERIDO porque la finca #34 no tiene departamento/vereda
 * (ver TC-DIS-49). El test "0" verifica el listado real y falla mientras siga
 * así; las baselines se toman con un fixture fijo servido por page.route:
 * las fincas #1–#5 tal como las devuelve hoy GET /configuracion/fincas/{id}
 * (4 activas y 1 inactiva, datos completos). Así la baseline no depende de
 * los datos que otras pruebas crean o editan en el ambiente.
 *
 * Nota del caso: el formulario no incluye mapa ni vista previa de coordenadas,
 * por lo que no aplica la baseline "con y sin marcador".
 *
 * Viewports: el script contempla movil / tablet / escritorio, pero solo se
 * ejecuta ESCRITORIO por el defecto abierto de sidebar/scroll (TC-DIS-07/08/10/11).
 * Para habilitarlos: TC_DIS_50_VIEWPORTS=movil,tablet,escritorio
 */
import { expect, test, type Locator, type Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_50_VIEWPORTS ?? 'escritorio')
  .split(',')
  .map((v) => v.trim());

const RUTA_LISTADO = /\/configuracion\/fincas$/;
// page.route compara la URL completa (con ?solo_activas=...): se filtra por pathname
const URL_LISTADO = (url: URL) => RUTA_LISTADO.test(url.pathname);

// Fincas #1–#5 del ambiente TEST (GET /configuracion/fincas/{id}, 2026-09-28)
const FINCAS_FIXTURE = [
  { id_finca: 1, nombre: 'Finca Acuícola El Remanso', ubicacion: { departamento: 'Huila', municipio: 'Neiva', vereda: 'El Remanso', latitud: '2.9273', longitud: '-75.2819' }, tamano_h: '12.50', es_activo: true, fecha_creacion: '2026-04-28T14:42:28Z', fecha_actualizacion: '2026-04-28T14:42:28.213141Z', id_usuario: 2 },
  { id_finca: 2, nombre: 'Piscícola Los Esteros', ubicacion: { departamento: 'Valle del Cauca', municipio: 'Cartago', vereda: 'Los Esteros', latitud: '3.8654', longitud: '-76.4920' }, tamano_h: '8.75', es_activo: true, fecha_creacion: '2026-04-28T14:42:28Z', fecha_actualizacion: '2026-04-28T14:42:28.213141Z', id_usuario: 2 },
  { id_finca: 3, nombre: 'Camaronera Costa Azul', ubicacion: { departamento: 'Cordoba', municipio: 'Monteria', vereda: 'Costa Azul', latitud: '8.7479', longitud: '-75.8814' }, tamano_h: '25.00', es_activo: true, fecha_creacion: '2026-04-28T14:42:28Z', fecha_actualizacion: '2026-04-28T14:42:28.213141Z', id_usuario: 2 },
  { id_finca: 4, nombre: 'Granja Piscícola La Esperanza', ubicacion: { departamento: 'Caldas', municipio: 'Manizales', vereda: 'La Esperanza', latitud: '5.0689', longitud: '-75.5174' }, tamano_h: '6.30', es_activo: true, fecha_creacion: '2026-04-28T14:42:28Z', fecha_actualizacion: '2026-04-28T14:42:28.213141Z', id_usuario: 2 },
  { id_finca: 5, nombre: 'Finca El Paraiso Norte', ubicacion: { departamento: 'Antioquia', municipio: 'Medellin', vereda: 'La Estrella', latitud: '6.30', longitud: '-75.60' }, tamano_h: '120.00', es_activo: false, fecha_creacion: '2026-06-21T16:13:31Z', fecha_actualizacion: '2026-06-21T16:13:31.510491Z', id_usuario: 2 },
];
const FINCA_EDITAR = FINCAS_FIXTURE[0].nombre;

const OPCIONES_CAPTURA = { fullPage: true, animations: 'disabled' as const, caret: 'hide' as const };

async function iniciarSesionAdmin(page: Page) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill(ADMIN_EMAIL);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 });
}

/** /configuracion → Fincas. Devuelve el estado HTTP del listado. */
async function abrirFincas(page: Page): Promise<number> {
  await page.goto('/configuracion');
  const listado = page.waitForResponse(
    (res) => res.request().method() === 'GET' && URL_LISTADO(new URL(res.url())),
    { timeout: 20_000 },
  );
  await page.getByRole('button', { name: 'Fincas', exact: true }).click();
  const res = await listado;
  await expect(page.getByRole('heading', { name: 'Gestión de Fincas' })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  return res.status();
}

async function servirFixture(page: Page) {
  await page.route(URL_LISTADO, (route) =>
    route.request().method() === 'GET'
      ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FINCAS_FIXTURE) })
      : route.fallback());
}

/**
 * Sección "Tipos de área" que queda de fondo tras el modal: hoy muestra "Acceso denegado"
 * al Administrador (defecto aparte, ver TC-DIS-49). Se enmascara para que su corrección
 * no altere las baselines de los formularios.
 */
function seccionTiposArea(page: Page): Locator[] {
  return [page.getByRole('alert'), page.getByText('No hay tipos de área registrados.')];
}

/** Bloque "Gestión de Fincas" (encabezado, buscador y tabla), sin las secciones vecinas de la pestaña. */
function seccionFincas(page: Page): Locator {
  return page
    .getByRole('heading', { name: 'Gestión de Fincas' })
    .locator('xpath=ancestor::div[.//table][1]');
}

test.describe('TC-DIS-50 - Consistencia visual - Datos de la Finca (RF-19)', () => {
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

  test('0. Precondición - el listado real de fincas carga con datos', async ({ page }) => {
    const estado = await abrirFincas(page);
    expect(
      estado,
      'BLOQUEO: GET /configuracion/fincas no responde 200 (400 VEREDA_REQUERIDO por la finca #34 sin departamento/vereda); las baselines se toman con el fixture',
    ).toBe(200);
    await expect(page.locator('table tbody tr').first()).toBeVisible();
  });

  test('1-2. Listado de fincas (fincas activas e inactiva, datos completos)', async ({ page }) => {
    await servirFixture(page);
    expect(await abrirFincas(page)).toBe(200);
    await expect(page.locator('table tbody tr').first()).toBeVisible();
    await expect(page.getByText(`${FINCAS_FIXTURE.filter((f) => f.es_activo).length} activas · 1 inactivas`).first()).toBeVisible();

    await expect(seccionFincas(page)).toHaveScreenshot('fincas-listado.png', { animations: 'disabled', caret: 'hide' });
  });

  test('3. Formulario "Registrar nueva finca"', async ({ page }) => {
    await servirFixture(page);
    await abrirFincas(page);
    await page.getByRole('button', { name: 'Nueva finca' }).click();
    const dialogo = page.getByRole('dialog', { name: 'Registrar nueva finca' });
    await expect(dialogo).toBeVisible();
    await expect(dialogo.getByRole('textbox', { name: 'Nombre de la finca', exact: true })).toHaveValue('');

    await expect(page).toHaveScreenshot('fincas-form-registrar.png', { ...OPCIONES_CAPTURA, mask: seccionTiposArea(page) });
  });

  test('3. Formulario "Editar finca" (datos completos)', async ({ page }) => {
    await servirFixture(page);
    await abrirFincas(page);
    await page.getByRole('button', { name: `Editar ${FINCA_EDITAR}` }).click();
    const dialogo = page.getByRole('dialog', { name: `Editar finca — ${FINCA_EDITAR}` });
    await expect(dialogo).toBeVisible();
    await expect(dialogo.getByRole('textbox', { name: 'Nombre de la finca', exact: true })).toHaveValue(FINCA_EDITAR);

    await expect(page).toHaveScreenshot('fincas-form-editar.png', { ...OPCIONES_CAPTURA, mask: seccionTiposArea(page) });
  });
});
