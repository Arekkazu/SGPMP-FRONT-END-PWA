import AxeBuilder from '@axe-core/playwright';
import { expect, test, Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? '';

async function loginComoAdmin(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(ADMIN_EMAIL);
  await page.getByLabel('Contraseña').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.waitForURL(/dashboard/);

  // IMPORTANTE: el JWT vive solo en memoria (no localStorage, ver README del repo).
  // Por eso NUNCA usamos page.goto() para navegar después de loguearnos —
  // eso recarga la página y borra la sesión. Navegamos como lo haría un usuario real:
  // haciendo clic en el link del sidebar.
  // En viewports chicos (movil/tablet) el sidebar vive detrás de un botón
  // hamburguesa ("Alternar menú lateral"); en escritorio no existe/no hace falta.
  const menuToggle = page.getByRole('button', { name: /alternar menú lateral/i });
  if (await menuToggle.isVisible().catch(() => false)) {
    await menuToggle.click();
  }
  await page.getByRole('button', { name: /gestión de usuarios/i }).click();
}

test.describe('TC-DIS-32 - Accesibilidad WCAG 2.1 AA - Listado de Usuarios (RF-11)', () => {

  test.beforeEach(async ({ page }) => {
    await loginComoAdmin(page);
  });

  test('listado de usuarios - 0 violaciones axe A/AA', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('filtro combinado nombre + correo por teclado (operador AND)', async ({ page }) => {
    // Labels reales confirmados: "Nombre" (placeholder "Buscar por nombre"),
    // "Correo" (placeholder "Buscar por correo")
    await page.getByLabel('Nombre').fill('a');
    await page.getByLabel('Correo').fill('test');
    await page.keyboard.press('Enter');

    await expect(page.getByRole('table')).toBeVisible();
    // TODO: verificar en los resultados que ambos filtros aplicaron (AND), no solo uno
  });

  test('detalle de un usuario - accesible por teclado', async ({ page }) => {
    // Selector real: aria-label={`Ver detalle de ${nombre_usuario}`}
    const primerBoton = page.getByRole('button', { name: /^Ver detalle de/ }).first();
    await primerBoton.focus();
    await page.keyboard.press('Enter');

    await expect(page.getByRole('dialog').or(page.getByRole('heading', { level: 1 }))).toBeVisible();
  });

});
