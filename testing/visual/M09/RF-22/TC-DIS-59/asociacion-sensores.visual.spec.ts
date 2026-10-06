/**
 * TC-DIS-59 — Consistencia visual del flujo por pasos de Asociación de Sensores
 * RF-22 v1.1 · CU-05 Gestionar Dispositivos IoT · Rol: Administrador
 * Configuración → IoT → "Asociación de Sensores a Áreas"
 *
 * Baseline de cada paso del flujo y del diálogo de reasignación:
 *   Paso 1 dispositivo · Paso 2 sensor · Paso 3 área destino · Paso 4 punto de
 *   instalación · diálogo "Confirmar reasignación" · aviso de asociaciones sensor→activo
 *   cerradas por la reasignación (RF-22 v1.1, sgpmp-backend#290/#304).
 *
 * Mismos datos que TC-DIS-58: dispositivo #1 "IOT-EST01-HLA-001", sensor #3
 * "Sensor oxígeno disuelto estanque-01" (asociado a Estanque-01), destino Estanque-02.
 *
 * Datos: el test "0" verifica que el ambiente entrega el listado de dispositivos (los 400 del
 * 2026-09-28 ya están corregidos). Las baselines usan fixtures fijos de datos reales servidos
 * con page.route (fincas #1–#5, dispositivos semilla, áreas de la finca #1 y la respuesta 409
 * real que abre el diálogo), así no dependen de los datos que otras pruebas cambian. Los
 * sensores del dispositivo #1 son reales. La confirmación de la reasignación responde un 201
 * SIMULADO con dos asociaciones superadas (activos #279 ambiental y #280 poblacional).
 * Ningún test modifica asociaciones en el ambiente.
 *
 * Una baseline solo se guarda si la vista no tiene defectos: el texto de cada paso, la
 * superficie de las áreas, que las etiquetas del indicador de pasos no se salgan del borde y
 * el color de los enlaces del aviso (token del DS) se verifican antes de capturar y fallan
 * como DEFECTO. La sección
 * se captura con la ventana ampliada a lo alto (conservando el ancho) para que la barra
 * superior fija no la tape; el diálogo, solo su tarjeta, que se mide además contra los
 * breakpoints del DS.
 *
 * Tema: la preferencia de tema es de la cuenta (compartida); GET
 * /configuracion/personalizacion/tema(/global) se sirve con el tema Claro (theme_mode 1,
 * cuerpo real de TEST) y cualquier escritura a esos endpoints se aborta.
 *
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_59_VIEWPORTS=escritorio
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

// 201 SIMULADO de la confirmación con asociaciones superadas (campo de sgpmp-backend#304)
const SUPERADAS = [
  { id_asociacion_activo_sensor: 14, id_activo_biologico: 279, tipo: 'ambiental' },
  { id_asociacion_activo_sensor: 15, id_activo_biologico: 280, tipo: 'poblacional' },
];

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
  // Ninguna asociación llega al backend: sin `confirmar` responde el 409 real que abre el diálogo;
  // la confirmación responde un 201 simulado con asociaciones superadas
  await page.route(porRuta(RUTA_ASOCIAR), (r) => {
    if (r.request().method() !== 'POST') return r.fallback();
    const cuerpo = r.request().postDataJSON() ?? {};
    if (!cuerpo.confirmar) return r.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify(ERROR_409_REASIGNACION) });
    return r.fulfill(json({
      id_sensores_area_asociada: 900001, id_sensor: 3, id_dispositivo_iot: cuerpo.id_dispositivo_iot, id_infraestructura: cuerpo.id_infraestructura,
      punto_instalacion: cuerpo.punto_instalacion, tiene_estado: true, fecha_asociacion: '2026-10-06T12:00:00Z', fecha_finalizacion: null,
      id_usuario: 1, asociaciones_activo_superadas: SUPERADAS,
    }));
  });
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

async function sinFocoNiHover(page: Page) {
  await page.mouse.move(0, 0);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.evaluate(() => document.fonts.ready);
}

/** Amplía el alto de la ventana (conservando el ancho) para que `objetivo` quepa sin scroll. */
async function ajustarAlto(page: Page, objetivo: Locator) {
  const viewport = page.viewportSize()!;
  await objetivo.evaluate((e) => e.scrollIntoView({ block: 'start' }));
  const caja = (await objetivo.boundingBox())!;
  const scroll = await page.evaluate(() => {
    const cont = [...document.querySelectorAll('*')].find((e) => e.scrollTop > 0) as HTMLElement | undefined;
    return (cont?.scrollTop ?? 0) + window.scrollY;
  });
  const necesario = Math.ceil(caja.y + scroll + caja.height + 48);
  if (necesario > viewport.height) await page.setViewportSize({ width: viewport.width, height: necesario });
}

/** Captura la sección (o un bloque) sin que la barra superior fija la tape. Sin baseline si hay defectos. */
async function capturar(page: Page, objetivo: Locator, nombre: string) {
  expect(test.info().errors.length, 'Sin baseline: la vista tiene defectos (ver errores anteriores)').toBe(0);
  await ajustarAlto(page, objetivo);
  await sinFocoNiHover(page);
  await expect(objetivo).toHaveScreenshot(nombre, { animations: 'disabled', caret: 'hide' });
}

/** DEFECTO si al texto del paso le faltan los espacios alrededor del valor resaltado (traducción RF-29). */
async function verificarTextoPaso(sec: Locator, esperado: RegExp, descripcion: string) {
  await expect.soft(sec.getByText(/^Paso \d — /).first(), `DEFECTO: ${descripcion}`).toHaveText(esperado);
}

/** DEFECTO si las tarjetas de área no muestran su superficie (se formatea como fecha). */
async function verificarSuperficie(sec: Locator) {
  for (const a of AREAS_FINCA_1.filter((x) => x.es_activo)) {
    const valor = Number(a.superficie);
    await expect.soft(
      tarjeta(sec, a.nombre_infraestructura),
      `DEFECTO: la tarjeta de "${a.nombre_infraestructura}" muestra "— m²" en vez de ${valor} m² (SensoresSection.tsx formatea superficie con formatearFechaHora)`,
    ).toContainText(new RegExp(`${valor.toLocaleString('es-CO').replace('.', '\\.')}|${valor}`));
  }
}

/** DEFECTO si alguna etiqueta del indicador de pasos se sale del borde de la sección. */
async function verificarStepper(page: Page, sec: Locator) {
  const borde = (await sec.boundingBox())!;
  const viewport = page.viewportSize()!;
  for (const etiqueta of ['Dispositivo', 'Sensor', 'Área destino', 'Confirmar']) {
    const caja = (await sec.getByText(etiqueta, { exact: true }).first().boundingBox())!;
    const limite = Math.min(borde.x + borde.width, viewport.width);
    expect.soft(Math.round(caja.x + caja.width), `DEFECTO: la etiqueta "${etiqueta}" del indicador de pasos se sale del borde (termina en ${Math.round(caja.x + caja.width)}px; la sección termina en ${Math.round(limite)}px)`).toBeLessThanOrEqual(Math.round(limite));
  }
}

/** DEFECTO si los enlaces no usan el color de enlace del DS (--brand-600) sino el del navegador. */
async function verificarEnlacesDS(bloque: Locator) {
  const colores = await bloque.getByRole('link').evaluateAll((as) => {
    const ref = document.createElement('span');
    ref.style.color = 'var(--brand-600)';
    document.body.appendChild(ref);
    const esperado = getComputedStyle(ref).color;
    ref.remove();
    return as.map((a) => ({ texto: a.textContent?.trim() ?? '', color: getComputedStyle(a).color, esperado }));
  });
  const distintos = colores.filter((c) => c.color !== c.esperado);
  expect.soft(distintos, `DEFECTO: los enlaces del aviso usan el color por defecto del navegador, no el token de enlace del DS (--brand-600 = ${colores[0]?.esperado}): ${distintos.map((c) => `"${c.texto}" ${c.color}`).join(' · ')}`).toEqual([]);
}

// ── Casos ────────────────────────────────────────────────────────────────────

test.describe('TC-DIS-59 - Consistencia visual - Asociación de Sensores (RF-22)', () => {
  // workers: 1 en el config; timeout amplio por la latencia del login en TEST
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      !VIEWPORTS_HABILITADOS.includes(testInfo.project.name),
      `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_59_VIEWPORTS.`,
    );
    expect(ADMIN_EMAIL, 'Falta TEST_ADMIN_EMAIL en testing/.env.test').not.toBe('');
    expect(ADMIN_PASSWORD, 'Falta TEST_ADMIN_PASSWORD en testing/.env.test').not.toBe('');
    await fijarTemaClaro(page);
    await iniciarSesionAdmin(page);
  });

  test('0. Precondición - el ambiente entrega el listado de dispositivos', async ({ page }) => {
    const dispositivos = page.waitForResponse((r) => r.request().method() === 'GET' && RUTA_DISPOSITIVOS.test(new URL(r.url()).pathname), { timeout: 40_000 });
    await page.goto('/configuracion');
    await page.getByRole('button', { name: 'IoT', exact: true }).click();
    // En móvil y tablet el listado se pide cuando la sección entra en pantalla
    await page.getByRole('heading', { name: 'Asociación de Sensores a Áreas' }).scrollIntoViewIfNeeded();
    expect(
      (await dispositivos).status(),
      'GET /configuracion/dispositivos-iot debe responder 200 para que el Paso 1 ofrezca dispositivos',
    ).toBe(200);
  });

  test('1. Paso 1 - selección de dispositivo', async ({ page }) => {
    await servirFixtures(page);
    const sec = await abrirAsociacion(page);

    await verificarStepper(page, sec);
    await capturar(page, sec, 'sensores-paso1-dispositivo.png');
  });

  test('1. Paso 2 - selección de sensor', async ({ page }) => {
    await servirFixtures(page);
    const sec = await abrirAsociacion(page);
    await irAPaso2(page, sec);
    await verificarTextoPaso(sec, /Elige el sensor de IOT-EST01-HLA-001 a asociar/, 'el texto del Paso 2 sale "Elige el sensor deIOT-EST01-HLA-001a asociar:" (faltan los espacios alrededor del serial)');
    await verificarStepper(page, sec);
    await capturar(page, sec, 'sensores-paso2-sensor.png');
  });

  test('1. Paso 3 - selección de área destino', async ({ page }) => {
    await servirFixtures(page);
    const sec = await abrirAsociacion(page);
    await irAPaso3(page, sec);
    await verificarTextoPaso(sec, /destino para Sensor oxígeno/, 'el texto del Paso 3 sale "Elige el área productiva destino paraSensor oxígeno…" (falta el espacio antes del sensor)');
    await verificarSuperficie(sec);
    await verificarStepper(page, sec);
    await capturar(page, sec, 'sensores-paso3-area.png');
  });

  test('1. Paso 4 - punto de instalación', async ({ page }) => {
    await servirFixtures(page);
    const sec = await abrirAsociacion(page);
    await irAPaso4(page, sec);

    await verificarStepper(page, sec);
    await capturar(page, sec, 'sensores-paso4-punto-instalacion.png');
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

    await capturar(page, dialogo.locator('> div'), 'sensores-dialogo-reasignacion.png');
  });

  test('2. Diálogo de reasignación según el breakpoint del sistema de diseño', async ({ page }, testInfo) => {
    await servirFixtures(page);
    const sec = await abrirAsociacion(page);
    await irAPaso4(page, sec);
    await sec.getByRole('textbox', { name: 'Punto de instalación física', exact: true }).fill('Salida de agua, profundidad 40 cm');
    await sec.getByRole('button', { name: 'Confirmar asociación' }).click();
    const dialogo = page.getByRole('dialog', { name: 'Confirmar reasignación' });
    await expect(dialogo).toBeVisible();

    const viewport = page.viewportSize()!;
    const caja = (await dialogo.locator('> div').boundingBox())!;
    testInfo.annotations.push({ type: 'Tarjeta del diálogo', description: `viewport ${viewport.width}×${viewport.height} · x ${Math.round(caja.x)} · y ${Math.round(caja.y)} · ${Math.round(caja.width)}×${Math.round(caja.height)}` });

    // DS v2.0 (CLAUDE.md, Grid y breakpoints): bottom sheet a ancho completo en xs/sm, max 480px en md, max 560px en lg
    if (viewport.width < 768) {
      expect.soft(Math.round(caja.width), `DEFECTO: en ${testInfo.project.name} (${viewport.width}px, xs/sm) el diálogo debe ser un bottom sheet a ancho completo; mide ${Math.round(caja.width)}px y queda centrado con márgenes`).toBe(viewport.width);
      expect.soft(Math.round(caja.y + caja.height), `DEFECTO: en ${testInfo.project.name} el bottom sheet debe apoyarse en el borde inferior de la pantalla`).toBe(viewport.height);
    } else if (viewport.width < 1200) {
      expect(Math.round(caja.width), `DEFECTO: en ${testInfo.project.name} (${viewport.width}px, md) el diálogo debe medir máximo 480px; mide ${Math.round(caja.width)}px`).toBeLessThanOrEqual(480);
    } else {
      expect(Math.round(caja.width), `DEFECTO: en ${testInfo.project.name} (${viewport.width}px, lg) el diálogo debe medir máximo 560px; mide ${Math.round(caja.width)}px`).toBeLessThanOrEqual(560);
    }
  });

  test('3. Aviso de asociaciones sensor→activo cerradas por la reasignación (simulado)', async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'Datos simulados', description: 'Confirmación respondida con 201 y asociaciones_activo_superadas (activo #279 ambiental, #280 poblacional); el sensor no se mueve de área.' });
    await servirFixtures(page);
    const sec = await abrirAsociacion(page);
    await irAPaso4(page, sec);
    await sec.getByRole('textbox', { name: 'Punto de instalación física', exact: true }).fill('Salida de agua, profundidad 40 cm');
    await sec.getByRole('button', { name: 'Confirmar asociación' }).click();
    const dialogo = page.getByRole('dialog', { name: 'Confirmar reasignación' });
    await dialogo.getByRole('button', { name: 'Reasignar' }).click();
    await expect(dialogo).toBeHidden();

    const titulo = page.getByText('El sensor dejó de monitorear activos biológicos');
    await expect(titulo).toBeVisible();
    // Bloque del aviso: la alerta y la lista de enlaces a cada activo
    const aviso = page.locator('div').filter({ has: page.getByRole('alert').filter({ has: titulo }) }).filter({ has: page.getByRole('list') }).last();
    await expect(aviso.getByRole('link')).toHaveCount(SUPERADAS.length);
    await verificarEnlacesDS(aviso);
    await capturar(page, aviso, 'sensores-aviso-superadas.png');
  });
});
