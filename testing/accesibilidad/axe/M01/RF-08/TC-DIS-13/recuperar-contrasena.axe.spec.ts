import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { createHtmlReport } from 'axe-html-reporter';

const EMAIL_VALIDO = process.env.TEST_USER_EMAIL!;

test.describe('TC-DIS-13 - Accesibilidad WCAG 2.1 AA - Recuperación de Contraseña', () => {

  test('formulario de Recuperar Contraseña - estado inicial - 0 violaciones axe A/AA', async ({ page }) => {
    await page.goto('/recuperar-contrasena');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    createHtmlReport({
      results,
      options: { outputDir: 'resultados', reportFileName: 'axe-TC-DIS-13-inicial.html' }
    });

    expect(results.violations).toEqual([]);
  });

  test('formulario de Recuperar Contraseña - confirmación de envío - 0 violaciones axe A/AA', async ({ page }) => {
    await page.goto('/recuperar-contrasena');

    await page.getByLabel(/correo electrónico/i).fill(EMAIL_VALIDO);
    await page.getByRole('button', { name: /enviar enlace de recuperación/i }).click();

    await page.getByRole('heading', { name: /correo enviado/i }).waitFor({ state: 'visible' });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    createHtmlReport({
      results,
      options: { outputDir: 'resultados', reportFileName: 'axe-TC-DIS-13-confirmacion.html' }
    });

    expect(results.violations).toEqual([]);
  });

});