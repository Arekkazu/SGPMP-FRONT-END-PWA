/**
 * TC-DIS-55 — Accesibilidad WCAG 2.1 AA del listado y formulario de Registro de Dispositivos IoT
 * RF-21 · CU-05 Gestionar Dispositivos IoT · Rol: Administrador
 * Configuración → IoT → "Dispositivos IoT": Paso 1 finca → Paso 2 área → dispositivos del área
 *
 * Herramientas: @axe-core/playwright (reporte axe-<TC>.html/json) + Lighthouse en
 * modo snapshot sobre la misma sesión (lighthouse-<TC>-<paso>.html/json), ambos
 * en ./resultados.
 *
 * BLOQUEOS DEL AMBIENTE (2026-09-28):
 *   - GET /configuracion/fincas → 400 VEREDA_REQUERIDO (finca #34, ver TC-DIS-49): el
 *     Paso 1 no ofrece fincas.
 *   - GET /configuracion/dispositivos-iot?solo_activos=false (la llamada de la UI) →
 *     400 SERIAL_FORMATO_INVALIDO: un dispositivo con serial inválido rompe el listado
 *     completo (con solo_activos=true responde 200).
 *   - POST /configuracion/dispositivos-iot exige id_tipo_dispositivo, que el frontend
 *     no envía: todo registro desde la UI responde 400 VAL_ENTRADA.
 * Los tests "a" verifican el estado real y fallan mientras sigan. El resto sirve con
 * page.route el listado de fincas (#1–#5 reales) y el de dispositivos (los activos
 * reales, leídos con solo_activos=true). Las áreas de la finca son reales.
 *
 * El formulario no tiene un select de área: el área se elige en el Paso 2 (tarjetas)
 * y el modal la muestra fija. El paso 5 se evalúa sobre esa selección.
 * El Paso 2 solo ofrece áreas activas, así que el 422 de área inactiva solo ocurre si
 * el área se desactiva mientras el formulario está abierto: se inyecta la respuesta
 * 422 real del backend. El 409 también se inyecta con su respuesta real, porque hoy el
 * alta desde la UI falla antes por el contrato (id_tipo_dispositivo).
 *
 * Viewports: corre en movil / tablet / escritorio por defecto — se confirmó
 * que esta pantalla navega directo por URL (no por el toggle del sidebar) y
 * no reproduce el bug de M01. Para acotarlo puntualmente:
 *   TC_DIS_55_VIEWPORTS=escritorio
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { auditarLighthouse, PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';

const TC_ID = 'TC-DIS-55';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';
const API_BASE = process.env.API_BASE_URL ?? 'https://api.inmero.co/back-sigab-test';

const SERIAL_EXISTENTE = process.env.TC_DIS_55_SERIAL_EXISTENTE ?? 'IOT-EST01-HLA-001';
const AREA = 'Estanque-01';

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_55_VIEWPORTS ?? 'movil,tablet,escritorio')
  .split(',')
  .map((v) => v.trim());

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

// page.route compara la URL completa (con query): se filtra por pathname
const porRuta = (patron: RegExp) => (url: URL) => patron.test(url.pathname);
const RUTA_FINCAS = /\/configuracion\/fincas$/;
const RUTA_DISPOSITIVOS = /\/configuracion\/dispositivos-iot$/;

// Fincas #1–#5 del ambiente TEST (GET /configuracion/fincas/{id}, 2026-09-28)
const FINCAS_FIXTURE = [
  { id_finca: 1, nombre: 'Finca Acuícola El Remanso', ubicacion: { departamento: 'Huila', municipio: 'Neiva', vereda: 'El Remanso', latitud: '2.9273', longitud: '-75.2819' }, tamano_h: '12.50', es_activo: true, fecha_creacion: '2026-04-28T14:42:28Z', fecha_actualizacion: '2026-04-28T14:42:28.213141Z', id_usuario: 2 },
  { id_finca: 2, nombre: 'Piscícola Los Esteros', ubicacion: { departamento: 'Valle del Cauca', municipio: 'Cartago', vereda: 'Los Esteros', latitud: '3.8654', longitud: '-76.4920' }, tamano_h: '8.75', es_activo: true, fecha_creacion: '2026-04-28T14:42:28Z', fecha_actualizacion: '2026-04-28T14:42:28.213141Z', id_usuario: 2 },
  { id_finca: 3, nombre: 'Camaronera Costa Azul', ubicacion: { departamento: 'Cordoba', municipio: 'Monteria', vereda: 'Costa Azul', latitud: '8.7479', longitud: '-75.8814' }, tamano_h: '25.00', es_activo: true, fecha_creacion: '2026-04-28T14:42:28Z', fecha_actualizacion: '2026-04-28T14:42:28.213141Z', id_usuario: 2 },
  { id_finca: 4, nombre: 'Granja Piscícola La Esperanza', ubicacion: { departamento: 'Caldas', municipio: 'Manizales', vereda: 'La Esperanza', latitud: '5.0689', longitud: '-75.5174' }, tamano_h: '6.30', es_activo: true, fecha_creacion: '2026-04-28T14:42:28Z', fecha_actualizacion: '2026-04-28T14:42:28.213141Z', id_usuario: 2 },
  { id_finca: 5, nombre: 'Finca El Paraiso Norte', ubicacion: { departamento: 'Antioquia', municipio: 'Medellin', vereda: 'La Estrella', latitud: '6.30', longitud: '-75.60' }, tamano_h: '120.00', es_activo: false, fecha_creacion: '2026-06-21T16:13:31Z', fecha_actualizacion: '2026-06-21T16:13:31.510491Z', id_usuario: 2 },
];
const FINCA = FINCAS_FIXTURE[0].nombre;

// Respuestas reales del backend TEST (POST /configuracion/dispositivos-iot con id_tipo_dispositivo, 2026-09-28)
const ERROR_409_SERIAL = {
  error_code: 'SERIAL_DUPLICADO',
  message: `El serial '${SERIAL_EXISTENTE}' ya está registrado en el sistema.`,
  fields: [{ field: 'serial', message: `El serial '${SERIAL_EXISTENTE}' ya está registrado en el sistema.` }],
};
const ERROR_422_AREA = {
  error_code: 'AREA_NO_DISPONIBLE',
  message: 'No se puede registrar el dispositivo porque el área productiva seleccionada está desactivada.',
  fields: [],
};

test.use({ launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

// ── Navegación ───────────────────────────────────────────────────────────────

async function iniciarSesionAdmin(page: Page) {
  // Solo JWT de respuestas exitosas del backend: tras una recarga, la última petición
  // con Authorization puede ser una rechazada (401) con el token anterior
  let token = '';
  page.on('response', (res) => {
    const h = res.request().headers()['authorization'];
    if (h && res.ok() && res.url().startsWith(API_BASE)) token = h;
  });
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill(ADMIN_EMAIL);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 });
  return () => token;
}

/** Sirve lo que el ambiente no entrega hoy: listado de fincas y de dispositivos (activos reales). */
async function reconstruir(page: Page, token: () => string, testInfo: TestInfo) {
  await page.goto('/configuracion');
  await expect.poll(() => token(), { message: 'No se capturó el JWT de la sesión' }).not.toBe('');
  const activos = await page.request.get(`${API_BASE}/configuracion/dispositivos-iot?solo_activos=true`, { headers: { authorization: token() } });
  expect(activos.status(), 'El listado de dispositivos activos debe responder 200').toBe(200);
  const dispositivos = await activos.json();

  const json = (cuerpo: unknown) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(cuerpo) });
  await page.route(porRuta(RUTA_FINCAS), (r) => (r.request().method() === 'GET' ? r.fulfill(json(FINCAS_FIXTURE)) : r.fallback()));
  await page.route(porRuta(RUTA_DISPOSITIVOS), (r) => (r.request().method() === 'GET' ? r.fulfill(json(dispositivos)) : r.fallback()));
  testInfo.annotations.push({
    type: 'Datos simulados',
    description: 'Listado de fincas (#1–#5 reales) y de dispositivos (activos reales vía solo_activos=true) servidos con page.route por los 400 de ambos listados.',
  });
}

/** /configuracion → IoT, en el Paso 1 de "Dispositivos IoT". */
async function abrirDispositivos(page: Page) {
  await page.goto('/configuracion');
  const fincas = page.waitForResponse((r) => r.request().method() === 'GET' && RUTA_FINCAS.test(new URL(r.url()).pathname));
  await page.getByRole('button', { name: 'IoT', exact: true }).click();
  const res = await fincas;
  await expect(page.getByRole('heading', { name: 'Dispositivos IoT' })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  return res.status();
}

function tarjeta(page: Page, texto: string) {
  return page.getByRole('button').filter({ has: page.getByText(texto, { exact: true }) }).first();
}

/** Paso 1 → finca, Paso 2 → área; queda en el listado de dispositivos del área. */
async function abrirDispositivosDelArea(page: Page) {
  await abrirDispositivos(page);
  await tarjeta(page, FINCA).click();
  await expect(page.getByText(/Paso 2 — Selecciona el área de/)).toBeVisible();
  await tarjeta(page, AREA).click();
  await expect(page.locator('table tbody tr').first()).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

interface Formulario {
  dialogo: Locator;
  serial: Locator;
  descripcion: Locator;
  registrar: Locator;
}

async function abrirFormulario(page: Page): Promise<Formulario> {
  await page.getByRole('button', { name: 'Nuevo dispositivo' }).click();
  const dialogo = page.getByRole('dialog', { name: 'Registrar dispositivo IoT' });
  await expect(dialogo).toBeVisible();
  return {
    dialogo,
    // El input de serial se ubica por su placeholder: su <label> no está asociado (ver test 3)
    serial: dialogo.getByRole('textbox').first(),
    descripcion: dialogo.getByRole('textbox', { name: 'Descripción — tipo, modelo o referencia', exact: true }),
    registrar: dialogo.getByRole('button', { name: 'Registrar dispositivo' }),
  };
}

async function inyectarRespuestaAlta(page: Page, status: number, cuerpo: object) {
  await page.route(porRuta(RUTA_DISPOSITIVOS), (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(cuerpo) })
      : route.fallback());
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

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Dispositivos IoT (RF-21)`, () => {
  // Modo por defecto (no serial): un paso con violaciones no debe impedir evaluar los demás.
  // workers: 1 en el config, así que los logins siguen siendo secuenciales.
  test.describe.configure({ timeout: 180_000 });

  let token: () => string;

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      !VIEWPORTS_HABILITADOS.includes(testInfo.project.name),
      `Viewport "${testInfo.project.name}" deshabilitado: defecto abierto de sidebar/scroll en móvil y tablet (TC-DIS-07/08/10/11). Solo se evalúa escritorio.`,
    );
    expect(ADMIN_EMAIL, 'Falta TEST_ADMIN_EMAIL en testing/.env.test').not.toBe('');
    expect(ADMIN_PASSWORD, 'Falta TEST_ADMIN_PASSWORD en testing/.env.test').not.toBe('');
    token = await iniciarSesionAdmin(page);
  });

  test('1a. Dispositivos IoT (estado real del ambiente) - 0 violaciones axe A/AA', async ({ page }, testInfo) => {
    const dispositivos = page.waitForResponse((r) => r.request().method() === 'GET' && RUTA_DISPOSITIVOS.test(new URL(r.url()).pathname), { timeout: 20_000 }).catch(() => null);
    const estadoFincas = await abrirDispositivos(page);

    await escanear(page, 'estado-real', testInfo);

    expect.soft(estadoFincas, 'BLOQUEO: GET /configuracion/fincas no responde 200 (400 VEREDA_REQUERIDO); el Paso 1 no ofrece fincas').toBe(200);
    const resDispositivos = await dispositivos;
    if (resDispositivos) {
      expect.soft(resDispositivos.status(), 'BLOQUEO: GET /configuracion/dispositivos-iot?solo_activos=false no responde 200 (400 SERIAL_FORMATO_INVALIDO)').toBe(200);
    }
  });

  test('1-2. Listado de dispositivos de un área - 0 violaciones axe A/AA', async ({ page }, testInfo) => {
    await reconstruir(page, token, testInfo);
    await abrirDispositivosDelArea(page);

    const fila = page.locator('table tbody tr').filter({ hasText: SERIAL_EXISTENTE }).first();
    await expect(fila, `Precondición: el área debe tener el dispositivo "${SERIAL_EXISTENTE}"`).toBeVisible();
    await expect(fila.getByRole('button', { name: `Desactivar ${SERIAL_EXISTENTE}` })).toBeVisible();

    await escanear(page, 'listado', testInfo);
  });

  test('3. Formulario "Registrar dispositivo" - 0 violaciones axe A/AA (1.3.1 labels)', async ({ page }, testInfo) => {
    await reconstruir(page, token, testInfo);
    await abrirDispositivosDelArea(page);
    const form = await abrirFormulario(page);

    // 1.3.1: serial y descripción deben identificarse por su label; el área se muestra fija
    await expect.soft(form.serial, '1.3.1: el campo "Serial físico del dispositivo" no tiene nombre accesible (su <label> no está asociado)').toHaveAccessibleName(/Serial físico del dispositivo/);
    await expect(form.descripcion).toBeVisible();
    await expect(form.dialogo.getByText(`Estanque — ${AREA}`)).toBeVisible();

    await escanear(page, 'formulario', testInfo);
  });

  test('4a. Registro desde la UI (estado real del contrato con el backend)', async ({ page }, testInfo) => {
    await reconstruir(page, token, testInfo);
    await abrirDispositivosDelArea(page);
    const form = await abrirFormulario(page);
    await form.serial.fill(SERIAL_EXISTENTE);
    await form.descripcion.fill('Prueba QA serial duplicado');

    const alta = page.waitForResponse((r) => r.request().method() === 'POST' && RUTA_DISPOSITIVOS.test(new URL(r.url()).pathname));
    await form.registrar.click();
    const respuesta = await alta;
    if (respuesta.ok()) {
      // Salvaguarda: si el backend aceptara el alta, no dejar el dispositivo creado
      const creado = await respuesta.json();
      await page.request.patch(`${API_BASE}/configuracion/dispositivos-iot/${creado.id_dispositivo_iot}/desactivar`, { headers: { authorization: token() } });
    }
    testInfo.annotations.push({ type: 'Respuesta real del backend', description: `${respuesta.status()} ${await respuesta.text()}` });

    expect(
      respuesta.status(),
      'BLOQUEO: el alta desde la UI no llega a validar el serial; el backend exige id_tipo_dispositivo, que el frontend no envía (400 VAL_ENTRADA). Con el contrato corregido se espera 409 SERIAL_DUPLICADO',
    ).toBe(409);
  });

  test('4b. Serial duplicado (HTTP 409) - anunciado en el campo y 0 violaciones axe A/AA', async ({ page }, testInfo) => {
    await reconstruir(page, token, testInfo);
    await inyectarRespuestaAlta(page, 409, ERROR_409_SERIAL);
    await abrirDispositivosDelArea(page);
    const form = await abrirFormulario(page);
    await form.serial.fill(SERIAL_EXISTENTE);
    await form.descripcion.fill('Prueba QA serial duplicado');
    await form.registrar.click();

    // 3.3.1: el 409 se muestra junto al campo serial con role="alert"
    const error = form.dialogo.getByRole('alert').filter({ hasText: 'Ya existe un dispositivo con este serial.' });
    await expect(error).toBeVisible();
    await expect.soft(form.serial, '3.3.1: el campo serial debe marcarse con aria-invalid').toHaveAttribute('aria-invalid', 'true');
    await expect.soft(form.serial, '3.3.1: el error debe asociarse al campo serial (aria-describedby)').toHaveAccessibleDescription(/Ya existe un dispositivo con este serial/);

    await escanear(page, 'error-409-serial', testInfo);
  });

  test('4c. Área inactiva (HTTP 422 AREA_NO_DISPONIBLE) - anunciado y 0 violaciones axe A/AA', async ({ page }, testInfo) => {
    await reconstruir(page, token, testInfo);
    await inyectarRespuestaAlta(page, 422, ERROR_422_AREA);
    await abrirDispositivosDelArea(page);
    const form = await abrirFormulario(page);
    await form.serial.fill('QA-TCDIS55-001');
    await form.descripcion.fill('Prueba QA area inactiva');
    await form.registrar.click();

    const alerta = form.dialogo.getByRole('alert').filter({ hasText: 'área productiva seleccionada está desactivada' });
    await expect(alerta, '3.3.1: el 422 de área inactiva debe anunciarse').toBeVisible();
    await expect(form.dialogo, 'El modal debe seguir abierto').toBeVisible();

    await escanear(page, 'error-422-area-inactiva', testInfo);
  });

  test('5. Teclado - la selección de área productiva se opera con Tab y Enter', async ({ page }, testInfo) => {
    testInfo.annotations.push({
      type: 'Adaptación del paso 5',
      description: 'El formulario no tiene select de área: el área se elige en el Paso 2 con tarjetas (botones). Se verifica que se recorran con Tab y se seleccionen con Enter.',
    });
    await reconstruir(page, token, testInfo);
    await abrirDispositivos(page);

    // Paso 1: la tarjeta de la finca se activa con Enter
    await tarjeta(page, FINCA).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByText(/Paso 2 — Selecciona el área de/)).toBeVisible();

    // Paso 2: desde "Cambiar finca", Tab recorre las tarjetas de área y Enter selecciona
    await page.getByRole('button', { name: /Volver a fincas|Cambiar finca/ }).first().focus();
    const area = tarjeta(page, AREA);
    for (let i = 0; i < 10 && !(await area.evaluate((el) => el === document.activeElement)); i++) {
      await page.keyboard.press('Tab');
    }
    await expect(area, `Tab debe alcanzar la tarjeta del área "${AREA}"`).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('table tbody tr').first(), 'Enter debe seleccionar el área y mostrar sus dispositivos').toBeVisible();
    await expect(page.getByText(AREA, { exact: true }).first()).toBeVisible();
  });
});
