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

test.describe('TC-DIS-23 - Consistencia Visual - Gestión de Roles (RF-03)', () => {

  test.beforeEach(async ({ page }) => {
    await loginComoAdmin(page);
  });

  test('listado de roles', async ({ page }) => {
    await expect(page).toHaveScreenshot('roles-listado.png', { fullPage: true });
  });

  test('editar rol Administrador (protegido)', async ({ page }) => {
    const botonEditar = page.getByRole('button', { name: 'Editar Administrador' });
    await expect(botonEditar).toBeDisabled();
    await expect(page).toHaveScreenshot('roles-editar-admin-protegido.png', { fullPage: true });
  });

});
