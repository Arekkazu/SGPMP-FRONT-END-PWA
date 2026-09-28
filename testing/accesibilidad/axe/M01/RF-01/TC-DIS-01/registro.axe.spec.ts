import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('TC-DIS-01 - Accesibilidad WCAG 2.1 AA - Formulario de Registro', () => {

test('formulario de Registro vacío - 0 violaciones axe A/AA', async ({ page }) => {
    await page.goto('/registro');

    const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

    expect(results.violations).toEqual([]);
});

test('formulario de Registro en estado de error - 0 violaciones axe A/AA', async ({ page }) => {
    await page.goto('/registro');

    const botonContinuar = page.getByRole('button', { name: /continuar/i });
    await botonContinuar.scrollIntoViewIfNeeded();
    await botonContinuar.click();

    const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

    expect(results.violations).toEqual([]);
});

});