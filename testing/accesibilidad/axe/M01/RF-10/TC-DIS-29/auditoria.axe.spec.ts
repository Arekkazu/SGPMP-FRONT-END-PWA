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
  const linkAuditoria = page.getByRole('link', { name: /auditoría/i }).or(page.getByRole('button', { name: /auditoría/i }));
  await abrirMenuYClicRobusto(page, menuToggle, linkAuditoria);
}

test.describe('TC-DIS-29 - Accesibilidad WCAG 2.1 AA - Auditoría (RF-10)', () => {

  test.beforeEach(async ({ page }) => {
    await loginComoAdmin(page);
  });

  test('pantalla de auditoría - 0 violaciones axe A/AA', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('filtro por tipo de evento con Enter ejecuta la consulta', async ({ page }) => {
    // <option> confirmado en AuditoriaFiltros.tsx: "Todos los tipos" + opciones dinámicas
    await page.getByRole('combobox', { name: /tipo/i }).selectOption({ index: 1 });
    await page.keyboard.press('Enter');
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('filtro sin resultados - mensaje anunciado vía aria-live', async ({ page }) => {
    // Un id_usuario inexistente (ej. 999999999) dispara 400 FILTROS_INCONSISTENTES
    // en el backend en vez de una lista vacía (hallazgo distinto, ya reportado).
    // Un rango de fechas histórico sí produce el estado vacío real.
    await page.getByLabel(/fecha desde/i).fill('2000-01-01T00:00');
    await page.getByLabel(/fecha hasta/i).fill('2000-01-02T00:00');
    await page.keyboard.press('Enter');
    await expect(page.getByText(/sin resultados|no se encontraron/i)).toBeVisible();
  });

});
