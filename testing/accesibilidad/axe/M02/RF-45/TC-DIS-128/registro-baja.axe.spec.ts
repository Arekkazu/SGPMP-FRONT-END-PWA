/**
 * TC-DIS-128 — Accesibilidad WCAG 2.1 AA del formulario de Registro de Baja (acción irreversible)
 * RF-45 · CU-09 Registrar Eventos Productivos y Bajas · Rol: Productor
 * Activos biológicos → ficha del activo → pestaña "Eventos" → "Baja"
 *
 * Herramientas: @axe-core/playwright (reporte axe-<TC>.html/json) + Lighthouse en
 * modo snapshot sobre la misma sesión (lighthouse-<TC>-<paso>-<viewport>.html/json),
 * ambos en ./resultados. Una auditoría fallida de Lighthouse es un defecto aunque tenga
 * peso 0 en el puntaje.
 *
 * Flujo vigente (2026-10-07): "Registrar baja" ya no envía; muestra dentro del mismo diálogo
 * el resumen "Confirma la baja" y el envío ocurre con "Confirmar baja".
 *
 * Datos: lote #296 (POBLACIONAL, ACTIVO, 10 animales) del Productor de prueba; al ser
 * lote, el formulario incluye "Cantidad afectada".
 *
 * PROTECCIÓN DE DATOS: la baja es IRREVERSIBLE. Todo POST /activos-biologicos/{id}/eventos/baja
 * se intercepta y por defecto se aborta. Los errores se obtienen así:
 *   - Reales, REDIRIGIENDO la petición del formulario a casos que el backend rechaza sin
 *     modificar nada: 404 ACTIVO_NO_ENCONTRADO (activo inexistente), 400 VAL_ENTRADA
 *     (tipo_baja inválido sobre activo inexistente) y 409 ACTIVO_YA_EN_BAJA (#471, ya en BAJA).
 *   - SIMULADOS con el formato estándar del backend: 422 cantidad_afectada mayor a la
 *     disponible (probarlo real exige enviar una baja sobre un lote activo) y 403 (el
 *     Productor tiene permiso). error_code del 422 a confirmar con desarrollo.
 *   Salvaguarda: antes de redirigir al #471, GET /activos-biologicos/471 confirma que sigue en
 *   BAJA; si cambió, ese envío no se hace (registraría una baja real).
 *
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_128_VIEWPORTS=escritorio
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { auditarLighthouse, PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';

const TC_ID = 'TC-DIS-128';
const USER_EMAIL = process.env.TEST_USER_EMAIL ?? '';
const USER_PASSWORD = process.env.TEST_USER_PASSWORD ?? '';

const API = 'https://api.inmero.co/back-sigab-test';
const ID_LOTE = 296; // lote ACTIVO con 10 animales
const CANTIDAD_DISPONIBLE = 10;
const ID_EN_BAJA = 471; // lote ya en BAJA (destino de la redirección del 409)

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_128_VIEWPORTS ?? 'movil,tablet,escritorio')
  .split(',')
  .map((v) => v.trim());

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const URL_BAJA = (url: URL) => /\/activos-biologicos\/\d+\/eventos\/baja$/.test(url.pathname);
const HOY = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
const IRREVERSIBLE = /no se puede deshacer|irreversible/i;

// SIMULADOS con el formato estándar del backend
const ERROR_422_CANTIDAD = {
  error_code: 'CANTIDAD_AFECTADA_EXCEDE_DISPONIBLE',
  message: `La cantidad afectada (${CANTIDAD_DISPONIBLE + 5}) supera la cantidad disponible del lote (${CANTIDAD_DISPONIBLE}).`,
  fields: [{ field: 'cantidad_afectada', message: `La cantidad afectada no puede superar la cantidad disponible (${CANTIDAD_DISPONIBLE}).` }],
};
const ERROR_403 = { error_code: 'ACCESO_DENEGADO', message: 'Acceso denegado. Su rol no tiene permisos para realizar esta operación.', fields: [] };

test.use({ launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

// ── Protección del POST de baja ──────────────────────────────────────────────

type ModoBaja =
  | { tipo: 'abortar' }
  | { tipo: 'redirigir'; idActivo: number; cuerpo: Record<string, unknown> }
  | { tipo: 'simular'; status: number; cuerpo: unknown };

/** Intercepta todo POST de baja; registra cada intento. Devuelve el setter de modo y los intentos. */
async function protegerBaja(page: Page) {
  let modo: ModoBaja = { tipo: 'abortar' };
  const intentos: unknown[] = [];
  await page.route(URL_BAJA, (r) => {
    if (r.request().method() !== 'POST') return r.continue();
    intentos.push(r.request().postDataJSON());
    if (modo.tipo === 'redirigir') {
      return r.continue({ url: `${API}/activos-biologicos/${modo.idActivo}/eventos/baja`, postData: JSON.stringify(modo.cuerpo) });
    }
    if (modo.tipo === 'simular') {
      return r.fulfill({ status: modo.status, contentType: 'application/json', body: JSON.stringify(modo.cuerpo) });
    }
    return r.abort();
  });
  return { fijarModo: (m: ModoBaja) => { modo = m; }, intentos };
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
  expect(estado, `Precondición: el activo #${idActivo} debe seguir en ${esperado}; si cambió, el envío redirigido registraría una baja real y no se hace`).toBe(esperado);
}

function dialogo(page: Page): Locator {
  return page.getByRole('dialog', { name: 'Registrar baja' });
}

function botonBaja(page: Page): Locator {
  return page.getByRole('button', { name: 'Baja', exact: true });
}

async function abrirPestanaEventos(page: Page) {
  await page.goto(`/activos-biologicos/${ID_LOTE}`);
  const secciones = page.getByRole('navigation', { name: 'Secciones del activo' });
  await expect(secciones).toBeVisible({ timeout: 20_000 });
  await secciones.getByRole('button', { name: 'Eventos', exact: true }).click();
  await expect(botonBaja(page)).toBeEnabled({ timeout: 20_000 });
}

async function abrirFormulario(page: Page) {
  await botonBaja(page).click();
  await expect(dialogo(page)).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

function campos(page: Page) {
  const d = dialogo(page);
  return {
    tipo: d.getByRole('combobox', { name: /Tipo de baja/ }),
    fecha: d.getByLabel(/Fecha de baja/),
    cantidad: d.getByRole('spinbutton', { name: /Cantidad afectada/ }),
    motivo: d.getByRole('textbox', { name: /Motivo de la baja/ }),
    registrar: d.getByRole('button', { name: 'Registrar baja', exact: true }),
    cancelar: d.getByRole('button', { name: 'Cancelar', exact: true }),
    // Paso de confirmación (resumen dentro del mismo diálogo)
    resumen: d.getByRole('heading', { name: 'Confirma la baja' }),
    confirmar: d.getByRole('button', { name: 'Confirmar baja', exact: true }),
    volver: d.getByRole('button', { name: 'Volver', exact: true }),
  };
}

/** Completa el formulario con valores válidos (el envío siempre queda interceptado). */
async function llenarValido(page: Page, cantidad = '2') {
  const c = campos(page);
  await c.tipo.selectOption('muerte');
  await c.fecha.fill(HOY);
  await c.cantidad.fill(cantidad);
  await c.motivo.fill('QA TC-DIS-128 (envío interceptado)');
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

// ── Casos ────────────────────────────────────────────────────────────────────

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Registro de baja (RF-45)`, () => {
  // Modo por defecto (no serial): un paso con violaciones no debe impedir evaluar los demás.
  // workers: 1 en el config, así que los logins siguen siendo secuenciales.
  test.describe.configure({ timeout: 180_000 });

  let token: () => string = () => '';

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      !VIEWPORTS_HABILITADOS.includes(testInfo.project.name),
      `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_128_VIEWPORTS.`,
    );
    expect(USER_EMAIL, 'Falta TEST_USER_EMAIL en testing/.env.test').not.toBe('');
    expect(USER_PASSWORD, 'Falta TEST_USER_PASSWORD en testing/.env.test').not.toBe('');
    token = await iniciarSesionProductor(page);
  });

  test('1-2. Formulario de baja - 0 violaciones axe A/AA y labels 1.3.1', async ({ page }, testInfo) => {
    await protegerBaja(page);
    await abrirPestanaEventos(page);
    await abrirFormulario(page);
    const c = campos(page);

    // 1.3.1: tipo_baja / fecha_baja / motivo_baja / cantidad_afectada con label asociado
    await expect(c.tipo, 'DEFECTO: 1.3.1: tipo_baja debe tener label asociado').toBeVisible();
    await expect(c.fecha, 'DEFECTO: 1.3.1: fecha_baja debe tener label asociado').toBeVisible();
    await expect(c.motivo, 'DEFECTO: 1.3.1: motivo_baja debe tener label asociado').toBeVisible();
    await expect(c.cantidad, 'DEFECTO: 1.3.1: cantidad_afectada debe tener label asociado').toBeVisible();

    // Foco al abrir el diálogo (2.4.3)
    const foco = await descripcionFoco(page);
    testInfo.annotations.push({ type: 'Foco al abrir el formulario', description: foco.texto });
    expect.soft(foco.dentroDelDialogo, `DEFECTO: 2.4.3: al abrir "Registrar baja" el foco debe moverse al diálogo (queda en ${foco.texto})`).toBe(true);

    await escanear(page, 'formulario', testInfo);
  });

  test('3-4. Confirmación de la acción irreversible - foco automático y aviso vía aria-live', async ({ page }, testInfo) => {
    const { intentos } = await protegerBaja(page); // modo abortar: la baja nunca llega al backend
    await abrirPestanaEventos(page);
    await abrirFormulario(page);
    const c = await llenarValido(page);

    // Antes de confirmar: el formulario advierte la irreversibilidad en una región anunciada
    const aviso = dialogo(page).locator('[aria-live], [role="alert"], [role="status"]').filter({ hasText: IRREVERSIBLE });
    await expect.soft(aviso, 'DEFECTO: 4.1.3: el formulario no advierte en una región anunciada que la baja es irreversible').toHaveCount(1);

    await c.registrar.click();
    await expect(c.resumen, 'DEFECTO: no existe paso de confirmación antes de registrar la baja').toBeVisible();
    expect(intentos.length, 'DEFECTO: la baja (irreversible) se envía al backend sin pasar por la confirmación').toBe(0);
    testInfo.annotations.push({ type: 'Confirmación', description: `Resumen "Confirma la baja" en el mismo diálogo; POST intentados al mostrarlo: ${intentos.length}` });

    // Foco automático en el paso de confirmación (2.4.3)
    const foco = await descripcionFoco(page);
    testInfo.annotations.push({ type: 'Foco al mostrar la confirmación', description: foco.texto });
    expect.soft(foco.dentroDelDialogo, `DEFECTO: 2.4.3: al mostrar la confirmación el foco debe quedar dentro del diálogo (queda en ${foco.texto})`).toBe(true);
    const enConfirmacion = await page.evaluate(() => ['Volver', 'Confirmar baja'].includes((document.activeElement?.textContent ?? '').trim()));
    expect.soft(enConfirmacion, `DEFECTO: 2.4.3: el foco debe moverse a un control de la confirmación (queda en ${foco.texto})`).toBe(true);

    // El aviso de irreversibilidad sigue en una región anunciada durante la confirmación (4.1.3)
    await expect.soft(aviso, 'DEFECTO: 4.1.3: "esta acción no se puede deshacer" debe estar en una región aria-live durante la confirmación').toHaveCount(1);
    await escanear(page, 'confirmacion', testInfo);

    // "Volver" regresa al formulario sin enviar
    await c.volver.click();
    await expect(c.registrar).toBeVisible();
    expect(intentos.length, 'Volver no debe enviar la baja').toBe(0);
  });

  test('5. Errores anunciados: cantidad mayor a la disponible (422) y 404/400/409 reales, 403 simulado', async ({ page }, testInfo) => {
    const { fijarModo } = await protegerBaja(page);
    testInfo.annotations.push(
      { type: 'Petición redirigida', description: '404, 400 y 409: el POST del formulario se redirige a casos que el backend rechaza sin modificar datos; respuestas reales. No se registra ninguna baja.' },
      { type: 'Datos simulados', description: '422 cantidad_afectada mayor a la disponible (error_code a confirmar con desarrollo) y 403.' },
    );
    await abrirPestanaEventos(page);
    await abrirFormulario(page);
    const c = campos(page);
    const alertas = dialogo(page).getByRole('alert');
    const alertaError = alertas.filter({ hasText: 'No se pudo registrar la baja' });

    const enviar = async (modo: ModoBaja, cantidad = '2') => {
      fijarModo(modo);
      await llenarValido(page, cantidad);
      const respuesta = page.waitForResponse((r) => URL_BAJA(new URL(r.url())) && r.request().method() === 'POST');
      await c.registrar.click();
      await expect(c.resumen).toBeVisible();
      await c.confirmar.click();
      const estado = (await respuesta).status();
      await expect(c.registrar, 'Tras un error la baja debe volver al formulario').toBeVisible();
      return estado;
    };

    // 422: cantidad_afectada mayor a la disponible — el cliente no la valida, el error viene del backend
    expect(await enviar({ tipo: 'simular', status: 422, cuerpo: ERROR_422_CANTIDAD }, String(CANTIDAD_DISPONIBLE + 5))).toBe(422);
    await expect(alertaError.filter({ hasText: 'cantidad' }), 'DEFECTO: 3.3.1: el 422 de cantidad excedida debe anunciarse').toBeVisible();
    await expect.soft(c.cantidad, 'DEFECTO: 3.3.1: "Cantidad afectada" debe marcarse como inválida (aria-invalid) con el error de campo del backend').toHaveAttribute('aria-invalid', 'true');
    const maximo = await c.cantidad.getAttribute('max');
    expect.soft(maximo, `DEFECTO: 3.3.3: "Cantidad afectada" no limita ni valida la cantidad disponible (${CANTIDAD_DISPONIBLE}) en el cliente`).not.toBeNull();
    await escanear(page, 'error-422-cantidad', testInfo);

    // 404 real: activo inexistente
    expect(await enviar({ tipo: 'redirigir', idActivo: 999999, cuerpo: { tipo_baja: 'muerte', fecha_baja: HOY, motivo_baja: 'QA TC-DIS-128 sondeo' } })).toBe(404);
    await expect(alertaError.filter({ hasText: 'no existe' }), 'DEFECTO: 3.3.1: el 404 debe anunciarse').toBeVisible();

    // 400 real: tipo_baja inválido (error de campo)
    expect(await enviar({ tipo: 'redirigir', idActivo: 999999, cuerpo: { tipo_baja: 'XYZ', fecha_baja: HOY, motivo_baja: 'QA TC-DIS-128 sondeo' } })).toBe(400);
    await expect(alertaError.filter({ hasText: 'tipo de baja' }), 'DEFECTO: 3.3.1: el 400 debe anunciarse').toBeVisible();
    await expect.soft(c.tipo, 'DEFECTO: 3.3.1: "Tipo de baja" debe marcarse como inválido (aria-invalid) con el error de campo del backend').toHaveAttribute('aria-invalid', 'true');
    // Errores de campo debajo del input, nunca en alerta global: si no, se anuncian dos veces
    const idErrorTipo = await c.tipo.getAttribute('aria-describedby');
    const textoErrorTipo = idErrorTipo ? ((await dialogo(page).locator(`[id="${idErrorTipo.split(' ')[0]}"]`).textContent()) ?? '').trim() : '';
    testInfo.annotations.push({ type: 'Error de campo 400 (tipo_baja)', description: textoErrorTipo || '(sin mensaje de campo)' });
    if (textoErrorTipo) {
      await expect.soft(
        alertaError.filter({ hasText: textoErrorTipo }),
        'DEFECTO: 3.3.1: el error de campo del 400 se repite en la alerta global "No se pudo registrar la baja" (el lector lo anuncia dos veces; los errores de campo van solo debajo del input)',
      ).toHaveCount(0);
    }
    await escanear(page, 'error-400-validacion', testInfo);

    // 409 real: el activo ya está dado de baja
    await verificarEstado(page, token, ID_EN_BAJA, 'BAJA');
    expect(await enviar({ tipo: 'redirigir', idActivo: ID_EN_BAJA, cuerpo: { tipo_baja: 'muerte', fecha_baja: HOY, motivo_baja: 'QA TC-DIS-128 sondeo', cantidad_afectada: 999 } })).toBe(409);
    await expect(alertaError.filter({ hasText: 'dado de baja previamente' }), 'DEFECTO: 3.3.1: el 409 debe anunciarse').toBeVisible();
    await escanear(page, 'error-409-ya-en-baja', testInfo);

    // 403 simulado
    expect(await enviar({ tipo: 'simular', status: 403, cuerpo: ERROR_403 })).toBe(403);
    await expect(alertaError.filter({ hasText: 'Acceso denegado' }), 'DEFECTO: 3.3.1: el 403 debe anunciarse').toBeVisible();
  });

  test('6. Teclado (2.1.1) - formulario operable y Enter envía igual que el clic', async ({ page }, testInfo) => {
    const { fijarModo, intentos } = await protegerBaja(page);
    fijarModo({ tipo: 'simular', status: 422, cuerpo: ERROR_422_CANTIDAD }); // el formulario queda abierto
    await abrirPestanaEventos(page);

    // Abrir con teclado
    await botonBaja(page).focus();
    await page.keyboard.press('Enter');
    await expect(dialogo(page), 'DEFECTO: 2.1.1: el formulario debe abrirse con Enter').toBeVisible();

    // Recorrido con Tab desde el foco actual: debe alcanzar todos los controles del formulario
    const c = campos(page);
    const recorrido: string[] = [];
    let pasosFuera = 0;
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      const foco = await descripcionFoco(page);
      recorrido.push(`${foco.texto}${foco.dentroDelDialogo ? '' : ' (fuera)'}`);
      if (!foco.dentroDelDialogo) pasosFuera++;
    }
    testInfo.annotations.push({ type: 'Recorrido de Tab (20 pasos)', description: recorrido.join(' → ') });
    for (const id of ['tipo-de-baja', 'fecha-de-baja', 'cantidad-afectada', 'motivo-de-la-baja']) {
      expect.soft(recorrido.some((f) => f.includes(`#${id}`)), `DEFECTO: 2.1.1: el control #${id} no se alcanza con Tab (en 20 pasos)`).toBe(true);
    }
    expect.soft(pasosFuera, 'DEFECTO: 2.4.3: el foco sale del diálogo modal al tabular (no hay trampa de foco)').toBe(0);

    // Enter envía lo mismo que el clic (formulario → confirmación → envío)
    await llenarValido(page);
    await c.fecha.focus();
    await page.keyboard.press('Enter');
    await expect(c.resumen, 'DEFECTO: 2.1.1: Enter en el formulario debe mostrar la confirmación').toBeVisible();
    await c.confirmar.focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => intentos.length, { message: 'Enter en "Confirmar baja" debe enviarla' }).toBe(1);
    await expect(c.registrar).toBeVisible();
    await c.registrar.click();
    await c.confirmar.click();
    await expect.poll(() => intentos.length, { message: 'El clic en "Registrar baja" y luego en "Confirmar baja" debe enviarla' }).toBe(2);
    expect(intentos[0], 'Enter debe enviar exactamente lo mismo que el clic').toEqual(intentos[1]);

    // Escape cierra el diálogo
    await page.keyboard.press('Escape');
    await expect.soft(dialogo(page), 'DEFECTO: 2.1.1: Escape debe cerrar el diálogo').toBeHidden({ timeout: 2_000 });
  });
});
