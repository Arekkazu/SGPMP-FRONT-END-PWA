/**
 * TC-DIS-121 — Consistencia visual de las vistas de Asociación Activa e Historial
 * RF-34 · CU-01 Registrar y Asociar Activo Biológico (vistas de consulta) · Rol: Administrador
 * Activos biológicos → ficha del activo → pestaña "Infraestructura"
 *
 * Baselines: vista "Ubicación actual" (asociación activa) y vista "Historial de
 * ubicaciones" con 2 asociaciones. Se captura solo la tarjeta de la sección de
 * infraestructura.
 *
 * Datos: activo #765 ("galpon prueba", Finca Administrativa de la cuenta Admin). El
 * test "0" verifica que la consulta ACTIVA responde 200. Las baselines usan fixtures
 * fijos servidos con page.route: un historial simulado de 2 asociaciones con
 * solapamiento y una asociación activa construida con el último registro, así no
 * dependen de cambios de datos. RF de solo lectura: ningún test escribe en el ambiente.
 *
 * 2026-10-09: el activo #4 original ya no existe en el ambiente (404
 * ACTIVO_NO_ENCONTRADO) — la cuenta Admin quedó momentáneamente sin ningún activo
 * visible; Alex sembró 10 activos nuevos (#756-765) en su finca. Se cambia ID_ACTIVO
 * a uno de ellos (igual que TC-DIS-120). El historial y la asociación activa de abajo
 * siguen siendo simulados (page.route), independientes del historial real del activo.
 *
 * 2026-10-10: reejecución sobre la release 1.0.0-rc.48. Sin cambios de datos ni de
 * criterio; las 6 baselines vigentes coinciden sin regenerarlas.
 *
 * Una baseline solo se guarda si la vista no tiene defectos: el alto del selector de
 * vista (touch target --s9 = 48px), el tamaño de su texto y el de la marca "ACTUAL"
 * (escala tipográfica del DS v2.0) se verifican antes de capturar y fallan como DEFECTO.
 *
 * Tema: la preferencia de tema es de la cuenta (compartida); GET
 * /configuracion/personalizacion/tema(/global) se sirve con el tema Claro (theme_mode 1,
 * cuerpo real de TEST) y cualquier escritura a esos endpoints se aborta.
 *
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_121_VIEWPORTS=escritorio
 */
import { expect, test, type Locator, type Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

const ID_ACTIVO = 765;

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_121_VIEWPORTS ?? 'movil,tablet,escritorio')
  .split(',')
  .map((v) => v.trim());

const URL_ASOCIACION = (url: URL) => /\/activos-biologicos\/\d+\/infraestructura$/.test(url.pathname);

// Historial simulado (2 asociaciones con solapamiento), independiente de ID_ACTIVO
const HISTORIAL = [
  { id_historial: 292, id_activo_biologico: ID_ACTIVO, id_infraestructura: 7, nombre_infraestructura: 'Piscina-Cam-02', tipo_infraestructura: 'Estanque', fecha_inicio: '2024-03-01T00:00:00Z', fecha_fin: '2024-03-15T00:00:00Z' },
  { id_historial: 293, id_activo_biologico: ID_ACTIVO, id_infraestructura: 16, nombre_infraestructura: 'QA-G05-Infra-1789005185', tipo_infraestructura: 'Estanque', fecha_inicio: '2024-03-10T00:00:00Z', fecha_fin: '2024-03-20T00:00:00Z' },
];

const RESPUESTAS = {
  HISTORIAL: {
    tipo_consulta: 'HISTORIAL', id_activo_biologico: ID_ACTIVO, asociacion_activa: null, historial: HISTORIAL,
    sensores_en_infraestructura: [],
    advertencia_integridad: 'Se detectó solapamiento entre los períodos de asociación a infraestructura con id_historial 292 y 293.',
  },
  // Asociación activa construida con el último registro del historial (vigente)
  ACTIVA: {
    tipo_consulta: 'ACTIVA', id_activo_biologico: ID_ACTIVO,
    asociacion_activa: { ...HISTORIAL[1], fecha_fin: null },
    historial: [], sensores_en_infraestructura: [], advertencia_integridad: null,
  },
};

// Tema Claro fijo (cuerpos reales de TEST con theme_mode 1)
const TEMA: Record<string, unknown> = {
  '/configuracion/personalizacion/tema': { theme_mode: 1, fuente: 'personal', id_tema_visual: 10 },
  '/configuracion/personalizacion/tema/global': { id_tema_visual: 1, id_usuario: 1, theme_mode: 1, es_global: true, fecha_actualizacion: '2026-09-29T22:56:03.004225Z' },
};

// DS v2.0: touch target mínimo (--s9) y escala tipográfica
const TOUCH_TARGET_MIN = 48;
const FS_BODY_MD = 14; // texto UI por defecto
const FS_CAPTION_MIN = 11; // --fs-label-sm, el menor tamaño de la escala

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

async function iniciarSesionAdmin(page: Page) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill(ADMIN_EMAIL);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 });
}

async function servirAsociaciones(page: Page) {
  await page.route(URL_ASOCIACION, (r) => {
    if (r.request().method() !== 'GET') return r.abort('blockedbyclient');
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

async function sinFocoNiHover(page: Page) {
  await page.mouse.move(0, 0);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.evaluate(() => document.fonts.ready);
}

/** Amplía el alto de la ventana (conservando el ancho) para que `objetivo` quepa sin scroll. */
async function ajustarAlto(page: Page, objetivo: Locator) {
  const viewport = page.viewportSize()!;
  await objetivo.evaluate((e) => e.scrollIntoView({ block: 'start' }));
  const caja = (await objetivo.boundingBox())!;
  const scroll = await page.evaluate(() => {
    const cont = [...document.querySelectorAll('*')].find((e) => e.scrollTop > 0) as HTMLElement | undefined;
    return (cont?.scrollTop ?? 0) + window.scrollY;
  });
  const necesario = Math.ceil(caja.y + scroll + caja.height + 48);
  if (necesario > viewport.height) await page.setViewportSize({ width: viewport.width, height: necesario });
  await objetivo.evaluate((e) => e.scrollIntoView({ block: 'center' }));
}

/** Captura la tarjeta de la sección. Sin baseline si hay defectos. */
async function capturar(page: Page, objetivo: Locator, nombre: string) {
  expect(test.info().errors.length, 'Sin baseline: la vista tiene defectos (ver errores anteriores)').toBe(0);
  await ajustarAlto(page, objetivo);
  await sinFocoNiHover(page);
  await expect(objetivo).toHaveScreenshot(nombre, { animations: 'disabled', caret: 'hide' });
}

const tamanoFuente = (l: Locator) => l.evaluate((e) => parseFloat(getComputedStyle(e).fontSize));

/** DEFECTO si los botones del selector de vista no cumplen el touch target ni la escala tipográfica. */
async function verificarSelectorVista(page: Page) {
  for (const nombre of ['Ubicación actual', 'Historial de ubicaciones']) {
    const boton = page.getByRole('button', { name: nombre, exact: true });
    const alto = Math.round((await boton.boundingBox())!.height);
    expect.soft(alto, `DEFECTO: el botón "${nombre}" del selector de vista mide ${alto}px de alto; el DS exige touch target mínimo de ${TOUCH_TARGET_MIN}px (--s9)`).toBeGreaterThanOrEqual(TOUCH_TARGET_MIN);
    const fs = await tamanoFuente(boton);
    expect.soft(fs, `DEFECTO: el texto del botón "${nombre}" usa ${fs}px, fuera de la escala del DS v2.0 (body-md = ${FS_BODY_MD}px)`).toBe(FS_BODY_MD);
  }
}

/** DEFECTO si la marca "ACTUAL" usa un tamaño menor al mínimo de la escala (caption 11px). */
async function verificarMarcaActual(sec: Locator) {
  const fs = await tamanoFuente(sec.getByText('ACTUAL', { exact: true }).first());
  expect.soft(fs, `DEFECTO: la marca "ACTUAL" usa ${fs}px, menor que el mínimo de la escala del DS v2.0 (caption = ${FS_CAPTION_MIN}px)`).toBeGreaterThanOrEqual(FS_CAPTION_MIN);
}

test.describe('TC-DIS-121 - Consistencia visual - Asociación Activa e Historial (RF-34)', () => {
  // workers: 1 en el config; timeout amplio por la latencia del login en TEST
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      !VIEWPORTS_HABILITADOS.includes(testInfo.project.name),
      `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_121_VIEWPORTS.`,
    );
    expect(ADMIN_EMAIL, 'Falta TEST_ADMIN_EMAIL en testing/.env.test').not.toBe('');
    expect(ADMIN_PASSWORD, 'Falta TEST_ADMIN_PASSWORD en testing/.env.test').not.toBe('');
    await fijarTemaClaro(page);
    await iniciarSesionAdmin(page);
  });

  test('0. Precondición - el activo tiene asociación activa en el ambiente', async ({ page }) => {
    expect(
      await abrirInfraestructura(page),
      `GET /activos-biologicos/${ID_ACTIVO}/infraestructura?tipo_consulta=ACTIVA debe responder 200`,
    ).toBe(200);
  });

  test('1. Vista "Ubicación actual" (asociación activa)', async ({ page }) => {
    await servirAsociaciones(page);
    await abrirInfraestructura(page);
    const tarjeta = page.getByText(RESPUESTAS.ACTIVA.asociacion_activa.nombre_infraestructura, { exact: true });
    await expect(tarjeta).toBeVisible();
    const sec = seccion(page, tarjeta);
    await expect(sec.getByText('ACTUAL', { exact: true })).toBeVisible();

    await verificarSelectorVista(page);
    await verificarMarcaActual(sec);
    await capturar(page, sec, 'asociacion-activa.png');
  });

  test('2. Vista "Historial de ubicaciones" (2 asociaciones)', async ({ page }) => {
    await servirAsociaciones(page);
    await abrirInfraestructura(page);
    await page.getByRole('button', { name: 'Historial de ubicaciones', exact: true }).click();
    for (const a of HISTORIAL) {
      await expect(page.getByText(a.nombre_infraestructura, { exact: true })).toBeVisible();
    }
    await expect(page.getByText('El historial de ubicaciones tiene inconsistencias')).toBeVisible();

    await verificarSelectorVista(page);
    await capturar(page, seccion(page, page.getByText(HISTORIAL[0].nombre_infraestructura, { exact: true })), 'asociacion-historial.png');
  });
});
