import { expect, test, Page, Locator } from '@playwright/test';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL!;
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD!;

// #132: el drawer móvil se abre con transition:transform 0.2s y puede volver a
// cerrarse (carrera confirmada con el velo de fondo de App.tsx) antes de que
// el clic sobre el ítem llegue a completarse. En vez de esperar una sola vez,
// se reintenta la apertura + el clic hasta que el target quede dentro del
// viewport (bug de producto pendiente de corrección, ver reporte de QA).
async function abrirMenuYClicRobusto(page: Page, menuToggle: Locator, target: Locator) {
  for (let intento = 1; intento <= 8; intento++) {
    const box = await target.boundingBox().catch(() => null);
    const vp = page.viewportSize();
    const dentro = !!box && !!vp && box.x >= -1 && box.y >= -1 && (box.x + box.width) <= vp.width + 1;
    if (dentro) {
      try {
        await target.click({ timeout: 2000 });
        return;
      } catch { /* reintentar */ }
    }
    if (await menuToggle.isVisible().catch(() => false)) {
      await menuToggle.click().catch(() => {});
    }
    await page.waitForTimeout(300);
  }
  await target.click();
}

async function loginComoAdmin(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(ADMIN_EMAIL);
  await page.getByLabel('Contraseña').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar' }).click();

  // Esperar a salir de login (evita colgarse esperando evento 'load' estricto en SPAs)
  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    waitUntil: 'domcontentloaded',
    timeout: 15000,
  });

  // Si el menú móvil/tablet está colapsado, desplegarlo
  const menuToggle = page.getByRole('button', { name: /alternar menú lateral/i });
  const linkRoles = page.getByRole('link', { name: /roles y permisos/i }).or(page.getByRole('button', { name: /roles y permisos/i }));
  await abrirMenuYClicRobusto(page, menuToggle, linkRoles);

  // Asegurar navegación a la vista de roles antes de ejecutar los tests
  await page.waitForURL(/roles/);
}

test.describe('TC-DIS-22 - Consistencia visual - Gestión de Roles (RF-03)', () => {

  test.beforeEach(async ({ page }) => {
    await loginComoAdmin(page);
  });

  test('listado de roles', async ({ page }) => {
    // Esperar a que la tabla cargue elementos dinámicos antes de la captura
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page).toHaveScreenshot('roles-listado.png', { fullPage: true });
  });

  test('editar rol Administrador (protegido)', async ({ page }) => {
    // exact: true evita coincidir con "Editar Administrador de piso"
    const botonEditar = page.getByRole('button', { name: 'Editar Administrador', exact: true });
    
    await expect(botonEditar).toBeDisabled();
    await expect(page).toHaveScreenshot('roles-editar-admin-protegido.png', { fullPage: true });
  });

});