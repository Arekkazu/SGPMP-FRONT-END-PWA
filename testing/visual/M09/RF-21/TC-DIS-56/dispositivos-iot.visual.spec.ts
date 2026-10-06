/**
 * TC-DIS-56 — Consistencia visual del listado y formulario de Registro de Dispositivos IoT
 * RF-21 v2.0 · CU-05 Gestionar Dispositivos IoT · Rol: Administrador
 * Configuración → IoT → "Dispositivos IoT": Paso 1 finca → Paso 2 área → dispositivos del área
 *
 * Baselines ("listado de dispositivos por área/finca" + formulario de registro):
 *   - Paso 1 (fincas) y Paso 2 (áreas de la finca #1),
 *   - dispositivos del área "Estanque-01" y del área "Alevinera-01",
 *   - estado vacío del área "Estanque-02",
 *   - formulario "Registrar dispositivo IoT" con un tipo SENSOR y con un tipo CAMARA
 *     (RF-21 v2.0, RFC-011: la cámara agrega resolución, fps y área de cobertura).
 *
 * Datos: el test "0" verifica que el ambiente entrega fincas y dispositivos (los 400 del
 * 2026-09-28 ya están corregidos). Las baselines se toman con fixtures fijos de datos reales
 * servidos por page.route: fincas #1–#5, áreas de la finca #1, dispositivos semilla de sus
 * áreas (2026-09-28) y el catálogo de tipos de dispositivo (tipos-dispositivo.fixture.json,
 * 2026-10-05), independientes de los datos que otras pruebas crean en el ambiente.
 *
 * Formularios: se captura solo la tarjeta del modal; si no cabe, se amplía el alto de la
 * ventana conservando el ancho. Una baseline solo se guarda si la vista no tiene defectos:
 * la superficie del área asignada y el estilo de las etiquetas (DS) se verifican antes de
 * capturar y fallan como DEFECTO. La tarjeta se mide además contra los breakpoints del DS.
 *
 * PROTECCIÓN DE DATOS: todo POST/PATCH a /configuracion/dispositivos-iot se aborta; el caso
 * no envía formularios.
 *
 * Tema: la preferencia de tema es de la cuenta (compartida); GET
 * /configuracion/personalizacion/tema(/global) se sirve con el tema Claro (theme_mode 1,
 * cuerpo real de TEST) y cualquier escritura a esos endpoints se aborta.
 *
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_56_VIEWPORTS=escritorio
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import tiposDispositivo from './tipos-dispositivo.fixture.json';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_56_VIEWPORTS ?? 'movil,tablet,escritorio')
  .split(',')
  .map((v) => v.trim());

// page.route compara la URL completa (con query): se filtra por pathname
const RUTA_FINCAS = /\/configuracion\/fincas$/;
const RUTA_AREAS = /\/configuracion\/infraestructuras$/;
const RUTA_DISPOSITIVOS = /\/configuracion\/dispositivos-iot$/;
const RUTA_TIPOS = /\/configuracion\/tipos-dispositivo-iot$/;
const URL_DISPOSITIVOS = (url: URL) => /\/configuracion\/dispositivos-iot(\/\d+(\/[\w-]+)*)?$/.test(url.pathname);
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
const AREA_FORM = AREAS_FINCA_1.find((a) => a.nombre_infraestructura === 'Estanque-01')!;
const TIPO_SENSOR = 'SENSOR_AMBIENTAL';
const TIPO_CAMARA = 'CAMARA_VISION';

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

/** Ninguna escritura a dispositivos llega al backend. */
async function protegerDispositivos(page: Page) {
  await page.route(URL_DISPOSITIVOS, (route) => {
    const req = route.request();
    if (!['xhr', 'fetch'].includes(req.resourceType()) || req.method() === 'GET') return route.fallback();
    return route.abort();
  });
}

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
  await page.route(porRuta(RUTA_TIPOS), (r) => (r.request().method() === 'GET' ? r.fulfill(json(tiposDispositivo)) : r.fallback()));
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

function tarjetaModal(dialogo: Locator): Locator {
  return dialogo.locator('> div');
}

async function sinFocoNiHover(page: Page) {
  await page.mouse.move(0, 0);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.evaluate(() => document.fonts.ready);
}

/** Captura solo la tarjeta del modal; si no cabe, amplía el alto de la ventana conservando el ancho. */
async function capturarModal(page: Page, dialogo: Locator, nombre: string) {
  // Una baseline con defectos no es una referencia válida
  expect(test.info().errors.length, 'Sin baseline: la vista tiene defectos (ver errores anteriores)').toBe(0);
  const viewport = page.viewportSize()!;
  const caja = (await tarjetaModal(dialogo).boundingBox())!;
  const necesario = Math.ceil(caja.y + caja.height + 48);
  if (necesario > viewport.height) await page.setViewportSize({ width: viewport.width, height: necesario });
  await sinFocoNiHover(page);
  await expect(tarjetaModal(dialogo)).toHaveScreenshot(nombre, { animations: 'disabled', caret: 'hide' });
}

async function abrirFormulario(page: Page, tipo: string) {
  await abrirArea(page, AREA_FORM.nombre_infraestructura);
  await page.getByRole('button', { name: 'Nuevo dispositivo' }).click();
  const dialogo = page.getByRole('dialog', { name: 'Registrar dispositivo IoT' });
  await expect(dialogo).toBeVisible();
  await expect(dialogo.getByText(`Estanque — ${AREA_FORM.nombre_infraestructura}`)).toBeVisible();
  const select = dialogo.getByRole('combobox', { name: 'Tipo de dispositivo' });
  await expect(select.locator('option', { hasText: tipo })).toHaveCount(1);
  await select.selectOption({ label: tipo });
  return dialogo;
}

/** DEFECTO si el encabezado del modal no muestra la superficie del área (se formatea como fecha). */
async function verificarSuperficie(dialogo: Locator) {
  const valor = Number(AREA_FORM.superficie);
  await expect.soft(
    dialogo.getByText(/#\d+ · .* m²/),
    `DEFECTO: el área asignada muestra "#${AREA_FORM.id_infraestructura} · — m²" en vez de ${valor} m² (DispositivoModal.tsx formatea superficie con formatearFechaHora)`,
  ).toContainText(new RegExp(`${valor.toLocaleString('es-CO').replace('.', '\\.')}|${valor}`));
}

/** DEFECTO si las etiquetas del formulario no comparten el estilo del DS (.ds-field__label: 12px / 600). */
async function verificarEtiquetas(dialogo: Locator) {
  const estilos = await dialogo.locator('form label').evaluateAll((ls) => ls.map((l) => {
    const c = getComputedStyle(l);
    return { texto: (l.textContent ?? '').trim(), estilo: `${c.fontSize} ${c.fontWeight}` };
  }));
  const distintas = estilos.filter((e) => e.estilo !== '12px 600');
  expect.soft(distintas, `DEFECTO: etiquetas del formulario fuera del estilo del DS (12px 600, como "Tipo de dispositivo"): ${distintas.map((e) => `"${e.texto}" ${e.estilo}`).join(' · ')}`).toEqual([]);
}

// ── Casos ────────────────────────────────────────────────────────────────────

test.describe('TC-DIS-56 - Consistencia visual - Dispositivos IoT (RF-21)', () => {
  // workers: 1 en el config; timeout amplio por la latencia del login en TEST
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      !VIEWPORTS_HABILITADOS.includes(testInfo.project.name),
      `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_56_VIEWPORTS.`,
    );
    expect(ADMIN_EMAIL, 'Falta TEST_ADMIN_EMAIL en testing/.env.test').not.toBe('');
    expect(ADMIN_PASSWORD, 'Falta TEST_ADMIN_PASSWORD en testing/.env.test').not.toBe('');
    await protegerDispositivos(page);
    await fijarTemaClaro(page);
    await iniciarSesionAdmin(page);
  });

  test('0. Precondición - el ambiente entrega fincas y dispositivos', async ({ page }) => {
    const fincas = page.waitForResponse((r) => r.request().method() === 'GET' && RUTA_FINCAS.test(new URL(r.url()).pathname));
    const dispositivos = page.waitForResponse((r) => r.request().method() === 'GET' && RUTA_DISPOSITIVOS.test(new URL(r.url()).pathname), { timeout: 20_000 }).catch(() => null);
    await abrirDispositivos(page);

    expect.soft((await fincas).status(), 'GET /configuracion/fincas debe responder 200').toBe(200);
    const resDispositivos = await dispositivos;
    if (resDispositivos) expect.soft(resDispositivos.status(), 'GET /configuracion/dispositivos-iot debe responder 200').toBe(200);
  });

  test('1. Paso 1 - selección de finca', async ({ page }) => {
    await servirFixtures(page);
    await abrirDispositivos(page);
    const finca = tarjeta(page, FINCA);
    await expect(finca).toBeVisible();

    await sinFocoNiHover(page);
    await expect(seccion(page, finca)).toHaveScreenshot('iot-paso1-fincas.png', { animations: 'disabled' });
  });

  test('1. Paso 2 - selección de área de la finca', async ({ page }) => {
    await servirFixtures(page);
    await abrirDispositivos(page);
    await tarjeta(page, FINCA).click();
    const area = tarjeta(page, 'Estanque-01');
    await expect(area).toBeVisible();

    await sinFocoNiHover(page);
    await expect(seccion(page, area)).toHaveScreenshot('iot-paso2-areas.png', { animations: 'disabled' });
  });

  test('2. Dispositivos por área - Estanque-01', async ({ page }) => {
    await servirFixtures(page);
    await abrirDispositivos(page);
    await abrirArea(page, 'Estanque-01');
    const tabla = page.locator('table').filter({ hasText: 'IOT-EST01-HLA-001' });
    await expect(tabla.locator('tbody tr')).toHaveCount(9);

    await sinFocoNiHover(page);
    await expect(seccion(page, tabla)).toHaveScreenshot('iot-dispositivos-estanque-01.png', { animations: 'disabled' });
  });

  test('2. Dispositivos por área - Alevinera-01', async ({ page }) => {
    await servirFixtures(page);
    await abrirDispositivos(page);
    await abrirArea(page, 'Alevinera-01');
    const tabla = page.locator('table').filter({ hasText: 'TC-M09-G61-1788611738279' });
    await expect(tabla.locator('tbody tr')).toHaveCount(2);

    await sinFocoNiHover(page);
    await expect(seccion(page, tabla)).toHaveScreenshot('iot-dispositivos-alevinera-01.png', { animations: 'disabled' });
  });

  test('2. Dispositivos por área - área sin dispositivos (Estanque-02)', async ({ page }) => {
    await servirFixtures(page);
    await abrirDispositivos(page);
    await abrirArea(page, 'Estanque-02');
    const vacio = page.getByRole('button', { name: 'Registrar primer dispositivo' });
    await expect(vacio).toBeVisible();

    await sinFocoNiHover(page);
    await expect(seccion(page, vacio)).toHaveScreenshot('iot-dispositivos-area-vacia.png', { animations: 'disabled' });
  });

  test('3. Formulario "Registrar dispositivo IoT" - tipo sensor', async ({ page }) => {
    await servirFixtures(page);
    await abrirDispositivos(page);
    const dialogo = await abrirFormulario(page, TIPO_SENSOR);
    await expect(dialogo.getByRole('textbox', { name: /^Resolución/ }), 'Con un tipo SENSOR no hay campos de cámara').toHaveCount(0);
    await verificarSuperficie(dialogo);
    await verificarEtiquetas(dialogo);
    await capturarModal(page, dialogo, 'iot-form-sensor.png');
  });

  test('3. Formulario "Registrar dispositivo IoT" - tipo cámara (resolución, fps y área de cobertura)', async ({ page }) => {
    await servirFixtures(page);
    await abrirDispositivos(page);
    const dialogo = await abrirFormulario(page, TIPO_CAMARA);
    await expect(dialogo.getByRole('textbox', { name: /^Resolución/ })).toBeVisible();
    await expect(dialogo.getByRole('spinbutton', { name: /FPS/i })).toBeVisible();
    await expect(dialogo.getByRole('spinbutton', { name: /Área de cobertura/ })).toBeVisible();
    await verificarSuperficie(dialogo);
    await verificarEtiquetas(dialogo);
    await capturarModal(page, dialogo, 'iot-form-camara.png');
  });

  test('4. Modal del formulario según el breakpoint del sistema de diseño', async ({ page }, testInfo) => {
    await servirFixtures(page);
    await abrirDispositivos(page);
    const dialogo = await abrirFormulario(page, TIPO_CAMARA);
    const viewport = page.viewportSize()!;
    const caja = (await tarjetaModal(dialogo).boundingBox())!;
    testInfo.annotations.push({ type: 'Tarjeta del modal', description: `viewport ${viewport.width}×${viewport.height} · x ${Math.round(caja.x)} · y ${Math.round(caja.y)} · ${Math.round(caja.width)}×${Math.round(caja.height)}` });

    // DS v2.0 (CLAUDE.md, Grid y breakpoints): bottom sheet a ancho completo en xs/sm, max 480px en md, max 560px en lg
    if (viewport.width < 768) {
      expect.soft(Math.round(caja.width), `DEFECTO: en ${testInfo.project.name} (${viewport.width}px, xs/sm) el modal debe ser un bottom sheet a ancho completo; mide ${Math.round(caja.width)}px y queda centrado con márgenes`).toBe(viewport.width);
      expect.soft(Math.round(caja.y + caja.height), `DEFECTO: en ${testInfo.project.name} el bottom sheet debe apoyarse en el borde inferior de la pantalla`).toBe(viewport.height);
    } else if (viewport.width < 1200) {
      expect(Math.round(caja.width), `DEFECTO: en ${testInfo.project.name} (${viewport.width}px, md) el modal debe medir máximo 480px; mide ${Math.round(caja.width)}px`).toBeLessThanOrEqual(480);
    } else {
      expect(Math.round(caja.width), `DEFECTO: en ${testInfo.project.name} (${viewport.width}px, lg) el modal debe medir máximo 560px; mide ${Math.round(caja.width)}px`).toBeLessThanOrEqual(560);
    }
  });
});
