import AxeBuilder from '@axe-core/playwright';
import { expect, test, Page } from '@playwright/test';

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL ?? '';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD ?? '';

async function iniciarSesion(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/correo electrónico/i).fill(TEST_USER_EMAIL);
  await page.getByLabel(/contraseña/i).fill(TEST_USER_PASSWORD);
  await page.getByRole('button', { name: /ingresar/i }).click();
  await page.waitForURL('**/dashboard');
}

// El ícono de campana vive en el AppBar, visible en cualquier pantalla con
// sesión iniciada (ver AppBar.tsx). Nombre accesible real: t('nav:aria.notificaciones')
// = "Notificaciones", o "Notificaciones ({{count}} sin leer)" si hay pendientes.
async function abrirPanelNotificaciones(page: Page) {
  await page.getByRole('button', { name: /^Notificaciones/i }).click();
  await expect(page.getByRole('dialog', { name: /notificaciones/i })).toBeVisible();
}

test.describe('TC-DIS-35 - Accesibilidad WCAG 2.1 AA - Panel de Notificaciones (RF-14)', () => {

  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page);
  });

  test('panel de notificaciones abierto - 0 violaciones axe A/AA', async ({ page }) => {
    await abrirPanelNotificaciones(page);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('Esc cierra el panel de notificaciones', async ({ page }) => {
    await abrirPanelNotificaciones(page);

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: /notificaciones/i })).not.toBeVisible();
  });

  test('marcar una notificación como leída - operable por teclado', async ({ page }) => {
    await abrirPanelNotificaciones(page);

    // Solo las notificaciones sin leer muestran el botón "Marcar como leída: {mensaje}"
    // (NotificationTray.tsx). Si los datos de prueba actuales no tienen pendientes, se
    // omite: no es un defecto, es un estado de datos.
    const primerBotonMarcar = page.getByRole('button', { name: /^Marcar como leída:/ }).first();
    const hayNoLeidas = await primerBotonMarcar.isVisible().catch(() => false);
    test.skip(!hayNoLeidas, 'No hay notificaciones sin leer en los datos de prueba actuales');

    await primerBotonMarcar.focus();
    await page.keyboard.press('Enter');
    await expect(primerBotonMarcar).toBeHidden();
  });

});
