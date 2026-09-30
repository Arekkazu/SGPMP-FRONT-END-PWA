/**
 * TC-DIS-121 — Consistencia visual de las vistas de Asociación Activa e Historial
 * RF-34 · CU-01 Registrar y Asociar Activo Biológico (vistas de consulta) · Rol: Administrador
 * Activos biológicos → ficha del activo → pestaña "Infraestructura"
 *
 * Baselines: vista "Ubicación actual" (asociación activa) y vista "Historial de
 * ubicaciones" con 2 asociaciones. Se captura solo la sección de infraestructura.
 *
 * Datos: activo #4 (el único del ambiente con historial de asociaciones).
 * BLOQUEO DEL AMBIENTE (2026-09-29, ver TC-DIS-120): ningún activo tiene asociación
 * activa (GET …/infraestructura?tipo_consulta=ACTIVA → 404 para todos). El test "0"
 * lo verifica y falla mientras siga. Las baselines usan fixtures fijos servidos con
 * page.route: el historial real del activo #4 (2 asociaciones) y una asociación
 * activa construida con su último registro, así no dependen de cambios de datos.
 *
 * Viewports: el script contempla movil / tablet / escritorio, pero solo se
 * ejecuta ESCRITORIO por el defecto abierto de sidebar/scroll (TC-DIS-07/08/10/11).
 * Para habilitarlos: TC_DIS_121_VIEWPORTS=movil,tablet,escritorio
 */
import { expect, test, type Locator, type Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

const ID_ACTIVO = 4;

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_121_VIEWPORTS ?? 'escritorio')
  .split(',')
  .map((v) => v.trim());

const URL_ASOCIACION = (url: URL) => /\/activos-biologicos\/\d+\/infraestructura$/.test(url.pathname);

// Historial real del activo #4 (GET …/infraestructura?tipo_consulta=HISTORIAL, 2026-09-29)
const HISTORIAL = [
  { id_historial: 292, id_activo_biologico: 4, id_infraestructura: 7, nombre_infraestructura: 'Piscina-Cam-02', tipo_infraestructura: 'Estanque', fecha_inicio: '2024-03-01T00:00:00Z', fecha_fin: '2024-03-15T00:00:00Z' },
  { id_historial: 293, id_activo_biologico: 4, id_infraestructura: 16, nombre_infraestructura: 'QA-G05-Infra-1789005185', tipo_infraestructura: 'Estanque', fecha_inicio: '2024-03-10T00:00:00Z', fecha_fin: '2024-03-20T00:00:00Z' },
];

const RESPUESTAS = {
  HISTORIAL: {
    tipo_consulta: 'HISTORIAL', id_activo_biologico: 4, asociacion_activa: null, historial: HISTORIAL,
    sensores_en_infraestructura: [],
    advertencia_integridad: 'Se detectó solapamiento entre los períodos de asociación a infraestructura con id_historial 292 y 293.',
  },
  // Asociación activa construida con el último registro del historial (vigente)
  ACTIVA: {
    tipo_consulta: 'ACTIVA', id_activo_biologico: 4,
    asociacion_activa: { ...HISTORIAL[1], fecha_fin: null },
    historial: [], sensores_en_infraestructura: [], advertencia_integridad: null,
  },
};

async function iniciarSesionAdmin(page: Page) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill(ADMIN_EMAIL);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 });
}

async function servirAsociaciones(page: Page) {
  await page.route(URL_ASOCIACION, (r) => {
    const tipo = new URL(r.request().url()).searchParams.get('tipo_consulta') as 'ACTIVA' | 'HISTORIAL';
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(RESPUESTAS[tipo] ?? RESPUESTAS.ACTIVA) });
  });
}

/** Ficha del activo → pestaña "Infraestructura". Devuelve el estado de la consulta ACTIVA. */
async function abrirInfraestructura(page: Page): Promise<number> {
  await page.goto(`/activos-biologicos/${ID_ACTIVO}`);
  const secciones = page.getByRole('navigation', { name: 'Secciones del activo' });
  await expect(secciones).toBeVisible({ timeout: 20_000 });
  const consulta = page.waitForResponse((r) => URL_ASOCIACION(new URL(r.url())) && new URL(r.url()).searchParams.get('tipo_consulta') === 'ACTIVA');
  await secciones.getByRole('button', { name: 'Infraestructura', exact: true }).click();
  const estado = (await consulta).status();
  await page.evaluate(() => document.fonts.ready);
  return estado;
}

/** Tarjeta de la sección de infraestructura (selector de vista + contenido). */
function seccion(page: Page, contenido: Locator): Locator {
  return page
    .locator('div')
    .filter({ has: page.getByRole('button', { name: 'Historial de ubicaciones', exact: true }) })
    .filter({ has: contenido })
    .last();
}

test.describe('TC-DIS-121 - Consistencia visual - Asociación Activa e Historial (RF-34)', () => {
  // workers: 1 en el config; timeout amplio por la latencia del login en TEST
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      !VIEWPORTS_HABILITADOS.includes(testInfo.project.name),
      `Viewport "${testInfo.project.name}" deshabilitado: defecto abierto de sidebar/scroll en móvil y tablet (TC-DIS-07/08/10/11). Solo se evalúa escritorio.`,
    );
    expect(ADMIN_EMAIL, 'Falta TEST_ADMIN_EMAIL en testing/.env.test').not.toBe('');
    expect(ADMIN_PASSWORD, 'Falta TEST_ADMIN_PASSWORD en testing/.env.test').not.toBe('');
    await iniciarSesionAdmin(page);
  });

  test('0. Precondición - el activo tiene asociación activa en el ambiente', async ({ page }) => {
    expect(
      await abrirInfraestructura(page),
      `BLOQUEO: GET /activos-biologicos/${ID_ACTIVO}/infraestructura?tipo_consulta=ACTIVA responde 404 ASOCIACION_INFRAESTRUCTURA_NO_ENCONTRADA; ningún activo del ambiente tiene asociación activa`,
    ).toBe(200);
  });

  test('1. Vista "Ubicación actual" (asociación activa)', async ({ page }) => {
    await servirAsociaciones(page);
    await abrirInfraestructura(page);
    const tarjeta = page.getByText(RESPUESTAS.ACTIVA.asociacion_activa.nombre_infraestructura, { exact: true });
    await expect(tarjeta).toBeVisible();
    await expect(page.getByText('ACTUAL', { exact: true })).toBeVisible();

    await expect(seccion(page, tarjeta)).toHaveScreenshot('asociacion-activa.png', { animations: 'disabled' });
  });

  test('2. Vista "Historial de ubicaciones" (2 asociaciones)', async ({ page }) => {
    await servirAsociaciones(page);
    await abrirInfraestructura(page);
    await page.getByRole('button', { name: 'Historial de ubicaciones', exact: true }).click();
    for (const a of HISTORIAL) {
      await expect(page.getByText(a.nombre_infraestructura, { exact: true })).toBeVisible();
    }

    await expect(seccion(page, page.getByText(HISTORIAL[0].nombre_infraestructura, { exact: true })))
      .toHaveScreenshot('asociacion-historial.png', { animations: 'disabled' });
  });
});
