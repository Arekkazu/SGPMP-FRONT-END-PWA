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

  // 1. Manejo eficiente de navegación para SPAs (evita timeouts de 30s)
  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    waitUntil: 'domcontentloaded',
    timeout: 15000,
  });

  // 2. Despliegue del menú lateral en vista móvil/tablet
  const menuToggle = page.getByRole('button', { name: /alternar menú lateral/i });
  const btnAuditoria = page.getByRole('link', { name: /auditoría/i }).or(page.getByRole('button', { name: /auditoría/i }));
  await abrirMenuYClicRobusto(page, menuToggle, btnAuditoria);
}

test.describe('TC-DIS-30 - Consistencia visual - Auditoría (RF-10)', () => {

  test.beforeEach(async ({ page }) => {
    await loginComoAdmin(page);
  });

  test('pantalla de auditoría', async ({ page }) => {
    // Validar un elemento propio de la pantalla antes de tomar el screenshot
    await expect(page.getByRole('heading', { name: /auditoría/i })).toBeVisible({ timeout: 10000 });

    // La tabla sin filtrar crece con cada prueba que corre contra staging (cada
    // login, cada acción genera un evento nuevo), así que comparar el listado
    // en vivo contra un baseline es inherentemente inestable (confirmado: el
    // diff crece entre corridas consecutivas sin ningún cambio de código). Se
    // fija un rango de fechas histórico y vacío (mismo filtro que TC-DIS-29)
    // para que el layout capturado sea determinista.
    await page.getByLabel(/fecha desde/i).fill('2000-01-01T00:00');
    await page.getByLabel(/fecha hasta/i).fill('2000-01-02T00:00');
    await page.keyboard.press('Enter');
    await expect(page.getByText(/sin resultados|no se encontraron/i)).toBeVisible();

    await expect(page).toHaveScreenshot('auditoria-listado.png', { fullPage: true });
  });

});