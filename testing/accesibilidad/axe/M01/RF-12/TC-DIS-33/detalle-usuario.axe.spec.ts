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
async function abrirDetalleUsuario(page: Page, nombre: string) {
  await page.getByLabel('Nombre').fill(nombre);
  await page.keyboard.press('Enter');

  const btnVerDetalle = page.getByRole('button', { name: `Ver detalle de ${nombre}` });
  await expect(btnVerDetalle).toBeVisible({ timeout: 10000 });
  await btnVerDetalle.click();
}

test.describe('TC-DIS-33 - Accesibilidad WCAG 2.1 AA - Detalle de Usuario (RF-12)', () => {

  test.beforeEach(async ({ page }) => {
    await loginComoAdmin(page);
  });

  test('detalle de usuario - 0 violaciones axe A/AA', async ({ page }) => {
    await abrirDetalleUsuario(page, USUARIO_PRUEBA);
    await expect(page.getByRole('dialog')).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('identificacion enmascarada - verificar formato real vs especificacion', async ({ page }) => {
    await abrirDetalleUsuario(page, USUARIO_PRUEBA);

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // HALLAZGO (confirmado en UsuarioModal.tsx): cuando el admin tiene permiso de
    // edición sobre el usuario, "Ver detalle" abre directamente el <form> editable
    // (Nombres/Apellidos/Correo/Teléfono/Dirección/Rol + Guardar), que NUNCA
    // renderiza el campo de identificación. El campo enmascarado (mascararId)
    // solo existe en la rama de solo-lectura del mismo componente, que no es
    // alcanzable para una cuenta con permiso de edición. Esto contradice el
    // RF-12 (la vista administrativa debe mostrar la identificación enmascarada).
    const enModoEdicion = await dialog.getByRole('button', { name: /guardar/i }).isVisible().catch(() => false);
    test.fail(enModoEdicion, 'RF-12: con permiso de edición, "Ver detalle" abre el modo edición y ese modo no incluye el campo de identificación enmascarada (ver UsuarioModal.tsx:265-286 vs 217-264)');

    const textoIdentificacion = await dialog.getByText(/Identificación/i).locator('..').innerText();
    console.log(`Texto de identificación mostrado: "${textoIdentificacion}"`);

    await expect(dialog.getByText(/••••/)).toBeVisible();
  });

  test('cerrar modal con Esc', async ({ page }) => {
    await abrirDetalleUsuario(page, USUARIO_PRUEBA);
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

});
