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

  // Esperar navegación de forma tolerante a SPAs
  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    waitUntil: 'domcontentloaded',
    timeout: 15000,
  });

  // Desplegar menú en resoluciones reducidas. La matriz de permisos no es un
  // link propio del sidebar: se abre desde "Roles y permisos" al editar un rol
  // (ver TC-DIS-24, que usa la misma navegación).
  const menuToggle = page.getByRole('button', { name: /alternar menú lateral/i });
  const linkRolesYPermisos = page.getByRole('link', { name: /roles y permisos/i }).or(page.getByRole('button', { name: /roles y permisos/i }));
  await abrirMenuYClicRobusto(page, menuToggle, linkRolesYPermisos);
}

test.describe('TC-DIS-25 - Consistencia visual - Matriz de Permisos (RF-04)', () => {

  test.beforeEach(async ({ page }) => {
    await loginComoAdmin(page);
  });

  test('matriz de permisos - estado inicial', async ({ page }) => {
    // La fila 1 puede ser "Administrador", rol protegido cuyo botón "editar"
    // está deshabilitado (r.es_protegido, ver RolesTable.tsx:108). Se apunta a
    // un rol editable, igual que TC-DIS-24 (matriz-permisos.axe.spec.ts).
    const filaRol = page.getByRole('row', { name: /veterinario|productor/i }).first();
    const botonEditar = filaRol.getByRole('button', { name: /editar|edit/i });

    await expect(botonEditar).toBeVisible();
    await botonEditar.click();

    // Validar apertura del modal antes de tomar la captura
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    await expect(page).toHaveScreenshot('matriz-permisos-inicial.png', { fullPage: true });
  });

});