import AxeBuilder from '@axe-core/playwright';
import { expect, test, Page, Locator } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';

const EMAIL_VALIDO = process.env.TEST_USER_EMAIL!;
const PASSWORD_VALIDO = process.env.TEST_USER_PASSWORD!;

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

async function iniciarSesion(page) {
  await page.goto('/login');
  await page.getByLabel(/correo electrónico/i).fill(EMAIL_VALIDO);
  await page.getByLabel(/contraseña/i).fill(PASSWORD_VALIDO);
  await page.getByRole('button', { name: /ingresar/i }).click();
  await page.waitForURL('**/dashboard');

  const botonMenu = page.getByRole('button', { name: /alternar menú lateral/i });
  const botonPerfil = page.getByRole('link', { name: /mi perfil/i }).or(page.getByRole('button', { name: /mi perfil/i }));
  await abrirMenuYClicRobusto(page, botonMenu, botonPerfil);
  await page.waitForURL('**/perfil');
}

test.describe('TC-DIS-19 - Accesibilidad WCAG 2.1 AA - Mi Perfil (solo lectura)', () => {

  test('pantalla de Mi Perfil - 0 violaciones axe A/AA', async ({ page }, testInfo) => {
    await iniciarSesion(page);

    await page.getByRole('heading', { name: /^mi perfil$/i }).waitFor({ state: 'visible' });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    guardarResultadoAxe('TC-DIS-19', __dirname, testInfo.title, results);
    expect(results.violations).toEqual([]);
  });

  test('estructura de encabezados es jerárquica y descriptiva', async ({ page }) => {
    await iniciarSesion(page);

    await expect(page.getByRole('heading', { name: /^mi perfil$/i })).toBeVisible();

    const tituloSeccionesSonHeadings = await page.getByRole('heading', { name: /información personal/i }).isVisible().catch(() => false);
    test.fail(!tituloSeccionesSonHeadings, 'RF-13: "Información personal" y "Datos de cuenta" se renderizan como <span> (ver PerfilPage.tsx:158 y :180), no como encabezados; un lector de pantalla que navegue por headings no las encuentra.');

    await expect(page.getByRole('heading', { name: /información personal/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /datos de cuenta/i })).toBeVisible();
  });

  test('avatar de iniciales no interfiere con lectores de pantalla', async ({ page }) => {
    await iniciarSesion(page);

    // El avatar (iniciales del usuario de prueba, ver .env.test) debe ser decorativo
    // (aria-hidden) o tener un texto accesible con el nombre completo, nunca leerse
    // como iniciales sueltas para un lector de pantalla
    const avatar = page.locator('text="AC"').first();
    const esOculto = await avatar.evaluate(el => el.closest('[aria-hidden="true"]') !== null).catch(() => false);
    const tieneAccessibleName = await avatar.evaluate(el => {
      const contenedor = el.closest('[aria-label], [role="img"]');
      return contenedor ? contenedor.getAttribute('aria-label') : null;
    }).catch(() => null);

    expect(esOculto || !!tieneAccessibleName).toBeTruthy();
  });

});