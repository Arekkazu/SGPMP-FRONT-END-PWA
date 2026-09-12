import { expect, test } from '@playwright/test';

test.describe('TC-DIS-02 - Consistencia visual - Formulario de Registro', () => {

  test('formulario de Registro - estado inicial', async ({ page }) => {
    await page.goto('/registro');
    await expect(page).toHaveScreenshot('registro-inicial.png', { fullPage: true });
  });

  test('formulario de Registro - estado de error', async ({ page }) => {
    await page.goto('/registro');

    const botonContinuar = page.getByRole('button', { name: /continuar/i });
    await botonContinuar.scrollIntoViewIfNeeded();
    await botonContinuar.click();

    await expect(page).toHaveScreenshot('registro-error.png', { fullPage: true });
  });

});