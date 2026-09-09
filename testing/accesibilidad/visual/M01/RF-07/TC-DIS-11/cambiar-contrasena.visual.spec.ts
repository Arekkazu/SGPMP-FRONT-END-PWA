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
  await botonPerfil.waitFor({ state: 'visible', timeout: 15000 });
  await botonPerfil.scrollIntoViewIfNeeded();
  await botonPerfil.click({ timeout: 15000 });
  await page.waitForURL('**/perfil');
}

test.describe('TC-DIS-11 - Consistencia visual - Cambio de Contraseña', () => {

  test('modal de Cambio de Contraseña - estado inicial', async ({ page }) => {
    await iniciarSesion(page);

    await page.getByRole('button', { name: /cambiar contraseña/i }).click();
    // El panel no usa role="dialog" — lo ubicamos por su encabezado (hallazgo aparte a documentar)
    await page.getByRole('heading', { name: /^cambiar contraseña$/i, level: 2 }).waitFor({ state: 'visible' });

    await expect(page).toHaveScreenshot('cambiar-contrasena-inicial.png', { fullPage: true });
  });

  test('modal de Cambio de Contraseña - estado con error', async ({ page }) => {
    await iniciarSesion(page);

    await page.getByRole('button', { name: /cambiar contraseña/i }).click();
    await page.getByRole('heading', { name: /^cambiar contraseña$/i, level: 2 }).waitFor({ state: 'visible' });

    await page.getByLabel(/contraseña actual/i).fill('ClaveActualIncorrecta1!');
    await page.getByLabel(/^nueva contraseña/i).fill('NuevaClaveTemporal2!');
    await page.getByLabel(/confirmar nueva contraseña/i).fill('NuevaClaveTemporal2!');

    await page.getByRole('button', { name: /cambiar contraseña/i }).last().click();
    await page.getByRole('alert').first().waitFor({ state: 'visible' });

    await expect(page).toHaveScreenshot('cambiar-contrasena-error.png', { fullPage: true });
  });

});