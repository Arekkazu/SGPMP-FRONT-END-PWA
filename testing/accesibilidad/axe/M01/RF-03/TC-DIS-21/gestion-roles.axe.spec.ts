import AxeBuilder from '@axe-core/playwright';
import { expect, test, Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL!;
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD!;

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
  await page.getByRole('button', { name: /roles y permisos/i }).click();
}

test.describe('TC-DIS-21 - Accesibilidad WCAG 2.1 AA - Gestión de Roles (RF-03)', () => {

  test.beforeEach(async ({ page }) => {
    await loginComoAdmin(page);
  });

  test('listado de roles - 0 violaciones axe A/AA', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('crear rol sin permisos - envío bloqueado en cliente - 0 violaciones axe A/AA', async ({ page }) => {
    // Texto real confirmado en RolesPage.tsx: "Crear nuevo rol"
    await page.getByRole('button', { name: 'Crear nuevo rol' }).click();

    await page.getByLabel(/nombre/i).fill('Rol de prueba QA');
    // Se deja sin seleccionar ningún permiso a propósito.
    // RolModal.tsx:174 deshabilita el submit mientras permisos.length === 0 (no
    // llega a viajar al backend, por lo que no hay error 400/alert que esperar).
    // El aviso real es el texto inline junto a "Permisos" (RolModal.tsx:155).
    const botonSubmit = page.getByRole('dialog').getByRole('button', { name: /guardar|crear/i });
    await expect(botonSubmit).toBeDisabled();
    await expect(page.getByText(/selecciona al menos un permiso/i)).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('intentar editar el rol Administrador - protegido/inmutable', async ({ page }) => {
    // Selector real confirmado en RolesTable.tsx: aria-label={`Editar ${nombre_rol}`}.
    // La protección se aplica en el cliente deshabilitando el botón (disabled={r.es_protegido})
    // con un title explicativo — nunca llega a intentarse la edición ni un 403 del backend.
    // exact:true porque hay datos de prueba con un rol "ADministrador de piso", cuyo
    // "Editar ADministrador de piso" matchea como substring de "Editar Administrador".
    const botonEditarAdmin = page.getByRole('button', { name: 'Editar Administrador', exact: true });
    await expect(botonEditarAdmin).toBeDisabled({ timeout: 10000 });
    await expect(botonEditarAdmin).toHaveAttribute('title', /no puede modificarse/i);
  });

});
