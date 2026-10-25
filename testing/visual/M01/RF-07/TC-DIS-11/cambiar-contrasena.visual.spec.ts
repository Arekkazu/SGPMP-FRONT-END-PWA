import { expect, test, Page, Locator } from '@playwright/test';

const EMAIL_VALIDO = process.env.TEST_USER_EMAIL!;
const PASSWORD_VALIDO = process.env.TEST_USER_PASSWORD!;

// Ejecutar secuencialmente para que las capturas visuales no colisionen
test.describe.configure({ mode: 'serial' });

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

async function iniciarSesionYAbirPanel(page) {
  await page.goto('/login');

  // Rellenar formulario de autenticación
  await page.getByLabel(/correo electrónico/i).fill(EMAIL_VALIDO);
  await page.getByLabel(/contraseña/i).fill(PASSWORD_VALIDO);
  await page.getByRole('button', { name: /ingresar/i }).click();

  // Confirmar ingreso al dashboard sin redirecciones
  await page.waitForURL('**/dashboard', { timeout: 15000 });

  // Manejar menú lateral colapsable (Mobile/Tablet)
  const botonMenu = page.getByRole('button', { name: /alternar menú lateral/i });
  const botonPerfil = page.getByRole('link', { name: /mi perfil/i }).or(page.getByRole('button', { name: /mi perfil/i }));
  await abrirMenuYClicRobusto(page, botonMenu, botonPerfil);
  await page.waitForURL('**/perfil');

  // Abrir panel/modal de cambio de contraseña
  await page.getByRole('button', { name: /cambiar contraseña/i }).click();
  const encabezado = page.getByRole('heading', { name: /^cambiar contraseña$/i, level: 2 });
  await encabezado.waitFor({ state: 'visible', timeout: 10000 });
}

test.describe('TC-DIS-11 - Consistencia visual - Cambio de Contraseña', () => {

  test.beforeEach(async ({ page }) => {
    await iniciarSesionYAbirPanel(page);
  });

  test('modal de Cambio de Contraseña - estado inicial', async ({ page }) => {
    // Garantizar que la vista no fue expulsada antes del snapshot
    await expect(page).not.toHaveURL('**/login');

    await expect(page).toHaveScreenshot('cambiar-contrasena-inicial.png', { fullPage: true });
  });

  test('modal de Cambio de Contraseña - estado con error', async ({ page }) => {
    await page.getByLabel(/contraseña actual/i).fill('ClaveActualIncorrecta1!');
    await page.getByLabel(/^nueva contraseña/i).fill('NuevaClaveTemporal2!');
    await page.getByLabel(/confirmar nueva contraseña/i).fill('NuevaClaveTemporal2!');

    await page.getByRole('button', { name: /cambiar contraseña/i }).last().click();

    // Esperar mensaje de error
    const alertaError = page.getByRole('alert').first();
    await alertaError.waitFor({ state: 'visible', timeout: 10000 });

    // Confirmar que la aplicación NO redirigió a /login al fallar
    await expect(page).not.toHaveURL('**/login');

    await expect(page).toHaveScreenshot('cambiar-contrasena-error.png', { fullPage: true });
  });

});