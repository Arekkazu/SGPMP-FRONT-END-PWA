import { expect, test, Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? '';
const USUARIO_PRUEBA = 'Sara Gonzalez';

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
  const btnUsuarios = page.getByRole('button', { name: /gestión de usuarios/i });
  await expect(btnUsuarios).toBeEnabled({ timeout: 10000 });
  await btnUsuarios.click();
}

test.describe('TC-DIS-29 - Consistencia Visual - Gestionar Cuenta (RF-06)', () => {

  test.beforeEach(async ({ page }) => {
    await loginComoAdmin(page);
  });

  test('modal gestionar cuenta', async ({ page }) => {
    // La tabla de usuarios está paginada y Sara Gonzalez puede no estar
    // en la primera página. Filtramos por nombre antes de buscar el botón.
    // El input tiene onKeyDown={Enter -> buscar()} en UsuariosPage.tsx.
    await page.getByLabel('Nombre').fill(USUARIO_PRUEBA);
    await page.keyboard.press('Enter');

    const btnGestionar = page.getByRole('button', { name: `Gestionar cuenta de ${USUARIO_PRUEBA}` });
    await expect(btnGestionar).toBeVisible({ timeout: 10000 });
    await btnGestionar.click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page).toHaveScreenshot('gestionar-cuenta-modal.png', { fullPage: true });
  });

});
