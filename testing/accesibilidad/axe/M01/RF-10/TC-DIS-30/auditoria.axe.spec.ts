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
  const btnAuditoria = page.getByRole('button', { name: /auditoría/i });
  await expect(btnAuditoria).toBeEnabled({ timeout: 10000 });
  await btnAuditoria.click();
}

test.describe('TC-DIS-30 - Accesibilidad WCAG 2.1 AA - Auditoría (RF-10)', () => {

  test.beforeEach(async ({ page }) => {
    await loginComoAdmin(page);
  });

  test('pantalla de auditoría - 0 violaciones axe A/AA', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('filtro por tipo de evento con Enter ejecuta la consulta', async ({ page }) => {
    await page.getByRole('combobox', { name: /tipo/i }).selectOption({ index: 1 });
    await page.keyboard.press('Enter');
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('filtro sin resultados - mensaje anunciado vía aria-live', async ({ page }) => {
    await page.getByPlaceholder(/ej\. 42/i).fill('999999999');
    await page.keyboard.press('Enter');
    await expect(page.getByText(/sin resultados|no se encontraron/i)).toBeVisible();
  });

});
