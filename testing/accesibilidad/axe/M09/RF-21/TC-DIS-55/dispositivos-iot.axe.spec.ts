/**
 * TC-DIS-55 — Accesibilidad WCAG 2.1 AA del listado y formulario de Registro de Dispositivos IoT
 * RF-21 v2.0 · CU-05 Gestionar Dispositivos IoT · Rol: Administrador
 * Configuración → IoT → "Dispositivos IoT": Paso 1 finca → Paso 2 área → dispositivos del área
 *
 * Cambio del RF (2026-10-05, RFC-011): al elegir un tipo de categoría CAMARA aparecen los
 * campos de visión (resolución, fps y área de cobertura). Deben anunciarse al aparecer,
 * tener etiquetas con su unidad o formato (resolución ANCHOxALTO, fps 1–60, m²) y mostrar
 * el error 400 en el campo correspondiente. Nuevo error 422 de tipo de dispositivo inexistente.
 *
 * Reejecución sobre la release 1.0.0-rc.40 (5123a22): un error del backend con `fields` se
 * anuncia debajo del campo (role="alert", aria-invalid, aria-describedby y foco) y ya no en
 * la alerta general "Error al registrar"; el caso verifica que no se anuncie dos veces.
 *
 * Herramientas: @axe-core/playwright (reporte axe-<TC>.html/json) + Lighthouse en
 * modo snapshot sobre la misma sesión (lighthouse-<TC>-<paso>-<viewport>.html/json),
 * ambos en ./resultados. Una auditoría fallida de Lighthouse es un defecto aunque tenga
 * peso 0 en el puntaje.
 *
 * Datos reales: finca "Finca Acuícola El Remanso", área "Estanque-01" y su dispositivo
 * "IOT-EST01-HLA-001"; tipo de cámara "CAMARA_VISION" (#5). Los bloqueos del 2026-09-28
 * (400 de los listados de fincas y dispositivos, alta sin id_tipo_dispositivo) ya no aplican.
 *
 * PROTECCIÓN DE DATOS: un dispositivo registrado es un registro real, así que todo POST/PATCH
 * a /configuracion/dispositivos-iot se intercepta y por defecto se aborta:
 *   - Reales: 409 SERIAL_DUPLICADO (serial existente) y 422 TIPO_DISPOSITIVO_NO_ENCONTRADO,
 *     REDIRIGIENDO el POST con id_tipo_dispositivo 999999 y el serial existente (no se puede
 *     crear nada aunque una validación faltara).
 *   - SIMULADOS con el formato estándar: los 400 de resolución, fps y área de cobertura
 *     (el backend valida el área antes que esos campos, así que obtenerlos reales exige un
 *     área real y arriesgaría crear el dispositivo; error_code y mensajes a confirmar) y el
 *     422 de área inactiva (cuerpo real del 2026-09-28).
 *
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_55_VIEWPORTS=escritorio
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { auditarLighthouse, PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';

const TC_ID = 'TC-DIS-55';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

const FINCA = 'Finca Acuícola El Remanso';
const AREA = 'Estanque-01';
const SERIAL_EXISTENTE = process.env.TC_DIS_55_SERIAL_EXISTENTE ?? 'IOT-EST01-HLA-001';
const TIPO_CAMARA = 'CAMARA_VISION';
const TIPO_SENSOR = 'SENSOR_AMBIENTAL';

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_55_VIEWPORTS ?? 'movil,tablet,escritorio')
  .split(',')
  .map((v) => v.trim());

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

// page.route compara la URL completa (con query): se filtra por pathname
const RUTA_FINCAS = /\/configuracion\/fincas$/;
const RUTA_DISPOSITIVOS = /\/configuracion\/dispositivos-iot$/;
const URL_DISPOSITIVOS = (url: URL) => /\/configuracion\/dispositivos-iot(\/\d+(\/[\w-]+)*)?$/.test(url.pathname);

// 400 SIMULADOS con el formato estándar del backend (error_code y mensajes a confirmar)
const error400 = (field: string, message: string) => ({ error_code: 'VAL_ENTRADA', message: 'Errores de validacion en la solicitud', fields: [{ field, message }] });
const ERRORES_400 = [
  { campo: 'resolucion', cuerpo: error400('resolucion', 'La resolución debe tener el formato ANCHOxALTO, p. ej. 1920x1080.'), mensaje: /formato ANCHOxALTO/ },
  { campo: 'fps', cuerpo: error400('fps', 'Los fps deben ser un entero entre 1 y 60.'), mensaje: /entre 1 y 60/ },
  { campo: 'area_cobertura_m2', cuerpo: error400('area_cobertura_m2', 'El área de cobertura debe ser mayor a 0 m².'), mensaje: /mayor a 0/ },
] as const;

// Respuesta 422 real del backend TEST (POST /configuracion/dispositivos-iot, área desactivada, 2026-09-28)
const ERROR_422_AREA = {
  error_code: 'AREA_NO_DISPONIBLE',
  message: 'No se puede registrar el dispositivo porque el área productiva seleccionada está desactivada.',
  fields: [],
};

test.use({ launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

// ── Protección de escrituras ─────────────────────────────────────────────────

type Modo =
  | { tipo: 'abortar' }
  | { tipo: 'redirigir'; cuerpo: (enviado: Record<string, unknown>) => Record<string, unknown> }
  | { tipo: 'simular'; status: number; cuerpo: unknown };

async function protegerDispositivos(page: Page) {
  let modo: Modo = { tipo: 'abortar' };
  const intentos: Record<string, unknown>[] = [];
  await page.route(URL_DISPOSITIVOS, (route) => {
    const req = route.request();
    if (!['xhr', 'fetch'].includes(req.resourceType()) || req.method() === 'GET') return route.fallback();
    const enviado = req.postDataJSON() ?? {};
    intentos.push(enviado);
    if (modo.tipo === 'redirigir' && req.method() === 'POST') return route.continue({ postData: JSON.stringify(modo.cuerpo(enviado)) });
    if (modo.tipo === 'simular') return route.fulfill({ status: modo.status, contentType: 'application/json', body: JSON.stringify(modo.cuerpo) });
    return route.abort();
  });
  return { fijarModo: (m: Modo) => { modo = m; }, intentos };
}

// ── Navegación ───────────────────────────────────────────────────────────────

async function iniciarSesionAdmin(page: Page) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill(ADMIN_EMAIL);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 });
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
  const dispositivos = page.waitForResponse((r) => r.request().method() === 'GET' && RUTA_DISPOSITIVOS.test(new URL(r.url()).pathname));
  await tarjeta(page, AREA).click();
  expect((await dispositivos).status(), 'GET /configuracion/dispositivos-iot debe responder 200').toBe(200);
  await expect(page.locator('table tbody tr').first()).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

interface Formulario {
  dialogo: Locator;
  serial: Locator;
  tipo: Locator;
  gateway: Locator;
  resolucion: Locator;
  fps: Locator;
  cobertura: Locator;
  descripcion: Locator;
  registrar: Locator;
}

async function abrirFormulario(page: Page): Promise<Formulario> {
  await page.getByRole('button', { name: 'Nuevo dispositivo' }).click();
  const dialogo = page.getByRole('dialog', { name: 'Registrar dispositivo IoT' });
  await expect(dialogo).toBeVisible();
  const form = {
    dialogo,
    serial: dialogo.getByRole('textbox', { name: 'Serial físico del dispositivo' }),
    tipo: dialogo.getByRole('combobox', { name: 'Tipo de dispositivo' }),
    gateway: dialogo.getByRole('combobox', { name: /Gateway Edge/ }),
    resolucion: dialogo.getByRole('textbox', { name: /^Resolución/ }),
    fps: dialogo.getByRole('spinbutton', { name: /FPS/i }),
    cobertura: dialogo.getByRole('spinbutton', { name: /Área de cobertura/ }),
    descripcion: dialogo.getByRole('textbox', { name: /^Descripción/ }),
    registrar: dialogo.getByRole('button', { name: 'Registrar dispositivo' }),
  };
  await expect(form.tipo.locator('option', { hasText: TIPO_CAMARA })).toHaveCount(1, { timeout: 20_000 });
  return form;
}

/** Formulario válido con tipo cámara, sin Gateway Edge. */
async function llenarCamara(form: Formulario, serial: string) {
  await form.serial.fill(serial);
  await form.tipo.selectOption({ label: TIPO_CAMARA });
  if (await form.gateway.count()) await form.gateway.selectOption({ index: 0 });
  await form.resolucion.fill('1920x1080');
  await form.fps.fill('25');
  await form.cobertura.fill('80');
  await form.descripcion.fill('Cámara QA TC-DIS-55');
}

/** 3.3.1: el campo queda inválido y con el mensaje asociado. */
async function verificarErrorEnCampo(campo: Locator, nombre: string, mensaje: RegExp, soft = true) {
  const e = soft ? expect.soft : expect;
  await e(campo, `DEFECTO: 3.3.1: "${nombre}" debe marcarse con aria-invalid`).toHaveAttribute('aria-invalid', 'true');
  await e(campo, `DEFECTO: 3.3.1: el error debe estar asociado al campo "${nombre}" (aria-describedby)`).toHaveAccessibleDescription(mensaje);
}

/**
 * Error del backend (release 1.0.0-rc.40, 5123a22): se anuncia debajo del campo (role="alert"),
 * el foco va al campo y no se repite en una alerta general.
 */
async function verificarErrorDelBackend(dialogo: Locator, campo: Locator, nombre: string, mensaje: RegExp) {
  await expect(dialogo.getByRole('alert').filter({ hasText: mensaje }).first(), `DEFECTO: 3.3.1/4.1.3: el error de "${nombre}" debe anunciarse (role="alert") con el mensaje del backend`).toBeVisible();
  await verificarErrorEnCampo(campo, nombre, mensaje);
  await expect.soft(campo, `DEFECTO: 3.3.1: el foco debe ir al campo "${nombre}" con el error`).toBeFocused();
  await expect.soft(dialogo.getByRole('alert').filter({ hasText: mensaje }), `DEFECTO: 3.3.1: el error de "${nombre}" se anuncia dos veces (debajo del campo y en una alerta general)`).toHaveCount(1);
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

// ── Casos ────────────────────────────────────────────────────────────────────

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Dispositivos IoT (RF-21)`, () => {
  // Modo por defecto (no serial): un paso con violaciones no debe impedir evaluar los demás.
  // workers: 1 en el config, así que los logins siguen siendo secuenciales.
  test.describe.configure({ timeout: 180_000 });

  let fijarModo: (m: Modo) => void;
  let intentos: Record<string, unknown>[];

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!VIEWPORTS_HABILITADOS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_55_VIEWPORTS.`);
    expect(ADMIN_EMAIL, 'Falta TEST_ADMIN_EMAIL en testing/.env.test').not.toBe('');
    expect(ADMIN_PASSWORD, 'Falta TEST_ADMIN_PASSWORD en testing/.env.test').not.toBe('');
    ({ fijarModo, intentos } = await protegerDispositivos(page));
    await iniciarSesionAdmin(page);
  });

  test('1-2. Listado de dispositivos de un área - 0 violaciones axe A/AA', async ({ page }, testInfo) => {
    expect(await abrirDispositivos(page), 'GET /configuracion/fincas debe responder 200').toBe(200);
    await abrirDispositivosDelArea(page);
    const fila = page.locator('table tbody tr').filter({ hasText: SERIAL_EXISTENTE }).first();
    await expect(fila, `Precondición: el área debe tener el dispositivo "${SERIAL_EXISTENTE}"`).toBeVisible();
    await expect(fila.getByRole('button', { name: `Desactivar ${SERIAL_EXISTENTE}` })).toBeVisible();
    await escanear(page, 'listado', testInfo);
  });

  test('3. Formulario "Registrar dispositivo" - labels (1.3.1) y 0 violaciones axe A/AA', async ({ page }, testInfo) => {
    await abrirDispositivosDelArea(page);
    const form = await abrirFormulario(page);
    for (const [campo, nombre] of [[form.serial, 'Serial'], [form.tipo, 'Tipo de dispositivo'], [form.descripcion, 'Descripción']] as const) {
      await expect(campo, `DEFECTO: 1.3.1: no se encontró el campo "${nombre}" por su label`).toBeVisible();
    }
    await expect(form.resolucion, 'Sin tipo de cámara no se muestran los campos de visión').toHaveCount(0);
    await escanear(page, 'formulario', testInfo);
  });

  test('3. Campos de cámara - aparecen anunciados, con unidad o formato en la etiqueta', async ({ page }, testInfo) => {
    await abrirDispositivosDelArea(page);
    const form = await abrirFormulario(page);

    // Región viva que exista ANTES de elegir el tipo: solo así el lector anuncia el cambio
    const regionesVivas = await form.dialogo.locator('[aria-live]:not([aria-live="off"]), [role="status"], [role="alert"]').count();
    await form.tipo.selectOption({ label: TIPO_CAMARA });
    await expect(form.resolucion, 'Al elegir CAMARA aparecen los campos de visión').toBeVisible();
    await expect(form.fps).toBeVisible();
    await expect(form.cobertura).toBeVisible();

    // 4.1.3: el cambio debe anunciarse (región viva con el aviso o los campos)
    const anuncio = await form.resolucion.evaluate((input, antes) => {
      const vivo = input.closest('[aria-live]:not([aria-live="off"]), [role="status"]');
      const dialogo = input.closest('[role="dialog"]')!;
      const despues = dialogo.querySelectorAll('[aria-live]:not([aria-live="off"]), [role="status"], [role="alert"]').length;
      const textos = [...dialogo.querySelectorAll('[aria-live]:not([aria-live="off"]), [role="status"]')].map((e) => e.textContent ?? '').join(' ');
      return { dentroDeRegionViva: !!vivo, avisoNuevo: despues > antes && /c[aá]mara|resoluci|visi[oó]n/i.test(textos) };
    }, regionesVivas);
    testInfo.annotations.push({ type: 'Anuncio de los campos de cámara', description: JSON.stringify(anuncio) });
    expect.soft(anuncio.dentroDeRegionViva || anuncio.avisoNuevo, 'DEFECTO: 4.1.3: los campos de cámara aparecen sin anunciarse (no están en una región aria-live ni hay un aviso de estado al elegir el tipo CAMARA)').toBe(true);

    // 1.3.1 / 3.3.2: etiquetas con unidad o formato; obligatorias con aria-required
    await expect.soft(form.resolucion, 'DEFECTO: 3.3.2: la etiqueta de resolución debe indicar el formato ANCHOxALTO').toHaveAccessibleName(/ANCHOxALTO/);
    await expect.soft(form.fps, 'DEFECTO: 3.3.2: la etiqueta "FPS" no indica el rango permitido 1–60').toHaveAccessibleName(/1\s*[–-]\s*60/);
    await expect.soft(form.cobertura, 'DEFECTO: 3.3.2: la etiqueta de área de cobertura debe indicar la unidad m²').toHaveAccessibleName(/m²/);
    for (const [campo, nombre] of [[form.resolucion, 'Resolución'], [form.fps, 'FPS'], [form.cobertura, 'Área de cobertura']] as const) {
      await expect.soft(campo, `DEFECTO: 3.3.2: "${nombre}" es obligatorio para una cámara y debe exponer aria-required`).toHaveAttribute('aria-required', 'true');
    }
    await escanear(page, 'campos-camara', testInfo);

    // Al cambiar a un tipo SENSOR los campos desaparecen
    await form.tipo.selectOption({ label: TIPO_SENSOR });
    await expect(form.resolucion, 'Con un tipo SENSOR los campos de visión no se muestran').toHaveCount(0);
  });

  test('3. Campos de cámara - validación del cliente anunciada en cada campo', async ({ page }, testInfo) => {
    await abrirDispositivosDelArea(page);
    const form = await abrirFormulario(page);
    await llenarCamara(form, 'QA-TCDIS55-001');
    await form.resolucion.fill('1920-1080');
    await form.fps.fill('0');
    await form.cobertura.fill('0');
    await form.registrar.click();

    await verificarErrorEnCampo(form.resolucion, 'Resolución', /ANCHOxALTO/, false);
    await verificarErrorEnCampo(form.fps, 'FPS', /entre 1 y 60/, false);
    await verificarErrorEnCampo(form.cobertura, 'Área de cobertura', /mayor a 0/, false);
    expect(intentos, 'La validación del cliente debe bloquear el envío').toHaveLength(0);
    await escanear(page, 'error-camara-cliente', testInfo);
  });

  test('4. HTTP 400 del backend en un campo de cámara (simulado) - error en el campo correspondiente', async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'Datos simulados', description: '400 VAL_ENTRADA con fields resolucion / fps / area_cobertura_m2 inyectados (error_code y mensajes a confirmar); no se crea ningún dispositivo.' });
    await abrirDispositivosDelArea(page);
    const form = await abrirFormulario(page);
    await llenarCamara(form, 'QA-TCDIS55-002');
    const campos = { resolucion: form.resolucion, fps: form.fps, area_cobertura_m2: form.cobertura };

    for (const [i, e] of ERRORES_400.entries()) {
      fijarModo({ tipo: 'simular', status: 400, cuerpo: e.cuerpo });
      await form.registrar.click();
      await expect.poll(() => intentos.length).toBe(i + 1);
      await verificarErrorDelBackend(form.dialogo, campos[e.campo], e.campo, e.mensaje);
      if (i === 0) await escanear(page, 'error-400-campo-camara', testInfo);
      // Corregir el campo para el siguiente envío (el error del campo se limpia al editar)
      await campos[e.campo].fill(campos[e.campo] === form.resolucion ? '1280x720' : '30');
    }
  });

  test('4. HTTP 409 real - serial duplicado anunciado en el campo', async ({ page }, testInfo) => {
    await abrirDispositivosDelArea(page);
    await expect(page.locator('table tbody tr').filter({ hasText: SERIAL_EXISTENTE }), `Precondición: "${SERIAL_EXISTENTE}" debe existir para que el POST sea un duplicado (si no, no se envía)`).toHaveCount(1);
    const form = await abrirFormulario(page);
    await form.serial.fill(SERIAL_EXISTENTE);
    await form.tipo.selectOption({ label: TIPO_SENSOR });
    if (await form.gateway.count()) await form.gateway.selectOption({ index: 0 });
    await form.descripcion.fill('Prueba QA serial duplicado');
    fijarModo({ tipo: 'redirigir', cuerpo: (enviado) => enviado });
    testInfo.annotations.push({ type: 'Petición real', description: `POST con el serial existente "${SERIAL_EXISTENTE}": el backend lo rechaza sin crear nada.` });

    const alta = page.waitForResponse((r) => r.request().method() === 'POST' && RUTA_DISPOSITIVOS.test(new URL(r.url()).pathname));
    await form.registrar.click();
    const respuesta = await alta;
    testInfo.annotations.push({ type: 'Respuesta real', description: `${respuesta.status()} ${await respuesta.text()}` });
    expect(respuesta.status(), 'El backend debe responder 409 al serial duplicado').toBe(409);

    await verificarErrorDelBackend(form.dialogo, form.serial, 'Serial', /Ya existe un dispositivo con este serial/);
    await escanear(page, 'error-409-serial', testInfo);
  });

  test('4. HTTP 422 real - tipo de dispositivo inexistente, anunciado', async ({ page }, testInfo) => {
    await abrirDispositivosDelArea(page);
    const form = await abrirFormulario(page);
    await llenarCamara(form, 'QA-TCDIS55-003');
    // Redirigido: tipo inexistente + serial existente (no se puede crear nada aunque faltara una validación)
    fijarModo({ tipo: 'redirigir', cuerpo: (enviado) => ({ ...enviado, id_tipo_dispositivo: 999999, serial: SERIAL_EXISTENTE }) });
    testInfo.annotations.push({ type: 'Petición redirigida', description: `POST con id_tipo_dispositivo 999999 y el serial existente "${SERIAL_EXISTENTE}": respuesta real del backend, sin crear nada.` });

    const alta = page.waitForResponse((r) => r.request().method() === 'POST' && RUTA_DISPOSITIVOS.test(new URL(r.url()).pathname));
    await form.registrar.click();
    const respuesta = await alta;
    const cuerpo = await respuesta.json();
    testInfo.annotations.push({ type: 'Respuesta real', description: `${respuesta.status()} ${JSON.stringify(cuerpo)}` });
    expect(respuesta.status()).toBe(422);
    expect(cuerpo.error_code).toBe('TIPO_DISPOSITIVO_NO_ENCONTRADO');

    await expect(form.dialogo, 'El modal sigue abierto para corregir').toBeVisible();
    await verificarErrorDelBackend(form.dialogo, form.tipo, 'Tipo de dispositivo', /tipo de dispositivo indicado no existe/);
    await escanear(page, 'error-422-tipo-inexistente', testInfo);
  });

  test('4. HTTP 422 - área inactiva (respuesta real inyectada), anunciado', async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'Respuesta inyectada', description: '422 AREA_NO_DISPONIBLE real del backend TEST (2026-09-28): el Paso 2 solo ofrece áreas activas.' });
    await abrirDispositivosDelArea(page);
    const form = await abrirFormulario(page);
    await llenarCamara(form, 'QA-TCDIS55-004');
    fijarModo({ tipo: 'simular', status: 422, cuerpo: ERROR_422_AREA });
    await form.registrar.click();

    const alerta = form.dialogo.getByRole('alert').filter({ hasText: 'área productiva seleccionada está desactivada' });
    await expect(alerta, 'DEFECTO: 3.3.1: el 422 de área inactiva debe anunciarse').toBeVisible();
    await expect(form.dialogo, 'El modal debe seguir abierto').toBeVisible();
    await escanear(page, 'error-422-area-inactiva', testInfo);
  });

  test('5. Teclado - selección de área con Tab/Enter y tipo de cámara con flechas', async ({ page }) => {
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

    // Tipo de dispositivo: con flechas se llega a CAMARA_VISION y aparecen los campos, alcanzables con Tab
    const form = await abrirFormulario(page);
    await form.tipo.focus();
    await page.keyboard.press('ArrowDown');
    await expect(form.tipo.locator('option:checked')).toHaveText(TIPO_CAMARA);
    await expect(form.resolucion).toBeVisible();
    for (let i = 0; i < 6 && !(await form.resolucion.evaluate((el) => el === document.activeElement)); i++) {
      await page.keyboard.press('Tab');
    }
    await expect(form.resolucion, 'Tab debe alcanzar "Resolución" tras elegir el tipo').toBeFocused();
    await page.keyboard.press('Tab');
    await expect(form.fps, 'Tab pasa de "Resolución" a "FPS"').toBeFocused();
    await page.keyboard.press('Tab');
    await expect(form.cobertura, 'Tab pasa de "FPS" a "Área de cobertura"').toBeFocused();
    expect(intentos, 'Operar el formulario con teclado no lo envía').toHaveLength(0);
  });
});
