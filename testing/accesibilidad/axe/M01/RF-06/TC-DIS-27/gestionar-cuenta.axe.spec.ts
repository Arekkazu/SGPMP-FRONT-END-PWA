import AxeBuilder from '@axe-core/playwright';
import { expect, test, Page, Locator } from '@playwright/test';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL!;
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD!;
const USUARIO_PRUEBA = 'Sara Gonzalez';

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
  await page.waitForURL(/dashboard/);

  // IMPORTANTE: el JWT vive solo en memoria (no localStorage, ver README del repo).
  // Por eso NUNCA usamos page.goto() para navegar después de loguearnos —
  // eso recarga la página y borra la sesión. Navegamos como lo haría un usuario real:
  // haciendo clic en el link del sidebar.
  // En viewports chicos (movil/tablet) el sidebar vive detrás de un botón
  // hamburguesa ("Alternar menú lateral"); en escritorio no existe/no hace falta.
  const menuToggle = page.getByRole('button', { name: /alternar menú lateral/i });
  const btnUsuarios = page.getByRole('link', { name: /gestión de usuarios/i }).or(page.getByRole('button', { name: /gestión de usuarios/i }));
  await abrirMenuYClicRobusto(page, menuToggle, btnUsuarios);
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

// Este caso requiere un usuario ACTIVO (ver Precondiciones): solo así el modal
// ofrece "Inactivar". El usuario de prueba puede haber quedado INACTIVO por una
// corrida anterior (activar no requiere motivo, es reversible), así que la
// dejamos en el estado esperado antes de cada test en lugar de asumirlo.
async function asegurarUsuarioActivo(page: Page, nombre: string) {
  await abrirGestionarCuenta(page, nombre);
  const btnActivar = page.getByRole('button', { name: /^activar/i });
  if (await btnActivar.isVisible().catch(() => false)) {
    await btnActivar.click();
    await page.getByRole('button', { name: /confirmar/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });
  } else {
    await page.keyboard.press('Escape');
  }
}

test.describe('TC-DIS-27 - Accesibilidad WCAG 2.1 AA - Gestionar Cuenta de Usuario (RF-06)', () => {

  test.beforeEach(async ({ page }) => {
    await loginComoAdmin(page);
    await asegurarUsuarioActivo(page, USUARIO_PRUEBA);
  });

  test('modal Gestionar cuenta sin motivo - error HTTP 400 anunciado', async ({ page }) => {
    await abrirGestionarCuenta(page, USUARIO_PRUEBA);

    await page.getByRole('button', { name: /inactivar/i }).click();
    await page.getByRole('button', { name: /confirmar/i }).click(); // sin llenar motivo_accion

    // El toast de éxito de "Activar" del beforeEach puede seguir visible cuando
    // aparece este error inline; se filtra por texto para no chocar con strict mode.
    await expect(page.getByRole('alert').filter({ hasText: /motivo/i })).toContainText(/motivo/i);

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

    // Se verifica que la acción notifique el resultado de forma accesible (role="status" o role="alert")
    const anuncioResultado = page.getByRole('status').or(page.getByRole('alert')).first();
    await expect(anuncioResultado).toBeVisible({ timeout: 5000 });
  });

});