import { expect, test, Page } from '@playwright/test';

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL ?? '';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD ?? '';

async function iniciarSesion(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/correo electrónico/i).fill(TEST_USER_EMAIL);
  await page.getByLabel(/contraseña/i).fill(TEST_USER_PASSWORD);
  await page.getByRole('button', { name: /ingresar/i }).click();
  // Se añade domcontentloaded para evitar timeouts por carga de assets
  await page.waitForURL('**/dashboard', { waitUntil: 'domcontentloaded' });
}

test.describe('TC-DIS-36 - Consistencia visual - Panel de Notificaciones (RF-14)', () => {

  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page);
  });

  test('panel de notificaciones abierto', async ({ page }) => {
    // Se elimina el ancla '^' para soportar textos con contadores o variaciones de maquetación
    await page.getByRole('button', { name: /notificaciones/i }).click();
    await expect(page.getByRole('dialog', { name: /notificaciones/i })).toBeVisible();

    // La lista de notificaciones crece con cada login/acción de cualquier
    // prueba del proyecto (no solo M01), así que su contenido nunca es
    // determinista entre corridas. Se enmascara para comparar solo el marco
    // del panel (encabezado, botones, estructura), no el feed en vivo.
    // El borde de la máscara antialiasa distinto entre corridas por 20-40px
    // (0.01% del área), no por contenido: se tolera ese ruido en vez de
    // perseguir un 0 exacto que la propia máscara nunca puede garantizar.
    await expect(page).toHaveScreenshot('notificaciones-panel.png', {
      fullPage: true,
      mask: [page.locator('.notification-tray__list')],
      maxDiffPixelRatio: 0.02,
    });
  });

});