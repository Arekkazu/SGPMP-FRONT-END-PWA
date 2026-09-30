import { Page } from '@playwright/test';

// Construimos la URL absoluta manualmente en vez de depender de que Playwright
// resuelva goto('/login') contra `use.baseURL` del config: en el entorno actual
// esa resolución implícita está fallando con
// "Protocol error (Page.navigate): Cannot navigate to invalid URL"
// incluso con baseURL bien configurado (ver hallazgo de TC-DIS-41). Con la URL
// absoluta evitamos depender de ese mecanismo mientras se investiga la causa raíz.
const BASE_URL = process.env.BASE_URL ?? 'https://api.inmero.co/';

export async function iniciarSesionAdmin(page: Page, email: string, password: string) {
  await page.goto(new URL('/login', BASE_URL).toString());
  await page.getByLabel(/correo electrónico/i).fill(email);
  await page.getByLabel(/contraseña/i).fill(password);

  const botonIngresar = page.getByRole('button', { name: /ingresar/i });
  await botonIngresar.waitFor({ state: 'visible' });
  await botonIngresar.click();

  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

// Navega a una opción del menú lateral, manejando el bug conocido del sidebar en móvil/tablet.
// TODO: quitar el waitFor de '.sidebar--open' cuando desarrollo confirme el fix del bug de sesión/animación del sidebar.
export async function irAOpcionMenu(page: Page, nombreOpcion: string | RegExp) {
  const botonMenu = page.getByRole('button', { name: /alternar menú lateral/i });

  if (await botonMenu.isVisible().catch(() => false)) {
    await botonMenu.click();
    await page.locator('.ds-sidebar--open').waitFor({ state: 'visible' });
  }

  const opcion = page.getByText(nombreOpcion, { exact: true }).first();
  await opcion.scrollIntoViewIfNeeded();
  await opcion.click();
}