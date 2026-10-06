/**
 * TC-DIS-50 — Consistencia visual del listado y formulario de Datos de la Finca
 * RF-19 · CU-04 Gestionar Infraestructura Productiva · Rol: Administrador
 *
 * Datos: el test "0" verifica que el listado real carga (el 400 VEREDA_REQUERIDO del
 * 2026-09-28 ya está corregido). Las baselines se toman con un fixture fijo servido por
 * page.route: las fincas #1–#5 tal como las devolvía GET /configuracion/fincas/{id}
 * (4 activas y 1 inactiva, datos completos), para no depender de los datos que otras
 * pruebas crean o editan en el ambiente.
 *
 * Formularios: se captura solo la tarjeta del modal (el fondo de la pestaña cambia con
 * los tipos de área del ambiente). El modal tiene scroll propio; antes de capturar se
 * amplía el alto de la ventana, conservando el ancho, hasta que la tarjeta quepa completa.
 *
 * Verificación de layout: la tarjeta del modal se mide contra el DS v2.0 (bottom sheet a
 * ancho completo en xs/sm, máx. 480px en md, máx. 560px en lg) y falla como DEFECTO si
 * no cumple.
 *
 * PROTECCIÓN DE DATOS: todo POST/PATCH a /configuracion/fincas se aborta (el caso no
 * envía formularios).
 *
 * Tema: la preferencia de tema es de la cuenta (compartida); GET
 * /configuracion/personalizacion/tema(/global) se sirve con el tema Claro (theme_mode 1,
 * cuerpo real de TEST) y cualquier escritura a esos endpoints se aborta.
 *
 * Nota del caso: el formulario no incluye mapa ni vista previa de coordenadas,
 * por lo que no aplica la baseline "con y sin marcador".
 *
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_50_VIEWPORTS=escritorio
 */
import { expect, test, type Locator, type Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_50_VIEWPORTS ?? 'movil,tablet,escritorio')
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

const URL_FINCAS = (url: URL) => /\/configuracion\/fincas(\/\d+(\/\w+)?)?$/.test(url.pathname);

// Tema Claro fijo (cuerpos reales de TEST con theme_mode 1)
const TEMA: Record<string, unknown> = {
  '/configuracion/personalizacion/tema': { theme_mode: 1, fuente: 'personal', id_tema_visual: 10 },
  '/configuracion/personalizacion/tema/global': { id_tema_visual: 1, id_usuario: 1, theme_mode: 1, es_global: true, fecha_actualizacion: '2026-09-29T22:56:03.004225Z' },
};

test.use({ locale: 'es-CO', timezoneId: 'America/Bogota' });

async function fijarTemaClaro(page: Page) {
  await page.route((url) => Object.keys(TEMA).some((k) => url.pathname.endsWith(k)), (r) => {
    const req = r.request();
    if (!['xhr', 'fetch'].includes(req.resourceType())) return r.continue();
    if (req.method() !== 'GET') return r.abort('blockedbyclient');
    const clave = Object.keys(TEMA).find((k) => new URL(req.url()).pathname.endsWith(k))!;
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(TEMA[clave]) });
  });
}

/** Ninguna escritura a fincas llega al backend. */
async function protegerFincas(page: Page) {
  await page.route(URL_FINCAS, (route) => {
    const req = route.request();
    if (!['xhr', 'fetch'].includes(req.resourceType()) || req.method() === 'GET') return route.fallback();
    return route.abort();
  });
}

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

function tarjetaModal(dialogo: Locator): Locator {
  return dialogo.locator('> div');
}

/**
 * La capa del modal tiene scroll propio: si la tarjeta no cabe, la captura la cortaría.
 * Se amplía el alto de la ventana (conservando el ancho del proyecto) hasta que quepa.
 */
async function capturarModal(page: Page, dialogo: Locator, nombre: string) {
  const viewport = page.viewportSize()!;
  const caja = (await tarjetaModal(dialogo).boundingBox())!;
  const necesario = Math.ceil(caja.y + caja.height + 48);
  if (necesario > viewport.height) await page.setViewportSize({ width: viewport.width, height: necesario });
  await page.mouse.move(0, 0);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.evaluate(() => document.fonts.ready);
  await expect(tarjetaModal(dialogo)).toHaveScreenshot(nombre, { animations: 'disabled', caret: 'hide' });
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
      `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_50_VIEWPORTS.`,
    );
    expect(ADMIN_EMAIL, 'Falta TEST_ADMIN_EMAIL en testing/.env.test').not.toBe('');
    expect(ADMIN_PASSWORD, 'Falta TEST_ADMIN_PASSWORD en testing/.env.test').not.toBe('');

    await protegerFincas(page);
    await fijarTemaClaro(page);
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

    await capturarModal(page, dialogo, 'fincas-form-registrar.png');
  });

  test('3. Formulario "Editar finca" (datos completos)', async ({ page }) => {
    await servirFixture(page);
    await abrirFincas(page);
    await page.getByRole('button', { name: `Editar ${FINCA_EDITAR}` }).click();
    const dialogo = page.getByRole('dialog', { name: `Editar finca — ${FINCA_EDITAR}` });
    await expect(dialogo).toBeVisible();
    await expect(dialogo.getByRole('textbox', { name: 'Nombre de la finca', exact: true })).toHaveValue(FINCA_EDITAR);

    await capturarModal(page, dialogo, 'fincas-form-editar.png');
  });

  test('4. Modal del formulario según el breakpoint del sistema de diseño', async ({ page }, testInfo) => {
    await servirFixture(page);
    await abrirFincas(page);
    await page.getByRole('button', { name: 'Nueva finca' }).click();
    const dialogo = page.getByRole('dialog', { name: 'Registrar nueva finca' });
    await expect(dialogo).toBeVisible();

    const viewport = page.viewportSize()!;
    const caja = (await tarjetaModal(dialogo).boundingBox())!;
    testInfo.annotations.push({ type: 'Tarjeta del modal', description: `viewport ${viewport.width}×${viewport.height} · x ${Math.round(caja.x)} · y ${Math.round(caja.y)} · ${Math.round(caja.width)}×${Math.round(caja.height)}` });

    // DS v2.0 (CLAUDE.md, Grid y breakpoints): bottom sheet a ancho completo en xs/sm, max 480px en md, max 560px en lg
    if (viewport.width < 768) {
      expect.soft(Math.round(caja.width), `DEFECTO: en ${testInfo.project.name} (${viewport.width}px, xs/sm) el modal debe ser un bottom sheet a ancho completo; mide ${Math.round(caja.width)}px y queda centrado con márgenes`).toBe(viewport.width);
      expect.soft(Math.round(caja.y + caja.height), `DEFECTO: en ${testInfo.project.name} el bottom sheet debe apoyarse en el borde inferior de la pantalla (empieza arriba y sale de la pantalla con scroll)`).toBe(viewport.height);
    } else if (viewport.width < 1200) {
      expect(Math.round(caja.width), `DEFECTO: en ${testInfo.project.name} (${viewport.width}px, md) el modal debe medir máximo 480px; mide ${Math.round(caja.width)}px`).toBeLessThanOrEqual(480);
    } else {
      expect(Math.round(caja.width), `DEFECTO: en ${testInfo.project.name} (${viewport.width}px, lg) el modal debe medir máximo 560px; mide ${Math.round(caja.width)}px`).toBeLessThanOrEqual(560);
    }
  });
});
