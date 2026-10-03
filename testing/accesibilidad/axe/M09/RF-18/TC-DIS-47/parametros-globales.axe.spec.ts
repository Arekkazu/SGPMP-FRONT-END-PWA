/**
 * TC-DIS-47 — Accesibilidad WCAG 2.1 AA del formulario de Parámetros Operativos Globales
 * RF-18 · Rol: Administrador · Configuración → pestaña "Sistema"
 *
 * Herramientas: @axe-core/playwright (reporte axe-<TC>.html/json) + Lighthouse en
 * modo snapshot sobre la misma sesión (lighthouse-<TC>-<paso>.html/json), ambos
 * en ./resultados.
 *
 * Paso 3: la regla "heartbeat ≥ frecuencia" se valida en el cliente, así que el
 * 400 real del backend no se alcanza desde la UI. Se prueban ambos: (a) el error
 * del cliente y (b) la respuesta 400 real del backend (HEARTBEAT_MENOR_FRECUENCIA,
 * capturada del ambiente TEST) inyectada con page.route en un envío válido.
 *
 * Paso 4: la configuración es GLOBAL (afecta a todos los dispositivos IoT del
 * ambiente), así que el guardado se intercepta: se verifica que Enter envíe la
 * misma petición que el clic sin modificar los datos reales.
 *
 * Viewports: corre en movil / tablet / escritorio por defecto — se confirmó
 * que esta pantalla navega directo por URL (no por el toggle del sidebar) y
 * no reproduce el bug de M01. Para acotarlo puntualmente:
 *   TC_DIS_47_VIEWPORTS=escritorio
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page, type Request, type TestInfo } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { auditarLighthouse, PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';

const TC_ID = 'TC-DIS-47';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_47_VIEWPORTS ?? 'movil,tablet,escritorio')
  .split(',')
  .map((v) => v.trim());

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const RUTA_PARAMETROS = /\/configuracion\/parametros\/\d+$/;

// Respuesta 400 real del backend TEST (PATCH /configuracion/parametros/1, 2026-09-28)
const ERROR_400_HEARTBEAT = {
  error_code: 'HEARTBEAT_MENOR_FRECUENCIA',
  message:
    'Conflicto de lógica operativa: El tiempo de espera (heartbeat) debe ser mayor o igual a la frecuencia de muestreo. No se puede esperar una señal en un tiempo menor al intervalo de envío configurado.',
  fields: [
    {
      field: 'heartbeat',
      message:
        'Conflicto de lógica operativa: El tiempo de espera (heartbeat) debe ser mayor o igual a la frecuencia de muestreo. No se puede esperar una señal en un tiempo menor al intervalo de envío configurado.',
    },
  ],
};

test.use({ launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

// ── Navegación ───────────────────────────────────────────────────────────────

async function iniciarSesionAdmin(page: Page) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill(ADMIN_EMAIL);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 });
}

interface Formulario {
  frecuencia: Locator;
  heartbeat: Locator;
  restablecer: Locator;
  guardar: Locator;
}

/** /configuracion → Sistema, con la configuración vigente cargada en el formulario. */
async function abrirParametros(page: Page): Promise<Formulario> {
  await page.goto('/configuracion');
  const carga = page.waitForResponse(
    (res) => res.request().method() === 'GET' && /\/configuracion\/parametros$/.test(new URL(res.url()).pathname),
    { timeout: 20_000 },
  );
  await page.getByRole('button', { name: 'Sistema', exact: true }).click();
  await carga;
  await expect(page.getByRole('heading', { name: 'Parámetros Operativos del Sistema' })).toBeVisible();

  const form: Formulario = {
    frecuencia: page.getByRole('spinbutton', { name: /Frecuencia de muestreo \(minutos\)/ }),
    heartbeat: page.getByRole('spinbutton', { name: /Heartbeat — tiempo máx\. sin datos \(minutos\)/ }),
    restablecer: page.getByRole('button', { name: 'Restablecer' }),
    guardar: page.getByRole('button', { name: 'Guardar configuración' }),
  };
  await expect(form.frecuencia).not.toHaveValue('');
  await page.evaluate(() => document.fonts.ready);
  return form;
}

function esGuardado(r: Request) {
  return r.method() === 'PATCH' && RUTA_PARAMETROS.test(new URL(r.url()).pathname);
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

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Parámetros Operativos Globales (RF-18)`, () => {
  // Modo por defecto (no serial): un paso con violaciones no debe impedir evaluar los demás.
  // workers: 1 en el config, así que los logins siguen siendo secuenciales.
  test.describe.configure({ timeout: 180_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      !VIEWPORTS_HABILITADOS.includes(testInfo.project.name),
      `Viewport "${testInfo.project.name}" deshabilitado: defecto abierto de sidebar/scroll en móvil y tablet (TC-DIS-07/08/10/11). Solo se evalúa escritorio.`,
    );
    expect(ADMIN_EMAIL, 'Falta TEST_ADMIN_EMAIL en testing/.env.test').not.toBe('');
    expect(ADMIN_PASSWORD, 'Falta TEST_ADMIN_PASSWORD en testing/.env.test').not.toBe('');

    await iniciarSesionAdmin(page);
  });

  test('1-2. Formulario en estado inicial - 0 violaciones axe A/AA (1.3.1 labels)', async ({ page }, testInfo) => {
    const form = await abrirParametros(page);

    // 1.3.1 / 4.1.2: los dos campos se localizan por su label y son obligatorios
    await expect(form.frecuencia).toHaveAttribute('aria-required', 'true');
    await expect(form.heartbeat).toHaveAttribute('aria-required', 'true');

    await escanear(page, 'estado-inicial', testInfo);
  });

  test('3a. Heartbeat menor a la frecuencia (validación del cliente) - anunciado y 0 violaciones axe A/AA', async ({ page }, testInfo) => {
    const form = await abrirParametros(page);
    const frecuencia = Number(await form.frecuencia.inputValue());

    let envios = 0;
    page.on('request', (r) => { if (esGuardado(r)) envios++; });

    await form.heartbeat.fill(String(frecuencia - 1));
    await form.heartbeat.blur();
    await form.guardar.click();

    // 3.3.1: error identificado junto al campo y anunciado (role="alert")
    const error = page.getByRole('alert').filter({ hasText: 'Debe ser mayor o igual a la frecuencia de muestreo.' });
    await expect(error).toBeVisible();
    await expect.soft(form.heartbeat, '3.3.1: el campo con error debe marcarse con aria-invalid').toHaveAttribute('aria-invalid', 'true');
    await expect
      .soft(form.heartbeat, '3.3.1: el mensaje de error debe estar asociado al campo (aria-describedby)')
      .toHaveAccessibleDescription(/Debe ser mayor o igual a la frecuencia de muestreo/);
    expect(envios, 'La validación del cliente debe bloquear el envío').toBe(0);

    await escanear(page, 'error-heartbeat-cliente', testInfo);
  });

  test('3b. Respuesta HTTP 400 del backend (HEARTBEAT_MENOR_FRECUENCIA) - anunciada y 0 violaciones axe A/AA', async ({ page }, testInfo) => {
    await page.route(RUTA_PARAMETROS, (route) =>
      route.request().method() === 'PATCH'
        ? route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify(ERROR_400_HEARTBEAT) })
        : route.fallback());

    const form = await abrirParametros(page);
    // Valor válido para el cliente (heartbeat + 1) para que la petición llegue al "backend"
    await form.heartbeat.fill(String(Number(await form.heartbeat.inputValue()) + 1));
    await form.guardar.click();

    const alerta = page.getByRole('alert').filter({ hasText: 'Error al guardar' });
    await expect(alerta).toBeVisible();
    await expect(alerta).toContainText('heartbeat');

    await escanear(page, 'error-400-heartbeat', testInfo);
  });

  test('4. Teclado (2.1.1) - Tab recorre el formulario y Enter guarda igual que el clic', async ({ page }) => {
    const form = await abrirParametros(page);
    const frecuencia = Number(await form.frecuencia.inputValue());
    const heartbeatInicial = Number(await form.heartbeat.inputValue());

    // Guardado interceptado: la configuración es global y no se modifica en el ambiente
    const cuerpos: Record<string, unknown>[] = [];
    await page.route(RUTA_PARAMETROS, async (route) => {
      if (route.request().method() !== 'PATCH') return route.fallback();
      const cuerpo = route.request().postDataJSON();
      cuerpos.push(cuerpo);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id_configuracion_global: 1,
          frecuencia_muestreo: cuerpo.frecuencia_muestreo,
          heartbeat: cuerpo.heartbeat,
          fecha_actualizacion: new Date().toISOString(),
          id_usuario: 1,
          es_activo: true,
        }),
      });
    });

    const guardarCon = async (heartbeat: number, disparar: () => Promise<void>) => {
      await form.heartbeat.fill(String(heartbeat));
      const peticion = page.waitForRequest(esGuardado, { timeout: 5_000 });
      await disparar();
      await peticion;
      // Tras guardar, el formulario se sincroniza con la respuesta
      await expect(form.heartbeat).toHaveValue(String(heartbeat));
      await expect(form.guardar).toBeDisabled();
    };

    // Orden de tabulación: frecuencia → heartbeat → Restablecer → Guardar
    await form.heartbeat.fill(String(heartbeatInicial + 1));
    await form.frecuencia.focus();
    await page.keyboard.press('Tab');
    await expect(form.heartbeat).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(form.restablecer).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(form.guardar).toBeFocused();

    // Enter en "Frecuencia", Enter en "Heartbeat" y clic en "Guardar" deben enviar lo mismo
    await guardarCon(heartbeatInicial + 1, async () => { await form.frecuencia.focus(); await page.keyboard.press('Enter'); });
    await guardarCon(heartbeatInicial + 2, async () => { await form.heartbeat.focus(); await page.keyboard.press('Enter'); });
    await guardarCon(heartbeatInicial + 3, async () => { await form.guardar.click(); });

    expect(cuerpos).toHaveLength(3);
    const claves = cuerpos.map((c) => Object.keys(c).sort().join(','));
    expect(new Set(claves).size, 'Enter y clic deben enviar el mismo formato de petición').toBe(1);
    expect(cuerpos.map((c) => [c.frecuencia_muestreo, c.heartbeat])).toEqual([
      [frecuencia, heartbeatInicial + 1],
      [frecuencia, heartbeatInicial + 2],
      [frecuencia, heartbeatInicial + 3],
    ]);
  });
});
