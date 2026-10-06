/**
 * TC-DIS-58 — Accesibilidad WCAG 2.1 AA del flujo por pasos de Asociación de Sensores
 * RF-22 v1.1 · CU-05 Gestionar Dispositivos IoT · Rol: Administrador
 * Configuración → IoT → "Asociación de Sensores a Áreas":
 *   Paso 1 dispositivo → Paso 2 sensor → Paso 3 área destino → Paso 4 punto de instalación
 *
 * Herramientas: @axe-core/playwright (reporte axe-<TC>.html/json) + Lighthouse en
 * modo snapshot sobre la misma sesión (lighthouse-<TC>-<paso>-<viewport>.html/json),
 * ambos en ./resultados. Una auditoría fallida de Lighthouse es un defecto aunque tenga
 * peso 0 en el puntaje.
 *
 * Cambio del RF (v1.1, sgpmp-backend#290/#304): al reasignar un sensor, el backend cierra
 * sus asociaciones sensor→activo ambientales y poblacionales y las devuelve en
 * asociaciones_activo_superadas; el asistente las anuncia en un aviso con enlace a la ficha
 * de cada activo.
 *
 * Datos: dispositivo #1 "IOT-EST01-HLA-001", sensor #3 "Sensor oxígeno disuelto
 * estanque-01", hoy asociado al área Estanque-01 (#1). Destino: Estanque-02 (#2).
 *
 * PROTECCIÓN DE DATOS: todo POST a /configuracion/sensores/{id}/asociar se intercepta y por
 * defecto se aborta:
 *   - Real: el primer envío sin `confirmar`, que responde 409 REASIGNACION_REQUIERE_CONFIRMACION
 *     sin cambiar nada. Solo se deja pasar si GET /configuracion/sensores/3/asociaciones
 *     confirma que el sensor sigue asociado a otra área (si no, ese POST lo asociaría de verdad).
 *   - SIMULADOS: la confirmación (`confirmar: true`, 201, con y sin asociaciones superadas) y
 *     el 404 AREA_NO_ENCONTRADA (cuerpo real del 2026-09-28).
 * Los listados de fincas y dispositivos ya responden 200 (bloqueos del 2026-09-28 corregidos).
 *
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_58_VIEWPORTS=escritorio
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page, type Request, type TestInfo } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { auditarLighthouse, PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';

const TC_ID = 'TC-DIS-58';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';
const API_BASE = process.env.API_BASE_URL ?? 'https://api.inmero.co/back-sigab-test';

const DISPOSITIVO = 'IOT-EST01-HLA-001';
const ID_SENSOR = 3;
const ID_AREA_DESTINO = 2;
const SENSOR = 'Sensor oxígeno disuelto estanque-01';
const FINCA = 'Finca Acuícola El Remanso';
const AREA_DESTINO = 'Estanque-02';

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_58_VIEWPORTS ?? 'movil,tablet,escritorio')
  .split(',')
  .map((v) => v.trim());

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

// page.route compara la URL completa (con query): se filtra por pathname
const porRuta = (patron: RegExp) => (url: URL) => patron.test(url.pathname);
const RUTA_FINCAS = /\/configuracion\/fincas$/;
const RUTA_DISPOSITIVOS = /\/configuracion\/dispositivos-iot$/;
const RUTA_ASOCIAR = /\/configuracion\/sensores\/\d+\/asociar$/;

// Respuesta 404 real del backend TEST (POST /configuracion/sensores/3/asociar con área inexistente, 2026-09-28)
const ERROR_404_AREA = {
  error_code: 'AREA_NO_ENCONTRADA',
  message: 'Ubicación inválida: El área productiva seleccionada no existe o se encuentra desactivada. No se pueden asociar sensores a infraestructuras fuera de operación.',
  fields: [{ field: 'id_infraestructura', message: 'Ubicación inválida: El área productiva seleccionada no existe o se encuentra desactivada. No se pueden asociar sensores a infraestructuras fuera de operación.' }],
};

// 201 SIMULADO de la confirmación; `superadas` replica el campo de sgpmp-backend#304
const confirmacion201 = (cuerpo: Record<string, unknown>, n: number, superadas: unknown[] = []) => ({
  id_sensores_area_asociada: 900000 + n, id_sensor: ID_SENSOR, id_dispositivo_iot: cuerpo.id_dispositivo_iot,
  id_infraestructura: cuerpo.id_infraestructura, punto_instalacion: cuerpo.punto_instalacion, tiene_estado: true,
  fecha_asociacion: new Date().toISOString(), fecha_finalizacion: null, id_usuario: 1, asociaciones_activo_superadas: superadas,
});
const SUPERADAS = [
  { id_asociacion_activo_sensor: 14, id_activo_biologico: 279, tipo: 'ambiental' },
  { id_asociacion_activo_sensor: 15, id_activo_biologico: 280, tipo: 'poblacional' },
];

test.use({ launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

// ── Navegación ───────────────────────────────────────────────────────────────

async function iniciarSesionAdmin(page: Page) {
  // Solo JWT de respuestas exitosas del backend (tras una recarga puede haber 401 con el token anterior)
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

// ── Protección de escrituras ─────────────────────────────────────────────────

/**
 * Aborta por defecto; `permitirPrimera` deja pasar el envío real sin `confirmar` (409) y
 * `simularConfirmacion` responde la confirmación con un 201 simulado.
 */
async function protegerAsociacion(page: Page) {
  const estado = { permitirPrimera: false, superadas: null as unknown[] | null, error404: false };
  const confirmaciones: Record<string, unknown>[] = [];
  await page.route(porRuta(RUTA_ASOCIAR), async (route) => {
    const req = route.request();
    if (req.method() !== 'POST') return route.fallback();
    const cuerpo = req.postDataJSON() ?? {};
    if (estado.error404) return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify(ERROR_404_AREA) });
    if (cuerpo.confirmar) {
      confirmaciones.push(cuerpo);
      if (estado.superadas === null) return route.abort();
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(confirmacion201(cuerpo, confirmaciones.length, estado.superadas)) });
    }
    return estado.permitirPrimera && new URL(req.url()).pathname.endsWith(`/sensores/${ID_SENSOR}/asociar`) ? route.fallback() : route.abort();
  });
  return { estado, confirmaciones };
}

/** Precondición del 409 real: el sensor sigue asociado a otra área (si no, el POST lo asociaría). */
async function verificarAsociacionActual(page: Page, token: () => string, testInfo: TestInfo) {
  await expect.poll(() => token(), { message: 'No se capturó el JWT de la sesión' }).not.toBe('');
  const res = await page.request.get(`${API_BASE}/configuracion/sensores/${ID_SENSOR}/asociaciones`, { headers: { authorization: token() } });
  expect(res.status(), `GET /configuracion/sensores/${ID_SENSOR}/asociaciones debe responder 200`).toBe(200);
  const items: { id_infraestructura: number; fecha_finalizacion: string | null; tiene_estado: boolean }[] = (await res.json()).items ?? [];
  const vigente = items.find((a) => a.fecha_finalizacion === null && a.tiene_estado);
  testInfo.annotations.push({ type: 'Asociación vigente del sensor', description: vigente ? `área #${vigente.id_infraestructura}` : 'ninguna' });
  expect(vigente && vigente.id_infraestructura !== ID_AREA_DESTINO, `Precondición: el sensor #${ID_SENSOR} debe seguir asociado a un área distinta de #${ID_AREA_DESTINO}; si no, el primer envío lo asociaría de verdad y no se envía`).toBe(true);
}

/** Sección "Asociación de Sensores a Áreas" (la pestaña IoT tiene otras secciones con tarjetas similares). */
function seccion(page: Page): Locator {
  return page
    .locator('div')
    .filter({ has: page.getByRole('heading', { name: 'Asociación de Sensores a Áreas' }) })
    .filter({ has: page.getByText('Área destino', { exact: true }) })
    .last();
}

function tarjeta(sec: Locator, texto: string): Locator {
  return sec.getByRole('button').filter({ hasText: texto }).first();
}

async function abrirAsociacion(page: Page): Promise<Locator> {
  await page.goto('/configuracion');
  await page.getByRole('button', { name: 'IoT', exact: true }).click();
  const titulo = page.getByRole('heading', { name: 'Asociación de Sensores a Áreas' });
  await titulo.scrollIntoViewIfNeeded();
  await expect(titulo).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  return seccion(page);
}

/** 2.4.3: tras cambiar de paso el foco no debe perderse en <body>. */
async function registrarFoco(page: Page, testInfo: TestInfo, paso: string) {
  const foco = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return 'body';
    return `${el.tagName.toLowerCase()}${el.getAttribute('aria-label') ? `[aria-label="${el.getAttribute('aria-label')}"]` : ''} "${(el.textContent ?? '').trim().slice(0, 40)}"`;
  });
  testInfo.annotations.push({ type: `Foco tras ${paso}`, description: foco });
  expect.soft(foco, `2.4.3: tras ${paso} el foco se pierde en <body> (el contenido del paso se reemplaza sin mover el foco)`).not.toBe('body');
}

function esAsociar(r: Request, confirmar?: boolean) {
  if (r.method() !== 'POST' || !RUTA_ASOCIAR.test(new URL(r.url()).pathname)) return false;
  if (confirmar === undefined) return true;
  return Boolean(r.postDataJSON()?.confirmar) === confirmar;
}

/** Recorre el asistente con teclado hasta el Paso 4 y deja lleno el punto de instalación. */
async function avanzarHastaPaso4(page: Page, testInfo: TestInfo, sec: Locator, escanearPasos = false) {
  if (escanearPasos) await escanear(page, 'paso-1-dispositivo', testInfo);

  const sensores = page.waitForResponse((r) => /\/dispositivos-iot\/\d+\/sensores$/.test(new URL(r.url()).pathname));
  await tarjeta(sec, DISPOSITIVO).focus();
  await page.keyboard.press('Enter');
  await sensores;
  await expect(sec.getByText(/Paso 2 — Elige el sensor de/)).toBeVisible();
  await registrarFoco(page, testInfo, 'elegir el dispositivo (Paso 1 → 2)');
  if (escanearPasos) await escanear(page, 'paso-2-sensor', testInfo);

  await tarjeta(sec, SENSOR).focus();
  await page.keyboard.press('Enter');
  await expect(sec.getByText(/Paso 3 — Elige el área productiva destino/)).toBeVisible();
  await registrarFoco(page, testInfo, 'elegir el sensor (Paso 2 → 3)');

  const areas = page.waitForResponse((r) => /\/configuracion\/infraestructuras$/.test(new URL(r.url()).pathname));
  await tarjeta(sec, FINCA).focus();
  await page.keyboard.press('Enter');
  await areas;
  await expect(tarjeta(sec, AREA_DESTINO)).toBeVisible();
  if (escanearPasos) await escanear(page, 'paso-3-area', testInfo);

  await tarjeta(sec, AREA_DESTINO).focus();
  await page.keyboard.press('Enter');
  const punto = sec.getByRole('textbox', { name: 'Punto de instalación física', exact: true });
  await expect(punto).toBeVisible();
  await registrarFoco(page, testInfo, 'elegir el área (Paso 3 → 4)');
  if (escanearPasos) await escanear(page, 'paso-4-punto-instalacion', testInfo);

  await punto.fill('QA accesibilidad - salida de agua');
  return { punto, confirmar: sec.getByRole('button', { name: 'Confirmar asociación' }) };
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

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Asociación de Sensores (RF-22)`, () => {
  // Modo por defecto (no serial): un paso con violaciones no debe impedir evaluar los demás.
  // workers: 1 en el config, así que los logins siguen siendo secuenciales.
  test.describe.configure({ timeout: 240_000 });

  let token: () => string;
  let proteccion: Awaited<ReturnType<typeof protegerAsociacion>>;

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!VIEWPORTS_HABILITADOS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_58_VIEWPORTS.`);
    expect(ADMIN_EMAIL, 'Falta TEST_ADMIN_EMAIL en testing/.env.test').not.toBe('');
    expect(ADMIN_PASSWORD, 'Falta TEST_ADMIN_PASSWORD en testing/.env.test').not.toBe('');
    proteccion = await protegerAsociacion(page);
    token = await iniciarSesionAdmin(page);
  });

  test('0. Estado real del ambiente - Paso 1 ofrece dispositivos', async ({ page }) => {
    const dispositivos = page.waitForResponse((r) => r.request().method() === 'GET' && RUTA_DISPOSITIVOS.test(new URL(r.url()).pathname), { timeout: 20_000 });
    await abrirAsociacion(page);
    expect(
      (await dispositivos).status(),
      'GET /configuracion/dispositivos-iot debe responder 200 para que el Paso 1 ofrezca dispositivos',
    ).toBe(200);
  });

  test('1-2. Flujo por pasos (dispositivo → sensor → área → punto) - 0 violaciones axe A/AA y foco (2.4.3)', async ({ page }, testInfo) => {
    const sec = await abrirAsociacion(page);
    await avanzarHastaPaso4(page, testInfo, sec, true);
  });

  test('3-4. Reasignación: el diálogo recibe el foco y Esc lo cierra sin cambios', async ({ page }, testInfo) => {
    const sec = await abrirAsociacion(page);
    const { confirmar } = await avanzarHastaPaso4(page, testInfo, sec);
    await verificarAsociacionActual(page, token, testInfo);
    proteccion.estado.permitirPrimera = true;
    const { confirmaciones } = proteccion;

    // Primer envío real: el backend pide confirmar la reasignación (409) sin cambiar la asociación
    const primera = page.waitForResponse((r) => esAsociar(r.request(), false));
    await confirmar.click();
    expect((await primera).status(), 'El backend debe pedir confirmación (409 REASIGNACION_REQUIERE_CONFIRMACION)').toBe(409);

    const dialogo = page.getByRole('dialog', { name: 'Confirmar reasignación' });
    await expect(dialogo).toBeVisible();
    await expect(dialogo).toContainText('ya está monitoreando el área');

    // Nota del caso: el diálogo debe recibir el foco automáticamente al aparecer
    const focoEnDialogo = await dialogo.evaluate((d) => d.contains(document.activeElement));
    testInfo.annotations.push({ type: 'Foco al abrir el diálogo', description: focoEnDialogo ? 'dentro del diálogo' : 'fuera del diálogo' });
    expect.soft(focoEnDialogo, '2.4.3: el diálogo de reasignación no recibe el foco al aparecer').toBe(true);

    await escanear(page, 'dialogo-reasignacion', testInfo);

    // Paso 4: Esc cierra el diálogo sin ejecutar cambios
    await page.keyboard.press('Escape');
    await expect.soft(dialogo, '2.1.1: la tecla Esc no cierra el diálogo de reasignación').toBeHidden({ timeout: 2_000 });
    expect(confirmaciones, 'Esc no debe enviar la confirmación de reasignación').toHaveLength(0);
  });

  test('5. Reasignación: Enter sobre "Reasignar" confirma (2.1.1) y el éxito se anuncia (4.1.3)', async ({ page }, testInfo) => {
    // La confirmación se simula (201): el sensor no se mueve de área en el ambiente
    proteccion.estado.superadas = [];
    const { confirmaciones } = proteccion;
    const sec = await abrirAsociacion(page);
    const { confirmar } = await avanzarHastaPaso4(page, testInfo, sec);
    await verificarAsociacionActual(page, token, testInfo);
    proteccion.estado.permitirPrimera = true;
    const dialogo = page.getByRole('dialog', { name: 'Confirmar reasignación' });

    // Enter activa el botón con foco: al abrir, el foco queda en el diálogo (en "Cancelar",
    // la opción segura); con Tab se llega a "Reasignar" y Enter confirma igual que el clic
    await confirmar.click();
    await expect(dialogo).toBeVisible();
    const reasignar = dialogo.getByRole('button', { name: 'Reasignar' });
    const recorrido: string[] = [];
    for (let i = 0; i < 6 && !(await reasignar.evaluate((b) => b === document.activeElement)); i++) {
      recorrido.push(await page.evaluate(() => (document.activeElement?.textContent ?? '').trim() || document.activeElement?.getAttribute('aria-label') || document.activeElement?.tagName || ''));
      await page.keyboard.press('Tab');
    }
    testInfo.annotations.push({ type: 'Foco en el diálogo hasta "Reasignar"', description: recorrido.join(' → ') || '(ya estaba en "Reasignar")' });
    await expect(reasignar, '2.1.1: "Reasignar" debe alcanzarse con Tab dentro del diálogo').toBeFocused();
    await page.keyboard.press('Enter');
    await expect.poll(() => confirmaciones.length, { message: '2.1.1: Enter sobre "Reasignar" debe confirmar la reasignación' }).toBe(1);
    expect(confirmaciones[0]).toMatchObject({ confirmar: true, id_dispositivo_iot: 1, id_infraestructura: ID_AREA_DESTINO });
    await expect(page.getByText('El sensor dejó de monitorear activos biológicos'), 'Sin asociaciones superadas no hay aviso').toHaveCount(0);

    // 4.1.3: la confirmación se anuncia (role="alert" / aria-live)
    const exito = page.getByRole('alert').filter({ hasText: 'reasignado' });
    await expect(exito).toBeVisible();
    await expect(exito).toHaveAttribute('aria-live', /assertive|polite/);

    await escanear(page, 'reasignacion-confirmada', testInfo);
  });

  test('3.3.1. Referencia inválida (HTTP 404 AREA_NO_ENCONTRADA) - anunciada y 0 violaciones axe A/AA', async ({ page }, testInfo) => {
    proteccion.estado.error404 = true;
    testInfo.annotations.push({ type: 'Respuesta inyectada', description: '404 AREA_NO_ENCONTRADA real del backend TEST (2026-09-28).' });

    const sec = await abrirAsociacion(page);
    const { confirmar } = await avanzarHastaPaso4(page, testInfo, sec);
    await confirmar.click();

    const alerta = sec.getByRole('alert').filter({ hasText: 'Ubicación inválida' });
    await expect(alerta, '3.3.1: el 404 de área inválida debe anunciarse').toBeVisible();

    await escanear(page, 'error-404-area', testInfo);
  });

  test('6. Reasignación que cierra asociaciones sensor→activo - aviso anunciado con enlaces a cada activo (RF-22 v1.1)', async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'Datos simulados', description: 'Confirmación respondida con 201 y asociaciones_activo_superadas (activo #279 ambiental, #280 poblacional); el sensor no se mueve de área.' });
    proteccion.estado.superadas = SUPERADAS;
    const sec = await abrirAsociacion(page);
    const { confirmar } = await avanzarHastaPaso4(page, testInfo, sec);
    await verificarAsociacionActual(page, token, testInfo);
    proteccion.estado.permitirPrimera = true;

    await confirmar.click();
    const dialogo = page.getByRole('dialog', { name: 'Confirmar reasignación' });
    await expect(dialogo).toBeVisible();
    await dialogo.getByRole('button', { name: 'Reasignar' }).click();
    await expect.poll(() => proteccion.confirmaciones.length).toBe(1);

    // 4.1.3: el aviso se anuncia (role="alert" con aria-live) y no desaparece solo
    const aviso = page.getByRole('alert').filter({ hasText: 'El sensor dejó de monitorear activos biológicos' });
    await expect(aviso, '4.1.3: el aviso de asociaciones cerradas debe anunciarse').toBeVisible();
    await expect(aviso).toHaveAttribute('aria-live', /assertive|polite/);
    await expect(aviso, 'El aviso indica cuántas asociaciones se cerraron').toContainText('se cerraron 2 asociaciones');
    await page.waitForTimeout(7_000);
    await expect(aviso, '2.2.1: el aviso con acciones pendientes no debe cerrarse solo').toBeVisible();

    // 1.3.1 / 2.4.4: lista de enlaces con propósito claro hacia la ficha de cada activo
    const lista = page.getByRole('list').filter({ has: page.getByRole('link', { name: /Activo #279/ }) });
    await expect(lista.getByRole('listitem'), '1.3.1: las asociaciones cerradas se presentan como lista').toHaveCount(2);
    for (const s of SUPERADAS) {
      const enlace = lista.getByRole('link', { name: new RegExp(`Activo #${s.id_activo_biologico} \\(${s.tipo}\\)`) });
      await expect(enlace, `2.4.4: el enlace al activo #${s.id_activo_biologico} nombra el activo y el tipo de asociación`).toBeVisible();
      await expect(enlace).toHaveAttribute('href', `/activos-biologicos/${s.id_activo_biologico}`);
    }

    // 2.1.1: los enlaces se alcanzan con Tab
    const primero = lista.getByRole('link').first();
    await primero.focus();
    await expect(primero, '2.1.1: el enlace recibe el foco del teclado').toBeFocused();
    await page.keyboard.press('Tab');
    await expect(lista.getByRole('link').nth(1), '2.1.1: Tab pasa al siguiente enlace').toBeFocused();

    await escanear(page, 'aviso-asociaciones-superadas', testInfo);
  });
});
