/**
 * TC-DIS-39 — Consistencia visual del listado y formulario del Catálogo de Especies
 * RF-15 · CU-01 Gestionar Catálogo de Especies · Rol: Administrador
 *
 * Corre en movil / tablet / escritorio por defecto — se confirmó que esta
 * pantalla navega directo por URL (no por el toggle del sidebar) y no
 * reproduce el bug de M01. Para acotarlo puntualmente:
 *   TC_DIS_39_VIEWPORTS=escritorio
 *
 * Precondiciones:
 *   - Catálogo con al menos una especie ACTIVA y una INACTIVA (se valida).
 *   - Baseline aprobada. La primera vez se genera con --update-snapshots.
 *
 * Paso 4: el listado vacío se obtiene con el buscador "Buscar por nombre…"
 * y un término sin coincidencias ("Ninguna especie coincide con la búsqueda.").
 * El catálogo desplegado no tiene paginación: muestra todos los registros
 * en una sola página con el pie "N registros".
 */
import { expect, test, type Page, type Response } from '@playwright/test';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_39_VIEWPORTS ?? 'movil,tablet,escritorio')
  .split(',')
  .map((v) => v.trim());

const RUTA_ESPECIES = '/configuracion/especies';

// Coincide con el GET del listado (XHR/fetch), no con la ruta de la SPA /configuracion
function esListadoEspecies(url: string | URL): boolean {
  const pathname = typeof url === 'string' ? new URL(url).pathname : url.pathname;
  return pathname.endsWith(RUTA_ESPECIES);
}

function esRespuestaListado(res: Response): boolean {
  const req = res.request();
  return (
    req.method() === 'GET' &&
    ['xhr', 'fetch'].includes(req.resourceType()) &&
    esListadoEspecies(res.url())
  );
}

async function iniciarSesionAdmin(page: Page) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill(ADMIN_EMAIL);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 });
}

/** Abre /configuracion (tab Catálogo por defecto) y espera a que la tabla termine de cargar. */
async function abrirCatalogoEspecies(page: Page) {
  const listado = page.waitForResponse(esRespuestaListado, { timeout: 20_000 });
  await page.goto('/configuracion');
  await listado;

  await page.getByRole('button', { name: 'Catálogo', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Catálogo de Especies' })).toBeVisible();
  // El contador "N activas · M inactivas" solo aparece cuando termina el skeleton
  await expect(page.getByText(/\d+ activas · \d+ inactivas/)).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

/** Zonas con datos que cambian entre corridas (fechas, contador) y no son parte del diseño. */
function zonasDinamicas(page: Page) {
  return [
    page.locator('table tbody td:nth-child(5)'), // columna "Actualizado"
    page.getByText(/\d+ activas · \d+ inactivas/),
  ];
}

const OPCIONES_CAPTURA = { fullPage: true, animations: 'disabled' as const, caret: 'hide' as const };

test.describe('TC-DIS-39 - Consistencia visual - Catálogo de Especies (RF-15)', () => {
  // En serie: si el login falla se detiene, en vez de sumar intentos fallidos a la cuenta admin (bloqueo a los 5)
  test.describe.configure({ mode: 'serial', timeout: 120_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      !VIEWPORTS_HABILITADOS.includes(testInfo.project.name),
      `Viewport "${testInfo.project.name}" deshabilitado: defecto abierto de sidebar/scroll en móvil y tablet (TC-DIS-07/08/10/11). Solo se evalúa escritorio.`,
    );
    expect(ADMIN_EMAIL, 'Falta TEST_ADMIN_EMAIL en testing/.env.test').not.toBe('');
    expect(ADMIN_PASSWORD, 'Falta TEST_ADMIN_PASSWORD en testing/.env.test').not.toBe('');

    await iniciarSesionAdmin(page);
  });

  test('1-2. Listado con especies activas e inactivas', async ({ page }) => {
    await abrirCatalogoEspecies(page);

    const filas = page.locator('table tbody tr');
    const filaActiva = filas.filter({ has: page.getByText('Activo', { exact: true }) }).first();
    const filaInactiva = filas.filter({ has: page.getByText('Inactivo', { exact: true }) }).first();

    // Precondición del caso: ambos estados deben existir para cubrirlos en la baseline
    await expect(filaActiva, 'Precondición: se requiere al menos una especie activa').toBeVisible();
    await expect(filaInactiva, 'Precondición: se requiere al menos una especie inactiva').toBeVisible();

    await expect(page).toHaveScreenshot('catalogo-listado.png', {
      ...OPCIONES_CAPTURA,
      mask: zonasDinamicas(page),
    });

    // Detalle del estado: etiqueta + punto indicador + acción disponible (Desactivar / Reactivar)
    await expect(filaActiva).toHaveScreenshot('catalogo-fila-activa.png', {
      animations: 'disabled',
      mask: [filaActiva.locator('td:nth-child(5)')],
    });
    await expect(filaInactiva).toHaveScreenshot('catalogo-fila-inactiva.png', {
      animations: 'disabled',
      mask: [filaInactiva.locator('td:nth-child(5)')],
    });
  });

  test('3a. Formulario crear especie', async ({ page }) => {
    await abrirCatalogoEspecies(page);

    await page.getByRole('button', { name: 'Nueva especie' }).click();
    const dialogo = page.getByRole('dialog', { name: 'Nueva especie' });
    await expect(dialogo).toBeVisible();
    await expect(dialogo.getByRole('textbox', { name: 'Nombre', exact: true })).toHaveValue('');

    await expect(page).toHaveScreenshot('catalogo-form-crear.png', OPCIONES_CAPTURA);
  });

  test('3b. Formulario editar especie', async ({ page }) => {
    await abrirCatalogoEspecies(page);

    const filaActiva = page
      .locator('table tbody tr')
      .filter({ has: page.getByText('Activo', { exact: true }) })
      .first();
    await filaActiva.getByRole('button', { name: /^Editar / }).click();

    const dialogo = page.getByRole('dialog', { name: /^Editar especie — / });
    await expect(dialogo).toBeVisible();
    await expect(dialogo.getByRole('textbox', { name: 'Nombre', exact: true })).not.toHaveValue('');

    await expect(page).toHaveScreenshot('catalogo-form-editar.png', {
      ...OPCIONES_CAPTURA,
      // Bloque "Creado: … · Actualizado: …" y fechas de la tabla de fondo
      mask: [dialogo.getByText(/^Creado:/), ...zonasDinamicas(page)],
    });
  });

  test('4. Listado vacío por filtro sin resultados', async ({ page }) => {
    await abrirCatalogoEspecies(page);

    await page
      .getByRole('textbox', { name: 'Buscar especies por nombre' })
      .fill('zzz sin resultados tc dis 39');
    await expect(page.getByText('Ninguna especie coincide con la búsqueda.', { exact: true })).toBeVisible();
    await expect(page.getByText('0 registros', { exact: true })).toBeVisible();
    await expect(page.locator('table tbody tr')).toHaveCount(0);

    await expect(page).toHaveScreenshot('catalogo-listado-vacio.png', {
      ...OPCIONES_CAPTURA,
      // El contador de la cabecera refleja el catálogo completo, no el filtro
      mask: [page.getByText(/\d+ activas · \d+ inactivas/)],
    });
  });
});
