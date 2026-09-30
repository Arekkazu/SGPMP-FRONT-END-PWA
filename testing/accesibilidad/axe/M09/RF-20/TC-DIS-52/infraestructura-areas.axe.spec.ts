/**
 * TC-DIS-52 — Accesibilidad WCAG 2.1 AA del listado y formulario de Infraestructura Productiva (Áreas)
 * RF-20 · CU-04 Gestionar Infraestructura Productiva · Rol: Administrador
 * Configuración → Fincas → sección "Infraestructura Productiva" → finca → áreas
 *
 * Herramientas: @axe-core/playwright (reporte axe-<TC>.html/json) + Lighthouse en
 * modo snapshot sobre la misma sesión (lighthouse-<TC>-<paso>.html/json), ambos
 * en ./resultados.
 *
 * BLOQUEOS DEL AMBIENTE (2026-09-28):
 *   - GET /configuracion/fincas responde 400 VEREDA_REQUERIDO (finca #34 sin
 *     departamento/vereda, ver TC-DIS-49): la sección no ofrece ninguna finca.
 *   - GET /configuracion/tipos-area responde 403 ACCESO_DENEGADO (Administrador y
 *     Productor): el select "Tipo de área" del formulario queda sin opciones.
 * Los tests "a" verifican el estado real y fallan mientras sigan los bloqueos;
 * los demás sirven con page.route el listado de fincas (#1–#5 reales) y un
 * catálogo de tipos con los nombres reales observados en las áreas existentes
 * ("Estanque", "Invernadero"). Las áreas de la finca sí son reales.
 *
 * Errores:
 *   - Nombre duplicado: real contra el backend ("Estanque-01" en la finca #1).
 *     HOY responde 500 ERROR_INTERNO en vez de 409 (hallazgo); no crea registros.
 *   - Superficie inválida: el cliente la valida antes de enviar; se prueba el error
 *     del cliente y la respuesta 400 real del backend inyectada con page.route.
 *
 * Viewports: corre en movil / tablet / escritorio por defecto — se confirmó
 * que esta pantalla navega directo por URL (no por el toggle del sidebar) y
 * no reproduce el bug de M01. Para acotarlo puntualmente:
 *   TC_DIS_52_VIEWPORTS=escritorio
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page, type Request, type TestInfo } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { auditarLighthouse, PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';

const TC_ID = 'TC-DIS-52';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';
const API_BASE = process.env.API_BASE_URL ?? 'https://api.inmero.co/back-sigab-test';

const AREA_EXISTENTE = process.env.TC_DIS_52_AREA_EXISTENTE ?? 'Estanque-01';

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_52_VIEWPORTS ?? 'movil,tablet,escritorio')
  .split(',')
  .map((v) => v.trim());

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

// page.route compara la URL completa (con query): se filtra por pathname
const porRuta = (patron: RegExp) => (url: URL) => patron.test(url.pathname);
const RUTA_FINCAS = /\/configuracion\/fincas$/;
const RUTA_TIPOS = /\/configuracion\/tipos-area$/;
const RUTA_AREAS = /\/configuracion\/infraestructuras$/;

// Fincas #1–#5 del ambiente TEST (GET /configuracion/fincas/{id}, 2026-09-28)
const FINCAS_FIXTURE = [
  { id_finca: 1, nombre: 'Finca Acuícola El Remanso', ubicacion: { departamento: 'Huila', municipio: 'Neiva', vereda: 'El Remanso', latitud: '2.9273', longitud: '-75.2819' }, tamano_h: '12.50', es_activo: true, fecha_creacion: '2026-04-28T14:42:28Z', fecha_actualizacion: '2026-04-28T14:42:28.213141Z', id_usuario: 2 },
  { id_finca: 2, nombre: 'Piscícola Los Esteros', ubicacion: { departamento: 'Valle del Cauca', municipio: 'Cartago', vereda: 'Los Esteros', latitud: '3.8654', longitud: '-76.4920' }, tamano_h: '8.75', es_activo: true, fecha_creacion: '2026-04-28T14:42:28Z', fecha_actualizacion: '2026-04-28T14:42:28.213141Z', id_usuario: 2 },
  { id_finca: 3, nombre: 'Camaronera Costa Azul', ubicacion: { departamento: 'Cordoba', municipio: 'Monteria', vereda: 'Costa Azul', latitud: '8.7479', longitud: '-75.8814' }, tamano_h: '25.00', es_activo: true, fecha_creacion: '2026-04-28T14:42:28Z', fecha_actualizacion: '2026-04-28T14:42:28.213141Z', id_usuario: 2 },
  { id_finca: 4, nombre: 'Granja Piscícola La Esperanza', ubicacion: { departamento: 'Caldas', municipio: 'Manizales', vereda: 'La Esperanza', latitud: '5.0689', longitud: '-75.5174' }, tamano_h: '6.30', es_activo: true, fecha_creacion: '2026-04-28T14:42:28Z', fecha_actualizacion: '2026-04-28T14:42:28.213141Z', id_usuario: 2 },
  { id_finca: 5, nombre: 'Finca El Paraiso Norte', ubicacion: { departamento: 'Antioquia', municipio: 'Medellin', vereda: 'La Estrella', latitud: '6.30', longitud: '-75.60' }, tamano_h: '120.00', es_activo: false, fecha_creacion: '2026-06-21T16:13:31Z', fecha_actualizacion: '2026-06-21T16:13:31.510491Z', id_usuario: 2 },
];
const FINCA = FINCAS_FIXTURE[0];

// Catálogo de tipos: solo nombres reales observados en las áreas existentes (el catálogo real responde 403)
const TIPOS_FIXTURE = [
  { id_tipo_area: 1, nombre: 'Estanque', es_activo: true, fecha_creacion: '2026-04-28T14:42:28Z', fecha_actualizacion: null },
  { id_tipo_area: 2, nombre: 'Invernadero', es_activo: true, fecha_creacion: '2026-04-28T14:42:28Z', fecha_actualizacion: null },
];

// Respuesta 400 real del backend TEST (POST /configuracion/infraestructuras, superficie 0, 2026-09-28)
const ERROR_400_SUPERFICIE = {
  error_code: 'VAL_ENTRADA',
  message: 'Errores de validacion en la solicitud',
  fields: [{ field: 'superficie', message: 'La superficie debe ser mayor a cero. Valor recibido: 0.' }],
};

test.use({ launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

// ── Navegación ───────────────────────────────────────────────────────────────

async function iniciarSesionAdmin(page: Page) {
  let token = '';
  page.on('request', (r) => {
    const h = r.headers()['authorization'];
    if (h) token = h;
  });
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill(ADMIN_EMAIL);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 });
  return () => token;
}

async function servirJson(page: Page, ruta: RegExp, cuerpo: unknown) {
  await page.route(porRuta(ruta), (route) =>
    route.request().method() === 'GET'
      ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(cuerpo) })
      : route.fallback());
}

/** Reconstruye lo que el ambiente no entrega hoy: listado de fincas y/o catálogo de tipos. */
async function reconstruir(page: Page, testInfo: TestInfo, { fincas = true, tipos = true } = {}) {
  if (fincas) await servirJson(page, RUTA_FINCAS, FINCAS_FIXTURE);
  if (tipos) await servirJson(page, RUTA_TIPOS, TIPOS_FIXTURE);
  testInfo.annotations.push({
    type: 'Datos simulados',
    description: [
      fincas && 'listado de fincas (#1–#5 reales) por el 400 de GET /configuracion/fincas',
      tipos && 'catálogo de tipos de área (Estanque, Invernadero) por el 403 de GET /configuracion/tipos-area',
    ].filter(Boolean).join('; '),
  });
}

/** /configuracion → Fincas → sección Infraestructura. */
async function abrirSeccionInfraestructura(page: Page) {
  await page.goto('/configuracion');
  const fincas = page.waitForResponse((r) => r.request().method() === 'GET' && RUTA_FINCAS.test(new URL(r.url()).pathname));
  await page.getByRole('button', { name: 'Fincas', exact: true }).click();
  const res = await fincas;
  const seccion = page.getByRole('heading', { name: 'Infraestructura Productiva' });
  await seccion.scrollIntoViewIfNeeded();
  await expect(seccion).toBeVisible();
  return res.status();
}

/** Selecciona la finca en la sección y espera el listado real de sus áreas. */
async function abrirAreasDeFinca(page: Page) {
  await abrirSeccionInfraestructura(page);
  const areas = page.waitForResponse((r) => r.request().method() === 'GET' && RUTA_AREAS.test(new URL(r.url()).pathname));
  await page.getByRole('button').filter({ has: page.getByText(FINCA.nombre, { exact: true }) }).first().click();
  expect((await areas).status(), 'El listado de áreas de la finca debe cargar').toBe(200);
  await expect(page.getByRole('button', { name: 'Cambiar finca' })).toBeVisible();
  await expect(page.locator('table tbody tr').first()).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

interface Formulario {
  dialogo: Locator;
  tipo: Locator;
  nombre: Locator;
  superficie: Locator;
  registrar: Locator;
}

async function abrirFormulario(page: Page): Promise<Formulario> {
  await page.getByRole('button', { name: 'Nueva área' }).click();
  const dialogo = page.getByRole('dialog', { name: 'Registrar área productiva' });
  await expect(dialogo).toBeVisible();
  return {
    dialogo,
    // El select se ubica por rol: su <label> no está asociado (ver test 3b)
    tipo: dialogo.getByRole('combobox').first(),
    nombre: dialogo.getByRole('textbox', { name: 'Nombre del área', exact: true }),
    superficie: dialogo.getByRole('spinbutton', { name: 'Superficie (m²)', exact: true }),
    registrar: dialogo.getByRole('button', { name: 'Registrar área' }),
  };
}

function esAlta(r: Request) {
  return r.method() === 'POST' && RUTA_AREAS.test(new URL(r.url()).pathname);
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

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Infraestructura Productiva / Áreas (RF-20)`, () => {
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

  test('1a. Sección de áreas (estado real del ambiente) - 0 violaciones axe A/AA', async ({ page }, testInfo) => {
    const estado = await abrirSeccionInfraestructura(page);

    await escanear(page, 'seccion-real', testInfo);

    expect(
      estado,
      'BLOQUEO: GET /configuracion/fincas no responde 200 (400 VEREDA_REQUERIDO por la finca #34); la sección no ofrece fincas para ver sus áreas',
    ).toBe(200);
  });

  test('1-2. Listado de áreas de una finca - 0 violaciones axe A/AA', async ({ page }, testInfo) => {
    await reconstruir(page, testInfo, { tipos: false });
    await abrirAreasDeFinca(page);

    // 4.1.2: estado de cada área en texto y acciones con nombre accesible
    const fila = page.locator('table tbody tr').filter({ hasText: AREA_EXISTENTE }).first();
    await expect(fila, `Precondición: la finca debe tener el área "${AREA_EXISTENTE}"`).toBeVisible();
    await expect(fila).toContainText(/Activa?/);

    await escanear(page, 'listado-areas', testInfo);
  });

  test('3a. Formulario "Registrar área" (estado real del catálogo de tipos)', async ({ page }, testInfo) => {
    await reconstruir(page, testInfo, { tipos: false });
    await abrirAreasDeFinca(page);
    const form = await abrirFormulario(page);

    await escanear(page, 'formulario-real', testInfo);

    expect(
      await form.tipo.locator('option').count(),
      'BLOQUEO: GET /configuracion/tipos-area responde 403 ACCESO_DENEGADO; el select "Tipo de área" queda sin opciones y no se puede registrar un área',
    ).toBeGreaterThan(0);
  });

  test('3b. Formulario "Registrar área" - 0 violaciones axe A/AA (1.3.1 labels, 4.1.2 select)', async ({ page }, testInfo) => {
    await reconstruir(page, testInfo);
    await abrirAreasDeFinca(page);
    const form = await abrirFormulario(page);

    // 1.3.1: nombre y superficie se ubican por su label
    await expect(form.nombre).toBeVisible();
    await expect(form.superficie).toBeVisible();
    // 4.1.2: el select de tipo_area debe exponer nombre, rol y valor
    await expect.soft(form.tipo, '4.1.2: el select "Tipo de área" no tiene nombre accesible (su <label> no está asociado)').toHaveAccessibleName(/Tipo de área/);
    await expect(form.tipo).toHaveValue('Estanque');
    await expect(form.tipo.locator('option')).toHaveText([/Estanque/, /Invernadero/]);

    await escanear(page, 'formulario', testInfo);
  });

  test('4. Nombre duplicado en la misma finca - HTTP 409 esperado, anunciado', async ({ page }, testInfo) => {
    await reconstruir(page, testInfo);
    await abrirAreasDeFinca(page);
    const form = await abrirFormulario(page);
    await form.tipo.selectOption('Estanque');
    await form.nombre.fill(AREA_EXISTENTE);
    await form.superficie.fill('100');

    const alta = page.waitForResponse((r) => esAlta(r.request()));
    await form.registrar.click();
    const respuesta = await alta;
    if (respuesta.ok()) {
      // Salvaguarda: si el backend no detectara el duplicado, no dejar el área creada
      const creada = await respuesta.json();
      await page.request.patch(`${API_BASE}/configuracion/infraestructuras/${creada.id_infraestructura}/desactivar`, { headers: { authorization: token() } });
    }

    // 3.3.1: el error se anuncia (role="alert") y el modal sigue abierto para corregir
    const alerta = form.dialogo.getByRole('alert');
    await expect(alerta.first()).toBeVisible();
    testInfo.annotations.push({ type: 'Respuesta del backend al duplicado', description: `${respuesta.status()} ${await respuesta.text()}` });

    await escanear(page, 'error-duplicado', testInfo);

    expect.soft(respuesta.status(), `El backend debe responder 409 al nombre duplicado "${AREA_EXISTENTE}" en la misma finca`).toBe(409);
    await expect.soft(alerta.first(), '3.3.1: el mensaje debe indicar que el nombre ya existe en la finca').toContainText(/existe|duplicad/i);
    await expect.soft(form.nombre, '3.3.1: el campo "Nombre del área" debe marcarse con aria-invalid').toHaveAttribute('aria-invalid', 'true');
  });

  test('4. Superficie inválida (validación del cliente) - anunciada por campo', async ({ page }, testInfo) => {
    await reconstruir(page, testInfo);
    await abrirAreasDeFinca(page);
    const form = await abrirFormulario(page);

    let envios = 0;
    page.on('request', (r) => { if (esAlta(r)) envios++; });

    await form.nombre.fill('Area Qa Accesibilidad');
    await form.superficie.fill('0');
    await form.superficie.blur();
    await form.registrar.click();

    await expect(form.dialogo.getByRole('alert')).toBeVisible();
    await expect(form.superficie).toHaveAttribute('aria-invalid', 'true');
    await expect(form.superficie).toHaveAccessibleDescription(/mayor a 0/i);
    expect(envios, 'La validación del cliente debe bloquear el envío').toBe(0);

    await escanear(page, 'error-superficie-cliente', testInfo);
  });

  test('4. HTTP 400 del backend - superficie inválida (VAL_ENTRADA) - anunciada por campo', async ({ page }, testInfo) => {
    await reconstruir(page, testInfo);
    await page.route(porRuta(RUTA_AREAS), (route) =>
      route.request().method() === 'POST'
        ? route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify(ERROR_400_SUPERFICIE) })
        : route.fallback());
    await abrirAreasDeFinca(page);
    const form = await abrirFormulario(page);
    await form.nombre.fill('Area Qa Accesibilidad');
    await form.superficie.fill('100');
    await form.registrar.click();

    await expect(form.dialogo.getByRole('alert').first()).toBeVisible();
    await expect.soft(form.superficie, '3.3.1: el campo "Superficie" debe marcarse con aria-invalid').toHaveAttribute('aria-invalid', 'true');
    await expect.soft(form.superficie, '3.3.1: el error del backend debe asociarse al campo "Superficie"').toHaveAccessibleDescription(/superficie debe ser mayor a cero/i);

    await escanear(page, 'error-400-superficie-backend', testInfo);
  });

  test('5. Teclado - el select "Tipo de área" se opera con flechas y Enter', async ({ page }, testInfo) => {
    await reconstruir(page, testInfo);
    await abrirAreasDeFinca(page);
    const form = await abrirFormulario(page);

    // Llegar al select con el teclado desde el primer control del modal
    await form.dialogo.getByRole('button', { name: /cerrar/i }).focus();
    await page.keyboard.press('Tab');
    await expect(form.tipo, 'El select debe ser el primer campo en el orden de tabulación').toBeFocused();

    await expect(form.tipo).toHaveValue('Estanque');
    await page.keyboard.press('ArrowDown');
    await expect(form.tipo, 'Flecha abajo debe seleccionar la siguiente opción').toHaveValue('Invernadero');
    await page.keyboard.press('ArrowUp');
    await expect(form.tipo, 'Flecha arriba debe volver a la opción anterior').toHaveValue('Estanque');

    // Abrir la lista (Alt+↓), moverse y confirmar con Enter
    await page.keyboard.press('Alt+ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(form.tipo, 'Enter debe confirmar la opción resaltada').toHaveValue('Invernadero');
    await expect(form.dialogo, 'Enter en el select no debe cerrar ni enviar el formulario').toBeVisible();
  });
});
