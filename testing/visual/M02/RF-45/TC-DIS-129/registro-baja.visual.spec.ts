/**
 * TC-DIS-129 — Consistencia visual del formulario de Registro de Baja y su diálogo de confirmación
 * RF-45 · CU-09 Registrar Eventos Productivos y Bajas · Rol: Productor
 * Activos biológicos → ficha del activo → pestaña "Eventos" → "Baja"
 *
 * Baselines (solo la tarjeta del modal, sin el fondo):
 *   - Formulario de baja TOTAL del lote (cantidad afectada vacía).
 *   - Formulario de baja PARCIAL del lote (cantidad afectada = 3).
 *   - Diálogo de confirmación irreversible (DEFECTO abierto, ver TC-DIS-128: no existe;
 *     el test falla hasta que se implemente y entonces genera su baseline).
 *
 * Datos: lote #296 (POBLACIONAL, ACTIVO, 10 animales) del Productor de prueba.
 *
 * PROTECCIÓN DE DATOS: la baja es IRREVERSIBLE. Todo POST …/eventos/baja se aborta, así
 * que aunque el formulario se envíe (hoy no hay confirmación intermedia) ninguna baja
 * llega al backend.
 *
 * Fecha: "Fecha de baja" se precarga con el día actual; se fija el reloj del navegador
 * (29-09-2026, America/Bogota) para que la baseline sea estable.
 *
 * Viewports: el script contempla movil / tablet / escritorio, pero solo se
 * ejecuta ESCRITORIO por el defecto abierto de sidebar/scroll (TC-DIS-07/08/10/11).
 * Para habilitarlos: TC_DIS_129_VIEWPORTS=movil,tablet,escritorio
 */
import { expect, test, type Locator, type Page } from '@playwright/test';

const USER_EMAIL = process.env.TEST_USER_EMAIL ?? '';
const USER_PASSWORD = process.env.TEST_USER_PASSWORD ?? '';

const ID_LOTE = 296;
const FECHA_FIJA = new Date('2026-09-29T12:00:00-05:00');
const MOTIVO = 'Mortalidad por golpe de calor (QA TC-DIS-129)';
const IRREVERSIBLE = /no se puede deshacer|irreversible/i;

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_129_VIEWPORTS ?? 'escritorio')
  .split(',')
  .map((v) => v.trim());

const URL_BAJA = (url: URL) => /\/activos-biologicos\/\d+\/eventos\/baja$/.test(url.pathname);

test.use({ timezoneId: 'America/Bogota', locale: 'es-CO' });

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

/** Tarjeta de un diálogo (sin el fondo semitransparente que cubre la página). */
function tarjeta(dlg: Locator): Locator {
  return dlg.locator('> div');
}

async function abrirFormulario(page: Page) {
  await page.goto(`/activos-biologicos/${ID_LOTE}`);
  const secciones = page.getByRole('navigation', { name: 'Secciones del activo' });
  await expect(secciones).toBeVisible({ timeout: 20_000 });
  await secciones.getByRole('button', { name: 'Eventos', exact: true }).click();
  const baja = page.getByRole('button', { name: 'Baja', exact: true });
  await expect(baja).toBeEnabled({ timeout: 20_000 });
  await baja.click();
  await expect(dialogo(page)).toBeVisible();
  await expect(dialogo(page).getByRole('spinbutton', { name: /Cantidad afectada/ }), 'El lote debe mostrar "Cantidad afectada"').toBeVisible();
}

/** Completa el formulario; cantidad vacía = baja total del lote. */
async function llenar(page: Page, cantidad: string) {
  const d = dialogo(page);
  await d.getByRole('combobox', { name: /Tipo de baja/ }).selectOption('muerte');
  await d.getByRole('spinbutton', { name: /Cantidad afectada/ }).fill(cantidad);
  await d.getByRole('textbox', { name: /Motivo de la baja/ }).fill(MOTIVO);
  // Quita el foco para capturar sin anillo de foco ni cursor de texto
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.evaluate(() => document.fonts.ready);
}

test.describe('TC-DIS-129 - Consistencia visual - Registro de baja (RF-45)', () => {
  // workers: 1 en el config; timeout amplio por la latencia del login en TEST
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      !VIEWPORTS_HABILITADOS.includes(testInfo.project.name),
      `Viewport "${testInfo.project.name}" deshabilitado: defecto abierto de sidebar/scroll en móvil y tablet (TC-DIS-07/08/10/11). Solo se evalúa escritorio.`,
    );
    expect(USER_EMAIL, 'Falta TEST_USER_EMAIL en testing/.env.test').not.toBe('');
    expect(USER_PASSWORD, 'Falta TEST_USER_PASSWORD en testing/.env.test').not.toBe('');
    // Acción irreversible: ninguna baja llega al backend
    await page.route(URL_BAJA, (r) => (r.request().method() === 'POST' ? r.abort() : r.continue()));
    await iniciarSesionProductor(page);
    // Después del login: la fecha precargada del formulario queda fija
    await page.clock.setFixedTime(FECHA_FIJA);
  });

  test('1. Formulario de baja total del lote (cantidad vacía)', async ({ page }) => {
    await abrirFormulario(page);
    await llenar(page, '');
    await expect(tarjeta(dialogo(page))).toHaveScreenshot('registro-baja-total.png', { animations: 'disabled' });
  });

  test('1. Formulario de baja parcial del lote (cantidad = 3)', async ({ page }) => {
    await abrirFormulario(page);
    await llenar(page, '3');
    await expect(tarjeta(dialogo(page))).toHaveScreenshot('registro-baja-parcial.png', { animations: 'disabled' });
  });

  test('2. Diálogo de confirmación irreversible', async ({ page }) => {
    await abrirFormulario(page);
    await llenar(page, '3');
    await dialogo(page).getByRole('button', { name: 'Registrar baja', exact: true }).click();

    const confirmacion = page.getByRole('alertdialog').or(page.getByRole('dialog').filter({ hasText: IRREVERSIBLE })).first();
    await expect(
      confirmacion,
      'DEFECTO (ver TC-DIS-128): no existe diálogo de confirmación; "Registrar baja" envía la baja directamente (el POST se abortó). No hay baseline que capturar.',
    ).toBeVisible({ timeout: 5_000 });
    await expect(tarjeta(confirmacion)).toHaveScreenshot('registro-baja-confirmacion.png', { animations: 'disabled' });
  });
});
