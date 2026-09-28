import { expect, test, Page } from '@playwright/test';

const EMAIL_VALIDO = process.env.TEST_USER_EMAIL!;
const PASSWORD_VALIDO = process.env.TEST_USER_PASSWORD!;

async function iniciarSesionYNavegarAPerfil(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/correo electrónico/i).fill(EMAIL_VALIDO);
  await page.getByLabel(/contraseña/i).fill(PASSWORD_VALIDO);
  await page.getByRole('button', { name: /ingresar/i }).click();
  
  // Espera la carga del dashboard sin bloquear por assets
  await page.waitForURL('**/dashboard', { waitUntil: 'domcontentloaded' });

  // Navegación directa a la ruta para evitar dependencias con el viewport del menú lateral
  await page.goto('/perfil');
  await page.waitForURL('**/perfil');
}

test.describe('TC-DIS-19 - Consistencia visual - Mi Perfil (solo lectura)', () => {

  test('pantalla de Mi Perfil - estado por defecto', async ({ page }) => {
    await iniciarSesionYNavegarAPerfil(page);
    
    // Verifica que el componente principal cargó antes de tomar la foto
    await page.getByRole('heading', { name: /^mi perfil$/i }).waitFor({ state: 'visible' });

    // Captura visual del componente
    await expect(page).toHaveScreenshot('mi-perfil-lectura.png', { fullPage: true });
  });

});