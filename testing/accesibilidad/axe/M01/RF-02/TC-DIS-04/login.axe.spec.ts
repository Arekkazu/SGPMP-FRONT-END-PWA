import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const EMAIL_VALIDO = process.env.TEST_USER_EMAIL!;
const PASSWORD_VALIDO = process.env.TEST_USER_PASSWORD!;

test.describe('TC-DIS-04 - Accesibilidad WCAG 2.1 AA - Pantalla de Login', () => {

test('formulario de Login vacío - 0 violaciones axe A/AA', async ({ page }) => {
    await page.goto('/login');

    const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

    expect(results.violations).toEqual([]);
});

test('formulario de Login con credenciales incorrectas - 0 violaciones axe A/AA', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/correo electrónico/i).fill('usuario-no-existe@correo.com');
    await page.getByLabel(/contraseña/i).fill('ClaveIncorrecta123!');

    const botonIngresar = page.getByRole('button', { name: /ingresar/i });
    await botonIngresar.scrollIntoViewIfNeeded();
    await botonIngresar.click();

    await page.getByRole('alert').first().waitFor({ state: 'visible' });

    const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

    expect(results.violations).toEqual([]);
});

test('formulario de Login bloqueado tras 5 intentos fallidos - 0 violaciones axe A/AA', async ({ page }) => {
    await page.goto('/login');

    // Provocar 5 intentos fallidos consecutivos con la cuenta real pero clave incorrecta
    for (let intento = 1; intento <= 5; intento++) {
    await page.getByLabel(/correo electrónico/i).fill(EMAIL_VALIDO);
    await page.getByLabel(/contraseña/i).fill('ClaveIncorrectaTemporal999!');

    const botonIngresar = page.getByRole('button', { name: /ingresar/i });
    await botonIngresar.scrollIntoViewIfNeeded();
    await botonIngresar.click();

    await page.getByRole('alert').first().waitFor({ state: 'visible' });
    }

    const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

    expect(results.violations).toEqual([]);
});

});