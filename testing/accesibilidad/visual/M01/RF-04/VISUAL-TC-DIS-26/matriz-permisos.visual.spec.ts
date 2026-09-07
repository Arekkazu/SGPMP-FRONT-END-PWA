import { expect, test, Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? '';

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
  const btnRoles = page.getByRole('button', { name: /roles y permisos/i });
  await expect(btnRoles).toBeEnabled({ timeout: 10000 });
  await btnRoles.click();
}

test.describe('TC-DIS-26 - Consistencia Visual - Matriz de Permisos (RF-04)', () => {

  test.beforeEach(async ({ page }) => {
    await loginComoAdmin(page);
  });

  test('matriz de permisos - estado inicial', async ({ page }) => {
    const filaRol = page.getByRole('row', { name: /veterinario|productor/i }).first();
    await filaRol.getByRole('button', { name: /editar/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page).toHaveScreenshot('matriz-permisos-inicial.png', { fullPage: true });
  });

});
