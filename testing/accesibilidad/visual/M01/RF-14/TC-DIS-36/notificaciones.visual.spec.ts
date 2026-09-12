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

test.describe('TC-DIS-36 - Consistencia visual - Panel de Notificaciones (RF-14)', () => {

  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page);
  });

  test('panel de notificaciones abierto', async ({ page }) => {
    await page.getByRole('button', { name: /^Notificaciones/i }).click();
    await expect(page.getByRole('dialog', { name: /notificaciones/i })).toBeVisible();

    await expect(page).toHaveScreenshot('notificaciones-panel.png', { fullPage: true });
  });

});
