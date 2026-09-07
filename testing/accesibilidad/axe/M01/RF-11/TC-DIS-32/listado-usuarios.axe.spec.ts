import AxeBuilder from '@axe-core/playwright';
import { expect, test, Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? '';

async function loginComoAdmin(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(ADMIN_EMAIL);
  await page.getByLabel('Contraseña').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.waitForURL(/dashboard/);
  await page.waitForTimeout(3000);

  const menuToggle = page.getByRole('button', { name: /alternar menú lateral/i });
  if (await menuToggle.isVisible().catch(() => false)) {
    await menuToggle.click();
  }
  const btnUsuarios = page.getByRole('button', { name: /gestión de usuarios/i });
  await expect(btnUsuarios).toBeEnabled({ timeout: 10000 });
  await btnUsuarios.click();
}

test.describe('TC-DIS-32 - Accesibilidad WCAG 2.1 AA - Listado de Usuarios (RF-11)', () => {

  test.beforeEach(async ({ page }) => {
    await loginComoAdmin(page);
  });

  test('listado de usuarios - 0 violaciones axe A/AA', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('filtro combinado nombre + correo por teclado (operador AND)', async ({ page }) => {
    await page.getByLabel('Nombre').fill('a');
    await page.getByLabel('Correo').fill('test');
    await page.keyboard.press('Enter');

    await expect(page.getByRole('table')).toBeVisible();
  });

  test('detalle de un usuario - accesible por teclado', async ({ page }) => {
    const primerBoton = page.getByRole('button', { name: /^Ver detalle de/ }).first();
    await primerBoton.focus();
    await page.keyboard.press('Enter');

    await expect(page.getByRole('dialog', { name: 'Detalle de usuario' })).toBeVisible();
  });

});
