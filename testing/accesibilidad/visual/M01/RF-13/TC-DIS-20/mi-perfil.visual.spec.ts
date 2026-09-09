import { expect, test } from '@playwright/test';

const EMAIL_VALIDO = process.env.TEST_USER_EMAIL!;
const PASSWORD_VALIDO = process.env.TEST_USER_PASSWORD!;

async function iniciarSesion(page) {
  await page.goto('/login');
  await page.getByLabel(/correo electrónico/i).fill(EMAIL_VALIDO);
  await page.getByLabel(/contraseña/i).fill(PASSWORD_VALIDO);
  await page.getByRole('button', { name: /ingresar/i }).click();
  await page.waitForURL('**/dashboard');

  const botonMenu = page.getByRole('button', { name: /alternar menú lateral/i });
  if (await botonMenu.isVisible().catch(() => false)) {
    await botonMenu.click();
    await page.waitForTimeout(500);
  }

  const botonPerfil = page.getByRole('button', { name: /mi perfil/i });
  await expect(botonPerfil).toBeEnabled({ timeout: 15000 });
  await botonPerfil.scrollIntoViewIfNeeded();
  await botonPerfil.click({ timeout: 15000 });
  await page.waitForURL('**/perfil');
}

test.describe('TC-DIS-20 - Consistencia visual - Mi Perfil (solo lectura)', () => {

  test('pantalla de Mi Perfil - estado por defecto', async ({ page }) => {
    await iniciarSesion(page);
    await page.getByRole('heading', { name: /^mi perfil$/i }).waitFor({ state: 'visible' });

    await expect(page).toHaveScreenshot('mi-perfil-lectura.png', { fullPage: true });
  });

});