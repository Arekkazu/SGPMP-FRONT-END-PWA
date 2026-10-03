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
  await page.waitForURL(/dashboard/, { waitUntil: 'domcontentloaded' });

  const btnUsuarios = page.getByRole('link', { name: /gestión de usuarios/i }).or(page.getByRole('button', { name: /gestión de usuarios/i }));
  const menuToggle = page.getByRole('button', { name: /alternar menú lateral/i });
  await abrirMenuYClicRobusto(page, menuToggle, btnUsuarios);

  // Esperar a que navegue a la página de usuarios y la animación del menú concluya
  await page.waitForURL(/usuarios/);
}

// Este usuario también lo muta TC-DIS-27 (activar/inactivar). El modal muestra
// acciones distintas según el estado ("Inactivar" vs "Activar"), así que sin
// fijar el estado antes de la captura, el resultado depende del orden de
// ejecución entre archivos. Se deja siempre Activo antes de screenshotear.
async function asegurarUsuarioActivo(page: Page, nombre: string) {
  const inputNombre = page.getByLabel('Nombre');
  await expect(inputNombre).toBeVisible({ timeout: 10000 });
  await inputNombre.fill(nombre);
  await page.keyboard.press('Enter');

  const btnGestionar = page.getByRole('button', { name: `Gestionar cuenta de ${nombre}` });
  await expect(btnGestionar).toBeVisible({ timeout: 10000 });
  await btnGestionar.click();

  const btnActivar = page.getByRole('button', { name: /^activar/i });
  if (await btnActivar.isVisible().catch(() => false)) {
    await btnActivar.click();
    await page.getByRole('button', { name: /confirmar/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });
  } else {
    await page.keyboard.press('Escape');
  }
}

test.describe('TC-DIS-28 - Consistencia visual - Gestionar Cuenta (RF-06)', () => {

  test.beforeEach(async ({ page }) => {
    await loginComoAdmin(page);
    await asegurarUsuarioActivo(page, USUARIO_PRUEBA);
  });

  test('modal gestionar cuenta', async ({ page }) => {
    const inputNombre = page.getByLabel('Nombre');

    // Asegura que el formulario sea visible e interactuable (menú lateral cerrado)
    await expect(inputNombre).toBeVisible({ timeout: 10000 });
    await inputNombre.fill(USUARIO_PRUEBA);
    await page.keyboard.press('Enter');

    const btnGestionar = page.getByRole('button', { name: `Gestionar cuenta de ${USUARIO_PRUEBA}` });
    await expect(btnGestionar).toBeVisible({ timeout: 10000 });
    await btnGestionar.click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page).toHaveScreenshot('gestionar-cuenta-modal.png', { fullPage: true });
  });

});