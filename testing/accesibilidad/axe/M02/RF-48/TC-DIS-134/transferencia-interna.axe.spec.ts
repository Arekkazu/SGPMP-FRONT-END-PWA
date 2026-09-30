/**
 * TC-DIS-134 — Accesibilidad WCAG 2.1 AA del formulario de Transferencia Interna de Activos
 * RF-48 · CU-10 Gestionar Transferencias y Consultar Historial · Rol: Productor
 * Activos biológicos → ficha del activo → pestaña "Infraestructura" → "Transferir"
 *
 * Herramientas: @axe-core/playwright (reporte axe-<TC>.html/json) + Lighthouse en
 * modo snapshot sobre la misma sesión (lighthouse-<TC>-<paso>.html/json), ambos
 * en ./resultados.
 *
 * Datos: lote #296 (ACTIVO, 10 animales, especie #40) asociado a "Corral QA JE Origen" (#48).
 * El backend ofrece como destino solo "Corral QA JE Destino OK" (#51, cap. 200); excluye
 * "Corral QA JE Capacidad" (#47, cap. 50) y el estanque de la misma finca.
 *
 * PROTECCIÓN DE DATOS: todo POST /activos-biologicos/{id}/transferencias se intercepta y por
 * defecto se aborta. Los errores se obtienen así:
 *   - Reales, REDIRIGIENDO la petición del formulario a casos que el backend rechaza sin mover
 *     nada: 404 ACTIVO_NO_ENCONTRADO, 422 INFRAESTRUCTURA_DESTINO_INVALIDA (destino inexistente),
 *     422 DESTINO_IGUAL_ORIGEN (48 → 48) y 409 ACTIVO_NO_ACTIVO (#471, en BAJA).
 *   - SIMULADOS con el formato estándar del backend: capacidad excedida (probarlo real exige
 *     una transferencia que el backend podría aceptar), 403 y la respuesta 201 de éxito.
 *     error_code de capacidad a confirmar con desarrollo.
 * Ningún activo se transfiere.
 *
 * Viewports: el script contempla movil / tablet / escritorio, pero solo se
 * ejecuta ESCRITORIO por el defecto abierto de sidebar/scroll (TC-DIS-07/08/10/11).
 * Para habilitarlos: TC_DIS_134_VIEWPORTS=movil,tablet,escritorio
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { auditarLighthouse, PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';

const TC_ID = 'TC-DIS-134';
const USER_EMAIL = process.env.TEST_USER_EMAIL ?? '';
const USER_PASSWORD = process.env.TEST_USER_PASSWORD ?? '';

const API = 'https://api.inmero.co/back-sigab-test';
const ID_ACTIVO = 296;
const ID_ORIGEN = 48;
const ID_DESTINO = 51;
const ID_EN_BAJA = 471;

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_134_VIEWPORTS ?? 'escritorio')
  .split(',')
  .map((v) => v.trim());

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const URL_TRANSFERENCIA = (url: URL) => /\/activos-biologicos\/\d+\/transferencias$/.test(url.pathname);
const URL_DISPONIBLES = (url: URL) => /\/activos-biologicos\/\d+\/transferencias\/disponibles$/.test(url.pathname);
const HOY = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

const cuerpo = (origen: number, destino: number) => ({
  infraestructura_origen_id: origen,
  infraestructura_destino_id: destino,
  fecha_transferencia: HOY,
  motivo_transferencia: 'QA TC-DIS-134 sondeo',
});

// SIMULADOS con el formato estándar del backend
const ERROR_CAPACIDAD = {
  error_code: 'CAPACIDAD_EXCEDIDA',
  message: 'La infraestructura destino no tiene capacidad suficiente: capacidad_max 200, ocupacion_actual 195, cantidad a transferir 10.',
  fields: [{ field: 'infraestructura_destino_id', message: 'Capacidad excedida: capacidad_max 200, ocupacion_actual 195.' }],
};
const ERROR_403 = { error_code: 'ACCESO_DENEGADO', message: 'Acceso denegado. Su rol no tiene permisos para realizar esta operación.', fields: [] };
const EXITO_201 = {
  id_movimiento: 999001, id_activo_biologico: ID_ACTIVO,
  infraestructura_origen: 'Corral QA JE Origen', infraestructura_destino: 'Corral QA JE Destino OK',
  fecha_transferencia: `${HOY}T00:00:00Z`, motivo_transferencia: 'QA TC-DIS-134',
  mensaje: 'Transferencia registrada correctamente.',
};

test.use({ launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

// ── Protección del POST de transferencia ─────────────────────────────────────

type ModoTransferencia =
  | { tipo: 'abortar' }
  | { tipo: 'redirigir'; idActivo: number; cuerpo: Record<string, unknown> }
  | { tipo: 'simular'; status: number; cuerpo: unknown };

async function protegerTransferencia(page: Page) {
  let modo: ModoTransferencia = { tipo: 'abortar' };
  const intentos: unknown[] = [];
  await page.route(URL_TRANSFERENCIA, (r) => {
    if (r.request().method() !== 'POST') return r.continue();
    intentos.push(r.request().postDataJSON());
    if (modo.tipo === 'redirigir') {
      return r.continue({ url: `${API}/activos-biologicos/${modo.idActivo}/transferencias`, postData: JSON.stringify(modo.cuerpo) });
    }
    if (modo.tipo === 'simular') {
      return r.fulfill({ status: modo.status, contentType: 'application/json', body: JSON.stringify(modo.cuerpo) });
    }
    return r.abort();
  });
  return { fijarModo: (m: ModoTransferencia) => { modo = m; }, intentos };
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
  return page.getByRole('dialog', { name: 'Transferencia interna' });
}

function botonAbrir(page: Page): Locator {
  return page.getByRole('button', { name: /Transferir/ }).first();
}

async function abrirPestanaInfraestructura(page: Page) {
  await page.goto(`/activos-biologicos/${ID_ACTIVO}`);
  const secciones = page.getByRole('navigation', { name: 'Secciones del activo' });
  await expect(secciones).toBeVisible({ timeout: 20_000 });
  await secciones.getByRole('button', { name: 'Infraestructura', exact: true }).click();
  await expect(page.getByText('Corral QA JE Origen').first(), 'Precondición: el activo debe tener asociación activa (origen)').toBeVisible({ timeout: 20_000 });
}

/** Abre el formulario y espera la lista de destinos; devuelve la respuesta de disponibles. */
async function abrirFormulario(page: Page) {
  const disponibles = page.waitForResponse((r) => URL_DISPONIBLES(new URL(r.url())));
  await botonAbrir(page).click();
  await expect(dialogo(page)).toBeVisible();
  const r = await disponibles;
  await expect(campos(page).destino).toBeEnabled();
  await page.evaluate(() => document.fonts.ready);
  return r;
}

function campos(page: Page) {
  const d = dialogo(page);
  return {
    destino: d.getByRole('combobox', { name: /Infraestructura destino/ }),
    fecha: d.getByLabel(/Fecha de transferencia/),
    motivo: d.getByRole('textbox', { name: /Motivo de la transferencia/ }),
    transferir: d.getByRole('button', { name: 'Transferir', exact: true }),
  };
}

async function llenarValido(page: Page) {
  const c = campos(page);
  await c.destino.selectOption(String(ID_DESTINO));
  await c.fecha.fill(HOY);
  await c.motivo.fill('QA TC-DIS-134 (envío interceptado)');
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

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Transferencia interna (RF-48)`, () => {
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

  test('1-2. Formulario - 0 violaciones axe, labels 1.3.1 y destinos filtrados por compatibilidad 4.1.2', async ({ page }, testInfo) => {
    await protegerTransferencia(page);
    await abrirPestanaInfraestructura(page);
    const r = await abrirFormulario(page);
    const disponibles: { id_infraestructura: number; nombre: string }[] = await r.json();
    const c = campos(page);

    // 1.3.1: labels de infraestructura_destino / fecha_transferencia / motivo_transferencia
    await expect(c.destino, '1.3.1: infraestructura_destino debe tener label asociado').toBeVisible();
    await expect(c.fecha, '1.3.1: fecha_transferencia debe tener label asociado').toBeVisible();
    await expect(c.motivo, '1.3.1: motivo_transferencia debe tener label asociado').toBeVisible();

    // 4.1.2: el select ofrece exactamente los destinos compatibles que devuelve el backend
    const opciones = await c.destino.locator('option').evaluateAll((os) => os.map((o) => ({ valor: (o as HTMLOptionElement).value, texto: (o.textContent ?? '').trim() })));
    testInfo.annotations.push({ type: 'Destinos ofrecidos', description: opciones.filter((o) => o.valor).map((o) => o.texto).join(' · ') });
    expect(opciones.filter((o) => o.valor).map((o) => Number(o.valor)), '4.1.2: la lista debe venir ya filtrada por compatibilidad (solo los destinos del backend)')
      .toEqual(disponibles.map((d) => d.id_infraestructura));
    expect(opciones.some((o) => Number(o.valor) === ID_ORIGEN), 'La infraestructura de origen no debe ofrecerse como destino').toBe(false);
    await c.destino.selectOption(String(ID_DESTINO));
    await expect(c.destino, '4.1.2: el value del select debe reflejar el destino elegido').toHaveValue(String(ID_DESTINO));

    // 4.1.2: la disponibilidad (ocupación actual / capacidad) debe comunicarse en el nombre de la opción
    const conOcupacion = opciones.filter((o) => o.valor).every((o) => /ocupa|disponible|libre/i.test(o.texto));
    expect.soft(conOcupacion, '4.1.2: las opciones solo muestran la capacidad máxima ("cap. 200"), no la ocupación actual ni la disponibilidad').toBe(true);

    // Nota del caso (E-07/E-08): las infraestructuras incompatibles no deben ocultarse en silencio
    const explicaExcluidas = await dialogo(page).getByText(/compatib|no aparecen|excluid|no disponibles/i).count();
    expect.soft(explicaExcluidas, 'E-07/E-08: las infraestructuras incompatibles se ocultan en silencio; el formulario no explica por qué no aparecen como opción').toBeGreaterThan(0);

    // Foco al abrir el diálogo (2.4.3)
    const foco = await descripcionFoco(page);
    expect.soft(foco.dentroDelDialogo, `2.4.3: al abrir "Transferencia interna" el foco debe moverse al diálogo (queda en ${foco.texto})`).toBe(true);

    await escanear(page, 'formulario', testInfo);
  });

  test('3. Confirmación - resumen antes de enviar y éxito anunciado', async ({ page }, testInfo) => {
    const { fijarModo, intentos } = await protegerTransferencia(page);
    await abrirPestanaInfraestructura(page);
    await abrirFormulario(page);
    const c = await llenarValido(page);

    // ¿Existe un paso de confirmación antes del envío?
    fijarModo({ tipo: 'abortar' });
    await c.transferir.click();
    const confirmacion = page.getByRole('alertdialog').or(page.getByRole('dialog').filter({ hasText: /confirm/i }));
    const hayConfirmacion = await confirmacion.first().isVisible({ timeout: 3_000 }).catch(() => false);
    testInfo.annotations.push({ type: 'Paso de confirmación', description: hayConfirmacion ? 'existe' : `no existe: POST enviado directamente (${intentos.length} intento(s), abortado)` });
    expect.soft(hayConfirmacion, 'El formulario envía la transferencia directamente, sin paso de confirmación (origen → destino) antes de enviar').toBe(true);

    // Éxito (201 simulado): el resultado debe anunciarse
    testInfo.annotations.push({ type: 'Datos simulados', description: 'Respuesta 201 de transferencia inyectada; el activo no se transfiere.' });
    await abrirPestanaInfraestructura(page);
    await abrirFormulario(page);
    await llenarValido(page);
    fijarModo({ tipo: 'simular', status: 201, cuerpo: EXITO_201 });
    await campos(page).transferir.click();
    await expect(dialogo(page), 'Tras el éxito el diálogo se cierra').toBeHidden();
    const exito = page.locator('[role="status"],[role="alert"],[aria-live]:not([aria-live="off"])').filter({ hasText: /transfer/i });
    await expect.soft(exito, '4.1.3: la transferencia exitosa no se anuncia (no hay mensaje de confirmación en región viva)').toHaveCount(1, { timeout: 5_000 });
    const foco = await descripcionFoco(page);
    testInfo.annotations.push({ type: 'Foco tras cerrar', description: foco.texto });
    await escanear(page, 'confirmacion-exito', testInfo);
  });

  test('4. Errores anunciados: capacidad excedida (simulado), 404/422/409 reales y 403 (simulado)', async ({ page }, testInfo) => {
    const { fijarModo } = await protegerTransferencia(page);
    testInfo.annotations.push(
      { type: 'Petición redirigida', description: '404, 422 y 409: el POST se redirige a casos que el backend rechaza sin mover el activo; respuestas reales.' },
      { type: 'Datos simulados', description: 'Capacidad excedida (error_code a confirmar con desarrollo) y 403.' },
    );
    await abrirPestanaInfraestructura(page);
    await abrirFormulario(page);
    const c = await llenarValido(page);
    const alerta = dialogo(page).getByRole('alert').filter({ hasText: 'No se pudo transferir' });

    const enviar = async (modo: ModoTransferencia) => {
      fijarModo(modo);
      const respuesta = page.waitForResponse((r) => URL_TRANSFERENCIA(new URL(r.url())) && r.request().method() === 'POST');
      await c.transferir.click();
      return (await respuesta).status();
    };

    // Capacidad excedida con capacidad_max / ocupacion_actual
    expect(await enviar({ tipo: 'simular', status: 422, cuerpo: ERROR_CAPACIDAD })).toBe(422);
    await expect(alerta, '3.3.1: la capacidad excedida debe anunciarse').toBeVisible();
    await expect(alerta, '3.3.1: el mensaje debe incluir capacidad_max y ocupacion_actual').toContainText(/capacidad_max 200.*ocupacion_actual 195/);
    await expect.soft(c.destino, '3.3.1: "Infraestructura destino" debe marcarse como inválida (aria-invalid) con el error de campo del backend').toHaveAttribute('aria-invalid', 'true');
    await escanear(page, 'error-capacidad', testInfo);

    // Reales
    expect(await enviar({ tipo: 'redirigir', idActivo: 999999, cuerpo: cuerpo(ID_ORIGEN, ID_DESTINO) })).toBe(404);
    await expect(alerta, '3.3.1: 404 ACTIVO_NO_ENCONTRADO anunciado').toContainText('no fue encontrado');

    expect(await enviar({ tipo: 'redirigir', idActivo: ID_ACTIVO, cuerpo: cuerpo(ID_ORIGEN, 999999) })).toBe(422);
    await expect(alerta, '3.3.1: 422 INFRAESTRUCTURA_DESTINO_INVALIDA anunciado').toContainText('no existe');

    expect(await enviar({ tipo: 'redirigir', idActivo: ID_ACTIVO, cuerpo: cuerpo(ID_ORIGEN, ID_ORIGEN) })).toBe(422);
    await expect(alerta, '3.3.1: 422 DESTINO_IGUAL_ORIGEN anunciado').toContainText('diferente a la infraestructura origen');
    await expect.soft(c.destino, '3.3.1: el 422 trae field infraestructura_destino_id pero el select no se marca como inválido').toHaveAttribute('aria-invalid', 'true');
    await escanear(page, 'error-422-destino', testInfo);

    expect(await enviar({ tipo: 'redirigir', idActivo: ID_EN_BAJA, cuerpo: cuerpo(ID_ORIGEN, ID_DESTINO) })).toBe(409);
    await expect(alerta, '3.3.1: 409 ACTIVO_NO_ACTIVO anunciado').toContainText('Solo se pueden transferir activos en estado ACTIVO');
    const textoAlerta = await alerta.innerText();
    expect.soft(textoAlerta, 'El mensaje del 409 muestra "El activo None" (identificador nulo sin reemplazar)').not.toContain('None');

    // 403 simulado
    expect(await enviar({ tipo: 'simular', status: 403, cuerpo: ERROR_403 })).toBe(403);
    await expect(alerta, '3.3.1: el 403 debe anunciarse').toContainText('Sin permiso de transferencia');

    // Validación del cliente: motivo vacío
    fijarModo({ tipo: 'abortar' });
    await c.motivo.fill('');
    await c.transferir.click();
    await expect(dialogo(page).getByRole('alert').filter({ hasText: /motivo/i }), '3.3.1: el motivo faltante debe anunciarse').toBeVisible();
    await expect(c.motivo).toHaveAttribute('aria-invalid', 'true');
    const describedby = await c.motivo.getAttribute('aria-describedby');
    expect.soft(describedby, '3.3.1: el textarea con error no referencia su mensaje con aria-describedby').not.toBeNull();
  });

  test('5. Teclado - select de destino operable con Tab/flechas y Enter envía igual que el clic', async ({ page }, testInfo) => {
    const { fijarModo, intentos } = await protegerTransferencia(page);
    fijarModo({ tipo: 'simular', status: 422, cuerpo: ERROR_CAPACIDAD }); // el formulario queda abierto
    await abrirPestanaInfraestructura(page);

    const disponibles = page.waitForResponse((r) => URL_DISPONIBLES(new URL(r.url())));
    await botonAbrir(page).focus();
    await page.keyboard.press('Enter');
    await expect(dialogo(page), '2.1.1: el formulario debe abrirse con Enter').toBeVisible();
    await disponibles;
    const c = campos(page);
    await expect(c.destino).toBeEnabled();

    // Tab hasta el select de destino
    const recorrido: string[] = [];
    for (let i = 0; i < 20 && !(await c.destino.evaluate((e) => e === document.activeElement)); i++) {
      await page.keyboard.press('Tab');
      const f = await descripcionFoco(page);
      recorrido.push(`${f.texto}${f.dentroDelDialogo ? '' : ' (fuera)'}`);
    }
    testInfo.annotations.push({ type: 'Recorrido de Tab hasta el destino', description: recorrido.join(' → ') });
    await expect(c.destino, '2.1.1: el select de destino debe alcanzarse con Tab').toBeFocused();
    expect.soft(recorrido.filter((f) => f.endsWith('(fuera)')).length, '2.4.3: el foco recorre la página de fondo antes de llegar al formulario (el diálogo no recibe el foco)').toBe(0);

    // Flechas: selecciona el primer destino
    await page.keyboard.press('ArrowDown');
    await expect(c.destino, '2.1.1: el destino debe elegirse con flechas').toHaveValue(String(ID_DESTINO));

    // Enter envía lo mismo que el clic
    await c.motivo.fill('QA TC-DIS-134 (envío interceptado)');
    await c.fecha.focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => intentos.length, { message: 'Enter en el formulario debe enviarlo' }).toBe(1);
    await c.transferir.click();
    await expect.poll(() => intentos.length, { message: 'El clic en "Transferir" debe enviarlo' }).toBe(2);
    expect(intentos[0], 'Enter debe enviar exactamente lo mismo que el clic').toEqual(intentos[1]);

    await page.keyboard.press('Escape');
    await expect.soft(dialogo(page), '2.1.1: Escape debe cerrar el diálogo').toBeHidden({ timeout: 2_000 });
  });
});
