import { expect, test } from '@playwright/test';

const EMAIL_VALIDO = process.env.TEST_USER_EMAIL!;
const PASSWORD_VALIDO = process.env.TEST_USER_PASSWORD!;

// Ejecutar secuencialmente para que las capturas visuales no colisionen
test.describe.configure({ mode: 'serial' });

async function iniciarSesionYAbirPanel(page) {
  await page.goto('/login');
  
  // Rellenar formulario de autenticación
  await page.getByLabel(/correo electrónico/i).fill(EMAIL_VALIDO);
  await page.getByLabel(/contraseña/i).fill(PASSWORD_VALIDO);
  await page.getByRole('button', { name: /ingresar/i }).click();

  // Confirmar ingreso al dashboard sin redirecciones
  await page.waitForURL('**/dashboard', { timeout: 15000 });

  // Manejar menú lateral colapsable (Mobile/Tablet)
  const botonMenu = page.getByRole('button', { name: /alternar menú lateral/i });
  if (await botonMenu.isVisible().catch(() => false)) {
    await botonMenu.click();
    await page.waitForTimeout(300);
  }

  // Navegar al perfil
  const botonPerfil = page.getByRole('button', { name: /mi perfil/i });
  await botonPerfil.waitFor({ state: 'visible', timeout: 10000 });
  await botonPerfil.click();
  await page.waitForURL('**/perfil');

  // Abrir panel/modal de cambio de contraseña
  await page.getByRole('button', { name: /cambiar contraseña/i }).click();
  const encabezado = page.getByRole('heading', { name: /^cambiar contraseña$/i, level: 2 });
  await encabezado.waitFor({ state: 'visible', timeout: 10000 });
}

test.describe('TC-DIS-11 - Consistencia visual - Cambio de Contraseña', () => {

  test.beforeEach(async ({ page }) => {
    await iniciarSesionYAbirPanel(page);
  });

  test('modal de Cambio de Contraseña - estado inicial', async ({ page }) => {
    // Garantizar que la vista no fue expulsada antes del snapshot
    await expect(page).not.toHaveURL('**/login');

    await expect(page).toHaveScreenshot('cambiar-contrasena-inicial.png', { fullPage: true });
  });

  test('modal de Cambio de Contraseña - estado con error', async ({ page }) => {
    await page.getByLabel(/contraseña actual/i).fill('ClaveActualIncorrecta1!');
    await page.getByLabel(/^nueva contraseña/i).fill('NuevaClaveTemporal2!');
    await page.getByLabel(/confirmar nueva contraseña/i).fill('NuevaClaveTemporal2!');

    await page.getByRole('button', { name: /cambiar contraseña/i }).last().click();

    // Esperar mensaje de error
    const alertaError = page.getByRole('alert').first();
    await alertaError.waitFor({ state: 'visible', timeout: 10000 });

    // Confirmar que la aplicación NO redirigió a /login al fallar
    await expect(page).not.toHaveURL('**/login');

    await expect(page).toHaveScreenshot('cambiar-contrasena-error.png', { fullPage: true });
  });

});