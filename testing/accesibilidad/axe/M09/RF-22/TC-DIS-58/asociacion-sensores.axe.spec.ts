/**
 * TC-DIS-58 — Accesibilidad WCAG 2.1 AA del flujo por pasos de Asociación de Sensores
 * RF-22 · CU-05 Gestionar Dispositivos IoT · Rol: Administrador
 * Configuración → IoT → "Asociación de Sensores a Áreas":
 *   Paso 1 dispositivo → Paso 2 sensor → Paso 3 área destino → Paso 4 punto de instalación
 *
 * Herramientas: @axe-core/playwright (reporte axe-<TC>.html/json) + Lighthouse en
 * modo snapshot sobre la misma sesión (lighthouse-<TC>-<paso>.html/json), ambos
 * en ./resultados.
 *
 * Datos: dispositivo #1 "IOT-EST01-HLA-001", sensor #3 "Sensor oxígeno disuelto
 * estanque-01", hoy asociado al área Estanque-01 (#1). Destino: Estanque-02 (#2).
 * Asociarlo sin `confirmar` responde 409 REASIGNACION_REQUIERE_CONFIRMACION y NO
 * cambia la asociación (verificado), así que el diálogo se dispara contra el backend
 * real. La confirmación (`confirmar: true`) se intercepta con page.route para no
 * mover el sensor en el ambiente.
 *
 * BLOQUEOS DEL AMBIENTE (2026-09-28, ver TC-DIS-49/55): GET /configuracion/fincas y
 * GET /configuracion/dispositivos-iot?solo_activos=false responden 400. El test "0"
 * verifica el estado real; el resto sirve con page.route el listado de fincas
 * (#1–#5 reales) y el de dispositivos (activos reales). Sensores y áreas son reales.
 *
 * Viewports: corre en movil / tablet / escritorio por defecto — se confirmó
 * que esta pantalla navega directo por URL (no por el toggle del sidebar) y
 * no reproduce el bug de M01. Para acotarlo puntualmente:
 *   TC_DIS_58_VIEWPORTS=escritorio
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

// Fincas #1–#5 del ambiente TEST (GET /configuracion/fincas/{id}, 2026-09-28)
const FINCAS_FIXTURE = [
  { id_finca: 1, nombre: 'Finca Acuícola El Remanso', ubicacion: { departamento: 'Huila', municipio: 'Neiva', vereda: 'El Remanso', latitud: '2.9273', longitud: '-75.2819' }, tamano_h: '12.50', es_activo: true, fecha_creacion: '2026-04-28T14:42:28Z', fecha_actualizacion: '2026-04-28T14:42:28.213141Z', id_usuario: 2 },
  { id_finca: 2, nombre: 'Piscícola Los Esteros', ubicacion: { departamento: 'Valle del Cauca', municipio: 'Cartago', vereda: 'Los Esteros', latitud: '3.8654', longitud: '-76.4920' }, tamano_h: '8.75', es_activo: true, fecha_creacion: '2026-04-28T14:42:28Z', fecha_actualizacion: '2026-04-28T14:42:28.213141Z', id_usuario: 2 },
  { id_finca: 3, nombre: 'Camaronera Costa Azul', ubicacion: { departamento: 'Cordoba', municipio: 'Monteria', vereda: 'Costa Azul', latitud: '8.7479', longitud: '-75.8814' }, tamano_h: '25.00', es_activo: true, fecha_creacion: '2026-04-28T14:42:28Z', fecha_actualizacion: '2026-04-28T14:42:28.213141Z', id_usuario: 2 },
  { id_finca: 4, nombre: 'Granja Piscícola La Esperanza', ubicacion: { departamento: 'Caldas', municipio: 'Manizales', vereda: 'La Esperanza', latitud: '5.0689', longitud: '-75.5174' }, tamano_h: '6.30', es_activo: true, fecha_creacion: '2026-04-28T14:42:28Z', fecha_actualizacion: '2026-04-28T14:42:28.213141Z', id_usuario: 2 },
  { id_finca: 5, nombre: 'Finca El Paraiso Norte', ubicacion: { departamento: 'Antioquia', municipio: 'Medellin', vereda: 'La Estrella', latitud: '6.30', longitud: '-75.60' }, tamano_h: '120.00', es_activo: false, fecha_creacion: '2026-06-21T16:13:31Z', fecha_actualizacion: '2026-06-21T16:13:31.510491Z', id_usuario: 2 },
];

// Respuesta 404 real del backend TEST (POST /configuracion/sensores/3/asociar con área inexistente, 2026-09-28)
const ERROR_404_AREA = {
  error_code: 'AREA_NO_ENCONTRADA',
  message: 'Ubicación inválida: El área productiva seleccionada no existe o se encuentra desactivada. No se pueden asociar sensores a infraestructuras fuera de operación.',
  fields: [{ field: 'id_infraestructura', message: 'Ubicación inválida: El área productiva seleccionada no existe o se encuentra desactivada. No se pueden asociar sensores a infraestructuras fuera de operación.' }],
};

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

async function reconstruir(page: Page, token: () => string, testInfo: TestInfo) {
  await page.goto('/configuracion');
  await expect.poll(() => token(), { message: 'No se capturó el JWT de la sesión' }).not.toBe('');
  const activos = await page.request.get(`${API_BASE}/configuracion/dispositivos-iot?solo_activos=true`, { headers: { authorization: token() } });
  expect(activos.status(), 'El listado de dispositivos activos debe responder 200').toBe(200);
  const dispositivos = await activos.json();

  const json = (cuerpo: unknown) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(cuerpo) });
  await page.route(porRuta(RUTA_FINCAS), (r) => (r.request().method() === 'GET' ? r.fulfill(json(FINCAS_FIXTURE)) : r.fallback()));
  await page.route(porRuta(RUTA_DISPOSITIVOS), (r) => (r.request().method() === 'GET' ? r.fulfill(json(dispositivos)) : r.fallback()));
  testInfo.annotations.push({
    type: 'Datos simulados',
    description: 'Listado de fincas (#1–#5 reales) y de dispositivos (activos reales vía solo_activos=true) servidos con page.route por los 400 de ambos listados. Sensores y áreas son reales.',
  });
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

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Asociación de Sensores (RF-22)`, () => {
  // Modo por defecto (no serial): un paso con violaciones no debe impedir evaluar los demás.
  // workers: 1 en el config, así que los logins siguen siendo secuenciales.
  test.describe.configure({ timeout: 240_000 });

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

  test('0. Estado real del ambiente - Paso 1 ofrece dispositivos', async ({ page }) => {
    const dispositivos = page.waitForResponse((r) => r.request().method() === 'GET' && RUTA_DISPOSITIVOS.test(new URL(r.url()).pathname), { timeout: 20_000 });
    await abrirAsociacion(page);
    expect(
      (await dispositivos).status(),
      'BLOQUEO: GET /configuracion/dispositivos-iot?solo_activos=false responde 400 (SERIAL_FORMATO_INVALIDO); el Paso 1 no ofrece dispositivos',
    ).toBe(200);
  });

  test('1-2. Flujo por pasos (dispositivo → sensor → área → punto) - 0 violaciones axe A/AA y foco (2.4.3)', async ({ page }, testInfo) => {
    await reconstruir(page, token, testInfo);
    const sec = await abrirAsociacion(page);
    await avanzarHastaPaso4(page, testInfo, sec, true);
  });

  test('3-4. Reasignación: el diálogo recibe el foco y Esc lo cierra sin cambios', async ({ page }, testInfo) => {
    await reconstruir(page, token, testInfo);
    const sec = await abrirAsociacion(page);
    const { confirmar } = await avanzarHastaPaso4(page, testInfo, sec);

    const confirmaciones: Request[] = [];
    page.on('request', (r) => { if (esAsociar(r, true)) confirmaciones.push(r); });

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

  test('5. Reasignación: Enter confirma igual que el clic en "Reasignar" (4.1.3 anunciado)', async ({ page }, testInfo) => {
    await reconstruir(page, token, testInfo);
    // Solo se intercepta la confirmación: el sensor no se mueve de área en el ambiente
    const confirmaciones: Record<string, unknown>[] = [];
    await page.route(porRuta(RUTA_ASOCIAR), async (route) => {
      if (!esAsociar(route.request(), true)) return route.fallback();
      const cuerpo = route.request().postDataJSON();
      confirmaciones.push(cuerpo);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id_sensores_area_asociada: 900000 + confirmaciones.length, id_sensor: 3, id_dispositivo_iot: cuerpo.id_dispositivo_iot,
          id_infraestructura: cuerpo.id_infraestructura, punto_instalacion: cuerpo.punto_instalacion, tiene_estado: true,
          fecha_asociacion: new Date().toISOString(), fecha_finalizacion: null, id_usuario: 1,
        }),
      });
    });

    const sec = await abrirAsociacion(page);
    const { confirmar } = await avanzarHastaPaso4(page, testInfo, sec);
    const dialogo = page.getByRole('dialog', { name: 'Confirmar reasignación' });

    // Enter con el diálogo abierto (sin mover el foco manualmente, como lo haría el usuario)
    await confirmar.click();
    await expect(dialogo).toBeVisible();
    await page.keyboard.press('Enter');
    await expect.poll(() => confirmaciones.length, {
      message: '2.1.1: Enter con el diálogo abierto no confirma la reasignación (el foco quedó fuera del diálogo)',
      timeout: 3_000,
    }).toBeGreaterThan(0).catch(() => { /* se registra abajo como soft */ });
    expect.soft(confirmaciones.length, '2.1.1: Enter con el diálogo abierto no confirma la reasignación (el foco quedó fuera del diálogo)').toBeGreaterThan(0);

    // Referencia: el clic en "Reasignar" sí confirma
    if (await dialogo.isVisible()) {
      await dialogo.getByRole('button', { name: 'Reasignar' }).click();
    }
    await expect.poll(() => confirmaciones.length, { message: 'El clic en "Reasignar" debe confirmar' }).toBeGreaterThan(0);
    expect(confirmaciones[0]).toMatchObject({ confirmar: true, id_dispositivo_iot: 1, id_infraestructura: 2 });

    // 4.1.3: la confirmación se anuncia (role="alert" / aria-live)
    const exito = page.getByRole('alert').filter({ hasText: 'reasignado' });
    await expect(exito).toBeVisible();
    await expect(exito).toHaveAttribute('aria-live', /assertive|polite/);

    await escanear(page, 'reasignacion-confirmada', testInfo);
  });

  test('3.3.1. Referencia inválida (HTTP 404 AREA_NO_ENCONTRADA) - anunciada y 0 violaciones axe A/AA', async ({ page }, testInfo) => {
    await reconstruir(page, token, testInfo);
    await page.route(porRuta(RUTA_ASOCIAR), (route) =>
      route.request().method() === 'POST'
        ? route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify(ERROR_404_AREA) })
        : route.fallback());

    const sec = await abrirAsociacion(page);
    const { confirmar } = await avanzarHastaPaso4(page, testInfo, sec);
    await confirmar.click();

    const alerta = sec.getByRole('alert').filter({ hasText: 'Ubicación inválida' });
    await expect(alerta, '3.3.1: el 404 de área inválida debe anunciarse').toBeVisible();

    await escanear(page, 'error-404-area', testInfo);
  });
});
