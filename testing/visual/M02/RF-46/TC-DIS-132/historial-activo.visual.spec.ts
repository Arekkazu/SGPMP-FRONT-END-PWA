/**
 * TC-DIS-132 — Consistencia visual de la vista de Historial del Activo
 * RF-46 · CU-10 Gestionar Transferencias y Consultar Historial · Rol: Productor
 * Activos biológicos → ficha del activo → pestaña "Historial"
 *
 * Baselines (solo la tarjeta "Historial consolidado"):
 *   - Listado paginado sin filtros: página 1 y página 2.
 *   - Listado filtrado (categoría TRANSFERENCIA + rango 01-09-2026 a 30-09-2026).
 *   - Estado sin resultados (rango de fechas sin registros).
 *
 * Datos: ningún activo del ambiente tiene registros de las 9 categorías ni supera una
 * página, así que la consulta GET /activos-biologicos/281/historial se sirve con
 * page.route desde historial.fixture.json: 10 registros REALES (activos #281, #296,
 * #279 y #472, capturados el 2026-09-29) de ESTADO, FASE_PRODUCTIVA, CRECIMIENTO, BAJA,
 * TRANSFERENCIA y CREACION, más 4 SIMULADOS (_origen: "simulado") para EVENTO_BIOLOGICO,
 * SANITARIO, REPRODUCTIVO y PRODUCTIVO. El mock aplica los filtros como el backend
 * (FASE → FASE_PRODUCTIVA) y pagina de 10 en 10 (14 registros → 2 páginas).
 * El test "0" verifica contra el ambiente real que el historial del activo responde.
 *
 * Viewports: el script contempla movil / tablet / escritorio, pero solo se
 * ejecuta ESCRITORIO por el defecto abierto de sidebar/scroll (TC-DIS-07/08/10/11).
 * Para habilitarlos: TC_DIS_132_VIEWPORTS=movil,tablet,escritorio
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import fixture from './historial.fixture.json';

const USER_EMAIL = process.env.TEST_USER_EMAIL ?? '';
const USER_PASSWORD = process.env.TEST_USER_PASSWORD ?? '';

const ID_ACTIVO = 281;
const POR_PAGINA = 10;
const CATEGORIAS = ['ESTADO', 'FASE_PRODUCTIVA', 'EVENTO_BIOLOGICO', 'CRECIMIENTO', 'SANITARIO', 'REPRODUCTIVO', 'PRODUCTIVO', 'BAJA', 'TRANSFERENCIA'];

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_132_VIEWPORTS ?? 'escritorio')
  .split(',')
  .map((v) => v.trim());

const URL_HISTORIAL = (url: URL) => url.pathname.endsWith(`/activos-biologicos/${ID_ACTIVO}/historial`);

type Registro = (typeof fixture.registros)[number];

/** Responde como el backend: filtra por categoría y fechas y pagina de 10 en 10. */
function responderHistorial(url: URL) {
  const categoria = url.searchParams.get('categoria_evento');
  const desde = url.searchParams.get('fecha_inicio');
  const hasta = url.searchParams.get('fecha_fin');
  const pagina = Number(url.searchParams.get('pagina') ?? 1);
  const registros = fixture.registros
    .filter((r: Registro) => !categoria || r.categoria === (categoria === 'FASE' ? 'FASE_PRODUCTIVA' : categoria))
    .filter((r: Registro) => !desde || r.fecha_evento.slice(0, 10) >= desde)
    .filter((r: Registro) => !hasta || r.fecha_evento.slice(0, 10) <= hasta)
    .map(({ _origen, ...r }: Registro) => r);
  const totalPaginas = Math.max(1, Math.ceil(registros.length / POR_PAGINA));
  return {
    id_activo_biologico: ID_ACTIVO,
    total_registros: registros.length,
    pagina_actual: pagina,
    total_paginas: totalPaginas,
    registros_por_pagina: POR_PAGINA,
    registros: registros.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA),
  };
}

async function iniciarSesionProductor(page: Page) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill(USER_EMAIL);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(USER_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 });
}

function esperarHistorial(page: Page) {
  return page.waitForResponse((r) => URL_HISTORIAL(new URL(r.url())) && ['xhr', 'fetch'].includes(r.request().resourceType()));
}

async function abrirHistorial(page: Page) {
  await page.goto(`/activos-biologicos/${ID_ACTIVO}`);
  const secciones = page.getByRole('navigation', { name: 'Secciones del activo' });
  await expect(secciones).toBeVisible({ timeout: 20_000 });
  const respuesta = esperarHistorial(page);
  await secciones.getByRole('button', { name: 'Historial', exact: true }).click();
  return respuesta;
}

/** Tarjeta "Historial consolidado" (filtros + tabla + paginación). */
function tarjetaHistorial(page: Page): Locator {
  return page.locator('div').filter({ has: page.getByRole('heading', { name: 'Historial consolidado' }) }).last();
}

async function filtrar(page: Page, accion: () => Promise<void>) {
  const respuesta = esperarHistorial(page);
  await accion();
  await respuesta;
}

async function capturar(page: Page, nombre: string) {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.evaluate(() => document.fonts.ready);
  await expect(tarjetaHistorial(page)).toHaveScreenshot(nombre, { animations: 'disabled' });
}

test.describe('TC-DIS-132 - Consistencia visual - Historial del activo (RF-46)', () => {
  // workers: 1 en el config; timeout amplio por la latencia del login en TEST
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      !VIEWPORTS_HABILITADOS.includes(testInfo.project.name),
      `Viewport "${testInfo.project.name}" deshabilitado: defecto abierto de sidebar/scroll en móvil y tablet (TC-DIS-07/08/10/11). Solo se evalúa escritorio.`,
    );
    expect(USER_EMAIL, 'Falta TEST_USER_EMAIL en testing/.env.test').not.toBe('');
    expect(USER_PASSWORD, 'Falta TEST_USER_PASSWORD en testing/.env.test').not.toBe('');
    await iniciarSesionProductor(page);
  });

  test('0. Precondición - el historial real del activo responde', async ({ page }, testInfo) => {
    const r = await abrirHistorial(page);
    expect(r.status(), `BLOQUEO: GET /activos-biologicos/${ID_ACTIVO}/historial no responde 200 para el Productor`).toBe(200);
    const cuerpo = await r.json();
    const categorias = [...new Set((cuerpo.registros ?? []).map((x: { categoria: string }) => x.categoria))];
    testInfo.annotations.push({ type: 'Historial real', description: `${cuerpo.total_registros} registros · categorías: ${categorias.join(', ')}` });
  });

  test.describe('con fixture', () => {
    test.beforeEach(async ({ page }, testInfo) => {
      testInfo.annotations.push({ type: 'Datos simulados', description: 'Historial servido desde historial.fixture.json: 10 registros reales + 4 simulados (EVENTO_BIOLOGICO, SANITARIO, REPRODUCTIVO, PRODUCTIVO).' });
      await page.route(URL_HISTORIAL, (r) =>
        r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(responderHistorial(new URL(r.request().url()))) }));
    });

    test('1. Listado paginado sin filtros - página 1 y página 2', async ({ page }) => {
      await abrirHistorial(page);
      const tabla = page.getByRole('table');
      await expect(tabla.getByRole('row')).toHaveCount(POR_PAGINA + 1);
      await expect(page.getByText('Página 1 de 2')).toBeVisible();

      // Todas las categorías del caso presentes en el fixture (entre las 2 páginas)
      const categorias = new Set(fixture.registros.map((r: Registro) => r.categoria));
      for (const c of CATEGORIAS) expect(categorias.has(c), `El fixture debe incluir la categoría ${c}`).toBe(true);

      await capturar(page, 'historial-pagina-1.png');

      await filtrar(page, () => page.getByRole('button', { name: 'Siguiente', exact: true }).click());
      await expect(page.getByText('Página 2 de 2')).toBeVisible();
      await expect(tabla.getByRole('row')).toHaveCount(fixture.registros.length - POR_PAGINA + 1);
      await capturar(page, 'historial-pagina-2.png');
    });

    test('2. Listado con filtros de categoría y rango de fechas', async ({ page }) => {
      await abrirHistorial(page);
      await filtrar(page, () => page.getByRole('combobox', { name: 'Categoría', exact: true }).selectOption('TRANSFERENCIA'));
      await filtrar(page, () => page.getByLabel('Desde', { exact: true }).fill('2026-09-01'));
      await filtrar(page, () => page.getByLabel('Hasta', { exact: true }).fill('2026-09-30'));
      await expect(page.getByRole('table').getByRole('row')).toHaveCount(3);
      await capturar(page, 'historial-filtrado.png');
    });

    test('3. Estado sin resultados', async ({ page }) => {
      await abrirHistorial(page);
      await filtrar(page, () => page.getByLabel('Desde', { exact: true }).fill('2025-01-01'));
      await filtrar(page, () => page.getByLabel('Hasta', { exact: true }).fill('2025-01-31'));
      await expect(page.getByText('Sin registros para los filtros seleccionados.')).toBeVisible();
      await capturar(page, 'historial-sin-resultados.png');
    });
  });
});
