import { expect, test, Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL!;
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD!;

async function loginComoAdmin(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(ADMIN_EMAIL);
  await page.getByLabel('Contraseña').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.waitForURL(/dashboard/);

  const menuToggle = page.getByRole('button', { name: /alternar menú lateral/i });
  if (await menuToggle.isVisible().catch(() => false)) {
    await menuToggle.click();
  }
  const btnAuditoria = page.getByRole('button', { name: /auditoría/i });
  await expect(btnAuditoria).toBeEnabled({ timeout: 10000 });
  await btnAuditoria.click();
}

test.describe('TC-DIS-30 - Consistencia visual - Auditoría (RF-10)', () => {

  test.beforeEach(async ({ page }) => {
    await loginComoAdmin(page);
  });

  test('pantalla de auditoría', async ({ page }) => {
    await expect(page).toHaveScreenshot('auditoria-listado.png', { fullPage: true });
  });

});
