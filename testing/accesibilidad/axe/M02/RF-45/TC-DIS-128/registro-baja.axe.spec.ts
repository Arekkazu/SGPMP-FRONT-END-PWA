/**
 * TC-DIS-128 — Accesibilidad WCAG 2.1 AA del formulario de Registro de Baja (acción irreversible)
 * RF-45 · CU-09 Registrar Eventos Productivos y Bajas · Rol: Productor
 * Activos biológicos → ficha del activo → pestaña "Eventos" → "Baja"
 *
 * Herramientas: @axe-core/playwright (reporte axe-<TC>.html/json) + Lighthouse en
 * modo snapshot sobre la misma sesión (lighthouse-<TC>-<paso>.html/json), ambos
 * en ./resultados.
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
 *
 * Viewports: el script contempla movil / tablet / escritorio, pero solo se
 * ejecuta ESCRITORIO por el defecto abierto de sidebar/scroll (TC-DIS-07/08/10/11).
 * Para habilitarlos: TC_DIS_128_VIEWPORTS=movil,tablet,escritorio
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

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_128_VIEWPORTS ?? 'escritorio')
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
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill(USER_EMAIL);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(USER_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 });
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

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      !VIEWPORTS_HABILITADOS.includes(testInfo.project.name),
      `Viewport "${testInfo.project.name}" deshabilitado: defecto abierto de sidebar/scroll en móvil y tablet (TC-DIS-07/08/10/11). Solo se evalúa escritorio.`,
    );
    expect(USER_EMAIL, 'Falta TEST_USER_EMAIL en testing/.env.test').not.toBe('');
    expect(USER_PASSWORD, 'Falta TEST_USER_PASSWORD en testing/.env.test').not.toBe('');
    await iniciarSesionProductor(page);
  });

  test('1-2. Formulario de baja - 0 violaciones axe A/AA y labels 1.3.1', async ({ page }, testInfo) => {
    await protegerBaja(page);
    await abrirPestanaEventos(page);
    await abrirFormulario(page);
    const c = campos(page);

    // 1.3.1: tipo_baja / fecha_baja / motivo_baja / cantidad_afectada con label asociado
    await expect(c.tipo, '1.3.1: tipo_baja debe tener label asociado').toBeVisible();
    await expect(c.fecha, '1.3.1: fecha_baja debe tener label asociado').toBeVisible();
    await expect(c.motivo, '1.3.1: motivo_baja debe tener label asociado').toBeVisible();
    await expect(c.cantidad, '1.3.1: cantidad_afectada debe tener label asociado').toBeVisible();

    // Foco al abrir el diálogo (2.4.3)
    const foco = await descripcionFoco(page);
    testInfo.annotations.push({ type: 'Foco al abrir el formulario', description: foco.texto });
    expect.soft(foco.dentroDelDialogo, `2.4.3: al abrir "Registrar baja" el foco debe moverse al diálogo (queda en ${foco.texto})`).toBe(true);

    await escanear(page, 'formulario', testInfo);
  });

  test('3-4. Confirmación de la acción irreversible - foco automático y aviso vía aria-live', async ({ page }, testInfo) => {
    const { intentos } = await protegerBaja(page); // modo abortar: la baja nunca llega al backend
    await abrirPestanaEventos(page);
    await abrirFormulario(page);
    const c = await llenarValido(page);

    // Antes de confirmar: el formulario debería advertir la irreversibilidad
    const avisoEnFormulario = await dialogo(page).getByText(IRREVERSIBLE).count();
    expect.soft(avisoEnFormulario, '4.1.3: el formulario no advierte que la baja es irreversible ("esta acción no se puede deshacer")').toBeGreaterThan(0);

    await c.registrar.click();
    const confirmacion = page.getByRole('alertdialog').or(page.getByRole('dialog').filter({ hasText: IRREVERSIBLE }));
    const hayConfirmacion = await confirmacion.first().isVisible({ timeout: 3_000 }).catch(() => false);
    testInfo.annotations.push({ type: 'Envío sin confirmación', description: `POST de baja intentados tras el clic en "Registrar baja": ${intentos.length} (todos abortados)` });

    expect.soft(intentos.length, 'La baja (irreversible) se envía al backend directamente al hacer clic en "Registrar baja", sin diálogo de confirmación').toBe(0);
    expect(hayConfirmacion, 'DEFECTO: no existe diálogo de confirmación antes de registrar la baja; no se puede evaluar su foco automático ni el anuncio de irreversibilidad').toBe(true);

    // Si el diálogo existe: foco automático, aviso anunciado y escaneo
    const dlg = confirmacion.first();
    const foco = await descripcionFoco(page);
    expect(foco.dentroDelDialogo, `El diálogo de confirmación debe recibir el foco automáticamente (queda en ${foco.texto})`).toBe(true);
    const anunciado = dlg.locator('[aria-live], [role="alert"], [role="status"]').filter({ hasText: IRREVERSIBLE });
    await expect(anunciado.or(page.getByRole('alertdialog').filter({ hasText: IRREVERSIBLE })), '4.1.3: "esta acción no se puede deshacer" debe anunciarse vía aria-live').toHaveCount(1);
    await escanear(page, 'confirmacion', testInfo);
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
      return (await respuesta).status();
    };

    // 422: cantidad_afectada mayor a la disponible — el cliente no la valida, el error viene del backend
    expect(await enviar({ tipo: 'simular', status: 422, cuerpo: ERROR_422_CANTIDAD }, String(CANTIDAD_DISPONIBLE + 5))).toBe(422);
    await expect(alertaError.filter({ hasText: 'cantidad' }), '3.3.1: el 422 de cantidad excedida debe anunciarse').toBeVisible();
    await expect.soft(c.cantidad, '3.3.1: "Cantidad afectada" debe marcarse como inválida (aria-invalid) con el error de campo del backend').toHaveAttribute('aria-invalid', 'true');
    const maximo = await c.cantidad.getAttribute('max');
    expect.soft(maximo, `3.3.3: "Cantidad afectada" no limita ni valida la cantidad disponible (${CANTIDAD_DISPONIBLE}) en el cliente`).not.toBeNull();
    await escanear(page, 'error-422-cantidad', testInfo);

    // 404 real: activo inexistente
    expect(await enviar({ tipo: 'redirigir', idActivo: 999999, cuerpo: { tipo_baja: 'muerte', fecha_baja: HOY, motivo_baja: 'QA TC-DIS-128 sondeo' } })).toBe(404);
    await expect(alertaError.filter({ hasText: 'no existe' }), '3.3.1: el 404 debe anunciarse').toBeVisible();

    // 400 real: tipo_baja inválido (error de campo)
    expect(await enviar({ tipo: 'redirigir', idActivo: 999999, cuerpo: { tipo_baja: 'XYZ', fecha_baja: HOY, motivo_baja: 'QA TC-DIS-128 sondeo' } })).toBe(400);
    await expect(alertaError.filter({ hasText: 'tipo de baja' }), '3.3.1: el 400 debe anunciarse').toBeVisible();
    await expect.soft(c.tipo, '3.3.1: "Tipo de baja" debe marcarse como inválido (aria-invalid) con el error de campo del backend').toHaveAttribute('aria-invalid', 'true');
    await escanear(page, 'error-400-validacion', testInfo);

    // 409 real: el activo ya está dado de baja
    expect(await enviar({ tipo: 'redirigir', idActivo: ID_EN_BAJA, cuerpo: { tipo_baja: 'muerte', fecha_baja: HOY, motivo_baja: 'QA TC-DIS-128 sondeo', cantidad_afectada: 999 } })).toBe(409);
    await expect(alertaError.filter({ hasText: 'dado de baja previamente' }), '3.3.1: el 409 debe anunciarse').toBeVisible();
    await escanear(page, 'error-409-ya-en-baja', testInfo);

    // 403 simulado
    expect(await enviar({ tipo: 'simular', status: 403, cuerpo: ERROR_403 })).toBe(403);
    await expect(alertaError.filter({ hasText: 'Acceso denegado' }), '3.3.1: el 403 debe anunciarse').toBeVisible();
  });

  test('6. Teclado (2.1.1) - formulario operable y Enter envía igual que el clic', async ({ page }, testInfo) => {
    const { fijarModo, intentos } = await protegerBaja(page);
    fijarModo({ tipo: 'simular', status: 422, cuerpo: ERROR_422_CANTIDAD }); // el formulario queda abierto
    await abrirPestanaEventos(page);

    // Abrir con teclado
    await botonBaja(page).focus();
    await page.keyboard.press('Enter');
    await expect(dialogo(page), '2.1.1: el formulario debe abrirse con Enter').toBeVisible();

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
      expect.soft(recorrido.some((f) => f.includes(`#${id}`)), `2.1.1: el control #${id} no se alcanza con Tab (en 20 pasos)`).toBe(true);
    }
    expect.soft(pasosFuera, '2.4.3: el foco sale del diálogo modal al tabular (no hay trampa de foco)').toBe(0);

    // Enter envía lo mismo que el clic
    await llenarValido(page);
    await c.fecha.focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => intentos.length, { message: 'Enter en el formulario debe enviarlo' }).toBe(1);
    await c.registrar.click();
    await expect.poll(() => intentos.length, { message: 'El clic en "Registrar baja" debe enviarlo' }).toBe(2);
    expect(intentos[0], 'Enter debe enviar exactamente lo mismo que el clic').toEqual(intentos[1]);

    // Escape cierra el diálogo
    await page.keyboard.press('Escape');
    await expect.soft(dialogo(page), '2.1.1: Escape debe cerrar el diálogo').toBeHidden({ timeout: 2_000 });
  });
});
