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

  const menuToggle = page.getByRole('button', { name: /alternar menú lateral/i });
  const btnUsuarios = page.getByRole('link', { name: /gestión de usuarios/i }).or(page.getByRole('button', { name: /gestión de usuarios/i }));
  await abrirMenuYClicRobusto(page, menuToggle, btnUsuarios);
}

test.describe('TC-DIS-34 - Consistencia visual - Detalle de Usuario (RF-12)', () => {

  test.beforeEach(async ({ page }) => {
    await loginComoAdmin(page);
  });

  test('detalle de usuario', async ({ page }) => {
    // La tabla de usuarios está paginada y Sara Gonzalez puede no estar
    // en la primera página. Filtramos por nombre antes de buscar el botón.
    // El input tiene onKeyDown={Enter -> buscar()} en UsuariosPage.tsx.
    await page.getByLabel('Nombre').fill(USUARIO_PRUEBA);
    await page.keyboard.press('Enter');

    const btnVerDetalle = page.getByRole('button', { name: `Ver detalle de ${USUARIO_PRUEBA}` });
    await expect(btnVerDetalle).toBeVisible({ timeout: 10000 });
    await btnVerDetalle.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    // Esperar a que carguen los datos reales: el modal muestra primero
    // skeletons (placeholders grises) mientras llega la respuesta del detalle.
    await expect(dialog.getByLabel(/nombres/i)).toBeVisible({ timeout: 10000 });

    // La columna "Última modificación" de la tabla de fondo (visible en el
    // borde del modal en escritorio) cambia cada vez que cualquier prueba de
    // M01 toca a Sara Gonzalez (TC-DIS-27/28 la activan/inactivan). Se
    // enmascara la tabla completa: el modal en primer plano es lo que
    // realmente valida este caso.
    await expect(page).toHaveScreenshot('detalle-usuario.png', {
      fullPage: true,
      mask: [page.getByRole('table')],
    });
  });

});
