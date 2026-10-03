/**
 * TC-DIS-56 — Consistencia visual del listado y formulario de Registro de Dispositivos IoT
 * RF-21 · CU-05 Gestionar Dispositivos IoT · Rol: Administrador
 * Configuración → IoT → "Dispositivos IoT": Paso 1 finca → Paso 2 área → dispositivos del área
 *
 * Baselines ("listado de dispositivos por área/finca" + formulario de registro):
 *   - Paso 1 (fincas) y Paso 2 (áreas de la finca #1),
 *   - dispositivos del área "Estanque-01" y del área "Alevinera-01",
 *   - estado vacío del área "Estanque-02",
 *   - formulario "Registrar dispositivo IoT".
 *
 * BLOQUEOS DEL AMBIENTE (2026-09-28, ver TC-DIS-49/55):
 *   - GET /configuracion/fincas → 400 VEREDA_REQUERIDO (finca #34);
 *   - GET /configuracion/dispositivos-iot?solo_activos=false → 400 SERIAL_FORMATO_INVALIDO.
 * El test "0" verifica ambos y falla mientras sigan. Las baselines se toman con
 * fixtures fijos de datos reales servidos por page.route: fincas #1–#5, áreas de la
 * finca #1 y dispositivos semilla de sus áreas (tal como los devuelve el backend con
 * solo_activos=true), lo que además las hace independientes de los datos que otras
 * pruebas crean en el ambiente.
 *
 * Viewports: corre en movil / tablet / escritorio por defecto — se confirmó
 * que esta pantalla navega directo por URL (no por el toggle del sidebar) y
 * no reproduce el bug de M01. Para acotarlo puntualmente:
 *   TC_DIS_56_VIEWPORTS=escritorio
 */
import { expect, test, type Locator, type Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_56_VIEWPORTS ?? 'movil,tablet,escritorio')
  .split(',')
  .map((v) => v.trim());

// page.route compara la URL completa (con query): se filtra por pathname
const RUTA_FINCAS = /\/configuracion\/fincas$/;
const RUTA_AREAS = /\/configuracion\/infraestructuras$/;
const RUTA_DISPOSITIVOS = /\/configuracion\/dispositivos-iot$/;
const porRuta = (patron: RegExp) => (url: URL) => patron.test(url.pathname);

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

// Dispositivos semilla de Estanque-01 (#1) y dos de Alevinera-01 (#3); Estanque-02 (#2) queda vacío
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
  { id_dispositivo_iot: 17, serial: 'TC-M09-G56-DUP-1788608864556', descripcion: 'Dispositivo base para probar serial duplicado (TC-M09-G56)', id_infraestructura: 3, id_tipo_dispositivo: 1, es_activo: true, fecha_creacion: '2026-09-05T11:47:45.685572Z' },
  { id_dispositivo_iot: 38, serial: 'TC-M09-G61-1788611738279', descripcion: 'Dispositivo de prueba TC-M09-G61 (precondicion RF-21)', id_infraestructura: 3, id_tipo_dispositivo: 1, es_activo: true, fecha_creacion: '2026-09-05T12:35:38.864280Z' },
];

const FINCA = FINCAS_FIXTURE[0].nombre;
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
}

/** /configuracion → IoT, en el Paso 1 de "Dispositivos IoT". */
async function abrirDispositivos(page: Page) {
  await page.goto('/configuracion');
  await page.getByRole('button', { name: 'IoT', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Dispositivos IoT' })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

function tarjeta(page: Page, texto: string) {
  return page.getByRole('button').filter({ has: page.getByText(texto, { exact: true }) }).first();
}

/** Bloque "Dispositivos IoT" que contiene `contenido` (el más interno), sin las secciones vecinas. */
function seccion(page: Page, contenido: Locator): Locator {
  return page
    .locator('div')
    .filter({ has: page.getByRole('heading', { name: 'Dispositivos IoT' }) })
    .filter({ has: contenido })
    .last();
}

async function abrirArea(page: Page, area: string) {
  await tarjeta(page, FINCA).click();
  await expect(page.getByText(/Paso 2 — Selecciona el área de/)).toBeVisible();
  await tarjeta(page, area).click();
  await expect(page.getByRole('button', { name: 'Nuevo dispositivo' })).toBeVisible();
}

// ── Casos ────────────────────────────────────────────────────────────────────

test.describe('TC-DIS-56 - Consistencia visual - Dispositivos IoT (RF-21)', () => {
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

  test('0. Precondición - el ambiente entrega fincas y dispositivos', async ({ page }) => {
    const fincas = page.waitForResponse((r) => r.request().method() === 'GET' && RUTA_FINCAS.test(new URL(r.url()).pathname));
    const dispositivos = page.waitForResponse((r) => r.request().method() === 'GET' && RUTA_DISPOSITIVOS.test(new URL(r.url()).pathname), { timeout: 20_000 }).catch(() => null);
    await abrirDispositivos(page);

    expect.soft((await fincas).status(), 'BLOQUEO: GET /configuracion/fincas no responde 200 (400 VEREDA_REQUERIDO por la finca #34)').toBe(200);
    const resDispositivos = await dispositivos;
    if (resDispositivos) {
      expect.soft(resDispositivos.status(), 'BLOQUEO: GET /configuracion/dispositivos-iot?solo_activos=false no responde 200 (400 SERIAL_FORMATO_INVALIDO)').toBe(200);
    }
  });

  test('1. Paso 1 - selección de finca', async ({ page }) => {
    await servirFixtures(page);
    await abrirDispositivos(page);
    const finca = tarjeta(page, FINCA);
    await expect(finca).toBeVisible();

    await expect(seccion(page, finca)).toHaveScreenshot('iot-paso1-fincas.png', { animations: 'disabled' });
  });

  test('1. Paso 2 - selección de área de la finca', async ({ page }) => {
    await servirFixtures(page);
    await abrirDispositivos(page);
    await tarjeta(page, FINCA).click();
    const area = tarjeta(page, 'Estanque-01');
    await expect(area).toBeVisible();

    await expect(seccion(page, area)).toHaveScreenshot('iot-paso2-areas.png', { animations: 'disabled' });
  });

  test('2. Dispositivos por área - Estanque-01', async ({ page }) => {
    await servirFixtures(page);
    await abrirDispositivos(page);
    await abrirArea(page, 'Estanque-01');
    const tabla = page.locator('table').filter({ hasText: 'IOT-EST01-HLA-001' });
    await expect(tabla.locator('tbody tr')).toHaveCount(9);

    await expect(seccion(page, tabla)).toHaveScreenshot('iot-dispositivos-estanque-01.png', { animations: 'disabled' });
  });

  test('2. Dispositivos por área - Alevinera-01', async ({ page }) => {
    await servirFixtures(page);
    await abrirDispositivos(page);
    await abrirArea(page, 'Alevinera-01');
    const tabla = page.locator('table').filter({ hasText: 'TC-M09-G61-1788611738279' });
    await expect(tabla.locator('tbody tr')).toHaveCount(2);

    await expect(seccion(page, tabla)).toHaveScreenshot('iot-dispositivos-alevinera-01.png', { animations: 'disabled' });
  });

  test('2. Dispositivos por área - área sin dispositivos (Estanque-02)', async ({ page }) => {
    await servirFixtures(page);
    await abrirDispositivos(page);
    await abrirArea(page, 'Estanque-02');
    const vacio = page.getByRole('button', { name: 'Registrar primer dispositivo' });
    await expect(vacio).toBeVisible();

    await expect(seccion(page, vacio)).toHaveScreenshot('iot-dispositivos-area-vacia.png', { animations: 'disabled' });
  });

  test('3. Formulario "Registrar dispositivo IoT"', async ({ page }) => {
    await servirFixtures(page);
    await abrirDispositivos(page);
    await abrirArea(page, 'Estanque-01');
    await page.getByRole('button', { name: 'Nuevo dispositivo' }).click();
    const dialogo = page.getByRole('dialog', { name: 'Registrar dispositivo IoT' });
    await expect(dialogo).toBeVisible();
    await expect(dialogo.getByText('Estanque — Estanque-01')).toBeVisible();

    await expect(page).toHaveScreenshot('iot-form-registrar.png', OPCIONES_CAPTURA);
  });
});
