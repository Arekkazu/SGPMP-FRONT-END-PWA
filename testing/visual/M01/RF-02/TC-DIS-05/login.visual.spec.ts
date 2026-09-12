import { expect, test } from '@playwright/test';

test.describe('TC-DIS-05 - Consistencia visual - Pantalla de Login', () => {

test('formulario de Login - estado inicial', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveScreenshot('login-inicial.png', { fullPage: true });
});

test('formulario de Login - estado con error', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/correo electrónico/i).fill('usuario-no-existe@correo.com');
    await page.getByLabel(/contraseña/i).fill('ClaveIncorrecta123!');

    const botonIngresar = page.getByRole('button', { name: /ingresar/i });
    await botonIngresar.scrollIntoViewIfNeeded();
    await botonIngresar.click();

    await page.getByRole('alert').first().waitFor({ state: 'visible' });

    await expect(page).toHaveScreenshot('login-error.png', { fullPage: true });
});

});