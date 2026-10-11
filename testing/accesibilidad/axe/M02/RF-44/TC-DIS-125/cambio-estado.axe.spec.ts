/**
 * TC-DIS-125 — Accesibilidad WCAG 2.1 AA del formulario de Cambio de Estado del Activo
 * RF-44 · CU-04 Cerrar Ciclo Productivo (formulario de cambio de estado) · Rol: Productor
 * Activos biológicos → ficha del activo → pestaña "Estado" → "Cambiar estado"
 *
 * Herramientas: @axe-core/playwright (reporte axe-<TC>.html/json) + Lighthouse en
 * modo snapshot sobre la misma sesión (lighthouse-<TC>-<paso>-<viewport>.html/json),
 * ambos en ./resultados. Una auditoría fallida de Lighthouse es un defecto aunque tenga
 * peso 0 en el puntaje.
 *
 * Datos (activos del Productor de prueba):
 *   - #296 lote ACTIVO: formulario con transiciones manuales (Inactivo, En tratamiento, Aislado).
 *   - #288 individual CERRADO: estado de transiciones limitadas (solo BAJA, por su endpoint propio).
 *
 * PROTECCIÓN DE DATOS: el cambio de estado es real e irreversible en algunos casos, así que
 * TODO PATCH /activos-biologicos/{id}/estado se intercepta. Por defecto se aborta; los
 * errores del backend se obtienen REDIRIGIENDO la petición del formulario a casos que el
 * backend rechaza sin modificar nada (respuestas reales, no simuladas):
 *   - 422 TRANSICION_INVALIDA: #468 (INACTIVO) → AISLADO (lista las transiciones válidas).
 *   - 400 VAL_ENTRADA: estado_nuevo "XYZ" sobre #471 (BAJA).
 *   - 422 VALIDACIONES_PREVIAS_REQUERIDAS: CERRADO manual sobre #288 (ya CERRADO).
 *   - 404 ACTIVO_NO_ENCONTRADO: activo inexistente.
 * Salvaguarda: antes de redirigir, GET /activos-biologicos/{id} confirma que el destino sigue en
 * el estado esperado (#468 INACTIVO, #288 CERRADO); si cambió, ese envío no se hace (con otro
 * estado la transición podría ser válida y se aplicaría de verdad).
 * La prueba de teclado responde con el 422 real capturado (2026-09-29) sin llegar al backend.
 *
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_125_VIEWPORTS=escritorio
 *
 * ── Reejecución 2026-10-09 ──────────────────────────────────────────────────
 * El script leía TEST_USER_EMAIL (hoy = la cuenta Admin, sin ninguno de estos 4 activos:
 * 404 ACTIVO_NO_ENCONTRADO en los 4) en vez de TEST_PRODUCTOR_EMAIL, la cuenta real dueña
 * de #296/288/468/471. Se corrige a TEST_PRODUCTOR_EMAIL/PASSWORD. Confirmado por curl que
 * los 4 activos existen con el estado exacto que este TC espera.
 *
 * ── Reejecución 2026-10-10 (rc.48) ──────────────────────────────────────────
 * Sin cambios de datos ni de criterio. Un GET previo confirmó otra vez los estados (#296
 * ACTIVO, #288 CERRADO, #468 INACTIVO, #471 BAJA); ningún activo cambia de estado.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page, type Route, type TestInfo } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { auditarLighthouse, PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';

const TC_ID = 'TC-DIS-125';
const USER_EMAIL = process.env.TEST_PRODUCTOR_EMAIL ?? '';
const USER_PASSWORD = process.env.TEST_PRODUCTOR_PASSWORD ?? '';

const API = 'https://api.inmero.co/back-sigab-test';
const ID_ACTIVO = 296; // lote ACTIVO
const ID_CERRADO = 288; // individual CERRADO
const ID_INACTIVO = 468; // lote INACTIVO (destino de la redirección de transición inválida)
const ID_BAJA = 471; // lote BAJA (destino de la redirección de estado inválido)

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_125_VIEWPORTS ?? 'movil,tablet,escritorio')
  .split(',')
  .map((v) => v.trim());

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const URL_ESTADO = (url: URL) => /\/activos-biologicos\/\d+\/estado$/.test(url.pathname);

// Transiciones manuales válidas desde ACTIVO (RF-44): CERRADO y BAJA van por sus endpoints propios
const DESTINOS_DESDE_ACTIVO = ['Inactivo', 'En tratamiento', 'Aislado'];
const HOY = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

// 422 real devuelto por el backend (2026-09-29) al intentar #468 INACTIVO → AISLADO
const ERROR_422_TRANSICION = {
  error_code: 'TRANSICION_INVALIDA',
  message: 'La transición INACTIVO → AISLADO no está permitida. Transiciones válidas desde INACTIVO: ACTIVO, EN_TRATAMIENTO, CERRADO, BAJA.',
  fields: [],
  timestamp: '2026-09-29T20:09:55.914135+00:00',
};

test.use({ launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

// ── Protección del PATCH de cambio de estado ─────────────────────────────────

type ModoPatch =
  | { tipo: 'bloquear' }
  | { tipo: 'redirigir'; idActivo: number; cuerpo: Record<string, string> }
  | { tipo: 'capturar'; cuerpos: unknown[] };

/** Intercepta todo PATCH de estado. Devuelve un setter para cambiar el modo en cada paso. */
async function protegerCambioEstado(page: Page) {
  let modo: ModoPatch = { tipo: 'bloquear' };
  await page.route(URL_ESTADO, (r: Route) => {
    if (r.request().method() !== 'PATCH') return r.continue();
    if (modo.tipo === 'redirigir') {
      return r.continue({ url: `${API}/activos-biologicos/${modo.idActivo}/estado`, postData: JSON.stringify(modo.cuerpo) });
    }
    if (modo.tipo === 'capturar') {
      modo.cuerpos.push(r.request().postDataJSON());
      return r.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify(ERROR_422_TRANSICION) });
    }
    return r.abort();
  });
  return (nuevo: ModoPatch) => { modo = nuevo; };
}

// ── Navegación ───────────────────────────────────────────────────────────────

async function iniciarSesionProductor(page: Page) {
  // Solo JWT de respuestas exitosas del backend (tras una recarga puede haber 401 con el token anterior)
  let token = '';
  page.on('response', (res) => {
    const h = res.request().headers()['authorization'];
    if (h && res.ok() && res.url().startsWith(API)) token = h;
  });
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill(USER_EMAIL);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(USER_PASSWORD);
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
  expect(estado, `Precondición: el activo #${idActivo} debe seguir ${esperado}; si cambió, el envío redirigido podría aplicarse de verdad y no se hace`).toBe(esperado);
}

function dialogo(page: Page): Locator {
  return page.getByRole('dialog', { name: 'Cambiar estado del activo' });
}

/** Ficha del activo → pestaña "Estado". */
async function abrirPestanaEstado(page: Page, idActivo: number) {
  await page.goto(`/activos-biologicos/${idActivo}`);
  const secciones = page.getByRole('navigation', { name: 'Secciones del activo' });
  await expect(secciones).toBeVisible({ timeout: 20_000 });
  await secciones.getByRole('button', { name: 'Estado', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Cambiar estado', exact: true })).toBeVisible({ timeout: 20_000 });
}

async function abrirFormulario(page: Page) {
  await page.getByRole('button', { name: 'Cambiar estado', exact: true }).click();
  await expect(dialogo(page)).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

function campos(page: Page) {
  const d = dialogo(page);
  return {
    estado: d.getByRole('combobox', { name: /Nuevo estado/ }),
    fecha: d.getByLabel(/Fecha del cambio/),
    motivo: d.getByRole('textbox', { name: /Motivo del cambio/ }),
    guardar: d.getByRole('button', { name: 'Cambiar estado', exact: true }),
    cancelar: d.getByRole('button', { name: 'Cancelar', exact: true }),
  };
}

/** Llena el formulario con valores válidos (el envío siempre queda interceptado). */
async function llenarValido(page: Page) {
  const c = campos(page);
  await c.estado.selectOption({ label: 'Inactivo' });
  await c.fecha.fill(HOY);
  await c.motivo.fill('QA TC-DIS-125 (envío interceptado)');
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

/** 3.3.1: el campo con error debe marcarse como inválido y referenciar su mensaje. */
async function verificarCampoConError(campo: Locator, nombre: string) {
  await expect.soft(campo, `DEFECTO: 3.3.1/4.1.2: "${nombre}" con error debe tener aria-invalid="true"`).toHaveAttribute('aria-invalid', 'true');
  const describedby = await campo.getAttribute('aria-describedby');
  expect.soft(describedby, `DEFECTO: 3.3.1: "${nombre}" debe referenciar su mensaje de error con aria-describedby`).not.toBeNull();
}

// ── Casos ────────────────────────────────────────────────────────────────────

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Cambio de estado del activo (RF-44)`, () => {
  // Modo por defecto (no serial): un paso con violaciones no debe impedir evaluar los demás.
  // workers: 1 en el config, así que los logins siguen siendo secuenciales.
  test.describe.configure({ timeout: 180_000 });

  let token: () => string = () => '';

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      !VIEWPORTS_HABILITADOS.includes(testInfo.project.name),
      `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_125_VIEWPORTS.`,
    );
    expect(USER_EMAIL, 'Falta TEST_PRODUCTOR_EMAIL en testing/.env.test').not.toBe('');
    expect(USER_PASSWORD, 'Falta TEST_PRODUCTOR_PASSWORD en testing/.env.test').not.toBe('');
    token = await iniciarSesionProductor(page);
  });

  test('1-2. Formulario (activo ACTIVO) - 0 violaciones axe, labels 1.3.1 y select con transiciones válidas 4.1.2', async ({ page }, testInfo) => {
    await protegerCambioEstado(page);
    await abrirPestanaEstado(page, ID_ACTIVO);
    await abrirFormulario(page);
    const c = campos(page);

    // 1.3.1: los tres campos tienen nombre accesible por su label
    await expect(c.estado, 'DEFECTO: 1.3.1: el select de estado_nuevo debe tener label asociado').toBeVisible();
    await expect(c.fecha, 'DEFECTO: 1.3.1: fecha_cambio_estado debe tener label asociado').toBeVisible();
    await expect(c.motivo, 'DEFECTO: 1.3.1: motivo_cambio debe tener label asociado').toBeVisible();

    // 4.1.2: el select solo ofrece las transiciones manuales válidas desde ACTIVO
    const opciones = await c.estado.locator('option').evaluateAll((os) =>
      os.map((o) => ({ texto: (o.textContent ?? '').trim(), valor: (o as HTMLOptionElement).value, deshabilitada: (o as HTMLOptionElement).disabled })));
    testInfo.annotations.push({ type: 'Opciones de estado_nuevo', description: opciones.map((o) => `${o.texto}${o.deshabilitada ? ' (deshabilitada)' : ''}`).join(' · ') });
    const habilitadas = opciones.filter((o) => o.valor && !o.deshabilitada).map((o) => o.texto);
    expect(habilitadas, 'DEFECTO: 4.1.2: el select debe mostrar solo las transiciones válidas desde ACTIVO').toEqual(DESTINOS_DESDE_ACTIVO);

    // CERRADO y BAJA: si aparecen, deben estar deshabilitadas de forma programática (no solo atenuadas)
    for (const terminal of ['Cerrado', 'Baja']) {
      const op = opciones.find((o) => o.texto === terminal);
      if (op) expect(op.deshabilitada, `DEFECTO: 4.1.2: "${terminal}" aparece en el select pero no está deshabilitada (disabled)`).toBe(true);
    }

    // 4.1.2: estado y valor programáticos del select
    await c.estado.selectOption({ label: 'En tratamiento' });
    await expect(c.estado, 'DEFECTO: 4.1.2: el value del select debe reflejar la opción elegida').toHaveValue('EN_TRATAMIENTO');
    await c.estado.selectOption({ index: 0 });

    // Requeridos: asterisco visual + aria-required (convención del proyecto)
    for (const [campo, nombre] of [[c.estado, 'Nuevo estado'], [c.fecha, 'Fecha del cambio'], [c.motivo, 'Motivo del cambio']] as const) {
      const requerido = await campo.evaluate((e) => e.getAttribute('aria-required') === 'true' || (e as HTMLInputElement).required);
      expect.soft(requerido, `DEFECTO: 3.3.2: "${nombre}" es obligatorio (asterisco visual) pero no se expone como requerido (aria-required/required)`).toBe(true);
    }

    await escanear(page, 'formulario', testInfo);
  });

  test('3. Errores de validación del formulario (estado, motivo y fecha) - anunciados', async ({ page }, testInfo) => {
    await protegerCambioEstado(page);
    await abrirPestanaEstado(page, ID_ACTIVO);
    await abrirFormulario(page);
    const c = campos(page);
    const alertas = dialogo(page).getByRole('alert');

    // Guardar sin estado ni motivo
    await c.guardar.click();
    await expect(alertas.filter({ hasText: /nuevo estado/i }), 'DEFECTO: 3.3.1: el estado_nuevo faltante debe anunciarse').toBeVisible();
    await expect(alertas.filter({ hasText: /motivo/i }), 'DEFECTO: 3.3.1: el motivo_cambio faltante debe anunciarse').toBeVisible();
    await verificarCampoConError(c.estado, 'Nuevo estado');
    await verificarCampoConError(c.motivo, 'Motivo del cambio');
    await escanear(page, 'error-motivo-requerido', testInfo);

    // Motivo solo con espacios
    await c.estado.selectOption({ label: 'Inactivo' });
    await c.motivo.fill('   ');
    await c.guardar.click();
    await expect(alertas.filter({ hasText: /motivo/i }), 'DEFECTO: 3.3.1: el motivo vacío (solo espacios) debe anunciarse').toBeVisible();

    // Fecha futura
    await c.motivo.fill('QA TC-DIS-125 (envío interceptado)');
    await c.fecha.fill('2099-01-01');
    await c.guardar.click();
    await expect(alertas.filter({ hasText: /futura/i }), 'DEFECTO: 3.3.1: la fecha futura debe anunciarse').toBeVisible();
    await verificarCampoConError(c.fecha, 'Fecha del cambio');
    await escanear(page, 'error-fecha-futura', testInfo);
  });

  test('3. Errores del backend (reales, petición redirigida) - anunciados con las transiciones válidas', async ({ page }, testInfo) => {
    const redirigir = await protegerCambioEstado(page);
    testInfo.annotations.push({
      type: 'Petición redirigida',
      description: 'El PATCH del formulario se redirige a casos que el backend rechaza sin modificar datos; las respuestas son reales. Ningún activo cambia de estado.',
    });
    await abrirPestanaEstado(page, ID_ACTIVO);
    const alerta = dialogo(page).getByRole('alert');

    const enviar = async (idActivo: number, cuerpo: Record<string, string>, codigo: number) => {
      redirigir({ tipo: 'redirigir', idActivo, cuerpo });
      await abrirFormulario(page);
      await llenarValido(page);
      const respuesta = page.waitForResponse((r) => URL_ESTADO(new URL(r.url())) && r.request().method() === 'PATCH');
      await campos(page).guardar.click();
      expect((await respuesta).status(), `El backend debe rechazar el caso con ${codigo}`).toBe(codigo);
    };
    const cerrar = async () => {
      await campos(page).cancelar.click();
      await expect(dialogo(page)).toBeHidden();
    };

    // 422 TRANSICION_INVALIDA: debe anunciar el listado de transiciones válidas
    await verificarEstado(page, token, ID_INACTIVO, 'INACTIVO');
    await enviar(ID_INACTIVO, { estado_nuevo: 'AISLADO', fecha_cambio_estado: HOY, motivo_cambio: 'QA TC-DIS-125 sondeo' }, 422);
    await expect(alerta.filter({ hasText: 'Transiciones válidas desde INACTIVO' }), 'DEFECTO: 3.3.1: la transición inválida debe anunciarse con las transiciones válidas').toBeVisible();
    await escanear(page, 'error-transicion-invalida', testInfo);
    await cerrar();

    // 400 VAL_ENTRADA con error de campo en estado_nuevo: debe ir debajo del select
    await enviar(ID_BAJA, { estado_nuevo: 'XYZ', fecha_cambio_estado: HOY, motivo_cambio: 'QA TC-DIS-125 sondeo' }, 400);
    const errorCampo = dialogo(page).locator('#estado-nuevo-err');
    await expect(errorCampo, 'DEFECTO: 3.3.1: el estado inválido debe anunciarse debajo del select').toContainText('Estado inválido');
    await verificarCampoConError(campos(page).estado, 'Nuevo estado (error 400 del backend)');
    // Errores de campo debajo del input, nunca en alerta global: si no, se anuncian dos veces
    await expect.soft(
      alerta.filter({ hasText: 'No se pudo cambiar el estado' }).filter({ hasText: 'Estado inválido' }),
      'DEFECTO: 3.3.1: el error de campo del 400 se repite en la alerta global "No se pudo cambiar el estado" (el lector lo anuncia dos veces; los errores de campo van solo debajo del input)',
    ).toHaveCount(0);
    await escanear(page, 'error-estado-invalido', testInfo);
    await cerrar();

    // 422 VALIDACIONES_PREVIAS_REQUERIDAS: CERRADO no se establece con el cambio manual
    await verificarEstado(page, token, ID_CERRADO, 'CERRADO');
    await enviar(ID_CERRADO, { estado_nuevo: 'CERRADO', fecha_cambio_estado: HOY, motivo_cambio: 'QA TC-DIS-125 sondeo' }, 422);
    await expect(errorCampo, 'DEFECTO: 3.3.1: el rechazo de CERRADO manual debe anunciarse debajo del select').toContainText('cierre de ciclo');
    await expect.soft(
      alerta.filter({ hasText: 'No se pudo cambiar el estado' }).filter({ hasText: 'cierre de ciclo' }),
      'DEFECTO: 3.3.1: el error de campo del 422 (CERRADO manual) se repite en la alerta global "No se pudo cambiar el estado" (el lector lo anuncia dos veces)',
    ).toHaveCount(0);
    await cerrar();

    // 404 ACTIVO_NO_ENCONTRADO
    await enviar(999999, { estado_nuevo: 'INACTIVO', fecha_cambio_estado: HOY, motivo_cambio: 'QA TC-DIS-125 sondeo' }, 404);
    await expect(alerta.filter({ hasText: 'no existe' }), 'DEFECTO: 3.3.1: el activo inexistente debe anunciarse').toBeVisible();
    await cerrar();
  });

  test('4. Activo en estado de transiciones limitadas (CERRADO) - 0 violaciones axe', async ({ page }, testInfo) => {
    await protegerCambioEstado(page);
    await abrirPestanaEstado(page, ID_CERRADO);
    await expect(page.getByRole('button', { name: 'Cerrar ciclo', exact: true }), 'Un activo CERRADO no admite cierre de ciclo').toHaveCount(0);
    await abrirFormulario(page);

    // Sin select editable: la ausencia de transiciones manuales se comunica con texto, no solo visualmente
    await expect(dialogo(page).getByRole('combobox'), 'Un activo CERRADO no debe ofrecer un select de transiciones manuales').toHaveCount(0);
    const aviso = dialogo(page).getByRole('alert').filter({ hasText: 'Sin transiciones disponibles' });
    await expect(aviso, 'DEFECTO: 3.3.1/4.1.3: la falta de transiciones debe comunicarse de forma accesible').toBeVisible();
    testInfo.annotations.push({ type: 'Mensaje para CERRADO', description: (await aviso.innerText()).replace(/\s+/g, ' ') });

    await escanear(page, 'activo-cerrado', testInfo);
  });

  test('5. Teclado - Enter guarda el formulario igual que el clic', async ({ page }) => {
    const fijarModo = await protegerCambioEstado(page);
    const cuerpos: unknown[] = [];
    fijarModo({ tipo: 'capturar', cuerpos }); // responde con el 422 real capturado, sin llegar al backend

    await abrirPestanaEstado(page, ID_ACTIVO);
    await abrirFormulario(page);
    const c = await llenarValido(page);

    await c.fecha.focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => cuerpos.length, { message: 'Enter en el formulario debe enviarlo' }).toBe(1);

    await c.guardar.click();
    await expect.poll(() => cuerpos.length, { message: 'El clic en "Cambiar estado" debe enviar el formulario' }).toBe(2);
    expect(cuerpos[0], 'Enter debe enviar exactamente lo mismo que el clic').toEqual(cuerpos[1]);
  });
});
