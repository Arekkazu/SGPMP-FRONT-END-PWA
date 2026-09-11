import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const EMAIL_VALIDO = process.env.TEST_USER_EMAIL!;
const PASSWORD_VALIDO = process.env.TEST_USER_PASSWORD!;

test.describe.configure({ mode: 'serial' });

async function iniciarSesion(page) {
  await page.goto('/login');
  await page.getByLabel(/correo electrónico/i).fill(EMAIL_VALIDO);
  await page.getByLabel(/contraseña/i).fill(PASSWORD_VALIDO);
  await page.getByRole('button', { name: /ingresar/i }).click();
  await page.waitForURL('**/dashboard');

  // Si el menú lateral está colapsado (móvil/tablet), ábrelo primero
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

async function abrirPanelCambiarContrasena(page) {
  await page.getByRole('button', { name: /cambiar contraseña/i }).click();
  const encabezado = page.getByRole('heading', { name: /cambiar contraseña/i, level: 2 });
  await encabezado.waitFor({ state: 'visible' });
  return page;
}

test.describe('TC-DIS-10 - Accesibilidad WCAG 2.1 AA - Cambio de Contraseña', () => {

  test('formulario de Cambio de Contraseña - estado inicial - 0 violaciones axe A/AA', async ({ page }) => {
    await iniciarSesion(page);
    await abrirPanelCambiarContrasena(page);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('formulario de Cambio de Contraseña - contraseña actual incorrecta - 0 violaciones axe A/AA', async ({ page }) => {
    await iniciarSesion(page);
    await abrirPanelCambiarContrasena(page);

    await page.getByLabel(/contraseña actual/i).fill('ClaveActualIncorrecta1!');
    await page.getByLabel(/^nueva contraseña/i).fill('NuevaClaveTemporal2!');
    await page.getByLabel(/confirmar nueva contraseña/i).fill('NuevaClaveTemporal2!');

    await page.getByRole('button', { name: /cambiar contraseña/i }).last().click();
    await page.getByRole('alert').first().waitFor({ state: 'visible' });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('mostrar/ocultar contraseña - aria-pressed presente', async ({ page }) => {
    await iniciarSesion(page);
    await abrirPanelCambiarContrasena(page);

    const botonMostrarOcultar = page.getByRole('button', { name: /acción del campo|mostrar|ocultar/i }).first();
    await expect(botonMostrarOcultar).toHaveAttribute('aria-pressed', /true|false/);
  });

});