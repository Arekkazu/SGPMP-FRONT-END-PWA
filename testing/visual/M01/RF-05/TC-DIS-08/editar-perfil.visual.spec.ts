import { expect, test, Page, Locator } from '@playwright/test';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL!;
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD!;
// ana.martinez.qa1@sgpmp-test.com quedó en estado "Pendiente" y fuera de la
// primera página del listado; se usa un usuario de prueba dedicado y Activo
// que no mutan otros casos (ver TC-DIS-07, mismo cambio).
const USUARIO_OBJETIVO = 'Prueba Tema Defecto';

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

async function iniciarSesionAdmin(page) {
  await page.goto('/login');
  await page.getByLabel(/correo electrónico/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/contraseña/i).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /ingresar/i }).click();
  await page.waitForURL('**/dashboard', { timeout: 15000 });

  const botonMenu = page.getByRole('button', { name: /alternar menú lateral/i });
  const botonUsuarios = page.getByRole('link', { name: /gestión de usuarios/i }).or(page.getByRole('button', { name: /gestión de usuarios/i }));
  await abrirMenuYClicRobusto(page, botonMenu, botonUsuarios);
  await page.waitForURL('**/usuarios', { timeout: 15000 });
}

// La tabla de usuarios está paginada y no tiene un input con placeholder
// "buscar" (ese locator nunca existió); el filtro real es el campo "Nombre"
// con onKeyDown={Enter -> buscar()} en UsuariosPage.tsx.
async function buscarYSeleccionarUsuario(page, nombre) {
  await page.getByLabel('Nombre').fill(nombre);
  await page.keyboard.press('Enter');

  const filaUsuario = page.getByRole('row', { name: new RegExp(nombre, 'i') });
  await filaUsuario.waitFor({ state: 'visible', timeout: 10000 });
  await filaUsuario.getByRole('button').last().click();

  const modalTitulo = page.getByRole('heading', { name: /gestionar cuenta/i });
  await modalTitulo.waitFor({ state: 'visible', timeout: 10000 });
}

test.describe('TC-DIS-08 - Consistencia visual - Editar Perfil (vista Administrador)', () => {

  test('lista de Gestión de usuarios - estado inicial', async ({ page }) => {
    await iniciarSesionAdmin(page);
    // La tabla sin filtrar se ordena por "última modificación" y cambia de
    // orden/contenido con cada prueba que crea o edita un usuario en todo el
    // módulo M01 (mismo hallazgo que TC-DIS-32). Se filtra por un nombre
    // inexistente para que el layout capturado sea determinista.
    await page.getByLabel('Nombre').fill('zzz-usuario-inexistente-qa');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('gestion-usuarios-lista.png', { fullPage: true });
  });

  test('modal Gestionar cuenta de un tercero', async ({ page }) => {
    await iniciarSesionAdmin(page);
    await buscarYSeleccionarUsuario(page, USUARIO_OBJETIVO);

    await expect(page).toHaveScreenshot('gestion-usuarios-modal.png', { fullPage: true });
  });

});