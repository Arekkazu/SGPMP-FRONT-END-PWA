import AxeBuilder from '@axe-core/playwright';
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
  await page.waitForURL(/dashboard/);

  // IMPORTANTE: el JWT vive solo en memoria (no localStorage, ver README del repo).
  // Por eso NUNCA usamos page.goto() para navegar después de loguearnos —
  // eso recarga la página y borra la sesión. Navegamos como lo haría un usuario real:
  // haciendo clic en el link del sidebar.
  // En viewports chicos (movil/tablet) el sidebar vive detrás de un botón
  // hamburguesa ("Alternar menú lateral"); en escritorio no existe/no hace falta.
  const menuToggle = page.getByRole('button', { name: /alternar menú lateral/i });
  const linkRolesYPermisos = page.getByRole('link', { name: /roles y permisos/i }).or(page.getByRole('button', { name: /roles y permisos/i }));
  await abrirMenuYClicRobusto(page, menuToggle, linkRolesYPermisos);
}

test.describe('TC-DIS-24 - Accesibilidad WCAG 2.1 AA - Matriz de Permisos del Rol (RF-04)', () => {

  test.beforeEach(async ({ page }) => {
    await loginComoAdmin(page);
  });

  test('matriz de permisos - 0 violaciones axe A/AA', async ({ page }) => {
    // TODO: confirmar cómo se abre la matriz (¿editar un rol la muestra dentro del RolModal,
    // o es una vista separada?) — ajustar navegación real cuando se confirme.
    const filaRol = page.getByRole('row', { name: /veterinario|productor/i }).first();
    await filaRol.getByRole('button', { name: /editar|edit/i }).click();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test.skip('marcar un permiso duplicado - error HTTP 409 anunciado', async () => {
    // No reproducible desde la UI: page.check() en Playwright es idempotente
    // (no hace clic si el checkbox ya está marcado), así que "marcarlo dos veces"
    // nunca dispara una segunda petición al backend. Un checkbox HTML tampoco
    // admite "doble marcado" por click real de usuario — la única forma de
    // llegar a un 409 aquí sería una condición de carrera (dos clientes
    // asignando el mismo permiso casi simultáneamente), no un flujo de UI
    // secuencial. Pendiente confirmar con backend/QA cómo se reproduce en
    // la práctica antes de reescribir este caso.
  });

  test('retirar el último permiso del rol - bloqueado en cliente', async ({ page }) => {
    // Requiere un rol de prueba con un solo permiso asignado (ver Precondiciones del caso)
    await page.getByPlaceholder(/filter by role name|filtrar por nombre de rol/i).fill('Rol de prueba');
    const filaRol = page.getByRole('row', { name: /rol de prueba/i });
    await filaRol.getByRole('button', { name: /editar|edit/i }).click();

    // PermisosMatrix.tsx deshabilita el checkbox del último permiso restante
    // (esUltimoPermiso = permisos.length <= 1) con title="Mínimo un permiso
    // requerido" — el intento nunca llega al backend, por lo que no hay 422/alert.
    const unicoPermiso = page.getByRole('checkbox', { checked: true }).first();
    await expect(unicoPermiso).toBeDisabled();
    await expect(unicoPermiso).toHaveAttribute('title', /m[ií]nimo un permiso requerido/i);
  });

});
