import { expect, test, Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL!;
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD!;
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

test.describe('TC-DIS-34 - Consistencia visual - Detalle de Usuario (RF-12)', () => {

  test.beforeEach(async ({ page }) => {
    await loginComoAdmin(page);
  });

  test('detalle de usuario', async ({ page }) => {
    // La tabla de usuarios está paginada y Sara Gonzalez puede no estar
    // en la primera página. Filtramos por nombre antes de buscar el botón.
    // El input tiene onKeyDown={Enter -> buscar()} en UsuariosPage.tsx.
    await page.getByLabel('Nombre').fill(USUARIO_PRUEBA);
    await page.keyboard.press('Enter');

    const btnVerDetalle = page.getByRole('button', { name: `Ver detalle de ${USUARIO_PRUEBA}` });
    await expect(btnVerDetalle).toBeVisible({ timeout: 10000 });
    await btnVerDetalle.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    // Esperar a que carguen los datos reales: el modal muestra primero
    // skeletons (placeholders grises) mientras llega la respuesta del detalle.
    await expect(dialog.getByLabel(/nombres/i)).toBeVisible({ timeout: 10000 });

    await expect(page).toHaveScreenshot('detalle-usuario.png', { fullPage: true });
  });

});
