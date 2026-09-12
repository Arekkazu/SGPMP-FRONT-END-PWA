import { expect, test, Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL!;
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD!;

async function loginComoAdmin(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(ADMIN_EMAIL);
  await page.getByLabel('Contraseña').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar' }).click();

  // Esperar navegación de forma tolerante a SPAs
  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    waitUntil: 'domcontentloaded',
    timeout: 15000,
  });

  // Desplegar menú en resoluciones reducidas
  const menuToggle = page.getByRole('button', { name: /alternar menú lateral/i });
  if (await menuToggle.isVisible().catch(() => false)) {
    await menuToggle.click();
  }

  // Navegar correctamente al módulo de Matriz de Permisos (usando texto o rol link)
  const linkMatriz = page.getByText(/matriz de permisos/i);
  await expect(linkMatriz).toBeVisible({ timeout: 10000 });
  await linkMatriz.click();
}

test.describe('TC-DIS-25 - Consistencia visual - Matriz de Permisos (RF-04)', () => {

  test.beforeEach(async ({ page }) => {
    await loginComoAdmin(page);
  });

  test('matriz de permisos - estado inicial', async ({ page }) => {
    // Seleccionar la primera fila de la tabla de forma genérica
    const primeraFila = page.getByRole('row').nth(1); 
    const botonEditar = primeraFila.getByRole('button', { name: /editar|edit/i });

    await expect(botonEditar).toBeVisible();
    await botonEditar.click();

    // Validar apertura del modal antes de tomar la captura
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    await expect(page).toHaveScreenshot('matriz-permisos-inicial.png', { fullPage: true });
  });

});