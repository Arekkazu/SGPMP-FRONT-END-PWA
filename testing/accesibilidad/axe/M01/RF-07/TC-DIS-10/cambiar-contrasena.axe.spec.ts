import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const EMAIL_VALIDO = process.env.TEST_USER_EMAIL!;
const PASSWORD_VALIDO = process.env.TEST_USER_PASSWORD!;

test.describe.configure({ mode: 'serial' });

async function iniciarSesionYAbirPanel(page) {
  await page.goto('/login');
  
  // Rellenar credenciales de entorno
  await page.getByLabel(/correo electrónico/i).fill(EMAIL_VALIDO);
  await page.getByLabel(/contraseña/i).fill(PASSWORD_VALIDO);
  await page.getByRole('button', { name: /ingresar/i }).click();

  // Esperar a estar autenticado
  await page.waitForURL('**/dashboard', { timeout: 15000 });

  // Si el menú lateral está colapsado (móvil/tablet), abrirlo
  const botonMenu = page.getByRole('button', { name: /alternar menú lateral/i });
  if (await botonMenu.isVisible().catch(() => false)) {
    await botonMenu.click();
    await page.waitForTimeout(300);
  }

  // Navegar a perfil
  const botonPerfil = page.getByRole('button', { name: /mi perfil/i });
  await botonPerfil.waitFor({ state: 'visible', timeout: 10000 });
  await botonPerfil.click();
  await page.waitForURL('**/perfil');

  // Abrir panel de cambio de contraseña
  await page.getByRole('button', { name: /cambiar contraseña/i }).click();
  const encabezado = page.getByRole('heading', { name: /cambiar contraseña/i, level: 2 });
  await encabezado.waitFor({ state: 'visible', timeout: 10000 });
}

test.describe('TC-DIS-10 - Accesibilidad WCAG 2.1 AA - Cambio de Contraseña', () => {

  test.beforeEach(async ({ page }) => {
    // Asegura inicio de sesión e ingreso al modal en cada test
    await iniciarSesionYAbirPanel(page);
  });

  test('formulario de Cambio de Contraseña - estado inicial - 0 violaciones axe A/AA', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('formulario de Cambio de Contraseña - contraseña actual incorrecta - 0 violaciones axe A/AA', async ({ page }) => {
    await page.getByLabel(/contraseña actual/i).fill('ClaveActualIncorrecta1!');
    await page.getByLabel(/^nueva contraseña/i).fill('NuevaClaveTemporal2!');
    await page.getByLabel(/confirmar nueva contraseña/i).fill('NuevaClaveTemporal2!');

    await page.getByRole('button', { name: /cambiar contraseña/i }).last().click();

    // Validar que el alert se muestre antes de evaluar accesibilidad y que NO haya redirigido a /login
    const alertaError = page.getByRole('alert').first();
    await alertaError.waitFor({ state: 'visible', timeout: 10000 });
    await expect(page).not.toHaveURL('**/login');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('mostrar/ocultar contraseña - aria-pressed presente', async ({ page }) => {
    const botonMostrarOcultar = page.getByRole('button', { name: /acción del campo|mostrar|ocultar/i }).first();
    await expect(botonMostrarOcultar).toHaveAttribute('aria-pressed', /true|false/);
  });

});