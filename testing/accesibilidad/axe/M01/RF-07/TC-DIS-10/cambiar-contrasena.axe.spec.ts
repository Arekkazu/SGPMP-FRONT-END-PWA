import AxeBuilder from '@axe-core/playwright';
import { expect, test, Page, Locator } from '@playwright/test';

const EMAIL_VALIDO = process.env.TEST_USER_EMAIL!;
const PASSWORD_VALIDO = process.env.TEST_USER_PASSWORD!;

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

  // Rellenar credenciales de entorno
  await page.getByLabel(/correo electrónico/i).fill(EMAIL_VALIDO);
  await page.getByLabel(/contraseña/i).fill(PASSWORD_VALIDO);
  await page.getByRole('button', { name: /ingresar/i }).click();

  // Esperar a estar autenticado
  await page.waitForURL('**/dashboard', { timeout: 15000 });

  // Si el menú lateral está colapsado (móvil/tablet), abrirlo
  const botonMenu = page.getByRole('button', { name: /alternar menú lateral/i });
  const botonPerfil = page.getByRole('link', { name: /mi perfil/i }).or(page.getByRole('button', { name: /mi perfil/i }));
  await abrirMenuYClicRobusto(page, botonMenu, botonPerfil);
  await page.waitForURL('**/perfil');

  // Abrir panel de cambio de contraseña
  await page.getByRole('button', { name: /cambiar contraseña/i }).click();
  const encabezado = page.getByRole('heading', { name: /cambiar contraseña/i, level: 2 });
  await encabezado.waitFor({ state: 'visible', timeout: 10000 });
}

test.describe('TC-DIS-10 - Accesibilidad WCAG 2.1 AA - Cambio de Contraseña', () => {

  test.beforeEach(async ({ page }) => {
    // Asegura inicio de sesión e ingreso al modal en cada test
    await iniciarSesionYAbirPanel(page);
  });

  test('formulario de Cambio de Contraseña - estado inicial - 0 violaciones axe A/AA', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('formulario de Cambio de Contraseña - contraseña actual incorrecta - 0 violaciones axe A/AA', async ({ page }) => {
    await page.getByLabel(/contraseña actual/i).fill('ClaveActualIncorrecta1!');
    await page.getByLabel(/^nueva contraseña/i).fill('NuevaClaveTemporal2!');
    await page.getByLabel(/confirmar nueva contraseña/i).fill('NuevaClaveTemporal2!');

    await page.getByRole('button', { name: /cambiar contraseña/i }).last().click();

    // Validar que el alert se muestre antes de evaluar accesibilidad y que NO haya redirigido a /login
    const alertaError = page.getByRole('alert').first();
    await alertaError.waitFor({ state: 'visible', timeout: 10000 });
    await expect(page).not.toHaveURL('**/login');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  // Hallazgo nuevo (no forma parte de las 7 causas del reporte M01 ya
  // cerrado): el botón "Acción del campo" no trae aria-pressed. Ya se corrigió
  // en Input.tsx (trailingPressed) pero el fix vive solo en este repo hasta
  // que se despliegue a staging; según indicación del líder de proyecto, este
  // tipo de hallazgo técnico queda fuera del alcance actual y se sigue por
  // separado en vez de bloquear el cierre del módulo.
  test.fixme('mostrar/ocultar contraseña - aria-pressed presente', async ({ page }) => {
    const botonMostrarOcultar = page.getByRole('button', { name: /acción del campo|mostrar|ocultar/i }).first();
    await expect(botonMostrarOcultar).toHaveAttribute('aria-pressed', /true|false/);
  });

});