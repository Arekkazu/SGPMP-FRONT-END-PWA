import { expect, test } from '@playwright/test';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL!;
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD!;

async function iniciarSesionAdmin(page) {
  await page.goto('/login');
  await page.getByLabel(/correo electrónico/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/contraseña/i).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /ingresar/i }).click();
  await page.waitForURL('**/dashboard');

  const botonMenu = page.getByRole('button', { name: /alternar menú lateral/i });
  if (await botonMenu.isVisible().catch(() => false)) {
    await botonMenu.click();
    await page.waitForTimeout(500);
  }

  const botonUsuarios = page.getByRole('button', { name: /gestión de usuarios/i });
  await expect(botonUsuarios).toBeEnabled({ timeout: 15000 });
  await botonUsuarios.scrollIntoViewIfNeeded();
  await botonUsuarios.click({ timeout: 15000 });
  await page.waitForURL('**/usuarios');
}

test.describe('TC-DIS-08 - Consistencia visual - Editar Perfil (vista Administrador)', () => {

  test('lista de Gestión de usuarios - estado inicial', async ({ page }) => {
    await iniciarSesionAdmin(page);
    await expect(page).toHaveScreenshot('gestion-usuarios-lista.png', { fullPage: true });
  });

  test('modal Gestionar cuenta de un tercero', async ({ page }) => {
    await iniciarSesionAdmin(page);

    const filaUsuario = page.getByRole('row', { name: /jorge castro luna/i });
    await filaUsuario.getByRole('button').last().click();

    await page.getByRole('heading', { name: /gestionar cuenta/i }).waitFor({ state: 'visible' });

    await expect(page).toHaveScreenshot('gestion-usuarios-modal.png', { fullPage: true });
  });

});