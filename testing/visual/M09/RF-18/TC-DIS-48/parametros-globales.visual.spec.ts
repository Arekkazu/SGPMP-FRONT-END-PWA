/**
 * TC-DIS-48 — Consistencia visual del formulario de Parámetros Operativos Globales
 * RF-18 · Rol: Administrador · Configuración → pestaña "Sistema"
 *
 * Una sola baseline por estado (el formulario es único y exclusivo del
 * Administrador, no varía por rol):
 *   - estado inicial,
 *   - error de heartbeat inconsistente (heartbeat < frecuencia, validación del cliente),
 *   - error HTTP 400 del backend (HEARTBEAT_MENOR_FRECUENCIA), inyectado con
 *     page.route porque el cliente bloquea el envío antes de llegar al backend.
 * Ningún test guarda: la configuración es global y afecta a todos los
 * dispositivos IoT del ambiente.
 *
 * Viewports: el script contempla movil / tablet / escritorio, pero solo se
 * ejecuta ESCRITORIO por el defecto abierto de sidebar/scroll (TC-DIS-07/08/10/11).
 * Para habilitarlos: TC_DIS_48_VIEWPORTS=movil,tablet,escritorio
 */
import { expect, test, type Locator, type Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_48_VIEWPORTS ?? 'escritorio')
  .split(',')
  .map((v) => v.trim());

const RUTA_PARAMETROS = /\/configuracion\/parametros\/\d+$/;

// Respuesta 400 real del backend TEST (PATCH /configuracion/parametros/1, 2026-09-28)
const ERROR_400_HEARTBEAT = {
  error_code: 'HEARTBEAT_MENOR_FRECUENCIA',
  message:
    'Conflicto de lógica operativa: El tiempo de espera (heartbeat) debe ser mayor o igual a la frecuencia de muestreo. No se puede esperar una señal en un tiempo menor al intervalo de envío configurado.',
  fields: [{ field: 'heartbeat', message: 'Conflicto de lógica operativa: El tiempo de espera (heartbeat) debe ser mayor o igual a la frecuencia de muestreo.' }],
};

const OPCIONES_CAPTURA = { fullPage: true, animations: 'disabled' as const, caret: 'hide' as const };

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
    guardar: page.getByRole('button', { name: 'Guardar configuración' }),
  };
  await expect(form.frecuencia).not.toHaveValue('');
  await page.evaluate(() => document.fonts.ready);
  return form;
}

/** Fecha/hora de "Última actualización": cambia si alguien guarda la configuración. */
function fechaActualizacion(page: Page): Locator {
  return page.getByText(/^\d{2}\/\d{2}\/\d{2},/);
}

test.describe('TC-DIS-48 - Consistencia visual - Parámetros Operativos Globales (RF-18)', () => {
  // workers: 1 en el config; timeout amplio por la latencia del login en TEST
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      !VIEWPORTS_HABILITADOS.includes(testInfo.project.name),
      `Viewport "${testInfo.project.name}" deshabilitado: defecto abierto de sidebar/scroll en móvil y tablet (TC-DIS-07/08/10/11). Solo se evalúa escritorio.`,
    );
    expect(ADMIN_EMAIL, 'Falta TEST_ADMIN_EMAIL en testing/.env.test').not.toBe('');
    expect(ADMIN_PASSWORD, 'Falta TEST_ADMIN_PASSWORD en testing/.env.test').not.toBe('');

    await iniciarSesionAdmin(page);
  });

  test('1-2. Formulario en estado inicial', async ({ page }) => {
    const form = await abrirParametros(page);
    await expect(form.guardar).toBeDisabled();

    await expect(page).toHaveScreenshot('parametros-estado-inicial.png', {
      ...OPCIONES_CAPTURA,
      mask: [fechaActualizacion(page)],
    });
  });

  test('3. Error de heartbeat inconsistente (validación del cliente)', async ({ page }) => {
    const form = await abrirParametros(page);
    const frecuencia = Number(await form.frecuencia.inputValue());

    await form.heartbeat.fill(String(frecuencia - 1));
    await form.heartbeat.blur();
    await form.guardar.click();
    await expect(page.getByRole('alert').filter({ hasText: 'Debe ser mayor o igual a la frecuencia de muestreo.' })).toBeVisible();

    await expect(page).toHaveScreenshot('parametros-error-heartbeat-cliente.png', {
      ...OPCIONES_CAPTURA,
      mask: [fechaActualizacion(page)],
    });
  });

  test('3. Error HTTP 400 del backend (HEARTBEAT_MENOR_FRECUENCIA)', async ({ page }) => {
    await page.route(RUTA_PARAMETROS, (route) =>
      route.request().method() === 'PATCH'
        ? route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify(ERROR_400_HEARTBEAT) })
        : route.fallback());

    const form = await abrirParametros(page);
    // Valor válido para el cliente (heartbeat + 1) para que la petición llegue al "backend"
    await form.heartbeat.fill(String(Number(await form.heartbeat.inputValue()) + 1));
    await form.heartbeat.blur();
    await form.guardar.click();
    await expect(page.getByRole('alert').filter({ hasText: 'Error al guardar' })).toBeVisible();

    await expect(page).toHaveScreenshot('parametros-error-400-backend.png', {
      ...OPCIONES_CAPTURA,
      mask: [fechaActualizacion(page)],
    });
  });
});
