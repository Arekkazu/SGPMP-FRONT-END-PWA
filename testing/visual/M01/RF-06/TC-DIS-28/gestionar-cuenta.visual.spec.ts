import { expect, test, Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL!;
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD!;
const USUARIO_PRUEBA = 'Sara Gonzalez';

async function loginComoAdmin(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(ADMIN_EMAIL);
  await page.getByLabel('Contraseña').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.waitForURL(/dashboard/, { waitUntil: 'domcontentloaded' });

  const btnUsuarios = page.getByRole('button', { name: /gestión de usuarios/i });

  // Si no está visible (móvil/tablet), abrir el menú
  if (!(await btnUsuarios.isVisible())) {
    await page.getByRole('button', { name: /alternar menú lateral/i }).click();
  }

  await btnUsuarios.click();

  // Esperar a que navegue a la página de usuarios y la animación del menú concluya
  await page.waitForURL(/usuarios/);
}

test.describe('TC-DIS-28 - Consistencia visual - Gestionar Cuenta (RF-06)', () => {

  test.beforeEach(async ({ page }) => {
    await loginComoAdmin(page);
  });

  test('modal gestionar cuenta', async ({ page }) => {
    const inputNombre = page.getByLabel('Nombre');
    
    // Asegura que el formulario sea visible e interactuable (menú lateral cerrado)
    await expect(inputNombre).toBeVisible({ timeout: 10000 });
    await inputNombre.fill(USUARIO_PRUEBA);
    await page.keyboard.press('Enter');

    const btnGestionar = page.getByRole('button', { name: `Gestionar cuenta de ${USUARIO_PRUEBA}` });
    await expect(btnGestionar).toBeVisible({ timeout: 10000 });
    await btnGestionar.click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page).toHaveScreenshot('gestionar-cuenta-modal.png', { fullPage: true });
  });

});