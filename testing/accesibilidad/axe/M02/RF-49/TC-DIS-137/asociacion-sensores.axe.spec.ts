/**
 * TC-DIS-137 — Accesibilidad WCAG 2.1 AA del formulario de Asociación de Sensores IoT al activo
 * RF-49 v1.2 · CU-11 Asociar Sensores IoT al Activo · Rol: Administrador
 * Activos biológicos → ficha del activo → pestaña "Sensores" → "Asociar sensor"
 *
 * Herramientas: @axe-core/playwright (reporte axe-<TC>.html/json) + Lighthouse en
 * modo snapshot sobre la misma sesión (lighthouse-<TC>-<paso>-<viewport>.html/json),
 * ambos en ./resultados. Una auditoría fallida de Lighthouse es un defecto aunque tenga
 * peso 0 en el puntaje.
 *
 * Cambios del RF v1.2 cubiertos:
 *   - Tipos de asociación DIRECTA / POBLACIONAL en el formulario del activo; la AMBIENTAL
 *     (tipo B) se forma por la infraestructura (RF-22) y ya no se ofrece aquí (#351).
 *   - Dispositivo IoT y sensor se eligen de listas encadenadas (sensores del dispositivo).
 *   - Flujos alternos anunciados: 422 activo en BAJA, 409 fincas distintas, 409 sensor ya
 *     vinculado (con la opción "Reasignar"), 400 incompatibilidad de especie, 201 con
 *     advertencia de dispositivo desconectado y 500 de auditoría (operación revertida).
 *
 * Datos (reejecución sobre la release 1.0.0-rc.46, 2026-10-09): los datos de QA anteriores
 * (#296 en "Corral QA JE Origen", #471 en BAJA) ya no existen en TEST. Se usan el lote #130
 * (ACTIVO) en "Estanque-01" (#1), la misma infraestructura del dispositivo #1
 * "IOT-EST01-HLA-001" con sus sensores reales, y el lote #466 (BAJA) para la salvaguarda.
 *
 * PROTECCIÓN DE DATOS: una asociación creada es un registro real, así que todo
 * POST /activos-biologicos/{id}/sensores se intercepta y por defecto se aborta:
 *   - Reales, REDIRIGIENDO la petición a casos que el backend rechaza sin crear nada:
 *     404 SENSOR_NO_ENCONTRADO, 422 ACTIVO_NO_ENCONTRADO, 400 VAL_ENTRADA y 422 de activo en
 *     BAJA (#466). Salvaguarda: antes de redirigir al #466, GET /activos-biologicos/466 confirma
 *     que sigue en BAJA; si cambió, ese envío no se hace.
 *   - SIMULADOS con el formato estándar del backend y los mensajes del RF: 201 con y sin
 *     advertencia, 409 fincas distintas, 409 sensor ya vinculado, 400 incompatibilidad de
 *     especie y 500 de auditoría. Probarlos real exige que el backend acepte o evalúe una
 *     asociación válida. error_code a confirmar con desarrollo.
 * Fuera de alcance: el ciclo de vida (ACTIVA / INACTIVA / SUPERADA) se consulta en
 * Configuración, no en esta pestaña (la sección lo indica).
 *
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_137_VIEWPORTS=escritorio
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { auditarLighthouse, PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';

const TC_ID = 'TC-DIS-137';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

const API = 'https://api.inmero.co/back-sigab-test';
const ID_ACTIVO = 130;
const ID_INFRAESTRUCTURA = 1;
const INFRAESTRUCTURA = 'Estanque-01';
const ID_EN_BAJA = 466;
const ID_DISPOSITIVO = '1';

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_137_VIEWPORTS ?? 'movil,tablet,escritorio')
  .split(',')
  .map((v) => v.trim());

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const URL_SENSORES = (url: URL) => /\/activos-biologicos\/\d+\/sensores$/.test(url.pathname);
const URL_SENSORES_DISPOSITIVO = (url: URL) => /\/dispositivos-iot\/\d+\/sensores$/.test(url.pathname);

const cuerpo = (o: Record<string, unknown> = {}) => ({
  tipo_activo: 'LOTE', tipo_asociacion: 'POBLACIONAL', dispositivo_iot_id: 999999, sensor_id: 999999,
  id_infraestructura: ID_INFRAESTRUCTURA, fecha_inicio: null, motivo: 'QA TC-DIS-137 sondeo', ...o,
});

// SIMULADOS con el formato estándar del backend y los mensajes del RF-49 v1.2
const ASOCIACION = {
  id_asociacion: 999001, id_activo_biologico: ID_ACTIVO, sensor_id: 3, dispositivo_iot_id: 1,
  id_infraestructura: ID_INFRAESTRUCTURA, tipo_activo: 'LOTE', tipo_asociacion: 'POBLACIONAL',
  estado_asociacion: 'ACTIVA', fecha_inicio: '2026-10-07T00:00:00Z', fecha_fin: null,
};
const EXITO_CON_ADVERTENCIA = {
  ...ASOCIACION,
  advertencia: 'Asociación registrada exitosamente. Advertencia: El dispositivo 1 se encuentra desconectado desde las 08:15:00. Las lecturas podrían no verse reflejadas de inmediato.',
};
const EXITO_SIN_ADVERTENCIA = { ...ASOCIACION, advertencia: null };
const ERROR_409_FINCA = {
  error_code: 'UBICACION_INCOMPATIBLE',
  message: "Error de ubicación. El activo está registrado en 'Finca A' y el sensor en 'Finca B'. La asociación solo es permitida dentro de la misma unidad territorial.",
  fields: [{ field: 'sensor_id', message: '' }],
};
const ERROR_409_VINCULADO = {
  error_code: 'SENSOR_YA_VINCULADO',
  message: "Conflicto de asignación. El sensor 3 ya está vinculado al activo 280. Debe desvincularlo primero o elegir la opción 'Reasignar'.",
  fields: [{ field: 'sensor_id', message: '' }],
};
const ERROR_400_ESPECIE = {
  error_code: 'INCOMPATIBILIDAD_BIOLOGICA',
  message: 'Incompatibilidad biológica. El sensor 3 está parametrizado para Aves, no es compatible con el activo 130 de tipo Bovino.',
  fields: [{ field: 'sensor_id', message: '' }],
};
// El backend repite el mensaje completo en fields[].message (formato real de SERIAL_DUPLICADO,
// AREA_NO_ENCONTRADA y TIPO_DISPOSITIVO_NO_ENCONTRADO)
for (const e of [ERROR_409_FINCA, ERROR_409_VINCULADO, ERROR_400_ESPECIE]) e.fields[0].message = e.message;

const ERROR_500_AUDITORIA = {
  error_code: 'AUDITORIA_NO_DISPONIBLE',
  message: 'Fallo crítico de seguridad. No se pudo generar el registro de auditoría obligatorio. La operación ha sido revertida por integridad de datos.',
  fields: [],
};

test.use({ launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

// ── Protección del POST de asociación ────────────────────────────────────────

type Modo =
  | { tipo: 'abortar' }
  | { tipo: 'redirigir'; idActivo: number; cuerpo: Record<string, unknown> }
  | { tipo: 'simular'; status: number; cuerpo: unknown };

async function protegerAsociacion(page: Page) {
  let modo: Modo = { tipo: 'abortar' };
  const intentos: unknown[] = [];
  await page.route(URL_SENSORES, (r) => {
    if (r.request().method() !== 'POST') return r.continue();
    intentos.push(r.request().postDataJSON());
    if (modo.tipo === 'redirigir') {
      return r.continue({ url: `${API}/activos-biologicos/${modo.idActivo}/sensores`, postData: JSON.stringify(modo.cuerpo) });
    }
    if (modo.tipo === 'simular') {
      return r.fulfill({ status: modo.status, contentType: 'application/json', body: JSON.stringify(modo.cuerpo) });
    }
    return r.abort();
  });
  return { fijarModo: (m: Modo) => { modo = m; }, intentos };
}

// ── Navegación ───────────────────────────────────────────────────────────────

async function iniciarSesionAdmin(page: Page) {
  // Solo JWT de respuestas exitosas del backend (tras una recarga puede haber 401 con el token anterior)
  let token = '';
  page.on('response', (res) => {
    const h = res.request().headers()['authorization'];
    if (h && res.ok() && res.url().startsWith(API)) token = h;
  });
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill(ADMIN_EMAIL);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 });
  return () => token;
}

/** Salvaguarda de la redirección: el activo destino debe seguir en el estado esperado. */
async function verificarEstado(page: Page, token: () => string, idActivo: number, esperado: string) {
  await expect.poll(() => token(), { message: 'No se capturó el JWT de la sesión' }).not.toBe('');
  const res = await page.request.get(`${API}/activos-biologicos/${idActivo}`, { headers: { authorization: token() } });
  expect(res.status(), `GET /activos-biologicos/${idActivo} debe responder 200`).toBe(200);
  const estado = String((await res.json()).nombre_estado ?? '').toUpperCase();
  expect(estado, `Precondición: el activo #${idActivo} debe seguir en ${esperado}; si cambió, el envío redirigido podría crear una asociación real y no se hace`).toBe(esperado);
}

function dialogo(page: Page): Locator {
  return page.getByRole('dialog', { name: 'Asociar sensor IoT' });
}

function botonAbrir(page: Page): Locator {
  return page.getByRole('button', { name: 'Asociar sensor', exact: true }).first();
}

async function abrirPestanaSensores(page: Page) {
  await page.goto(`/activos-biologicos/${ID_ACTIVO}`);
  const secciones = page.getByRole('navigation', { name: 'Secciones del activo' });
  await expect(secciones).toBeVisible({ timeout: 20_000 });
  // Esperar la ficha: la infraestructura del activo se pasa al formulario al abrirlo
  await expect(page.getByText(INFRAESTRUCTURA).first()).toBeVisible({ timeout: 20_000 });
  await secciones.getByRole('button', { name: 'Sensores', exact: true }).click();
  await expect(botonAbrir(page)).toBeEnabled({ timeout: 20_000 });
}

function campos(page: Page) {
  const d = dialogo(page);
  return {
    tipoActivo: d.getByRole('combobox', { name: /Tipo de activo/ }),
    tipoAsociacion: d.getByRole('combobox', { name: /Tipo de asociación/ }),
    dispositivo: d.getByRole('combobox', { name: /Dispositivo IoT/ }),
    sensor: d.getByRole('combobox', { name: /^Sensor/ }),
    fecha: d.getByLabel(/Fecha de inicio/),
    motivo: d.getByRole('textbox', { name: /Motivo/ }),
    asociar: d.getByRole('button', { name: 'Asociar sensor', exact: true }),
  };
}

async function abrirFormulario(page: Page) {
  await botonAbrir(page).click();
  await expect(dialogo(page)).toBeVisible();
  await expect(campos(page).dispositivo.locator(`option[value="${ID_DISPOSITIVO}"]`), `Precondición: el dispositivo #${ID_DISPOSITIVO} debe estar en la lista`).toBeAttached({ timeout: 20_000 });
  await page.evaluate(() => document.fonts.ready);
}

/** Elige el dispositivo y espera la lista de sus sensores. */
async function elegirDispositivo(page: Page) {
  const c = campos(page);
  const sensores = page.waitForResponse((r) => URL_SENSORES_DISPOSITIVO(new URL(r.url())));
  await c.dispositivo.selectOption(ID_DISPOSITIVO);
  expect((await sensores).status(), 'Los sensores del dispositivo deben cargar').toBe(200);
  await expect(c.sensor).toBeEnabled();
  await expect(c.sensor.locator('option:not([value=""])').first(), 'Precondición: el dispositivo debe tener sensores activos').toBeAttached();
}

async function llenarValido(page: Page) {
  const c = campos(page);
  await elegirDispositivo(page);
  await c.sensor.selectOption({ index: 1 });
  return c;
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

function descripcionFoco(page: Page) {
  return page.evaluate(() => {
    const e = document.activeElement as HTMLElement | null;
    if (!e) return { dentroDelDialogo: false, texto: 'ninguno' };
    return {
      dentroDelDialogo: !!e.closest('[role="dialog"],[role="alertdialog"]'),
      texto: `${e.tagName}${e.id ? `#${e.id}` : ''} "${(e.getAttribute('aria-label') ?? e.textContent ?? '').trim().slice(0, 30)}"`,
    };
  });
}

/** 3.3.1: el campo con error se marca inválido, referencia su mensaje y el mensaje no se repite en la alerta global. */
async function verificarErrorDeCampo(page: Page, campo: Locator, mensaje: string, alertaGlobal: Locator, caso: string) {
  await expect.soft(campo, `DEFECTO: 3.3.1: con el ${caso} el campo debe marcarse como inválido (aria-invalid)`).toHaveAttribute('aria-invalid', 'true');
  const bajoElCampo = dialogo(page).getByRole('alert').filter({ hasText: mensaje }).filter({ hasNotText: 'No se pudo asociar el sensor' });
  await expect.soft(bajoElCampo, `DEFECTO: 3.3.1: el error de campo del ${caso} debe anunciarse debajo del campo`).toHaveCount(1);
  const describedby = await campo.getAttribute('aria-describedby');
  expect.soft(describedby, `DEFECTO: 3.3.1: el campo con error del ${caso} no referencia su mensaje con aria-describedby`).not.toBeNull();
  await expect.soft(
    alertaGlobal.filter({ hasText: mensaje }),
    `DEFECTO: 3.3.1: el error de campo del ${caso} se repite en la alerta global (el lector lo anuncia dos veces)`,
  ).toHaveCount(0);
}

// ── Casos ────────────────────────────────────────────────────────────────────

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Asociación de sensores IoT (RF-49)`, () => {
  // Modo por defecto (no serial): un paso con violaciones no debe impedir evaluar los demás.
  // workers: 1 en el config, así que los logins siguen siendo secuenciales.
  test.describe.configure({ timeout: 180_000 });

  let token: () => string = () => '';

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!VIEWPORTS_HABILITADOS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_137_VIEWPORTS.`);
    expect(ADMIN_EMAIL, 'Falta TEST_ADMIN_EMAIL en testing/.env.test').not.toBe('');
    expect(ADMIN_PASSWORD, 'Falta TEST_ADMIN_PASSWORD en testing/.env.test').not.toBe('');
    token = await iniciarSesionAdmin(page);
  });

  test('1-2. Formulario - 0 violaciones axe, labels 1.3.1, tipos y listas encadenadas 4.1.2', async ({ page }, testInfo) => {
    await protegerAsociacion(page);
    await abrirPestanaSensores(page);
    await abrirFormulario(page);
    const c = campos(page);

    // Foco al abrir el diálogo (2.4.3)
    const foco = await descripcionFoco(page);
    expect.soft(foco.dentroDelDialogo, `DEFECTO: 2.4.3: al abrir "Asociar sensor IoT" el foco debe moverse al diálogo (queda en ${foco.texto})`).toBe(true);

    // 1.3.1: todos los campos con nombre accesible por su label
    for (const [campo, nombre] of [[c.tipoActivo, 'tipo_activo'], [c.tipoAsociacion, 'tipo_asociacion'], [c.dispositivo, 'dispositivo_iot_id'], [c.sensor, 'sensor_id'], [c.fecha, 'fecha_inicio'], [c.motivo, 'motivo']] as const) {
      await expect(campo, `DEFECTO: 1.3.1: ${nombre} debe tener label asociado`).toBeVisible();
    }
    // id_infraestructura obligatorio (RF v1.2): se muestra la del activo como texto
    await expect(dialogo(page).getByText(new RegExp(`Infraestructura del activo.*#${ID_INFRAESTRUCTURA}`)), 'La infraestructura del activo debe mostrarse en el formulario').toBeVisible();

    // 4.1.2: tipos de asociación del formulario del activo (AMBIENTAL va por la infraestructura, RF-22)
    const tipos = await c.tipoAsociacion.locator('option').evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value));
    testInfo.annotations.push({ type: 'Tipos de asociación ofrecidos', description: tipos.join(' · ') });
    expect(tipos, 'El formulario del activo ofrece DIRECTA y POBLACIONAL').toEqual(['DIRECTA', 'POBLACIONAL']);
    await expect(c.tipoAsociacion, '4.1.2: un lote se asocia como POBLACIONAL por defecto').toHaveValue('POBLACIONAL');
    await expect(c.tipoActivo).toHaveValue('LOTE');

    // 4.1.2: dispositivo y sensor son listas; el sensor depende del dispositivo
    await expect(c.sensor, '4.1.2: el sensor está deshabilitado hasta elegir el dispositivo').toBeDisabled();
    await elegirDispositivo(page);
    await expect(c.dispositivo, '4.1.2: el value refleja el dispositivo elegido').toHaveValue(ID_DISPOSITIVO);
    const sensores = await c.sensor.locator('option:not([value=""])').allInnerTexts();
    testInfo.annotations.push({ type: 'Sensores del dispositivo', description: sensores.join(' · ') });
    await c.sensor.selectOption({ index: 1 });
    await expect(c.sensor, '4.1.2: el value refleja el sensor elegido').not.toHaveValue('');

    // 3.3.2: requeridos expuestos
    for (const [campo, nombre] of [[c.dispositivo, 'Dispositivo IoT'], [c.sensor, 'Sensor']] as const) {
      await expect.soft(campo, `DEFECTO: 3.3.2: "${nombre}" es obligatorio (asterisco) pero no se expone como requerido`).toHaveAttribute('aria-required', 'true');
    }

    await escanear(page, 'formulario', testInfo);
  });

  test('3. Éxito: advertencia de dispositivo desconectado (201 con warning) y estado ACTIVA - anunciados', async ({ page }, testInfo) => {
    const { fijarModo } = await protegerAsociacion(page);
    testInfo.annotations.push({ type: 'Datos simulados', description: '201 con advertencia de dispositivo desconectado (mensaje del RF v1.2) y 201 sin advertencia; no se crea ninguna asociación.' });
    await abrirPestanaSensores(page);

    // 201 con advertencia
    await abrirFormulario(page);
    await llenarValido(page);
    fijarModo({ tipo: 'simular', status: 201, cuerpo: EXITO_CON_ADVERTENCIA });
    await campos(page).asociar.click();
    await expect(dialogo(page)).toBeHidden();
    const advertencia = page.getByRole('alert').filter({ hasText: 'desconectado' });
    await expect(advertencia, 'DEFECTO: 3.3.1/4.1.3: la advertencia de dispositivo desconectado debe anunciarse').toBeVisible();
    await expect(advertencia, 'DEFECTO: 4.1.3: la advertencia debe estar en región viva (aria-live)').toHaveAttribute('aria-live', /assertive|polite/);
    await expect(advertencia, 'DEFECTO: 1.4.1: la advertencia no debe depender solo del ícono/color: título en texto').toContainText('Asociación creada con advertencia');
    await escanear(page, 'advertencia-desconectado', testInfo);

    // 201 sin advertencia: el estado de la asociación se comunica por texto
    await abrirFormulario(page);
    await llenarValido(page);
    fijarModo({ tipo: 'simular', status: 201, cuerpo: EXITO_SIN_ADVERTENCIA });
    await campos(page).asociar.click();
    await expect(dialogo(page)).toBeHidden();
    await expect(page.getByRole('alert').filter({ hasText: 'Sensor asociado' }), 'DEFECTO: 4.1.2: el estado ACTIVA debe comunicarse por texto').toContainText('Estado: ACTIVA');
  });

  test('4. Errores del RF v1.2 anunciados: BAJA, fincas distintas, sensor vinculado, especie, auditoría y reales', async ({ page }, testInfo) => {
    const { fijarModo } = await protegerAsociacion(page);
    testInfo.annotations.push(
      { type: 'Petición redirigida', description: '404 SENSOR_NO_ENCONTRADO, 422 ACTIVO_NO_ENCONTRADO, 400 VAL_ENTRADA y 422 de activo en BAJA (#466): respuestas reales de casos que el backend rechaza sin crear nada.' },
      { type: 'Datos simulados', description: '409 fincas distintas, 409 sensor ya vinculado, 400 incompatibilidad de especie y 500 de auditoría con los mensajes del RF v1.2 (error_code a confirmar con desarrollo).' },
    );
    await abrirPestanaSensores(page);
    await abrirFormulario(page);
    const c = await llenarValido(page);
    const alerta = dialogo(page).getByRole('alert').filter({ hasText: 'No se pudo asociar el sensor' });
    // Desde rc.46 un error con field se anuncia debajo de su campo y no en la alerta general
    const anunciado = dialogo(page).getByRole('alert');

    const enviar = async (modo: Modo) => {
      fijarModo(modo);
      const respuesta = page.waitForResponse((r) => URL_SENSORES(new URL(r.url())) && r.request().method() === 'POST');
      await c.asociar.click();
      return (await respuesta).status();
    };

    // 409 fincas distintas (simulado)
    expect(await enviar({ tipo: 'simular', status: 409, cuerpo: ERROR_409_FINCA })).toBe(409);
    await expect.soft(anunciado.filter({ hasText: 'misma unidad territorial' }), 'DEFECTO: 3.3.1: el conflicto de ubicación (fincas distintas) debe anunciarse').toHaveCount(1);
    await verificarErrorDeCampo(page, c.sensor, ERROR_409_FINCA.fields[0].message, alerta, '409 de fincas distintas');
    await escanear(page, 'error-409-finca', testInfo);

    // 409 sensor ya vinculado (simulado): debe ofrecer la salida "Reasignar"
    expect(await enviar({ tipo: 'simular', status: 409, cuerpo: ERROR_409_VINCULADO })).toBe(409);
    await expect.soft(anunciado.filter({ hasText: 'ya está vinculado al activo' }), 'DEFECTO: 3.3.1: el sensor ya vinculado debe anunciarse').toHaveCount(1);
    await expect.soft(anunciado.filter({ hasText: 'Reasignar' }), 'DEFECTO: 3.3.3: el mensaje debe indicar cómo resolverlo (desvincular o "Reasignar")').toHaveCount(1);
    await verificarErrorDeCampo(page, c.sensor, ERROR_409_VINCULADO.fields[0].message, alerta, '409 de sensor ya vinculado');

    // 400 incompatibilidad de especie (simulado)
    expect(await enviar({ tipo: 'simular', status: 400, cuerpo: ERROR_400_ESPECIE })).toBe(400);
    await expect.soft(anunciado.filter({ hasText: 'Incompatibilidad biológica' }), 'DEFECTO: 3.3.1: la incompatibilidad biológica debe anunciarse').toHaveCount(1);
    await verificarErrorDeCampo(page, c.sensor, ERROR_400_ESPECIE.fields[0].message, alerta, '400 de incompatibilidad de especie');
    await escanear(page, 'error-400-especie', testInfo);

    // 500 de auditoría (simulado): mensaje del RF, no genérico
    expect(await enviar({ tipo: 'simular', status: 500, cuerpo: ERROR_500_AUDITORIA })).toBe(500);
    await expect(alerta, 'DEFECTO: 3.3.1: el fallo de auditoría debe anunciarse indicando que la operación se revirtió').toContainText('revertida');

    // Reales
    expect(await enviar({ tipo: 'redirigir', idActivo: ID_ACTIVO, cuerpo: cuerpo() })).toBe(404);
    await expect(alerta, 'DEFECTO: 3.3.1: 404 SENSOR_NO_ENCONTRADO anunciado').toContainText('No existe un sensor');

    expect(await enviar({ tipo: 'redirigir', idActivo: 999999, cuerpo: cuerpo() })).toBe(422);
    await expect(alerta, 'DEFECTO: 3.3.1: 422 ACTIVO_NO_ENCONTRADO anunciado').toContainText('No existe un activo biológico');

    await verificarEstado(page, token, ID_EN_BAJA, 'BAJA');
    const sensorReal = Number(await c.sensor.inputValue());
    const estadoBaja = await enviar({ tipo: 'redirigir', idActivo: ID_EN_BAJA, cuerpo: cuerpo({ dispositivo_iot_id: Number(ID_DISPOSITIVO), sensor_id: sensorReal }) });
    testInfo.annotations.push({ type: `Activo en BAJA (#${ID_EN_BAJA})`, description: `HTTP ${estadoBaja}: ${(await alerta.innerText()).replace(/\s+/g, ' ')}` });
    expect(estadoBaja, 'El backend debe rechazar la asociación a un activo en BAJA con 422').toBe(422);
    await expect(alerta, 'DEFECTO: 3.3.1: el rechazo por activo en BAJA debe anunciarse').toContainText(/BAJA/i);

    expect(await enviar({ tipo: 'redirigir', idActivo: ID_ACTIVO, cuerpo: cuerpo({ tipo_asociacion: 'XYZ' }) })).toBe(400);
    await expect(anunciado.filter({ hasText: 'no es una de las opciones permitidas' }), 'DEFECTO: 3.3.1: 400 VAL_ENTRADA anunciado').toHaveCount(1);
    await expect.soft(c.tipoAsociacion, 'DEFECTO: 3.3.1: el 400 trae field tipo_asociacion pero el select no se marca como inválido').toHaveAttribute('aria-invalid', 'true');

    // Validación del cliente: dispositivo y sensor vacíos
    fijarModo({ tipo: 'abortar' });
    await c.dispositivo.selectOption('');
    await c.asociar.click();
    await expect(dialogo(page).getByRole('alert').filter({ hasText: /dispositivo es obligatorio/i }), 'DEFECTO: 3.3.1: dispositivo faltante anunciado').toBeVisible();
    await expect(dialogo(page).getByRole('alert').filter({ hasText: /sensor es obligatorio/i }), 'DEFECTO: 3.3.1: sensor faltante anunciado').toBeVisible();
    await expect(c.dispositivo).toHaveAttribute('aria-invalid', 'true');
    expect.soft(await c.dispositivo.getAttribute('aria-describedby'), 'DEFECTO: 3.3.1: el select con error no referencia su mensaje con aria-describedby').not.toBeNull();
  });

  test('5. Teclado - listas de dispositivo/sensor con Tab y flechas, Enter envía igual que el clic', async ({ page }, testInfo) => {
    const { fijarModo, intentos } = await protegerAsociacion(page);
    fijarModo({ tipo: 'simular', status: 409, cuerpo: ERROR_409_VINCULADO }); // el formulario queda abierto
    await abrirPestanaSensores(page);

    await botonAbrir(page).focus();
    await page.keyboard.press('Enter');
    await expect(dialogo(page), '2.1.1: el formulario debe abrirse con Enter').toBeVisible();
    const c = campos(page);
    await expect(c.dispositivo.locator(`option[value="${ID_DISPOSITIVO}"]`)).toBeAttached({ timeout: 20_000 });

    // Tab hasta el dispositivo
    const recorrido: string[] = [];
    for (let i = 0; i < 25 && !(await c.dispositivo.evaluate((e) => e === document.activeElement)); i++) {
      await page.keyboard.press('Tab');
      const f = await descripcionFoco(page);
      recorrido.push(`${f.texto}${f.dentroDelDialogo ? '' : ' (fuera)'}`);
    }
    testInfo.annotations.push({ type: 'Recorrido de Tab hasta el dispositivo', description: recorrido.join(' → ') });
    await expect(c.dispositivo, 'DEFECTO: 2.1.1: el dispositivo debe alcanzarse con Tab').toBeFocused();
    expect.soft(recorrido.filter((f) => f.endsWith('(fuera)')).length, 'DEFECTO: 2.4.3: el foco recorre la página de fondo antes de llegar al formulario').toBe(0);

    // Flechas: elige el primer dispositivo y carga sus sensores
    const primero = await c.dispositivo.locator('option:not([value=""])').first().getAttribute('value');
    const sensores = page.waitForResponse((r) => URL_SENSORES_DISPOSITIVO(new URL(r.url())));
    await page.keyboard.press('ArrowDown');
    await expect(c.dispositivo, 'DEFECTO: 2.1.1: el dispositivo debe elegirse con flechas').toHaveValue(primero ?? '');
    await sensores;
    await expect(c.sensor).toBeEnabled();

    // Si el primer dispositivo no tiene sensores activos, usar el dispositivo de prueba
    if (!(await c.sensor.locator('option:not([value=""])').count())) await elegirDispositivo(page);
    await c.sensor.focus();
    await page.keyboard.press('ArrowDown');
    await expect(c.sensor, 'DEFECTO: 2.1.1: el sensor debe elegirse con flechas').not.toHaveValue('');

    // Enter en un campo de texto envía lo mismo que el clic (en un <select> Enter no envía formularios)
    await c.fecha.focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => intentos.length, { message: 'Enter en el formulario debe enviarlo' }).toBe(1);
    await c.asociar.click();
    await expect.poll(() => intentos.length, { message: 'El clic en "Asociar sensor" debe enviarlo' }).toBe(2);
    expect(intentos[0], 'Enter debe enviar exactamente lo mismo que el clic').toEqual(intentos[1]);

    await page.keyboard.press('Escape');
    await expect.soft(dialogo(page), 'DEFECTO: 2.1.1: Escape debe cerrar el diálogo').toBeHidden({ timeout: 2_000 });
  });
});
