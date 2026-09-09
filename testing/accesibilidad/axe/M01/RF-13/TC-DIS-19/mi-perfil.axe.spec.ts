import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const EMAIL_VALIDO = process.env.TEST_USER_EMAIL!;
const PASSWORD_VALIDO = process.env.TEST_USER_PASSWORD!;

async function iniciarSesion(page) {
  await page.goto('/login');
  await page.getByLabel(/correo electrónico/i).fill(EMAIL_VALIDO);
  await page.getByLabel(/contraseña/i).fill(PASSWORD_VALIDO);
  await page.getByRole('button', { name: /ingresar/i }).click();
  await page.waitForURL('**/dashboard');

  const botonMenu = page.getByRole('button', { name: /alternar menú lateral/i });
  if (await botonMenu.isVisible().catch(() => false)) {
    await botonMenu.click();
    await page.waitForTimeout(500);
  }

  const botonPerfil = page.getByRole('button', { name: /mi perfil/i });
  await botonPerfil.waitFor({ state: 'visible', timeout: 10000 });
  await botonPerfil.scrollIntoViewIfNeeded();
  await botonPerfil.click({ timeout: 10000 });
  await page.waitForURL('**/perfil');
}

test.describe('TC-DIS-19 - Accesibilidad WCAG 2.1 AA - Mi Perfil (solo lectura)', () => {

  test('pantalla de Mi Perfil - 0 violaciones axe A/AA', async ({ page }) => {
    await iniciarSesion(page);

    await page.getByRole('heading', { name: /^mi perfil$/i }).waitFor({ state: 'visible' });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('estructura de encabezados es jerárquica y descriptiva', async ({ page }) => {
    await iniciarSesion(page);

    await expect(page.getByRole('heading', { name: /^mi perfil$/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /información personal/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /datos de cuenta/i })).toBeVisible();
  });

  test('avatar de iniciales no interfiere con lectores de pantalla', async ({ page }) => {
    await iniciarSesion(page);

    // El avatar "SG" debe ser decorativo (aria-hidden) o tener un texto accesible con el nombre completo,
    // nunca leerse como "SG" suelto para un lector de pantalla
    const avatar = page.locator('text="SG"').first();
    const esOculto = await avatar.evaluate(el => el.closest('[aria-hidden="true"]') !== null).catch(() => false);
    const tieneAccessibleName = await avatar.evaluate(el => {
      const contenedor = el.closest('[aria-label], [role="img"]');
      return contenedor ? contenedor.getAttribute('aria-label') : null;
    }).catch(() => null);

    expect(esOculto || !!tieneAccessibleName).toBeTruthy();
  });

});