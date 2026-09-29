/**
 * TC-DIS-42 — Consistencia visual de Etapas, Patologías y Métricas por especie
 * RF-16 · CU-02 Configurar Parámetros por Especie · Rol: Administrador
 *
 * Baseline independiente por sección (cada una tiene su propio formulario y
 * catálogo de selects): listado de la sección + formulario crear + formulario
 * editar. "Etapas" corresponde a la sub-pestaña "Ciclos Biológicos".
 *
 * Viewports: el script contempla movil / tablet / escritorio, pero por ahora
 * solo se ejecuta ESCRITORIO por el defecto abierto de sidebar/scroll en
 * móvil y tablet (ver TC-DIS-07/08/10/11). Para habilitarlos:
 *   TC_DIS_42_VIEWPORTS=movil,tablet,escritorio npx playwright test TC-DIS-42
 *
 * Precondición: especie con al menos una etapa, una patología y una métrica.
 * Por defecto "Tilapia Roja" (#1); se cambia con TC_DIS_42_ESPECIE.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

const ESPECIE = process.env.TC_DIS_42_ESPECIE ?? 'Tilapia Roja';

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_42_VIEWPORTS ?? 'escritorio')
  .split(',')
  .map((v) => v.trim());

interface Seccion {
  clave: string;
  subTab: string;
  endpoint: string;
  titulo: string;
  botonNuevo: string;
  dialogoNuevo: string;
  dialogoEditar: RegExp;
}

const SECCIONES: Seccion[] = [
  {
    clave: 'etapas',
    subTab: 'Ciclos Biológicos',
    endpoint: '/configuracion/ciclos',
    titulo: 'Ciclos Biológicos',
    botonNuevo: 'Nuevo ciclo',
    dialogoNuevo: 'Nuevo ciclo biológico',
    dialogoEditar: /^Editar ciclo — /,
  },
  {
    clave: 'patologias',
    subTab: 'Patologías',
    endpoint: '/configuracion/patologias',
    titulo: 'Patologías',
    botonNuevo: 'Nueva patología',
    dialogoNuevo: 'Nueva patología',
    dialogoEditar: /^Editar patología — /,
  },
  {
    clave: 'metricas',
    subTab: 'Métricas',
    endpoint: '/configuracion/metricas',
    titulo: 'Métricas de Producción',
    botonNuevo: 'Nueva métrica',
    dialogoNuevo: 'Nueva métrica de producción',
    dialogoEditar: /^Editar métrica — /,
  },
];

const OPCIONES_CAPTURA = { fullPage: true, animations: 'disabled' as const, caret: 'hide' as const };

async function iniciarSesionAdmin(page: Page) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill(ADMIN_EMAIL);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 });
}

function esListado(endpoint: string) {
  return (res: { url(): string; request(): { method(): string } }) =>
    res.request().method() === 'GET' && new URL(res.url()).pathname.endsWith(endpoint);
}

/** /configuracion → Por Especie → especie de prueba (abre en "Ciclos Biológicos"). */
async function abrirEspecie(page: Page) {
  await page.goto('/configuracion');
  await page.getByRole('button', { name: 'Por Especie', exact: true }).click();

  const ciclos = page.waitForResponse(esListado('/configuracion/ciclos'), { timeout: 20_000 });
  await page.getByRole('button', { name: new RegExp(ESPECIE) }).first().click();
  await ciclos;
  await expect(page.getByRole('heading', { level: 2, name: ESPECIE, exact: true })).toBeVisible();
}

/** Abre la sub-pestaña y espera a que la tabla tenga datos (precondición del caso). */
async function abrirSeccion(page: Page, seccion: Seccion) {
  if (seccion.subTab !== 'Ciclos Biológicos') {
    const listado = page.waitForResponse(esListado(seccion.endpoint), { timeout: 20_000 });
    await page.getByRole('button', { name: seccion.subTab, exact: true }).click();
    await listado;
  }
  await expect(page.getByRole('heading', { name: seccion.titulo })).toBeVisible();
  await expect(
    page.locator('table tbody tr').first(),
    `Precondición: "${ESPECIE}" debe tener al menos un registro en ${seccion.subTab}`,
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

/** Celdas de fecha (dd/mm/aa): cambian con cada edición y no son parte del diseño. */
function fechas(page: Page): Locator {
  return page.locator('table tbody td').filter({ hasText: /^\d{2}\/\d{2}\/\d{2}$/ });
}

test.describe('TC-DIS-42 - Consistencia visual - Etapas/Patologías/Métricas (RF-16)', () => {
  // En serie y con un solo login por test: evita sumar intentos contra la cuenta admin
  test.describe.configure({ mode: 'serial', timeout: 120_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      !VIEWPORTS_HABILITADOS.includes(testInfo.project.name),
      `Viewport "${testInfo.project.name}" deshabilitado: defecto abierto de sidebar/scroll en móvil y tablet (TC-DIS-07/08/10/11). Solo se evalúa escritorio.`,
    );
    expect(ADMIN_EMAIL, 'Falta TEST_ADMIN_EMAIL en testing/.env.test').not.toBe('');
    expect(ADMIN_PASSWORD, 'Falta TEST_ADMIN_PASSWORD en testing/.env.test').not.toBe('');

    await iniciarSesionAdmin(page);
    await abrirEspecie(page);
  });

  for (const seccion of SECCIONES) {
    test(`${seccion.subTab} - listado y formularios crear/editar`, async ({ page }) => {
      await abrirSeccion(page, seccion);

      // 1-3. Listado de la sección
      await expect(page).toHaveScreenshot(`${seccion.clave}-listado.png`, {
        ...OPCIONES_CAPTURA,
        mask: [fechas(page)],
      });

      // Formulario crear
      await page.getByRole('button', { name: seccion.botonNuevo }).click();
      const dialogoNuevo = page.getByRole('dialog', { name: seccion.dialogoNuevo });
      await expect(dialogoNuevo).toBeVisible();
      await expect(dialogoNuevo.getByRole('textbox', { name: 'Nombre', exact: true })).toHaveValue('');
      await expect(page).toHaveScreenshot(`${seccion.clave}-form-crear.png`, {
        ...OPCIONES_CAPTURA,
        mask: [fechas(page)],
      });
      await dialogoNuevo.getByRole('button', { name: 'Cancelar' }).click();
      await expect(dialogoNuevo).toBeHidden();

      // Formulario editar (primer registro de la sección)
      await page.locator('table tbody tr').first().getByRole('button', { name: /^Editar / }).click();
      const dialogoEditar = page.getByRole('dialog', { name: seccion.dialogoEditar });
      await expect(dialogoEditar).toBeVisible();
      await expect(dialogoEditar.getByRole('textbox', { name: 'Nombre', exact: true })).not.toHaveValue('');
      await expect(page).toHaveScreenshot(`${seccion.clave}-form-editar.png`, {
        ...OPCIONES_CAPTURA,
        // Metadatos "Creado / Actualizado" del registro, si el formulario los muestra
        mask: [fechas(page), dialogoEditar.getByText(/^Creado:/)],
      });
    });
  }
});
