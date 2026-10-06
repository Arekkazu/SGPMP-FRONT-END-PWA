/**
 * TC-DIS-49 — Accesibilidad WCAG 2.1 AA del listado y formulario de Datos de la Finca
 * RF-19 · CU-04 Gestionar Infraestructura Productiva · Roles: Administrador y Productor
 *
 * Herramientas: @axe-core/playwright (reporte axe-<TC>.html/json) + Lighthouse en
 * modo snapshot sobre la misma sesión (lighthouse-<TC>-<paso>-<viewport>.html/json),
 * ambos en ./resultados. Una auditoría fallida de Lighthouse es un defecto aunque
 * tenga peso 0 en el puntaje.
 *
 * Corregido al 2026-10-05: GET /configuracion/fincas responde 200 y 1a ya evalúa el
 * listado real; 1b se conserva como control con los registros leídos uno por uno.
 * BLOQUEO DEL AMBIENTE (2026-09-28): GET /configuracion/fincas respondía
 * 400 VEREDA_REQUERIDO para todos los usuarios, porque la finca #34 no tiene
 * departamento/vereda (su GET individual responde 400 DEPARTAMENTO_REQUERIDO) y
 * rompe la serialización del listado completo. Por eso:
 *   - 1a escanea el listado tal como está hoy y falla indicando el bloqueo;
 *   - 1b reconstruye el listado con los registros reales leídos uno por uno
 *     (GET /configuracion/fincas/{id}) y lo sirve con page.route, para poder
 *     evaluar 4.1.2 (estado activa/inactiva) mientras se corrige el dato.
 *
 * PROTECCIÓN DE DATOS: una finca registrada es un registro real, así que todo POST/PATCH
 * a /configuracion/fincas se intercepta y por defecto se aborta. Solo el 409 duplicado
 * llega al backend, y únicamente si la finca ya existe en el listado real (si no, el
 * POST se aborta y el caso falla por precondición).
 *
 * Errores:
 *   - 409 duplicado: real, contra el backend ("Finca Acuícola El Remanso").
 *   - 400 coordenadas / formato de texto: el cliente los valida antes de enviar,
 *     así que se prueba el error del cliente y, aparte, la respuesta 400 real
 *     del backend (capturada del ambiente TEST) inyectada con page.route.
 * Teclado: el alta se intercepta para no crear fincas en el ambiente.
 *
 * Productor: TEST_PRODUCTOR_EMAIL/PASSWORD; si no están, TEST_USER_EMAIL/PASSWORD (cuenta Productor).
 *
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_49_VIEWPORTS=escritorio
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page, type Request, type TestInfo } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { auditarLighthouse, PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';

const TC_ID = 'TC-DIS-49';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';
const PRODUCTOR_EMAIL = process.env.TEST_PRODUCTOR_EMAIL || process.env.TEST_USER_EMAIL || '';
const PRODUCTOR_PASSWORD = process.env.TEST_PRODUCTOR_PASSWORD || process.env.TEST_USER_PASSWORD || '';

const FINCA_EXISTENTE = process.env.TC_DIS_49_FINCA_EXISTENTE ?? 'Finca Acuícola El Remanso';
const API_BASE = process.env.API_BASE_URL ?? 'https://api.inmero.co/back-sigab-test';

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_49_VIEWPORTS ?? 'movil,tablet,escritorio')
  .split(',')
  .map((v) => v.trim());

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const RUTA_LISTADO = /\/configuracion\/fincas$/;
// page.route compara la URL completa (con ?solo_activas=...): se filtra por pathname
const URL_LISTADO = (url: URL) => RUTA_LISTADO.test(url.pathname);
const URL_FINCAS = (url: URL) => /\/configuracion\/fincas(\/\d+(\/\w+)?)?$/.test(url.pathname);

// Respuestas 400 reales del backend TEST (POST /configuracion/fincas, 2026-09-28)
const ERROR_400_LATITUD = {
  error_code: 'VAL_ENTRADA',
  message: 'Errores de validacion en la solicitud',
  fields: [{ field: 'ubicacion.latitud', message: 'La latitud debe estar entre -90 y 90.' }],
};
const ERROR_400_FORMATO = {
  error_code: 'DEPARTAMENTO_FORMATO_INVALIDO',
  message:
    "El campo 'departamento' solo permite letras y espacios (incluye tildes y ñ). No se permiten números ni caracteres especiales.",
  fields: [{
    field: 'departamento',
    message: "El campo 'departamento' solo permite letras y espacios (incluye tildes y ñ). No se permiten números ni caracteres especiales.",
  }],
};

const DATOS_VALIDOS = {
  tamano: '10',
  departamento: 'Huila',
  municipio: 'Neiva',
  vereda: 'La Ceiba',
  latitud: '2.9',
  longitud: '-75.3',
};

test.use({ launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

// ── Protección de escrituras ─────────────────────────────────────────────────

/** Aborta todo POST/PATCH a fincas salvo que `permitirAlta` lo habilite (solo el 409 duplicado). */
async function protegerFincas(page: Page) {
  let permitir = false;
  await page.route(URL_FINCAS, (route) => {
    const req = route.request();
    if (!['xhr', 'fetch'].includes(req.resourceType()) || req.method() === 'GET') return route.fallback();
    if (permitir && req.method() === 'POST' && URL_LISTADO(new URL(req.url()))) return route.fallback();
    return route.abort();
  });
  return { permitirAlta: () => { permitir = true; } };
}

// ── Navegación ───────────────────────────────────────────────────────────────

/** Inicia sesión y devuelve una función que entrega el último JWT enviado al backend. */
async function iniciarSesion(page: Page, email: string, password: string) {
  let token = '';
  page.on('request', (r) => {
    const h = r.headers()['authorization'];
    if (h) token = h;
  });
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill(email);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(password);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 });
  return () => token;
}

function esListado(res: { url(): string; request(): { method(): string } }) {
  return res.request().method() === 'GET' && RUTA_LISTADO.test(new URL(res.url()).pathname);
}

/** /configuracion → Fincas. Devuelve el estado HTTP del listado. */
async function abrirFincas(page: Page): Promise<number> {
  await page.goto('/configuracion');
  const listado = page.waitForResponse(esListado, { timeout: 20_000 });
  await page.getByRole('button', { name: 'Fincas', exact: true }).click();
  const res = await listado;
  await expect(page.getByRole('heading', { name: 'Gestión de Fincas' })).toBeVisible();
  // .first(): con fincas cargadas, la sección de infraestructura muestra otro contador igual
  await expect(page.getByText(/\d+ activas · \d+ inactivas/).first()).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  return res.status();
}

interface Formulario {
  dialogo: Locator;
  nombre: Locator;
  tamano: Locator;
  productor: Locator;
  departamento: Locator;
  municipio: Locator;
  vereda: Locator;
  latitud: Locator;
  longitud: Locator;
  cancelar: Locator;
  registrar: Locator;
}

async function abrirFormularioRegistro(page: Page): Promise<Formulario> {
  await page.getByRole('button', { name: 'Nueva finca' }).click();
  const dialogo = page.getByRole('dialog', { name: 'Registrar nueva finca' });
  await expect(dialogo).toBeVisible();
  return {
    dialogo,
    nombre: dialogo.getByRole('textbox', { name: 'Nombre de la finca', exact: true }),
    tamano: dialogo.getByRole('spinbutton', { name: 'Tamaño (hectáreas)', exact: true }),
    productor: dialogo.getByRole('spinbutton', { name: 'ID Productor asignado', exact: true }),
    departamento: dialogo.getByRole('textbox', { name: 'Departamento', exact: true }),
    municipio: dialogo.getByRole('textbox', { name: 'Municipio', exact: true }),
    vereda: dialogo.getByRole('textbox', { name: 'Vereda', exact: true }),
    latitud: dialogo.getByRole('spinbutton', { name: 'Latitud', exact: true }),
    longitud: dialogo.getByRole('spinbutton', { name: 'Longitud', exact: true }),
    cancelar: dialogo.getByRole('button', { name: 'Cancelar' }),
    registrar: dialogo.getByRole('button', { name: 'Registrar finca' }),
  };
}

async function llenarFormulario(form: Formulario, nombre: string) {
  await form.nombre.fill(nombre);
  await form.tamano.fill(DATOS_VALIDOS.tamano);
  await form.departamento.fill(DATOS_VALIDOS.departamento);
  await form.municipio.fill(DATOS_VALIDOS.municipio);
  await form.vereda.fill(DATOS_VALIDOS.vereda);
  await form.latitud.fill(DATOS_VALIDOS.latitud);
  await form.longitud.fill(DATOS_VALIDOS.longitud);
}

function esAlta(r: Request) {
  return r.method() === 'POST' && RUTA_LISTADO.test(new URL(r.url()).pathname);
}

/** Inyecta una respuesta 400 real del backend en el alta de finca. */
async function inyectarErrorAlta(page: Page, cuerpo: object) {
  await page.route(URL_LISTADO, (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify(cuerpo) })
      : route.fallback());
}

/** 3.3.1 "anunciado por campo": el input queda inválido y el mensaje asociado a él. */
async function verificarErrorEnCampo(campo: Locator, nombreCampo: string, mensaje: RegExp) {
  await expect.soft(campo, `3.3.1: el campo "${nombreCampo}" debe marcarse con aria-invalid`).toHaveAttribute('aria-invalid', 'true');
  await expect.soft(campo, `3.3.1: el error debe estar asociado al campo "${nombreCampo}" (aria-describedby)`).toHaveAccessibleDescription(mensaje);
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

function saltarViewportsDeshabilitados(testInfo: TestInfo) {
  test.skip(
    !VIEWPORTS_HABILITADOS.includes(testInfo.project.name),
    `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_49_VIEWPORTS.`,
  );
}

// ── Casos: Administrador ─────────────────────────────────────────────────────

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Datos de la Finca (RF-19) - Administrador`, () => {
  // Modo por defecto (no serial): un paso con violaciones no debe impedir evaluar los demás.
  // workers: 1 en el config, así que los logins siguen siendo secuenciales.
  test.describe.configure({ timeout: 180_000 });

  let tokenAdmin: () => string;
  let permitirAlta: () => void;

  test.beforeEach(async ({ page }, testInfo) => {
    saltarViewportsDeshabilitados(testInfo);
    expect(ADMIN_EMAIL, 'Falta TEST_ADMIN_EMAIL en testing/.env.test').not.toBe('');
    expect(ADMIN_PASSWORD, 'Falta TEST_ADMIN_PASSWORD en testing/.env.test').not.toBe('');
    ({ permitirAlta } = await protegerFincas(page));
    tokenAdmin = await iniciarSesion(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  test('1a. Listado de fincas (estado real del ambiente) - 0 violaciones axe A/AA', async ({ page }, testInfo) => {
    const estado = await abrirFincas(page);

    await escanear(page, 'listado-real', testInfo);

    expect(
      estado,
      'BLOQUEO: GET /configuracion/fincas no responde 200 (400 VEREDA_REQUERIDO por la finca #34 sin departamento/vereda); el listado no muestra fincas',
    ).toBe(200);
  });

  test('1b. Listado reconstruido con los registros reales - 4.1.2 estado activa/inactiva', async ({ page }, testInfo) => {
    testInfo.annotations.push({
      type: 'Datos simulados',
      description: 'El listado se sirve con page.route a partir de GET /configuracion/fincas/{id} (registros reales), por el bloqueo del endpoint de listado.',
    });

    // Reconstruye el listado leyendo cada finca por id (se omiten las que el backend no puede leer)
    await page.goto('/configuracion');
    await expect.poll(() => tokenAdmin(), { message: 'No se capturó el JWT de la sesión' }).not.toBe('');
    const fincas: unknown[] = [];
    let noEncontradasSeguidas = 0;
    for (let id = 1; noEncontradasSeguidas < 10 && id <= 200; id++) {
      const res = await page.request.get(`${API_BASE}/configuracion/fincas/${id}`, { headers: { authorization: tokenAdmin() } });
      if (res.status() === 200) fincas.push(await res.json());
      noEncontradasSeguidas = res.status() === 404 ? noEncontradasSeguidas + 1 : 0;
    }
    expect(fincas.length, 'Se necesitan fincas reales para reconstruir el listado').toBeGreaterThan(0);

    await page.route(URL_LISTADO, (route) =>
      route.request().method() === 'GET'
        ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fincas) })
        : route.fallback());
    expect(await abrirFincas(page)).toBe(200);

    // 4.1.2: el estado se expone como texto y las acciones nombran la finca y la acción
    const filas = page.locator('table tbody tr');
    const activa = filas.filter({ hasText: 'Activa' }).first();
    const inactiva = filas.filter({ hasText: 'Inactiva' }).first();
    await expect(activa, 'Precondición: al menos una finca activa').toBeVisible();
    await expect(inactiva, 'Precondición: al menos una finca inactiva').toBeVisible();
    await expect(activa.getByRole('button', { name: /^Desactivar / })).toBeVisible();
    await expect(inactiva.getByRole('button', { name: /^Reactivar / })).toBeVisible();

    await escanear(page, 'listado-reconstruido', testInfo);
  });

  test('3. Formulario "Registrar finca" - 0 violaciones axe A/AA (1.3.1 labels)', async ({ page }, testInfo) => {
    await abrirFincas(page);
    const form = await abrirFormularioRegistro(page);

    // 1.3.1: los 7 campos del RF se localizan por su label; los obligatorios exponen aria-required
    for (const [campo, nombre] of [
      [form.nombre, 'Nombre'], [form.departamento, 'Departamento'], [form.municipio, 'Municipio'],
      [form.vereda, 'Vereda'], [form.latitud, 'Latitud'], [form.longitud, 'Longitud'], [form.tamano, 'Tamaño'],
    ] as const) {
      await expect(campo, `1.3.1: no se encontró el campo "${nombre}" por su label`).toBeVisible();
      await expect.soft(campo, `1.3.1: "${nombre}" debe exponer aria-required`).toHaveAttribute('aria-required', 'true');
    }

    await escanear(page, 'formulario', testInfo);
  });

  test('4. Nombre duplicado (HTTP 409 real) - anunciado por campo y 0 violaciones axe A/AA', async ({ page }, testInfo) => {
    const listado = page.waitForResponse(esListado, { timeout: 20_000 });
    await abrirFincas(page);
    const res = await listado;
    const cuerpo = res.ok() ? await res.json() : [];
    const nombres: string[] = (Array.isArray(cuerpo) ? cuerpo : cuerpo.items ?? []).map((f: { nombre: string }) => f.nombre);
    expect(nombres, `Precondición: "${FINCA_EXISTENTE}" debe existir en el listado real para que el POST sea un duplicado (si no, no se envía)`).toContain(FINCA_EXISTENTE);
    permitirAlta();
    testInfo.annotations.push({ type: 'Petición real', description: `POST con el nombre de la finca existente "${FINCA_EXISTENTE}": el backend la rechaza por duplicado sin crear nada.` });
    const form = await abrirFormularioRegistro(page);
    await llenarFormulario(form, FINCA_EXISTENTE);

    const alta = page.waitForResponse((r) => esAlta(r.request()));
    await form.registrar.click();
    const respuesta = await alta;

    if (respuesta.ok()) {
      // Salvaguarda: si el backend no detectara el duplicado, no dejar la finca creada
      const creada = await respuesta.json();
      await page.request.patch(`${API_BASE}/configuracion/fincas/${creada.id_finca}/desactivar`, { headers: { authorization: tokenAdmin() } });
    }
    expect(respuesta.status(), `El backend debe rechazar el nombre duplicado "${FINCA_EXISTENTE}" con 409`).toBe(409);

    await expect(form.dialogo.getByRole('alert').filter({ hasText: 'Error al guardar' })).toContainText('Ya existe una finca');
    await verificarErrorEnCampo(form.nombre, 'Nombre de la finca', /Ya existe una finca/);

    await escanear(page, 'error-409-duplicado', testInfo);
  });

  test('4. Coordenadas fuera de rango y formato de texto (validación del cliente) - anunciados por campo', async ({ page }, testInfo) => {
    await abrirFincas(page);
    const form = await abrirFormularioRegistro(page);
    await llenarFormulario(form, 'Finca Qa Accesibilidad');

    let envios = 0;
    page.on('request', (r) => { if (esAlta(r)) envios++; });

    await form.latitud.fill('95');
    await form.latitud.blur();
    await form.departamento.fill('Huila123');
    await form.departamento.blur();
    await form.registrar.click();

    for (const [campo, nombre] of [[form.latitud, 'Latitud'], [form.departamento, 'Departamento']] as const) {
      await expect(campo, `3.3.1: "${nombre}" debe marcarse con aria-invalid`).toHaveAttribute('aria-invalid', 'true');
      const idsDescripcion = (await campo.getAttribute('aria-describedby')) ?? '';
      expect.soft(idsDescripcion, `3.3.1: el error de "${nombre}" debe estar asociado al campo`).not.toBe('');
    }
    await expect(form.dialogo.getByRole('alert')).toHaveCount(2);
    expect(envios, 'La validación del cliente debe bloquear el envío').toBe(0);

    await escanear(page, 'error-400-cliente', testInfo);
  });

  test('4. HTTP 400 del backend - coordenadas fuera de rango (VAL_ENTRADA) - anunciado por campo', async ({ page }, testInfo) => {
    await inyectarErrorAlta(page, ERROR_400_LATITUD);
    await abrirFincas(page);
    const form = await abrirFormularioRegistro(page);
    await llenarFormulario(form, 'Finca Qa Accesibilidad');
    await form.registrar.click();

    await expect(form.dialogo.getByRole('alert').filter({ hasText: 'Error al guardar' })).toBeVisible();
    await verificarErrorEnCampo(form.latitud, 'Latitud', /latitud debe estar entre -90 y 90/i);

    await escanear(page, 'error-400-coordenadas-backend', testInfo);
  });

  test('4. HTTP 400 del backend - formato de texto (DEPARTAMENTO_FORMATO_INVALIDO) - anunciado por campo', async ({ page }, testInfo) => {
    await inyectarErrorAlta(page, ERROR_400_FORMATO);
    await abrirFincas(page);
    const form = await abrirFormularioRegistro(page);
    await llenarFormulario(form, 'Finca Qa Accesibilidad');
    await form.registrar.click();

    await expect(form.dialogo.getByRole('alert').filter({ hasText: 'Error al guardar' })).toBeVisible();
    await verificarErrorEnCampo(form.departamento, 'Departamento', /solo permite letras y espacios/);

    await escanear(page, 'error-400-formato-backend', testInfo);
  });

  test('5. Teclado (2.1.1) - Tab recorre todos los campos y Enter guarda igual que el clic', async ({ page }) => {
    // Alta interceptada: no se crean fincas en el ambiente
    const cuerpos: Record<string, unknown>[] = [];
    await page.route(URL_LISTADO, async (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      const cuerpo = route.request().postDataJSON();
      cuerpos.push(cuerpo);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id_finca: 900000 + cuerpos.length, ...cuerpo, id_usuario: null, es_activo: true,
          fecha_creacion: new Date().toISOString(), fecha_actualizacion: new Date().toISOString(),
        }),
      });
    });
    await abrirFincas(page);

    // Orden de tabulación, incluidos los campos de ubicación y coordenadas
    const form = await abrirFormularioRegistro(page);
    const orden: [Locator, string][] = [
      [form.nombre, 'Nombre'], [form.tamano, 'Tamaño'], [form.productor, 'ID Productor'],
      [form.departamento, 'Departamento'], [form.municipio, 'Municipio'], [form.vereda, 'Vereda'],
      [form.latitud, 'Latitud'], [form.longitud, 'Longitud'], [form.cancelar, 'Cancelar'], [form.registrar, 'Registrar finca'],
    ];
    await orden[0][0].focus();
    for (let i = 1; i < orden.length; i++) {
      await page.keyboard.press('Tab');
      await expect(orden[i][0], `2.1.1: tras "${orden[i - 1][1]}" el foco debe pasar a "${orden[i][1]}"`).toBeFocused();
    }

    // Enter en un campo (Longitud) y clic en "Registrar finca" deben enviar lo mismo
    await llenarFormulario(form, 'Finca Qa Teclado');
    await form.longitud.focus();
    const porEnter = page.waitForRequest(esAlta, { timeout: 5_000 });
    await page.keyboard.press('Enter');
    await porEnter;
    await expect(form.dialogo).toBeHidden();

    const form2 = await abrirFormularioRegistro(page);
    await llenarFormulario(form2, 'Finca Qa Teclado');
    const porClic = page.waitForRequest(esAlta, { timeout: 5_000 });
    await form2.registrar.click();
    await porClic;

    expect(cuerpos).toHaveLength(2);
    expect(cuerpos[0], 'Enter debe enviar exactamente lo mismo que el clic').toEqual(cuerpos[1]);
  });
});

// ── Casos: Productor (solo lectura) ──────────────────────────────────────────

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Datos de la Finca (RF-19) - Productor (solo lectura)`, () => {
  test.describe.configure({ timeout: 180_000 });

  test('Restricción de solo lectura para el rol Productor - accesible y 0 violaciones axe A/AA', async ({ page }, testInfo) => {
    saltarViewportsDeshabilitados(testInfo);
    expect(PRODUCTOR_EMAIL, 'Falta TEST_PRODUCTOR_EMAIL (o TEST_USER_EMAIL) en testing/.env.test').not.toBe('');
    expect(PRODUCTOR_PASSWORD, 'Falta TEST_PRODUCTOR_PASSWORD (o TEST_USER_PASSWORD) en testing/.env.test').not.toBe('');

    await protegerFincas(page);
    await iniciarSesion(page, PRODUCTOR_EMAIL, PRODUCTOR_PASSWORD);
    await expect.soft(page.getByText('Productor', { exact: true }), 'La cuenta TEST_PRODUCTOR debe tener rol Productor').toBeVisible();

    const estado = await abrirFincas(page);
    testInfo.annotations.push({ type: 'Listado (Productor)', description: `GET /configuracion/fincas → ${estado}` });

    // Solo lectura: sin acciones de escritura (la restricción no debe depender solo de deshabilitar visualmente)
    await expect(page.getByRole('button', { name: 'Nueva finca' }), 'El Productor no debe ver "Nueva finca"').toHaveCount(0);
    await expect(page.getByRole('button', { name: /^(Editar|Desactivar|Reactivar) / }), 'El Productor no debe ver acciones de edición').toHaveCount(0);

    await escanear(page, 'productor-solo-lectura', testInfo);
  });
});
