import { expect, test, Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL!;
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD!;

async function loginComoAdmin(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(ADMIN_EMAIL);
  await page.getByLabel('Contraseña').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar' }).click();

  // Esperar a salir de login (evita colgarse esperando evento 'load' estricto en SPAs)
  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    waitUntil: 'domcontentloaded',
    timeout: 15000,
  });

  // Si el menú móvil/tablet está colapsado, desplegarlo
  const menuToggle = page.getByRole('button', { name: /alternar menú lateral/i });
  if (await menuToggle.isVisible().catch(() => false)) {
    await menuToggle.click();
  }

  // Corregido: En el sidebar los ítems son enlaces (<a>), no botones (<button>)
  const linkRoles = page.getByRole('link', { name: /roles y permisos/i });
  await expect(linkRoles).toBeVisible({ timeout: 10000 });
  await linkRoles.click();

  // Asegurar navegación a la vista de roles antes de ejecutar los tests
  await page.waitForURL(/roles/);
}

test.describe('TC-DIS-22 - Consistencia visual - Gestión de Roles (RF-03)', () => {

  test.beforeEach(async ({ page }) => {
    await loginComoAdmin(page);
  });

  test('listado de roles', async ({ page }) => {
    // Esperar a que la tabla cargue elementos dinámicos antes de la captura
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page).toHaveScreenshot('roles-listado.png', { fullPage: true });
  });

  test('editar rol Administrador (protegido)', async ({ page }) => {
    // exact: true evita coincidir con "Editar Administrador de piso"
    const botonEditar = page.getByRole('button', { name: 'Editar Administrador', exact: true });
    
    await expect(botonEditar).toBeDisabled();
    await expect(page).toHaveScreenshot('roles-editar-admin-protegido.png', { fullPage: true });
  });

});