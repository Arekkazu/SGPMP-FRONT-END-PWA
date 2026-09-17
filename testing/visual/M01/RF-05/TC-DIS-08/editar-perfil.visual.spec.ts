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

test.describe('TC-DIS-08 - Consistencia visual - Editar Perfil (vista Administrador)', () => {

  test('lista de Gestión de usuarios - estado inicial', async ({ page }) => {
    await iniciarSesionAdmin(page);
    await expect(page).toHaveScreenshot('gestion-usuarios-lista.png', { fullPage: true });
  });

  test('modal Gestionar cuenta de un tercero', async ({ page }) => {
    await iniciarSesionAdmin(page);
    await buscarYSeleccionarUsuario(page, USUARIO_OBJETIVO);

    await expect(page).toHaveScreenshot('gestion-usuarios-modal.png', { fullPage: true });
  });

});