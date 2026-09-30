/**
 * TC-DIS-59 — Consistencia visual del flujo por pasos de Asociación de Sensores
 * RF-22 · CU-05 Gestionar Dispositivos IoT · Rol: Administrador
 * Configuración → IoT → "Asociación de Sensores a Áreas"
 *
 * Baseline de cada paso del flujo y del diálogo de reasignación:
 *   Paso 1 dispositivo · Paso 2 sensor · Paso 3 área destino · Paso 4 punto de
 *   instalación · diálogo "Confirmar reasignación".
 *
 * Mismos datos que TC-DIS-58: dispositivo #1 "IOT-EST01-HLA-001", sensor #3
 * "Sensor oxígeno disuelto estanque-01" (asociado a Estanque-01), destino Estanque-02.
 *
 * BLOQUEOS DEL AMBIENTE (2026-09-28, ver TC-DIS-49/55): GET /configuracion/fincas y
 * GET /configuracion/dispositivos-iot?solo_activos=false responden 400. El test "0"
 * verifica el estado real y falla mientras sigan. Las baselines usan fixtures fijos
 * de datos reales servidos con page.route (fincas #1–#5, dispositivos semilla, áreas
 * de la finca #1 y la respuesta 409 real que abre el diálogo), así no dependen de
 * los datos que otras pruebas cambian. Los sensores del dispositivo #1 son reales.
 * Ningún test modifica asociaciones en el ambiente.
 *
 * Viewports: corre en movil / tablet / escritorio por defecto — se confirmó
 * que esta pantalla navega directo por URL (no por el toggle del sidebar) y
 * no reproduce el bug de M01. Para acotarlo puntualmente:
 *   TC_DIS_59_VIEWPORTS=escritorio
 */
import { expect, test, type Locator, type Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

const DISPOSITIVO = 'IOT-EST01-HLA-001';
const SENSOR = 'Sensor oxígeno disuelto estanque-01';
const FINCA = 'Finca Acuícola El Remanso';
const AREA_DESTINO = 'Estanque-02';

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_59_VIEWPORTS ?? 'movil,tablet,escritorio')
  .split(',')
  .map((v) => v.trim());

// page.route compara la URL completa (con query): se filtra por pathname
const porRuta = (patron: RegExp) => (url: URL) => patron.test(url.pathname);
const RUTA_FINCAS = /\/configuracion\/fincas$/;
const RUTA_DISPOSITIVOS = /\/configuracion\/dispositivos-iot$/;
const RUTA_AREAS = /\/configuracion\/infraestructuras$/;
const RUTA_ASOCIAR = /\/configuracion\/sensores\/\d+\/asociar$/;

// ── Fixtures: datos reales del ambiente TEST (2026-09-28) ────────────────────

const FINCAS_FIXTURE = [
  { id_finca: 1, nombre: 'Finca Acuícola El Remanso', ubicacion: { departamento: 'Huila', municipio: 'Neiva', vereda: 'El Remanso', latitud: '2.9273', longitud: '-75.2819' }, tamano_h: '12.50', es_activo: true, fecha_creacion: '2026-04-28T14:42:28Z', fecha_actualizacion: '2026-04-28T14:42:28.213141Z', id_usuario: 2 },
  { id_finca: 2, nombre: 'Piscícola Los Esteros', ubicacion: { departamento: 'Valle del Cauca', municipio: 'Cartago', vereda: 'Los Esteros', latitud: '3.8654', longitud: '-76.4920' }, tamano_h: '8.75', es_activo: true, fecha_creacion: '2026-04-28T14:42:28Z', fecha_actualizacion: '2026-04-28T14:42:28.213141Z', id_usuario: 2 },
  { id_finca: 3, nombre: 'Camaronera Costa Azul', ubicacion: { departamento: 'Cordoba', municipio: 'Monteria', vereda: 'Costa Azul', latitud: '8.7479', longitud: '-75.8814' }, tamano_h: '25.00', es_activo: true, fecha_creacion: '2026-04-28T14:42:28Z', fecha_actualizacion: '2026-04-28T14:42:28.213141Z', id_usuario: 2 },
  { id_finca: 4, nombre: 'Granja Piscícola La Esperanza', ubicacion: { departamento: 'Caldas', municipio: 'Manizales', vereda: 'La Esperanza', latitud: '5.0689', longitud: '-75.5174' }, tamano_h: '6.30', es_activo: true, fecha_creacion: '2026-04-28T14:42:28Z', fecha_actualizacion: '2026-04-28T14:42:28.213141Z', id_usuario: 2 },
  { id_finca: 5, nombre: 'Finca El Paraiso Norte', ubicacion: { departamento: 'Antioquia', municipio: 'Medellin', vereda: 'La Estrella', latitud: '6.30', longitud: '-75.60' }, tamano_h: '120.00', es_activo: false, fecha_creacion: '2026-06-21T16:13:31Z', fecha_actualizacion: '2026-06-21T16:13:31.510491Z', id_usuario: 2 },
];

const AREAS_FINCA_1 = [
  { id_infraestructura: 3, nombre_infraestructura: 'Alevinera-01', tipo_area: 'Estanque', superficie: '500.00', id_finca: 1, descripcion_infraestructura: 'Área de alevinaje y larvicultura de tilapia', es_activo: true, fecha_actualizacion: null },
  { id_infraestructura: 1, nombre_infraestructura: 'Estanque-01', tipo_area: 'Estanque', superficie: '2500.00', id_finca: 1, descripcion_infraestructura: 'Estanque principal de engorde de tilapia con aireación artificial', es_activo: true, fecha_actualizacion: '2026-09-26T07:22:58.409459Z' },
  { id_infraestructura: 2, nombre_infraestructura: 'Estanque-02', tipo_area: 'Estanque', superficie: '1800.00', id_finca: 1, descripcion_infraestructura: 'Estanque secundario para fase juvenil de tilapia', es_activo: true, fecha_actualizacion: null },
  { id_infraestructura: 10, nombre_infraestructura: 'Invernadero Norte', tipo_area: 'Invernadero', superficie: '500.00', id_finca: 1, descripcion_infraestructura: 'Zona controlada para cultivos', es_activo: false, fecha_actualizacion: null },
];

// Dispositivos semilla (los mismos de TC-DIS-56)
const DISPOSITIVOS_FIXTURE = [
  { id_dispositivo_iot: 3, serial: 'IOT-ALE01-HLA-003', descripcion: 'Nodo IoT alevinera, módulo compacto de bajo consumo', id_infraestructura: 1, id_tipo_dispositivo: 1, es_activo: true, fecha_creacion: '2026-04-28T14:42:28.213141Z' },
  { id_dispositivo_iot: 8, serial: 'IOT-CAC01-CAL-001', descripcion: 'Nodo IoT estanque cachama, módulo estándar de campo', id_infraestructura: 1, id_tipo_dispositivo: 1, es_activo: true, fecha_creacion: '2026-04-28T14:42:28.213141Z' },
  { id_dispositivo_iot: 7, serial: 'IOT-CAM02-COR-002', descripcion: 'Nodo IoT piscina camarón 02, módulo de respaldo', id_infraestructura: 1, id_tipo_dispositivo: 1, es_activo: true, fecha_creacion: '2026-04-28T14:42:28.213141Z' },
  { id_dispositivo_iot: 1, serial: 'IOT-EST01-HLA-001', descripcion: 'Nodo IoT principal estanque 01, gateway LoRaWAN con batería solar', id_infraestructura: 1, id_tipo_dispositivo: 1, es_activo: true, fecha_creacion: '2026-04-28T14:42:28.213141Z' },
  { id_dispositivo_iot: 2, serial: 'IOT-EST02-HLA-002', descripcion: 'Nodo IoT estanque 02, módulo WiFi con fuente de red', id_infraestructura: 1, id_tipo_dispositivo: 1, es_activo: true, fecha_creacion: '2026-04-28T14:42:28.213141Z' },
  { id_dispositivo_iot: 9, serial: 'IOT-MOJ01-CAL-002', descripcion: 'Nodo IoT estanque mojarra, módulo estándar de campo', id_infraestructura: 1, id_tipo_dispositivo: 1, es_activo: true, fecha_creacion: '2026-04-28T14:42:28.213141Z' },
  { id_dispositivo_iot: 10, serial: 'IOT-TEST-001', descripcion: 'Dispositivo de prueba funcional', id_infraestructura: 1, id_tipo_dispositivo: 1, es_activo: true, fecha_creacion: '2026-06-21T18:16:14.158079Z' },
  { id_dispositivo_iot: 4, serial: 'IOT-TRU01-VLC-001', descripcion: 'Nodo IoT estanque trucha 01, resistente a bajas temperaturas', id_infraestructura: 1, id_tipo_dispositivo: 1, es_activo: true, fecha_creacion: '2026-04-28T14:42:28.213141Z' },
  { id_dispositivo_iot: 5, serial: 'IOT-TRU02-VLC-002', descripcion: 'Nodo IoT estanque trucha 02, con alarma local integrada', id_infraestructura: 1, id_tipo_dispositivo: 1, es_activo: true, fecha_creacion: '2026-04-28T14:42:28.213141Z' },
];

// Respuesta 409 real del backend TEST al asociar el sensor #3 a Estanque-02 sin confirmar (2026-09-28)
const ERROR_409_REASIGNACION = {
  error_code: 'REASIGNACION_REQUIERE_CONFIRMACION',
  message: "Conflicto de asignación: El sensor 3 ya está monitoreando el área 'Estanque-01'. ¿Desea reasignarlo? Esta acción finalizará la asociación anterior automáticamente.",
  fields: [{ field: 'confirmar', message: "Conflicto de asignación: El sensor 3 ya está monitoreando el área 'Estanque-01'. ¿Desea reasignarlo? Esta acción finalizará la asociación anterior automáticamente." }],
};

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
  await page.route(porRuta(RUTA_DISPOSITIVOS), (r) => (r.request().method() === 'GET' ? r.fulfill(json(DISPOSITIVOS_FIXTURE)) : r.fallback()));
  await page.route(porRuta(RUTA_AREAS), (r) => {
    if (r.request().method() !== 'GET') return r.fallback();
    const idFinca = Number(new URL(r.request().url()).searchParams.get('finca_id'));
    const items = idFinca === 1 ? AREAS_FINCA_1 : [];
    return r.fulfill(json({ total: items.length, items }));
  });
  // Ninguna asociación llega al backend: el envío responde siempre el 409 real que abre el diálogo
  await page.route(porRuta(RUTA_ASOCIAR), (r) =>
    r.request().method() === 'POST'
      ? r.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify(ERROR_409_REASIGNACION) })
      : r.fallback());
}

/** Sección "Asociación de Sensores a Áreas" (la pestaña IoT tiene otras secciones con tarjetas similares). */
function seccion(page: Page): Locator {
  return page
    .locator('div')
    .filter({ has: page.getByRole('heading', { name: 'Asociación de Sensores a Áreas' }) })
    .filter({ has: page.getByText('Área destino', { exact: true }) })
    .last();
}

function tarjeta(sec: Locator, texto: string): Locator {
  return sec.getByRole('button').filter({ hasText: texto }).first();
}

async function abrirAsociacion(page: Page): Promise<Locator> {
  await page.goto('/configuracion');
  await page.getByRole('button', { name: 'IoT', exact: true }).click();
  const titulo = page.getByRole('heading', { name: 'Asociación de Sensores a Áreas' });
  await titulo.scrollIntoViewIfNeeded();
  await expect(titulo).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const sec = seccion(page);
  await expect(tarjeta(sec, DISPOSITIVO)).toBeVisible();
  return sec;
}

async function irAPaso2(page: Page, sec: Locator) {
  const sensores = page.waitForResponse((r) => /\/dispositivos-iot\/\d+\/sensores$/.test(new URL(r.url()).pathname));
  await tarjeta(sec, DISPOSITIVO).click();
  expect((await sensores).status(), 'Los sensores del dispositivo deben cargar').toBe(200);
  await expect(tarjeta(sec, SENSOR)).toBeVisible();
}

async function irAPaso3(page: Page, sec: Locator) {
  await irAPaso2(page, sec);
  await tarjeta(sec, SENSOR).click();
  await tarjeta(sec, FINCA).click();
  await expect(tarjeta(sec, AREA_DESTINO)).toBeVisible();
}

async function irAPaso4(page: Page, sec: Locator) {
  await irAPaso3(page, sec);
  await tarjeta(sec, AREA_DESTINO).click();
  await expect(sec.getByRole('textbox', { name: 'Punto de instalación física', exact: true })).toBeVisible();
}

// ── Casos ────────────────────────────────────────────────────────────────────

test.describe('TC-DIS-59 - Consistencia visual - Asociación de Sensores (RF-22)', () => {
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

  test('0. Precondición - el ambiente entrega el listado de dispositivos', async ({ page }) => {
    const dispositivos = page.waitForResponse((r) => r.request().method() === 'GET' && RUTA_DISPOSITIVOS.test(new URL(r.url()).pathname), { timeout: 20_000 });
    await page.goto('/configuracion');
    await page.getByRole('button', { name: 'IoT', exact: true }).click();
    expect(
      (await dispositivos).status(),
      'BLOQUEO: GET /configuracion/dispositivos-iot?solo_activos=false responde 400 (SERIAL_FORMATO_INVALIDO); el Paso 1 no ofrece dispositivos',
    ).toBe(200);
  });

  test('1. Paso 1 - selección de dispositivo', async ({ page }) => {
    await servirFixtures(page);
    const sec = await abrirAsociacion(page);

    await expect(sec).toHaveScreenshot('sensores-paso1-dispositivo.png', { animations: 'disabled' });
  });

  test('1. Paso 2 - selección de sensor', async ({ page }) => {
    await servirFixtures(page);
    const sec = await abrirAsociacion(page);
    await irAPaso2(page, sec);

    await expect(sec).toHaveScreenshot('sensores-paso2-sensor.png', { animations: 'disabled' });
  });

  test('1. Paso 3 - selección de área destino', async ({ page }) => {
    await servirFixtures(page);
    const sec = await abrirAsociacion(page);
    await irAPaso3(page, sec);

    await expect(sec).toHaveScreenshot('sensores-paso3-area.png', { animations: 'disabled' });
  });

  test('1. Paso 4 - punto de instalación', async ({ page }) => {
    await servirFixtures(page);
    const sec = await abrirAsociacion(page);
    await irAPaso4(page, sec);

    await expect(sec).toHaveScreenshot('sensores-paso4-punto-instalacion.png', { animations: 'disabled', caret: 'hide' });
  });

  test('2. Diálogo de confirmación de reasignación', async ({ page }) => {
    await servirFixtures(page);
    const sec = await abrirAsociacion(page);
    await irAPaso4(page, sec);
    await sec.getByRole('textbox', { name: 'Punto de instalación física', exact: true }).fill('Salida de agua, profundidad 40 cm');
    await sec.getByRole('button', { name: 'Confirmar asociación' }).click();

    const dialogo = page.getByRole('dialog', { name: 'Confirmar reasignación' });
    await expect(dialogo).toBeVisible();
    await expect(dialogo).toContainText('ya está monitoreando el área');

    await expect(page).toHaveScreenshot('sensores-dialogo-reasignacion.png', OPCIONES_CAPTURA);
  });
});
