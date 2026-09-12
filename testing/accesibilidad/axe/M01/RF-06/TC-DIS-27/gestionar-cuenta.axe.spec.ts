import AxeBuilder from '@axe-core/playwright';
import { expect, test, Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL!;
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD!;
const USUARIO_PRUEBA = 'Sara Gonzalez';

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
  const btnUsuarios = page.getByRole('button', { name: /gestión de usuarios/i });
  await expect(btnUsuarios).toBeEnabled({ timeout: 10000 });
  await btnUsuarios.click();
}

// La tabla de usuarios está paginada; el usuario de prueba puede no estar
// en la primera página. Filtramos por nombre antes de buscar el botón.
// El input tiene onKeyDown={Enter -> buscar()} en UsuariosPage.tsx.
async function abrirGestionarCuenta(page: Page, nombre: string) {
  await page.getByLabel('Nombre').fill(nombre);
  await page.keyboard.press('Enter');

  const btnGestionar = page.getByRole('button', { name: `Gestionar cuenta de ${nombre}` });
  await expect(btnGestionar).toBeVisible({ timeout: 10000 });
  await btnGestionar.click();
}

test.describe('TC-DIS-27 - Accesibilidad WCAG 2.1 AA - Gestionar Cuenta de Usuario (RF-06)', () => {

  test.beforeEach(async ({ page }) => {
    await loginComoAdmin(page);
  });

  test('modal Gestionar cuenta sin motivo - error HTTP 400 anunciado', async ({ page }) => {
    await abrirGestionarCuenta(page, USUARIO_PRUEBA);

    await page.getByRole('button', { name: /inactivar/i }).click();
    await page.getByRole('button', { name: /confirmar/i }).click(); // sin llenar motivo_accion

    await expect(page.getByRole('alert')).toContainText(/motivo/i);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('Esc cierra el modal sin ejecutar la acción', async ({ page }) => {
    await abrirGestionarCuenta(page, USUARIO_PRUEBA);
    await page.getByRole('button', { name: /inactivar/i }).click();
    await page.keyboard.press('Escape');

    await expect(page.getByRole('dialog')).not.toBeVisible();
    // TODO: verificar que el estado del usuario en la tabla sigue igual (sin refrescar)
  });

  test('Enter con motivo lleno confirma la acción y anuncia el resultado', async ({ page }) => {
    await abrirGestionarCuenta(page, USUARIO_PRUEBA);
    await page.getByRole('button', { name: /inactivar/i }).click();
    await page.getByLabel(/motivo/i).fill('Prueba QA - caso TC-DIS-27');
    await page.keyboard.press('Enter');

    // TODO: confirmar mecanismo real de anuncio (aria-live region, toast, etc.)
    await expect(page.getByRole('status')).toBeVisible();
  });

});
