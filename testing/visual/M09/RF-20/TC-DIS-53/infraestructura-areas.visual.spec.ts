/**
 * TC-DIS-53 — Consistencia visual del listado y formulario de Infraestructura Productiva
 * RF-20 v1.1 · CU-04 Gestionar Infraestructura Productiva · Rol: Administrador
 * Configuración → Fincas → sección "Infraestructura Productiva"
 *
 * Cambio del RF (2026-10-05, RFC-009): el formulario agrega especie y modelo de IA, el listado
 * la columna "Modelo IA", y un área inactiva ofrece "Reactivar". Baselines nuevas del
 * formulario y del área en estado inactivo.
 *
 * Baselines:
 *   - selector de fincas de la sección;
 *   - áreas de la finca #1 (activas + inactiva) y de la finca #2;
 *   - fila del área inactiva ("Invernadero Norte") y su confirmación "Reactivar área";
 *   - formulario "Registrar área productiva" (vacío y con especie y modelo de IA elegidos)
 *     y "Editar área" (con especie y modelo asignados).
 *
 * Datos: areas.fixture.json guarda las respuestas reales de TEST del 2026-10-05 (fincas
 * #1–#5, tipos de área, áreas de las fincas #1 y #2 y especies). En TEST ninguna especie
 * tiene familia de modelo ni ningún área tiene especie, así que se SIMULAN: "Tilapia Roja"
 * con familia MODELO_ACUICULTURA y "Estanque-01" con esa especie y modelo. El test "0"
 * verifica contra el ambiente real que fincas, tipos y áreas cargan y que la finca #1
 * sigue teniendo un área inactiva.
 *
 * Reejecución sobre la release 1.0.0-rc.40 (modales como bottom sheet con el ancho del DS).
 *
 * Una baseline solo se guarda si la vista no tiene defectos. Antes de capturar se verifican y
 * fallan como DEFECTO: la superficie de cada área, las etiquetas del formulario (estilo del
 * DS), la precarga de "Editar área", la escala tipográfica del DS v2.0 en el texto con estilo
 * propio del módulo (los componentes del DS se evalúan con su propio CSS) y el breakpoint de
 * cada modal (bottom sheet a ancho completo en xs/sm; formulario máx. 480px en md y 560px en
 * lg; confirmación corta máx. 400px en md+).
 *
 * Formularios y confirmación: se captura solo la tarjeta del modal (el fondo de la pestaña
 * cambia con los datos del ambiente); si no cabe, se amplía el alto de la ventana
 * conservando el ancho.
 *
 * PROTECCIÓN DE DATOS: todo POST/PATCH a /configuracion/infraestructuras se aborta; el caso
 * no envía formularios ni confirma la reactivación.
 *
 * Tema: la preferencia de tema es de la cuenta (compartida); GET
 * /configuracion/personalizacion/tema(/global) se sirve con el tema Claro (theme_mode 1,
 * cuerpo real de TEST) y cualquier escritura a esos endpoints se aborta.
 *
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_53_VIEWPORTS=escritorio
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import fixture from './areas.fixture.json';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_53_VIEWPORTS ?? 'movil,tablet,escritorio')
  .split(',')
  .map((v) => v.trim());

// page.route compara la URL completa (con query): se filtra por pathname
const RUTA_FINCAS = /\/configuracion\/fincas$/;
const RUTA_TIPOS = /\/configuracion\/tipos-area$/;
const RUTA_AREAS = /\/configuracion\/infraestructuras$/;
const RUTA_ESPECIES = /\/configuracion\/especies$/;
const porRuta = (patron: RegExp) => (url: URL) => patron.test(url.pathname);
const URL_AREAS = (url: URL) => /\/configuracion\/infraestructuras(\/\d+(\/\w+)?)?$/.test(url.pathname);

const FINCA_1 = fixture.fincas[0].nombre;
const FINCA_2 = fixture.fincas[1].nombre;
const AREAS_1 = fixture.areas['1'].items;
const AREAS_2 = fixture.areas['2'].items;
const AREA_INACTIVA = AREAS_1.find((a) => !a.es_activo)!.nombre_infraestructura;
const AREA_EDITAR = 'Estanque-01';

// SIMULADO: en TEST ninguna especie tiene familia de modelo ni ningún área tiene especie
const ESPECIE = fixture.especies.items.find((e) => e.nombre === 'Tilapia Roja')!;
const FAMILIA = 'MODELO_ACUICULTURA';
const especies = { ...fixture.especies, items: fixture.especies.items.map((e) => (e.id_especie === ESPECIE.id_especie ? { ...e, tipo_modelo: FAMILIA } : e)) };
const conEspecie = (a: (typeof AREAS_1)[number]) =>
  a.nombre_infraestructura === AREA_EDITAR ? { ...a, especie_id: ESPECIE.id_especie, tipo_modelo_asignado: FAMILIA } : a;

// Tema Claro fijo (cuerpos reales de TEST con theme_mode 1)
const TEMA: Record<string, unknown> = {
  '/configuracion/personalizacion/tema': { theme_mode: 1, fuente: 'personal', id_tema_visual: 10 },
  '/configuracion/personalizacion/tema/global': { id_tema_visual: 1, id_usuario: 1, theme_mode: 1, es_global: true, fecha_actualizacion: '2026-09-29T22:56:03.004225Z' },
};

test.use({ locale: 'es-CO', timezoneId: 'America/Bogota' });

// ── Datos ────────────────────────────────────────────────────────────────────

async function fijarTemaClaro(page: Page) {
  await page.route((url) => Object.keys(TEMA).some((k) => url.pathname.endsWith(k)), (r) => {
    const req = r.request();
    if (!['xhr', 'fetch'].includes(req.resourceType())) return r.continue();
    if (req.method() !== 'GET') return r.abort('blockedbyclient');
    const clave = Object.keys(TEMA).find((k) => new URL(req.url()).pathname.endsWith(k))!;
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(TEMA[clave]) });
  });
}

/** Ninguna escritura a áreas llega al backend. */
async function protegerAreas(page: Page) {
  await page.route(URL_AREAS, (route) => {
    const req = route.request();
    if (!['xhr', 'fetch'].includes(req.resourceType()) || req.method() === 'GET') return route.fallback();
    return route.abort();
  });
}

async function servirFixtures(page: Page) {
  const json = (cuerpo: unknown) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(cuerpo) });
  const soloGet = (cuerpo: (url: URL) => unknown) => (r: Parameters<Parameters<Page['route']>[1]>[0]) =>
    r.request().method() === 'GET' && ['xhr', 'fetch'].includes(r.request().resourceType())
      ? r.fulfill(json(cuerpo(new URL(r.request().url()))))
      : r.fallback();
  await page.route(porRuta(RUTA_FINCAS), soloGet(() => ({ total: fixture.fincas.length, items: fixture.fincas })));
  await page.route(porRuta(RUTA_TIPOS), soloGet(() => fixture.tipos_area));
  await page.route(porRuta(RUTA_ESPECIES), soloGet(() => especies));
  await page.route(porRuta(RUTA_AREAS), soloGet((url) => {
    const respuesta = fixture.areas[url.searchParams.get('finca_id') as '1' | '2'];
    return respuesta ? { ...respuesta, items: respuesta.items.map(conEspecie) } : { total: 0, items: [] };
  }));
}

// ── Navegación ───────────────────────────────────────────────────────────────

async function iniciarSesionAdmin(page: Page) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill(ADMIN_EMAIL);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 });
}

/** /configuracion → Fincas → sección Infraestructura (queda en el selector de fincas). */
async function abrirSeccion(page: Page) {
  await page.goto('/configuracion');
  await page.getByRole('button', { name: 'Fincas', exact: true }).click();
  const titulo = page.getByRole('heading', { name: 'Infraestructura Productiva' });
  await titulo.scrollIntoViewIfNeeded();
  await expect(titulo).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  return titulo;
}

/** Bloque de la sección Infraestructura que contiene `contenido` (el más interno). */
function seccion(page: Page, contenido: Locator): Locator {
  return page
    .locator('div')
    .filter({ has: page.getByRole('heading', { name: 'Infraestructura Productiva' }) })
    .filter({ has: contenido })
    .last();
}

function botonFinca(page: Page, nombre: string) {
  return page.getByRole('button').filter({ has: page.getByText(nombre, { exact: true }) }).first();
}

/** Bloque de áreas de la finca seleccionada (la pestaña también tiene la tabla de fincas). */
function seccionAreas(page: Page): Locator {
  return seccion(page, page.getByRole('button', { name: 'Cambiar finca' }));
}

async function abrirAreas(page: Page, nombreFinca: string, cantidad: number) {
  await botonFinca(page, nombreFinca).click();
  await expect(page.getByRole('button', { name: 'Cambiar finca' })).toBeVisible();
  await expect(seccionAreas(page).locator('table tbody tr')).toHaveCount(cantidad);
}

function filaArea(page: Page, nombre: string): Locator {
  return seccionAreas(page).locator('table tbody tr').filter({ hasText: nombre }).first();
}

function tarjetaModal(dialogo: Locator): Locator {
  return dialogo.locator('> div');
}

// DS v2.0: escala tipográfica (todos los anchos)
const ESCALA = [11, 12, 14, 15, 16, 18, 19, 20, 24, 26, 28];

/**
 * DEFECTO si la tarjeta del modal no respeta el breakpoint del DS v2.0: bottom sheet a ancho
 * completo en xs/sm; formulario máx. 480px en md y 560px en lg; confirmación corta máx. 400px en md+.
 */
async function verificarBreakpoint(page: Page, dialogo: Locator, variante: 'formulario' | 'confirmacion' = 'formulario') {
  const nombre = test.info().project.name;
  const viewport = page.viewportSize()!;
  const caja = (await tarjetaModal(dialogo).boundingBox())!;
  test.info().annotations.push({ type: `Tarjeta del modal (${variante})`, description: `viewport ${viewport.width}×${viewport.height} · x ${Math.round(caja.x)} · y ${Math.round(caja.y)} · ${Math.round(caja.width)}×${Math.round(caja.height)}` });
  if (viewport.width < 768) {
    expect.soft(Math.round(caja.width), `DEFECTO: en ${nombre} (${viewport.width}px, xs/sm) el modal debe ser un bottom sheet a ancho completo; mide ${Math.round(caja.width)}px`).toBe(viewport.width);
    expect.soft(Math.round(caja.y + caja.height), `DEFECTO: en ${nombre} el bottom sheet debe apoyarse en el borde inferior de la pantalla`).toBe(viewport.height);
    return;
  }
  const maximo = variante === 'confirmacion' ? 400 : viewport.width < 1200 ? 480 : 560;
  expect.soft(Math.round(caja.width), `DEFECTO: en ${nombre} (${viewport.width}px) el modal de ${variante} debe medir máximo ${maximo}px; mide ${Math.round(caja.width)}px`).toBeLessThanOrEqual(maximo);
}

/** DEFECTO si algún texto con estilo propio del objetivo usa un tamaño fuera de la escala del DS v2.0. */
async function verificarEscala(objetivo: Locator, zona: string) {
  const fuera = await objetivo.evaluate((raiz, escala) => {
    const res: string[] = [];
    const walker = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const texto = (n.textContent ?? '').trim();
      const el = n.parentElement;
      // Componentes del DS (botón, alerta, badge, campos) se evalúan con su propio CSS, no como estilo del módulo
      if (!texto || !el || el.closest('option, .ds-sr-only, .ds-btn, .ds-alert, .ds-badge, .ds-field, style')) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (!escala.includes(fs)) res.push(`"${texto.slice(0, 30)}" ${fs}px`);
    }
    return [...new Set(res)];
  }, ESCALA);
  expect.soft(fuera, `DEFECTO: ${zona}: texto fuera de la escala tipográfica del DS v2.0: ${fuera.join(' · ')}`).toEqual([]);
}

/** Sin baseline si la vista tiene defectos. */
function exigirSinDefectos() {
  expect(test.info().errors.length, 'Sin baseline: la vista tiene defectos (ver errores anteriores)').toBe(0);
}

/** Verifica breakpoint y escala; captura solo la tarjeta del modal (si no cabe, amplía el alto conservando el ancho). */
async function capturarModal(page: Page, dialogo: Locator, nombre: string, variante: 'formulario' | 'confirmacion' = 'formulario') {
  await verificarBreakpoint(page, dialogo, variante);
  await verificarEscala(tarjetaModal(dialogo), `modal de ${variante}`);
  exigirSinDefectos();
  const viewport = page.viewportSize()!;
  const caja = (await tarjetaModal(dialogo).boundingBox())!;
  const necesario = Math.ceil(caja.y + caja.height + 48);
  if (necesario > viewport.height) await page.setViewportSize({ width: viewport.width, height: necesario });
  await sinFocoNiHover(page);
  await expect(tarjetaModal(dialogo)).toHaveScreenshot(nombre, { animations: 'disabled', caret: 'hide' });
}

async function sinFocoNiHover(page: Page) {
  await page.mouse.move(0, 0);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.evaluate(() => document.fonts.ready);
}

/** DEFECTO si la columna "Superficie" no muestra el valor de cada área (se formatea como fecha). */
async function verificarSuperficie(page: Page, areas: { nombre_infraestructura: string; superficie: string }[]) {
  for (const a of areas) {
    const valor = Number(a.superficie);
    await expect(
      filaArea(page, a.nombre_infraestructura),
      `DEFECTO: la columna "Superficie" de "${a.nombre_infraestructura}" muestra "— m²" en vez de ${valor} m² (InfraestructuraSection.tsx formatea superficie con formatearFechaHora)`,
    ).toContainText(new RegExp(`${valor.toLocaleString('es-CO').replace('.', '\.')}|${valor}`));
  }
}

/** DEFECTO si las etiquetas del formulario no comparten el estilo del DS (.ds-field__label: 12px / 600). */
async function verificarEtiquetas(dialogo: Locator) {
  const estilos = await dialogo.locator('form label').evaluateAll((ls) => ls.map((l) => {
    const c = getComputedStyle(l);
    return { texto: (l.textContent ?? '').trim(), estilo: `${c.fontSize} ${c.fontWeight}` };
  }));
  const distintas = estilos.filter((e) => e.estilo !== '12px 600');
  expect.soft(distintas, `DEFECTO: etiquetas del formulario fuera del estilo del DS (12px 600, como "Nombre del área"): ${distintas.map((e) => `"${e.texto}" ${e.estilo}`).join(' · ')}`).toEqual([]);
}

async function abrirRegistro(page: Page) {
  await page.getByRole('button', { name: 'Nueva área' }).click();
  const dialogo = page.getByRole('dialog', { name: 'Registrar área productiva' });
  await expect(dialogo).toBeVisible();
  // Las especies se cargan al abrir el modal
  await expect(dialogo.getByRole('combobox', { name: 'Especie', exact: true }).locator('option', { hasText: ESPECIE.nombre })).toHaveCount(1, { timeout: 20_000 });
  return dialogo;
}

// ── Casos ────────────────────────────────────────────────────────────────────

test.describe('TC-DIS-53 - Consistencia visual - Infraestructura Productiva / Áreas (RF-20)', () => {
  // workers: 1 en el config; timeout amplio por la latencia del login en TEST
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!VIEWPORTS_HABILITADOS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_53_VIEWPORTS.`);
    expect(ADMIN_EMAIL, 'Falta TEST_ADMIN_EMAIL en testing/.env.test').not.toBe('');
    expect(ADMIN_PASSWORD, 'Falta TEST_ADMIN_PASSWORD en testing/.env.test').not.toBe('');
    await protegerAreas(page);
    await fijarTemaClaro(page);
    await iniciarSesionAdmin(page);
  });

  test('0. Precondición - el ambiente entrega fincas, tipos de área y áreas (con una inactiva)', async ({ page }, testInfo) => {
    const fincas = page.waitForResponse((r) => r.request().method() === 'GET' && RUTA_FINCAS.test(new URL(r.url()).pathname));
    const tipos = page.waitForResponse((r) => r.request().method() === 'GET' && RUTA_TIPOS.test(new URL(r.url()).pathname));
    await abrirSeccion(page);
    expect((await fincas).status(), 'GET /configuracion/fincas debe responder 200').toBe(200);
    expect((await tipos).status(), 'GET /configuracion/tipos-area debe responder 200').toBe(200);

    const areas = page.waitForResponse((r) => r.request().method() === 'GET' && RUTA_AREAS.test(new URL(r.url()).pathname));
    await botonFinca(page, FINCA_1).click();
    const r = await areas;
    expect(r.status()).toBe(200);
    const items: { nombre_infraestructura: string; es_activo: boolean }[] = (await r.json()).items;
    testInfo.annotations.push({ type: `Áreas reales de ${FINCA_1}`, description: items.map((a) => `${a.nombre_infraestructura}${a.es_activo ? '' : ' (inactiva)'}`).join(' · ') });
    expect(items.some((a) => !a.es_activo), 'La finca #1 debe tener un área inactiva').toBe(true);
  });

  test.describe('con datos fijados', () => {
    test.beforeEach(async ({ page }, testInfo) => {
      testInfo.annotations.push({ type: 'Datos fijados', description: `areas.fixture.json (respuestas reales del 2026-10-05). SIMULADO: "${ESPECIE.nombre}" con familia ${FAMILIA} y "${AREA_EDITAR}" con esa especie y modelo.` });
      await servirFixtures(page);
      await abrirSeccion(page);
    });

    test('1. Selector de fincas de la sección', async ({ page }) => {
      const primera = botonFinca(page, FINCA_1);
      await expect(primera).toBeVisible();
      await verificarEscala(seccion(page, primera), 'selector de fincas');
      exigirSinDefectos();
      await sinFocoNiHover(page);
      await expect(seccion(page, primera)).toHaveScreenshot('areas-selector-fincas.png', { animations: 'disabled' });
    });

    test('1-2. Áreas agrupadas por finca - finca #1 (activas, inactiva y columna Modelo IA)', async ({ page }) => {
      await abrirAreas(page, FINCA_1, AREAS_1.length);
      await expect(filaArea(page, AREA_EDITAR)).toContainText('Acuicultura');
      await verificarSuperficie(page, AREAS_1);
      await verificarEscala(seccionAreas(page), 'áreas de la finca #1');
      exigirSinDefectos();
      await sinFocoNiHover(page);
      await expect(seccionAreas(page)).toHaveScreenshot('areas-listado-finca-1.png', { animations: 'disabled' });
    });

    test('1-2. Áreas agrupadas por finca - finca #2', async ({ page }) => {
      await abrirAreas(page, FINCA_2, AREAS_2.length);
      await verificarSuperficie(page, AREAS_2);
      await verificarEscala(seccionAreas(page), 'áreas de la finca #2');
      exigirSinDefectos();
      await sinFocoNiHover(page);
      await expect(seccionAreas(page)).toHaveScreenshot('areas-listado-finca-2.png', { animations: 'disabled' });
    });

    test('2. Área en estado inactivo - fila', async ({ page }) => {
      await abrirAreas(page, FINCA_1, AREAS_1.length);
      const fila = filaArea(page, AREA_INACTIVA);
      await expect(fila).toContainText('Inactiva');
      await expect(fila.getByRole('button', { name: `Reactivar ${AREA_INACTIVA}`, exact: true })).toBeVisible();
      await verificarSuperficie(page, AREAS_1.filter((a) => !a.es_activo));
      await verificarEscala(fila, 'fila del área inactiva');
      exigirSinDefectos();
      await sinFocoNiHover(page);
      await expect(fila).toHaveScreenshot('areas-fila-inactiva.png', { animations: 'disabled' });
    });

    test('2. Área en estado inactivo - confirmación "Reactivar área"', async ({ page }) => {
      await abrirAreas(page, FINCA_1, AREAS_1.length);
      await filaArea(page, AREA_INACTIVA).getByRole('button', { name: `Reactivar ${AREA_INACTIVA}`, exact: true }).click();
      const confirmacion = page.getByRole('dialog').filter({ hasText: 'Reactivar área' });
      await expect(confirmacion).toContainText(AREA_INACTIVA);
      await capturarModal(page, confirmacion, 'areas-confirmar-reactivar.png', 'confirmacion');
      await confirmacion.getByRole('button', { name: 'Cancelar', exact: true }).click();
      await expect(confirmacion).toBeHidden();
    });

    test('3. Formulario "Registrar área productiva"', async ({ page }) => {
      await abrirAreas(page, FINCA_1, AREAS_1.length);
      const dialogo = await abrirRegistro(page);
      await expect(dialogo.getByRole('combobox', { name: 'Especie', exact: true })).toHaveValue('');
      await verificarEtiquetas(dialogo);
      await capturarModal(page, dialogo, 'areas-form-registrar.png');
    });

    test('3. Formulario "Registrar área productiva" con especie y modelo de IA elegidos', async ({ page }) => {
      await abrirAreas(page, FINCA_1, AREAS_1.length);
      const dialogo = await abrirRegistro(page);
      await dialogo.getByRole('textbox', { name: 'Nombre del área', exact: true }).fill('Estanque-03');
      await dialogo.getByRole('spinbutton', { name: 'Superficie (m²)', exact: true }).fill('1500');
      await dialogo.getByRole('combobox', { name: 'Especie', exact: true }).selectOption({ label: ESPECIE.nombre });
      await dialogo.getByRole('combobox', { name: 'Modelo de IA', exact: true }).selectOption(FAMILIA);
      await verificarEtiquetas(dialogo);
      await capturarModal(page, dialogo, 'areas-form-registrar-especie-modelo.png');
    });

    test('3. Formulario "Editar área" (con especie y modelo de IA)', async ({ page }) => {
      await abrirAreas(page, FINCA_1, AREAS_1.length);
      await filaArea(page, AREA_EDITAR).getByRole('button', { name: `Editar ${AREA_EDITAR}`, exact: true }).click();
      const dialogo = page.getByRole('dialog', { name: `Editar área — ${AREA_EDITAR}` });
      await expect(dialogo.getByRole('textbox', { name: 'Nombre del área', exact: true })).toHaveValue(AREA_EDITAR);
      // Sin precarga no hay baseline válida: se falla antes de capturar el estado defectuoso
      await expect(
        dialogo.getByRole('combobox', { name: 'Especie', exact: true }),
        `DEFECTO: "Editar área" no precarga la especie asignada (#${ESPECIE.id_especie} "${ESPECIE.nombre}"): el reset del formulario se repite al cargar los tipos de área pero no al cargar las especies, y si estas llegan después el select queda en "Selecciona una especie"`,
      ).toHaveValue(String(ESPECIE.id_especie), { timeout: 10_000 });
      await expect(dialogo.getByRole('combobox', { name: 'Modelo de IA', exact: true }), 'DEFECTO: "Editar área" no precarga el modelo de IA asignado').toHaveValue(FAMILIA);
      await verificarEtiquetas(dialogo);
      await capturarModal(page, dialogo, 'areas-form-editar.png');
    });

    test('4. Modal del formulario según el breakpoint del sistema de diseño', async ({ page }) => {
      await abrirAreas(page, FINCA_1, AREAS_1.length);
      const dialogo = await abrirRegistro(page);
      await verificarBreakpoint(page, dialogo);
    });
  });
});
