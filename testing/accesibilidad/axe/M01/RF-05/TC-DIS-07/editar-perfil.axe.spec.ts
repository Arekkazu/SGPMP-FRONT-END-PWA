import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL!;
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD!;
const USUARIO_OBJETIVO = 'ana.martinez.qa1@sgpmp-test.com';

test.describe.configure({ mode: 'serial' });

async function iniciarSesionAdmin(page) {
  await page.goto('/login');
  await page.getByLabel(/correo electrónico/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/contraseña/i).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /ingresar/i }).click();
  await page.waitForURL('**/dashboard', { timeout: 15000 });

  const botonMenu = page.getByRole('button', { name: /alternar menú lateral/i });
  if (await botonMenu.isVisible().catch(() => false)) {
    await botonMenu.click();
    await page.waitForTimeout(300);
  }

  const botonUsuarios = page.getByRole('button', { name: /gestión de usuarios/i });
  await expect(botonUsuarios).toBeEnabled({ timeout: 15000 });
  await botonUsuarios.scrollIntoViewIfNeeded();
  await botonUsuarios.click({ timeout: 15000 });
  await page.waitForURL('**/usuarios', { timeout: 15000 });
}

async function buscarYSeleccionarUsuario(page, email) {
  const buscador = page.getByPlaceholder(/buscar/i);
  if (await buscador.isVisible().catch(() => false)) {
    await buscador.fill(email);
    await page.waitForTimeout(500);
  }

  const filaUsuario = page.getByRole('row', { name: new RegExp(email, 'i') });
  await filaUsuario.waitFor({ state: 'visible', timeout: 10000 });
  await filaUsuario.getByRole('button').last().click();

  const modalTitulo = page.getByRole('heading', { name: /gestionar cuenta/i });
  await modalTitulo.waitFor({ state: 'visible', timeout: 10000 });
}

test.describe('TC-DIS-07 - Accesibilidad WCAG 2.1 AA - Editar Perfil (vista Administrador)', () => {

  test('lista de Gestión de usuarios - 0 violaciones axe A/AA', async ({ page }) => {
    await iniciarSesionAdmin(page);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('modal Gestionar cuenta de un tercero - 0 violaciones axe A/AA', async ({ page }) => {
    await iniciarSesionAdmin(page);
    await buscarYSeleccionarUsuario(page, USUARIO_OBJETIVO);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('modal Gestionar cuenta - opciones son operables con teclado', async ({ page }) => {
    await iniciarSesionAdmin(page);
    await buscarYSeleccionarUsuario(page, USUARIO_OBJETIVO);

    await expect(page.getByText(/^inactivar$/i)).toBeVisible();
    await expect(page.getByText(/^bloquear$/i)).toBeVisible();
    await expect(page.getByText(/^eliminar$/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /cancelar/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /confirmar/i })).toBeVisible();
  });

});