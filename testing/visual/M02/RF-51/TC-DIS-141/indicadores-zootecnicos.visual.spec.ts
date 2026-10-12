/**
 * TC-DIS-141 — Consistencia visual de la vista de Indicadores Zootécnicos
 * RF-51 · CU-12 Consultar Indicadores y Exponer Datos · Rol: Productor
 * Activos biológicos → ficha del activo → pestaña "Indicadores"
 *
 * Baselines (la sección de indicadores completa: filtros, advertencias y tarjetas):
 *   - Activo individual #295 (ganancia de peso calculada; el resto no disponible).
 *   - Lote #296 (ganancia de peso, morbilidad y mortalidad calculadas).
 *   - Lote con un indicador disponible de cada categoría (crecimiento, producción,
 *     sanitario, eficiencia) — SIMULADO: ningún activo del ambiente tiene datos de
 *     producción ni de consumo de alimento.
 *   - Error por datos insuficientes (422 real de #291 con el filtro CRECIMIENTO).
 *   - Modo tiempo real / diferido (batch): BLOQUEO. La vista no tiene selector de modo y
 *     GET …/indicadores no acepta ese parámetro; el test falla mientras no exista.
 *
 * Datos: los indicadores cambian con cada evento registrado, así que GET …/indicadores se
 * sirve con page.route desde indicadores.fixture.json (respuestas reales del 2026-09-30, salvo
 * "lote_todas_categorias"). El test "0" verifica contra el ambiente real que ambos activos
 * responden y siguen teniendo al menos un indicador calculado.
 *
 * Tema: la preferencia de tema es de la cuenta (compartida); GET
 * /configuracion/personalizacion/tema(/global) se sirve con el tema Claro (theme_mode 1,
 * cuerpo real de TEST) y cualquier escritura a esos endpoints se aborta.
 * Una baseline solo se guarda si la vista no tiene defectos: que el texto con estilo propio
 * del módulo use la escala tipográfica del DS v2.0, que no se muestren códigos técnicos al
 * Productor y que la muestra insuficiente (422) use el rol visual de advertencia se verifican
 * antes de capturar y fallan como DEFECTO. Los componentes del DS (botón, alerta) se evalúan
 * con su propio CSS.
 * Captura completa: la sección es más alta que el viewport (sobre todo en móvil); antes de
 * capturar se amplía el alto de la ventana conservando el ancho.
 *
 * Navegación directa por URL (page.goto), sin sidebar. Solo lecturas.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_141_VIEWPORTS=escritorio
 *
 * ── Reejecución 2026-10-09 ──────────────────────────────────────────────────
 * El script leía TEST_USER_EMAIL (cuenta Admin, sin estos activos) en vez de
 * TEST_PRODUCTOR_EMAIL, la dueña real. Se corrige. Confirmado por curl: #295, #296 y #291
 * responden igual a lo documentado. El bug de backend en POST /sesiones/refresh para esta
 * cuenta (ver TC-DIS-125) ya estaba corregido.
 *
 * ── Reejecución 2026-10-10 (rc.48) ──────────────────────────────────────────
 * El código técnico "kg_alimento/kg_ganancia" de la ronda anterior está corregido: se muestra
 * "kg de alimento / kg de ganancia" (commit 2b7b44e). Las demás unidades no tienen traducción
 * propia y se formatean desde el código del backend, así que quedan "kg / dia" y
 * "unidades / dia", sin tilde. verificarSinCodigos lo detecta ahora como DEFECTO: se eliminan
 * las baselines de individual y lote (las vistas cambiaron y tienen el defecto) y no se genera
 * la de todas las categorías. El BLOQUEO del modo tiempo real / diferido sigue igual.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import fixture from './indicadores.fixture.json';

const USER_EMAIL = process.env.TEST_PRODUCTOR_EMAIL ?? '';
const USER_PASSWORD = process.env.TEST_PRODUCTOR_PASSWORD ?? '';

const ID_INDIVIDUAL = 295;
const ID_LOTE = 296;
const ID_INSUFICIENTE = 291;

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_141_VIEWPORTS ?? 'movil,tablet,escritorio')
  .split(',')
  .map((v) => v.trim());

// DS v2.0: escala tipográfica (todos los anchos)
const ESCALA = [11, 12, 14, 15, 16, 18, 19, 20, 24, 26, 28];
/** Códigos técnicos que no debería leer un Productor: prefijos EN_MAYÚSCULAS: o identificadores snake_case. */
const JERGA_TECNICA = /\b[A-Z]{2,}(?:_[A-Z]+)+:|\b[a-z]+_[a-z_]+\b/;

const URL_INDICADORES = (url: URL) => /\/activos-biologicos\/\d+\/indicadores$/.test(url.pathname);

// Tema Claro fijo (cuerpos reales de TEST con theme_mode 1)
const TEMA: Record<string, unknown> = {
  '/configuracion/personalizacion/tema': { theme_mode: 1, fuente: 'personal', id_tema_visual: 10 },
  '/configuracion/personalizacion/tema/global': { id_tema_visual: 1, id_usuario: 1, theme_mode: 1, es_global: true, fecha_actualizacion: '2026-09-29T22:56:03.004225Z' },
};

async function fijarTemaClaro(page: Page) {
  await page.route((url) => Object.keys(TEMA).some((k) => url.pathname.endsWith(k)), (r) => {
    const req = r.request();
    if (!['xhr', 'fetch'].includes(req.resourceType())) return r.continue();
    if (req.method() !== 'GET') return r.abort('blockedbyclient');
    const clave = Object.keys(TEMA).find((k) => new URL(req.url()).pathname.endsWith(k))!;
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(TEMA[clave]) });
  });
}

/** Sirve los indicadores desde el fixture según el activo y el tipo pedido. */
async function servirIndicadores(page: Page, lote: 'lote' | 'lote_todas_categorias' = 'lote') {
  await page.route(URL_INDICADORES, (r) => {
    const url = new URL(r.request().url());
    const id = Number(url.pathname.split('/').at(-2));
    const tipo = url.searchParams.get('tipo_indicador') ?? 'TODOS';
    if (id === ID_INSUFICIENTE && tipo === 'CRECIMIENTO') {
      return r.fulfill({ status: fixture.datos_insuficientes.status, contentType: 'application/json', body: JSON.stringify(fixture.datos_insuficientes.body) });
    }
    const cuerpo = id === ID_INDIVIDUAL ? fixture.individual : id === ID_LOTE ? fixture[lote] : id === ID_INSUFICIENTE ? fixture.insuficiente : null;
    if (!cuerpo) return r.continue();
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(cuerpo) });
  });
}

async function iniciarSesionProductor(page: Page) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill(USER_EMAIL);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(USER_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 });
}

function esperarIndicadores(page: Page) {
  return page.waitForResponse((r) => URL_INDICADORES(new URL(r.url())) && ['xhr', 'fetch'].includes(r.request().resourceType()));
}

async function abrirIndicadores(page: Page, idActivo: number) {
  await page.goto(`/activos-biologicos/${idActivo}`);
  const secciones = page.getByRole('navigation', { name: 'Secciones del activo' });
  await expect(secciones).toBeVisible({ timeout: 20_000 });
  const respuesta = esperarIndicadores(page);
  await secciones.getByRole('button', { name: 'Indicadores', exact: true }).click();
  const r = await respuesta;
  await expect(page.getByRole('heading', { name: 'Indicadores zootécnicos' })).toBeVisible();
  return r;
}

/** Sección completa: el título está en la tarjeta de filtros, cuyo contenedor agrupa todo. */
function seccion(page: Page): Locator {
  return page.getByRole('heading', { name: 'Indicadores zootécnicos' }).locator('xpath=ancestor::div[2]');
}

/** DEFECTO si algún texto con estilo propio del módulo usa un tamaño fuera de la escala tipográfica del DS v2.0. */
async function verificarEscala(page: Page) {
  const fuera = await seccion(page).evaluate((raiz, escala) => {
    const res: string[] = [];
    const vistos = new Set<string>();
    const walker = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const texto = (n.textContent ?? '').trim();
      const el = n.parentElement;
      // Componentes del DS (botón, alerta) se evalúan con su propio CSS, no como estilo del módulo
      if (!texto || !el || el.closest('option, .ds-sr-only, .ds-btn, .ds-alert, style')) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      const clave = `${fs}|${texto.slice(0, 30)}`;
      if (!escala.includes(fs) && !vistos.has(clave)) { vistos.add(clave); res.push(`"${texto.slice(0, 30)}" ${fs}px`); }
    }
    // Los controles de filtro también llevan texto (valor del select / fecha)
    for (const c of raiz.querySelectorAll('select, input')) {
      const fs = parseFloat(getComputedStyle(c).fontSize);
      if (!escala.includes(fs)) res.push(`control #${c.id} ${fs}px`);
    }
    return res;
  }, ESCALA);
  expect.soft(fuera, `DEFECTO: texto fuera de la escala tipográfica del DS v2.0 (texto UI = body-md 14px): ${fuera.join(' · ')}`).toEqual([]);
}

/** DEFECTO si la sección muestra códigos técnicos al Productor. */
async function verificarSinCodigos(page: Page) {
  const texto = (await seccion(page).innerText()).replace(/\s+/g, ' ');
  const hallado = texto.match(JERGA_TECNICA)?.[0] ?? null;
  expect.soft(hallado, `DEFECTO: la vista muestra códigos técnicos al Productor ("${hallado}"); deben mostrarse con texto legible`).toBeNull();
  // rc.48: las unidades compuestas se formatean desde el código del backend (kg/dia → "kg / dia");
  // sin traducción propia, la palabra queda sin tilde
  const sinTilde = [...new Set(texto.match(/[^\s.]*\s?\/\s?dia\b/g) ?? [])];
  expect.soft(sinTilde, `DEFECTO: la unidad se muestra con error ortográfico: ${sinTilde.map((u) => `"${u}"`).join(', ')} (debe decir "día"); la unidad sale del código del backend formateado, sin traducción propia en el i18n`).toEqual([]);
}

/** Captura la sección completa. Sin baseline si hay defectos. */
async function capturar(page: Page, nombre: string) {
  await verificarEscala(page);
  await verificarSinCodigos(page);
  expect(test.info().errors.length, 'Sin baseline: la vista tiene defectos (ver errores anteriores)').toBe(0);
  await page.mouse.move(0, 0);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.evaluate(() => document.fonts.ready);
  const caja = await seccion(page).boundingBox();
  const viewport = page.viewportSize();
  if (caja && viewport) {
    const alto = Math.ceil(caja.y + caja.height + 40);
    if (alto > viewport.height) await page.setViewportSize({ width: viewport.width, height: alto });
  }
  await expect(seccion(page)).toHaveScreenshot(nombre, { animations: 'disabled', caret: 'hide' });
}

test.describe('TC-DIS-141 - Consistencia visual - Indicadores zootécnicos (RF-51)', () => {
  // workers: 1 en el config; timeout amplio por la latencia del login en TEST
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!VIEWPORTS_HABILITADOS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_141_VIEWPORTS.`);
    expect(USER_EMAIL, 'Falta TEST_PRODUCTOR_EMAIL en testing/.env.test').not.toBe('');
    expect(USER_PASSWORD, 'Falta TEST_PRODUCTOR_PASSWORD en testing/.env.test').not.toBe('');
    await fijarTemaClaro(page);
    await iniciarSesionProductor(page);
  });

  test('0. Precondición - el individual y el lote reales tienen indicadores calculados', async ({ page }, testInfo) => {
    for (const id of [ID_INDIVIDUAL, ID_LOTE]) {
      const r = await abrirIndicadores(page, id);
      expect(r.status(), `GET /activos-biologicos/${id}/indicadores debe responder 200`).toBe(200);
      const cuerpo = await r.json();
      const disponibles = cuerpo.indicadores.filter((i: { disponible: boolean }) => i.disponible).map((i: { tipo: string }) => i.tipo);
      testInfo.annotations.push({ type: `Indicadores reales #${id}`, description: `${cuerpo.tipo_activo}: ${disponibles.join(', ')}` });
      expect(disponibles.length, `El activo #${id} debe tener al menos un indicador calculado`).toBeGreaterThan(0);
    }
  });

  test.describe('con indicadores fijados', () => {
    test('1. Activo individual', async ({ page }, testInfo) => {
      testInfo.annotations.push({ type: 'Datos fijados', description: 'Respuesta real del individual #295 (2026-09-30).' });
      await servirIndicadores(page);
      await abrirIndicadores(page, ID_INDIVIDUAL);
      await expect(page.getByText('0.9677')).toBeVisible();
      await capturar(page, 'indicadores-individual.png');
    });

    test('2. Lote', async ({ page }, testInfo) => {
      testInfo.annotations.push({ type: 'Datos fijados', description: 'Respuesta real del lote #296 (2026-09-30).' });
      await servirIndicadores(page);
      await abrirIndicadores(page, ID_LOTE);
      await expect(page.locator('main dl'), 'Debe mostrarse una tarjeta por indicador').toHaveCount(fixture.lote.indicadores.length);
      await capturar(page, 'indicadores-lote.png');
    });

    test('2. Lote con un indicador de cada categoría (simulado)', async ({ page }, testInfo) => {
      testInfo.annotations.push({ type: 'Datos simulados', description: 'Lote #296 con ganancia_peso, produccion_promedio y conversion_alimenticia completados para cubrir crecimiento, producción, sanitario y eficiencia.' });
      await servirIndicadores(page, 'lote_todas_categorias');
      await abrirIndicadores(page, ID_LOTE);
      await expect(page.getByText('No disponible')).toHaveCount(0);
      await capturar(page, 'indicadores-todas-categorias.png');
    });

    test('Estado de error por datos insuficientes (422)', async ({ page }, testInfo) => {
      testInfo.annotations.push({ type: 'Datos fijados', description: 'Respuestas reales de #291 (2026-09-30): TODOS (200, sin indicadores calculados) y CRECIMIENTO (422 INDICADOR_NO_DISPONIBLE).' });
      await servirIndicadores(page);
      await abrirIndicadores(page, ID_INSUFICIENTE);
      const respuesta = esperarIndicadores(page);
      await page.getByRole('combobox', { name: 'Tipo', exact: true }).selectOption('CRECIMIENTO');
      expect((await respuesta).status()).toBe(422);
      const alerta = page.getByRole('alert').filter({ hasText: /indicadores/i }).first();
      await expect(alerta).toBeVisible();
      // Mapeo del proyecto: 422 = alert-warning (regla de negocio), no alert-error
      expect.soft(await alerta.getAttribute('class'), 'DEFECTO: la muestra insuficiente (422) se muestra como "Error al cargar indicadores" con el rol visual de error (ds-alert--error); un 422 usa alert-warning').not.toMatch(/--error/);
      await capturar(page, 'indicadores-datos-insuficientes.png');
    });
  });

  test('Modo tiempo real y modo diferido (batch)', async ({ page }, testInfo) => {
    await abrirIndicadores(page, ID_LOTE);
    const controles = page.getByRole('combobox', { name: /modo/i })
      .or(page.getByRole('radio', { name: /tiempo real|diferido|batch/i }))
      .or(page.getByRole('button', { name: /tiempo real|diferido|batch/i }))
      .or(page.getByRole('tab', { name: /tiempo real|diferido|batch/i }));
    testInfo.annotations.push({ type: 'Controles de modo encontrados', description: String(await controles.count()) });
    expect(
      await controles.count(),
      'DEFECTO (BLOQUEO): la vista de indicadores no tiene selector de modo tiempo real / diferido (batch) y GET …/indicadores no acepta ese parámetro (solo fecha_inicio, fecha_fin y tipo_indicador). No hay modos que capturar.',
    ).toBeGreaterThan(0);
  });
});
