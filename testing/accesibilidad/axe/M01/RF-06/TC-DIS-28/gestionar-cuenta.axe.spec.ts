import AxeBuilder from '@axe-core/playwright';
import { expect, test, Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? '';
const USUARIO_PRUEBA = 'Sara Gonzalez'; // confirmado real en tabla /usuarios

async function loginComoAdmin(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(ADMIN_EMAIL);
  await page.getByLabel('Contraseña').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.waitForURL(/dashboard/);
  // Pausa deliberada: navegar inmediatamente tras el login causaba una
  // condicion de carrera (401 en sesiones/refresh + clic perdido). Confirmado
  // con script de diagnostico que 3s de espera lo evita.
  await page.waitForTimeout(3000);


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
  // CORRECCIÓN (aplicando fix de Camila en TC-DIS-22): esperar a que el
  // ítem del sidebar se habilite tras cargar permisos asíncronos.
  await expect(btnUsuarios).toBeEnabled({ timeout: 10000 });
  await btnUsuarios.click();
}

test.describe('TC-DIS-28 - Accesibilidad WCAG 2.1 AA - Gestionar Cuenta de Usuario (RF-06)', () => {

  test.beforeEach(async ({ page }) => {
    await loginComoAdmin(page);
  });

  test('modal Gestionar cuenta sin motivo - error HTTP 400 anunciado', async ({ page }) => {
    // Selector real: aria-label={`Gestionar cuenta de ${nombre_usuario}`}
    await page.getByRole('button', { name: `Gestionar cuenta de ${USUARIO_PRUEBA}` }).click();

    await page.getByRole('button', { name: /inactivar/i }).click();
    await page.getByRole('button', { name: /confirmar/i }).click(); // sin llenar motivo_accion

    await expect(page.getByRole('alert')).toContainText(/motivo/i);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('Esc cierra el modal sin ejecutar la acción', async ({ page }) => {
    await page.getByRole('button', { name: `Gestionar cuenta de ${USUARIO_PRUEBA}` }).click();
    await page.getByRole('button', { name: /inactivar/i }).click();
    await page.keyboard.press('Escape');

    await expect(page.getByRole('dialog')).not.toBeVisible();
    // TODO: verificar que el estado del usuario en la tabla sigue igual (sin refrescar)
  });

  test('Enter con motivo lleno confirma la acción y anuncia el resultado', async ({ page }) => {
    await page.getByRole('button', { name: `Gestionar cuenta de ${USUARIO_PRUEBA}` }).click();
    await page.getByRole('button', { name: /inactivar/i }).click();
    await page.getByLabel(/motivo/i).fill('Prueba QA - caso TC-DIS-28');
    await page.keyboard.press('Enter');

    // TODO: confirmar mecanismo real de anuncio (aria-live region, toast, etc.)
    await expect(page.getByRole('status')).toBeVisible();
  });

});
