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
  const btnRoles = page.getByRole('button', { name: /roles y permisos/i });
  await expect(btnRoles).toBeEnabled({ timeout: 10000 });
  await btnRoles.click();
}

test.describe('TC-DIS-25 - Accesibilidad WCAG 2.1 AA - Matriz de Permisos del Rol (RF-04)', () => {

  test.beforeEach(async ({ page }) => {
    await loginComoAdmin(page);
  });

  test('matriz de permisos - 0 violaciones axe A/AA', async ({ page }) => {
    const filaRol = page.getByRole('row', { name: /veterinario|productor/i }).first();
    await filaRol.getByRole('button', { name: /editar/i }).click();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('marcar un permiso duplicado - error HTTP 409 anunciado', async ({ page }) => {
    const filaRol = page.getByRole('row', { name: /veterinario|productor/i }).first();
    await filaRol.getByRole('button', { name: /editar/i }).click();

    const checkboxYaMarcado = page.getByRole('checkbox', { name: /C para/i }).first();
    await checkboxYaMarcado.check();
    await checkboxYaMarcado.check();

    await expect(page.getByRole('alert')).toContainText(/ya cuenta con el permiso/i);
  });

  test('retirar el último permiso del rol - error HTTP 422 anunciado', async ({ page }) => {
    const filaRol = page.getByRole('row', { name: /rol de prueba/i });
    await filaRol.getByRole('button', { name: /editar/i }).click();

    const unicoPermiso = page.getByRole('checkbox', { checked: true }).first();
    await unicoPermiso.uncheck();

    await expect(page.getByRole('alert')).toContainText(/al menos una capacidad activa/i);
  });

});
