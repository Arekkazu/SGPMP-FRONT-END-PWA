/**
 * TC-DIS-144 — Consistencia visual del listado de Bitácora de Auditoría
 * RF-52 · CU-13 Auditoría y Trazabilidad de Transformación Biológica · Rol: Administrador
 * Ruta: /activos-biologicos/auditoria ("Auditoría y trazabilidad")
 *
 * Baselines (vista completa: encabezado, filtros, tabla y paginación):
 *   - Listado sin filtros (página 1).
 *   - Listado con filtros de tipo de operación, resultado y rango de fechas (con resultados).
 *   - Listado con filtros sin resultados (estado vacío).
 *   - Filtro por usuario: BLOQUEO. La vista no tiene ese filtro; el test falla mientras no exista.
 *
 * Datos: la bitácora crece con la actividad del sistema, así que GET /activos-biologicos/auditoria
 * se sirve con page.route desde bitacora.fixture.json (respuestas reales del 2026-09-30): sin
 * filtros, el filtrado RF48 + TRANSFERENCIA_REGISTRADA + EXITOSO + septiembre 2026, y una
 * respuesta vacía para cualquier otro filtro. El test "0" verifica contra el ambiente real
 * que la bitácora responde con al menos 5 registros.
 *
 * Tema: la preferencia de tema es de la cuenta (compartida); GET
 * /configuracion/personalizacion/tema(/global) se sirve con el tema Claro (theme_mode 1,
 * cuerpo real de TEST) y cualquier escritura a esos endpoints se aborta.
 * Captura completa: la vista es más alta que el viewport; antes de capturar se amplía el alto
 * de la ventana conservando el ancho.
 *
 * Navegación directa por URL (page.goto), sin sidebar. Solo lecturas.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_144_VIEWPORTS=escritorio
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import fixture from './bitacora.fixture.json';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_144_VIEWPORTS ?? 'movil,tablet,escritorio')
  .split(',')
  .map((v) => v.trim());

const URL_BITACORA = (url: URL) => url.pathname.endsWith('/activos-biologicos/auditoria');
const FILTRO = { rf: 'RF48', tipo: fixture.tipo_evento_filtrado, resultado: 'EXITOSO', desde: '2026-09-01', hasta: '2026-09-30' };
const VACIA = { total_registros: 0, pagina_actual: 1, total_paginas: 1, registros_por_pagina: 20, registros: [] };

// Tema Claro fijo (cuerpos reales de TEST con theme_mode 1)
const TEMA: Record<string, unknown> = {
  '/configuracion/personalizacion/tema': { theme_mode: 1, fuente: 'personal', id_tema_visual: 10 },
  '/configuracion/personalizacion/tema/global': { id_tema_visual: 1, id_usuario: 1, theme_mode: 1, es_global: true, fecha_actualizacion: '2026-09-29T22:56:03.004225Z' },
};

test.use({ locale: 'es-CO', timezoneId: 'America/Bogota' });

async function fijarTemaClaro(page: Page) {
  await page.route((url) => Object.keys(TEMA).some((k) => url.pathname.endsWith(k)), (r) => {
    const req = r.request();
    if (!['xhr', 'fetch'].includes(req.resourceType())) return r.continue();
    if (req.method() !== 'GET') return r.abort('blockedbyclient');
    const clave = Object.keys(TEMA).find((k) => new URL(req.url()).pathname.endsWith(k))!;
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(TEMA[clave]) });
  });
}

/** Sin filtros → página 1 real; el filtro de la prueba → respuesta real filtrada; otro → vacía. */
async function servirBitacora(page: Page) {
  await page.route(URL_BITACORA, (r) => {
    if (!['xhr', 'fetch'].includes(r.request().resourceType())) return r.continue();
    const q = new URL(r.request().url()).searchParams;
    const conFiltros = [...q.keys()].some((k) => !['pagina', 'page_size'].includes(k));
    const esElFiltro = q.get('rf_origen') === FILTRO.rf && q.get('tipo_evento') === FILTRO.tipo && q.get('resultado') === FILTRO.resultado;
    const cuerpo = !conFiltros ? fixture.sin_filtros : esElFiltro ? fixture.filtrado : VACIA;
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(cuerpo) });
  });
}

async function iniciarSesionAdmin(page: Page) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill(ADMIN_EMAIL);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 });
}

function esperarBitacora(page: Page) {
  return page.waitForResponse((r) => URL_BITACORA(new URL(r.url())) && ['xhr', 'fetch'].includes(r.request().resourceType()));
}

async function abrirBitacora(page: Page) {
  const respuesta = esperarBitacora(page);
  await page.goto('/activos-biologicos/auditoria');
  await expect(page.getByRole('heading', { name: 'Auditoría y trazabilidad', level: 1 })).toBeVisible({ timeout: 40_000 });
  return respuesta;
}

function filtros(page: Page) {
  return {
    rf: page.getByRole('textbox', { name: /^rf origen$/i }),
    tipo: page.getByRole('textbox', { name: /^tipo de evento$/i }),
    resultado: page.getByRole('combobox', { name: /^resultado$/i }),
    desde: page.getByLabel(/^desde$/i),
    hasta: page.getByLabel(/^hasta$/i),
    aplicar: page.getByRole('button', { name: 'Aplicar filtros' }),
  };
}

async function aplicarFiltros(page: Page, valores: { rf: string; tipo: string; resultado: string; desde: string; hasta: string }) {
  const f = filtros(page);
  await f.rf.fill(valores.rf);
  await f.tipo.fill(valores.tipo);
  await f.resultado.selectOption(valores.resultado);
  await f.desde.fill(valores.desde);
  await f.hasta.fill(valores.hasta);
  const respuesta = esperarBitacora(page);
  await f.aplicar.click();
  return respuesta;
}

/** Vista completa: el título está en el encabezado, cuyo contenedor agrupa toda la página. */
function vista(page: Page): Locator {
  return page.getByRole('heading', { name: 'Auditoría y trazabilidad', level: 1 }).locator('xpath=ancestor::div[2]');
}

async function capturar(page: Page, nombre: string) {
  await page.mouse.move(0, 0);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.evaluate(() => document.fonts.ready);
  const caja = await vista(page).boundingBox();
  const viewport = page.viewportSize();
  if (caja && viewport) {
    const alto = Math.ceil(caja.y + caja.height + 40);
    if (alto > viewport.height) await page.setViewportSize({ width: viewport.width, height: alto });
  }
  await expect(vista(page)).toHaveScreenshot(nombre, { animations: 'disabled' });
}

test.describe('TC-DIS-144 - Consistencia visual - Bitácora de auditoría (RF-52)', () => {
  // workers: 1 en el config; timeout amplio por la latencia del login en TEST
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!VIEWPORTS_HABILITADOS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_144_VIEWPORTS.`);
    expect(ADMIN_EMAIL, 'Falta TEST_ADMIN_EMAIL en testing/.env.test').not.toBe('');
    expect(ADMIN_PASSWORD, 'Falta TEST_ADMIN_PASSWORD en testing/.env.test').not.toBe('');
    await fijarTemaClaro(page);
    await iniciarSesionAdmin(page);
  });

  test('0. Precondición - la bitácora real responde con al menos 5 registros', async ({ page }, testInfo) => {
    const r = await abrirBitacora(page);
    expect(r.status()).toBe(200);
    const cuerpo = await r.json();
    testInfo.annotations.push({ type: 'Bitácora real', description: `${cuerpo.total_registros} registros` });
    expect(cuerpo.total_registros).toBeGreaterThanOrEqual(5);
  });

  test.describe('con bitácora fijada', () => {
    test.beforeEach(async ({ page }, testInfo) => {
      testInfo.annotations.push({ type: 'Datos fijados', description: 'Bitácora servida desde bitacora.fixture.json (respuestas reales del 2026-09-30).' });
      await servirBitacora(page);
    });

    test('1. Listado sin filtros', async ({ page }) => {
      await abrirBitacora(page);
      await expect(page.getByRole('table').getByRole('row')).toHaveCount(fixture.sin_filtros.registros.length + 1);
      await capturar(page, 'bitacora-sin-filtros.png');
    });

    test('2. Listado con filtros (tipo de operación, resultado y rango de fechas)', async ({ page }) => {
      await abrirBitacora(page);
      const r = await aplicarFiltros(page, FILTRO);
      expect(new URL(r.url()).searchParams.get('fecha_inicio')).not.toBeNull();
      await expect(page.getByRole('table').getByRole('row')).toHaveCount(fixture.filtrado.registros.length + 1);
      await capturar(page, 'bitacora-con-filtros.png');
    });

    test('3. Filtros sin resultados', async ({ page }) => {
      await abrirBitacora(page);
      await aplicarFiltros(page, { ...FILTRO, tipo: 'EVENTO_INEXISTENTE' });
      await expect(page.getByText('Sin registros de auditoría para los filtros seleccionados.')).toBeVisible();
      await capturar(page, 'bitacora-sin-resultados.png');
    });
  });

  test('Filtro por usuario', async ({ page }) => {
    await abrirBitacora(page);
    const filtroUsuario = page.getByRole('textbox', { name: /usuario|responsable/i }).or(page.getByRole('combobox', { name: /usuario|responsable/i }));
    expect(
      await filtroUsuario.count(),
      'BLOQUEO: la bitácora no tiene filtro por usuario (solo RF origen, Tipo de evento, ID activo, Clasificación, Resultado, Severidad, Desde y Hasta) ni columna de usuario. No hay estado filtrado por usuario que capturar.',
    ).toBeGreaterThan(0);
  });
});
