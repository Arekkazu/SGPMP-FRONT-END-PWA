/**
 * TC-DIS-137 — Accesibilidad WCAG 2.1 AA del formulario de Asociación de Sensores IoT al activo
 * RF-49 · CU-11 Asociar Sensores IoT al Activo · Rol: Administrador
 * Activos biológicos → ficha del activo → pestaña "Sensores" → "Asociar sensor"
 *
 * Herramientas: @axe-core/playwright (reporte axe-<TC>.html/json) + Lighthouse en
 * modo snapshot sobre la misma sesión (lighthouse-<TC>-<paso>-<viewport>.html/json),
 * ambos en ./resultados.
 *
 * Datos: lote #296 (ACTIVO) en "Corral QA JE Origen" (#48).
 *
 * PROTECCIÓN DE DATOS: una asociación creada es un registro real, así que todo
 * POST /activos-biologicos/{id}/sensores se intercepta y por defecto se aborta:
 *   - Reales, REDIRIGIENDO la petición a casos que el backend rechaza sin crear nada:
 *     404 SENSOR_NO_ENCONTRADO, 422 ACTIVO_NO_ENCONTRADO y 400 VAL_ENTRADA.
 *   - SIMULADOS con el formato estándar del backend: 201 con advertencia de dispositivo
 *     desconectado, 201 sin advertencia (estado ACTIVA), 422 de incompatibilidad espacial
 *     (sensor en otra infraestructura) y 409 (asociación duplicada). Probarlos real exige
 *     que el backend acepte o evalúe una asociación válida. error_code a confirmar.
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
const ID_ACTIVO = 296;
const ID_INFRAESTRUCTURA = 48;

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_137_VIEWPORTS ?? 'movil,tablet,escritorio')
  .split(',')
  .map((v) => v.trim());

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const URL_SENSORES = (url: URL) => /\/activos-biologicos\/\d+\/sensores$/.test(url.pathname);

const cuerpo = (o: Record<string, unknown> = {}) => ({
  tipo_activo: 'LOTE', tipo_asociacion: 'POBLACIONAL', dispositivo_iot_id: 999999, sensor_id: 999999,
  id_infraestructura: ID_INFRAESTRUCTURA, fecha_inicio: null, motivo: 'QA TC-DIS-137 sondeo', ...o,
});

// SIMULADOS con el formato estándar del backend
const ASOCIACION = {
  id_asociacion: 999001, id_activo_biologico: ID_ACTIVO, sensor_id: 12, dispositivo_iot_id: 5,
  id_infraestructura: ID_INFRAESTRUCTURA, tipo_activo: 'LOTE', tipo_asociacion: 'POBLACIONAL',
  estado_asociacion: 'ACTIVA', fecha_inicio: '2026-09-30T00:00:00Z', fecha_fin: null,
};
const EXITO_CON_ADVERTENCIA = {
  ...ASOCIACION,
  advertencia: 'El dispositivo IoT #5 está desconectado (última transmisión hace más de 24 h). La asociación se registró, pero no recibirá lecturas hasta que el dispositivo se reconecte.',
};
const EXITO_SIN_ADVERTENCIA = { ...ASOCIACION, advertencia: null };
const ERROR_422_ESPACIAL = {
  error_code: 'INCOMPATIBILIDAD_ESPACIAL',
  message: 'El sensor #12 pertenece a la infraestructura #51 y el activo está en la infraestructura #48. Solo se pueden asociar sensores de la misma infraestructura productiva.',
  fields: [{ field: 'sensor_id', message: 'El sensor no pertenece a la infraestructura del activo.' }],
};
const ERROR_409 = {
  error_code: 'ASOCIACION_DUPLICADA',
  message: 'El sensor #12 ya tiene una asociación ACTIVA con el activo #296.',
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
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill(ADMIN_EMAIL);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 });
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
  // Esperar la ficha: la infraestructura del activo se precarga en el formulario al abrirlo
  await expect(page.getByText('Corral QA JE Origen').first()).toBeVisible({ timeout: 20_000 });
  await secciones.getByRole('button', { name: 'Sensores', exact: true }).click();
  await expect(botonAbrir(page)).toBeEnabled({ timeout: 20_000 });
}

async function abrirFormulario(page: Page) {
  await botonAbrir(page).click();
  await expect(dialogo(page)).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

function campos(page: Page) {
  const d = dialogo(page);
  return {
    tipoActivo: d.getByLabel(/Tipo de activo/),
    tipoAsociacion: d.getByLabel(/Tipo de asociación/),
    dispositivo: d.getByLabel(/dispositivo IoT/i),
    sensor: d.getByLabel(/ID sensor/i),
    infraestructura: d.getByLabel(/infraestructura/i),
    asociar: d.getByRole('button', { name: 'Asociar sensor', exact: true }),
  };
}

async function llenarValido(page: Page) {
  const c = campos(page);
  await c.dispositivo.fill('5');
  await c.sensor.fill('12');
  await c.infraestructura.fill(String(ID_INFRAESTRUCTURA));
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

// ── Casos ────────────────────────────────────────────────────────────────────

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Asociación de sensores IoT (RF-49)`, () => {
  // Modo por defecto (no serial): un paso con violaciones no debe impedir evaluar los demás.
  // workers: 1 en el config, así que los logins siguen siendo secuenciales.
  test.describe.configure({ timeout: 180_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!VIEWPORTS_HABILITADOS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_137_VIEWPORTS.`);
    expect(ADMIN_EMAIL, 'Falta TEST_ADMIN_EMAIL en testing/.env.test').not.toBe('');
    expect(ADMIN_PASSWORD, 'Falta TEST_ADMIN_PASSWORD en testing/.env.test').not.toBe('');
    await iniciarSesionAdmin(page);
  });

  test('1-2. Formulario - 0 violaciones axe, labels 1.3.1 y selects de dispositivo/sensor 4.1.2', async ({ page }, testInfo) => {
    await protegerAsociacion(page);
    await abrirPestanaSensores(page);
    await abrirFormulario(page);
    const c = campos(page);

    // 1.3.1: labels de dispositivo_iot_id / sensor_id / id_infraestructura / tipo_asociacion
    for (const [campo, nombre] of [[c.dispositivo, 'dispositivo_iot_id'], [c.sensor, 'sensor_id'], [c.infraestructura, 'id_infraestructura'], [c.tipoAsociacion, 'tipo_asociacion']] as const) {
      await expect(campo, `1.3.1: ${nombre} debe tener label asociado`).toBeVisible();
    }
    await expect(c.infraestructura, 'La infraestructura del activo viene precargada').toHaveValue(String(ID_INFRAESTRUCTURA));

    // 4.1.2: dispositivo y sensor deben ser selects (lista de opciones con name/role/value)
    const roles = {
      dispositivo: await c.dispositivo.evaluate((e) => e.getAttribute('role') ?? (e.tagName === 'SELECT' ? 'combobox' : `${e.tagName.toLowerCase()}[${(e as HTMLInputElement).type}]`)),
      sensor: await c.sensor.evaluate((e) => e.getAttribute('role') ?? (e.tagName === 'SELECT' ? 'combobox' : `${e.tagName.toLowerCase()}[${(e as HTMLInputElement).type}]`)),
    };
    testInfo.annotations.push({ type: 'Controles de dispositivo/sensor', description: `dispositivo: ${roles.dispositivo} · sensor: ${roles.sensor}` });
    expect.soft(roles.dispositivo, '4.1.2: el dispositivo IoT se pide como ID numérico escrito a mano, no como select de dispositivos disponibles').toBe('combobox');
    expect.soft(roles.sensor, '4.1.2: el sensor se pide como ID numérico escrito a mano, no como select de sensores de la infraestructura').toBe('combobox');

    // Foco al abrir el diálogo (2.4.3)
    const foco = await descripcionFoco(page);
    expect.soft(foco.dentroDelDialogo, `2.4.3: al abrir "Asociar sensor IoT" el foco debe moverse al diálogo (queda en ${foco.texto})`).toBe(true);

    await escanear(page, 'formulario', testInfo);
  });

  test('3. Advertencia de dispositivo desconectado (201 con warning) - anunciada vía aria-live', async ({ page }, testInfo) => {
    const { fijarModo } = await protegerAsociacion(page);
    testInfo.annotations.push({ type: 'Datos simulados', description: '201 con advertencia de dispositivo desconectado y 201 sin advertencia (estado ACTIVA) inyectados; no se crea ninguna asociación.' });
    await abrirPestanaSensores(page);

    // 201 con advertencia
    await abrirFormulario(page);
    await llenarValido(page);
    fijarModo({ tipo: 'simular', status: 201, cuerpo: EXITO_CON_ADVERTENCIA });
    await campos(page).asociar.click();
    await expect(dialogo(page)).toBeHidden();
    const advertencia = page.getByRole('alert').filter({ hasText: 'desconectado' });
    await expect(advertencia, '3.3.1/4.1.3: la advertencia de dispositivo desconectado debe anunciarse').toBeVisible();
    await expect(advertencia, 'La advertencia debe estar en región viva (aria-live)').toHaveAttribute('aria-live', /assertive|polite/);
    await expect(advertencia, 'La advertencia no debe depender solo del ícono: título en texto').toContainText('Asociación creada con advertencia');
    await escanear(page, 'advertencia-desconectado', testInfo);

    // 201 sin advertencia: el estado de la asociación se comunica por texto
    await abrirFormulario(page);
    await llenarValido(page);
    fijarModo({ tipo: 'simular', status: 201, cuerpo: EXITO_SIN_ADVERTENCIA });
    await campos(page).asociar.click();
    await expect(dialogo(page)).toBeHidden();
    await expect(page.getByRole('alert').filter({ hasText: 'Sensor asociado' }), '4.1.2: el estado ACTIVA debe comunicarse por texto').toContainText('Estado: ACTIVA');
  });

  test('4. Errores anunciados: incompatibilidad espacial 422 y 409 (simulados), 404/422/400 reales', async ({ page }, testInfo) => {
    const { fijarModo } = await protegerAsociacion(page);
    testInfo.annotations.push(
      { type: 'Petición redirigida', description: '404 SENSOR_NO_ENCONTRADO, 422 ACTIVO_NO_ENCONTRADO y 400 VAL_ENTRADA: respuestas reales de casos que el backend rechaza sin crear nada.' },
      { type: 'Datos simulados', description: '422 de incompatibilidad espacial y 409 de asociación duplicada (error_code a confirmar con desarrollo).' },
    );
    await abrirPestanaSensores(page);
    await abrirFormulario(page);
    const c = await llenarValido(page);
    const alerta = dialogo(page).getByRole('alert').filter({ hasText: 'No se pudo asociar el sensor' });

    const enviar = async (modo: Modo) => {
      fijarModo(modo);
      const respuesta = page.waitForResponse((r) => URL_SENSORES(new URL(r.url())) && r.request().method() === 'POST');
      await c.asociar.click();
      return (await respuesta).status();
    };

    expect(await enviar({ tipo: 'simular', status: 422, cuerpo: ERROR_422_ESPACIAL })).toBe(422);
    await expect(alerta, '3.3.1: la incompatibilidad espacial (422) debe anunciarse').toContainText('no pertenece a la infraestructura');
    expect.soft(await alerta.innerText(), '3.3.1: con fields, la alerta reemplaza el mensaje principal (infraestructuras #51/#48 del sensor y del activo) por el mensaje del campo').toContain('misma infraestructura');
    await expect.soft(c.sensor, '3.3.1: el 422 trae field sensor_id pero el campo no se marca como inválido').toHaveAttribute('aria-invalid', 'true');
    await escanear(page, 'error-422-espacial', testInfo);

    expect(await enviar({ tipo: 'simular', status: 409, cuerpo: ERROR_409 })).toBe(409);
    await expect(alerta, '3.3.1: la asociación duplicada (409) debe anunciarse').toContainText('ya tiene una asociación ACTIVA');

    expect(await enviar({ tipo: 'redirigir', idActivo: ID_ACTIVO, cuerpo: cuerpo() })).toBe(404);
    await expect(alerta, '3.3.1: 404 SENSOR_NO_ENCONTRADO anunciado').toContainText('No existe un sensor');

    expect(await enviar({ tipo: 'redirigir', idActivo: 999999, cuerpo: cuerpo() })).toBe(422);
    await expect(alerta, '3.3.1: 422 ACTIVO_NO_ENCONTRADO anunciado').toContainText('No existe un activo biológico');

    expect(await enviar({ tipo: 'redirigir', idActivo: ID_ACTIVO, cuerpo: cuerpo({ tipo_asociacion: 'XYZ' }) })).toBe(400);
    await expect(alerta, '3.3.1: 400 VAL_ENTRADA anunciado').toContainText('no es una de las opciones permitidas');
    await expect.soft(c.tipoAsociacion, '3.3.1: el 400 trae field tipo_asociacion pero el select no se marca como inválido').toHaveAttribute('aria-invalid', 'true');
    await escanear(page, 'error-400-validacion', testInfo);

    // Validación del cliente: campos obligatorios vacíos
    fijarModo({ tipo: 'abortar' });
    await c.dispositivo.fill('');
    await c.sensor.fill('');
    await c.asociar.click();
    await expect(dialogo(page).getByRole('alert').filter({ hasText: /dispositivo es obligatorio/i }), '3.3.1: dispositivo faltante anunciado').toBeVisible();
    await expect(dialogo(page).getByRole('alert').filter({ hasText: /sensor es obligatorio/i }), '3.3.1: sensor faltante anunciado').toBeVisible();
    await expect(c.dispositivo).toHaveAttribute('aria-invalid', 'true');
  });

  test('5. Teclado - dispositivo/sensor operables con Tab/flechas y Enter envía igual que el clic', async ({ page }, testInfo) => {
    const { fijarModo, intentos } = await protegerAsociacion(page);
    fijarModo({ tipo: 'simular', status: 422, cuerpo: ERROR_422_ESPACIAL }); // el formulario queda abierto
    await abrirPestanaSensores(page);

    await botonAbrir(page).focus();
    await page.keyboard.press('Enter');
    await expect(dialogo(page), '2.1.1: el formulario debe abrirse con Enter').toBeVisible();
    const c = campos(page);

    // Tab hasta el dispositivo
    const recorrido: string[] = [];
    for (let i = 0; i < 25 && !(await c.dispositivo.evaluate((e) => e === document.activeElement)); i++) {
      await page.keyboard.press('Tab');
      const f = await descripcionFoco(page);
      recorrido.push(`${f.texto}${f.dentroDelDialogo ? '' : ' (fuera)'}`);
    }
    testInfo.annotations.push({ type: 'Recorrido de Tab hasta el dispositivo', description: recorrido.join(' → ') });
    await expect(c.dispositivo, '2.1.1: el dispositivo debe alcanzarse con Tab').toBeFocused();
    expect.soft(recorrido.filter((f) => f.endsWith('(fuera)')).length, '2.4.3: el foco recorre la página de fondo antes de llegar al formulario (el diálogo no recibe el foco)').toBe(0);

    // Flechas: en un input numérico solo incrementan el número (no hay lista de dispositivos)
    await page.keyboard.press('ArrowUp');
    await expect(c.dispositivo, '2.1.1: el campo responde a las flechas').toHaveValue('1');
    await page.keyboard.press('Tab');
    await expect(c.sensor, '2.1.1: el sensor debe alcanzarse con Tab').toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(c.sensor).toHaveValue('1');

    // Enter envía lo mismo que el clic
    await page.keyboard.press('Enter');
    await expect.poll(() => intentos.length, { message: 'Enter en el formulario debe enviarlo' }).toBe(1);
    await c.asociar.click();
    await expect.poll(() => intentos.length, { message: 'El clic en "Asociar sensor" debe enviarlo' }).toBe(2);
    expect(intentos[0], 'Enter debe enviar exactamente lo mismo que el clic').toEqual(intentos[1]);

    await page.keyboard.press('Escape');
    await expect.soft(dialogo(page), '2.1.1: Escape debe cerrar el diálogo').toBeHidden({ timeout: 2_000 });
  });
});
