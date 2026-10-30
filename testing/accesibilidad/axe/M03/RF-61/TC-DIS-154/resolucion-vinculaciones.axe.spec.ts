/**
 * TC-DIS-154 — Verificar accesibilidad WCAG 2.1 AA del formulario de Resolución Manual de
 * Vinculaciones (lecturas AMBIGUA/SIN_VINCULAR)
 * RF-61 · CU-05 - Gestionar Infraestructura IoT y Contexto Productivo · Rol: Administrador · Prioridad: Alta
 * Ruta: /telemetria/vinculaciones — VinculacionesView + VinculacionDetalleModal +
 * ResolverVinculacionModal + CorregirVinculacionModal (Telemetría → Vinculaciones)
 *
 * Tercera ejecución (2026-10-29) sobre 1.4.0-rc.11, ambiente TEST (app en /sigab-test, API en
 * /api-sgpmp-test). Desde el prototipo 13.8 la vista es una bandeja de tarjetas <article> en dos
 * secciones con h2 ("Por revisar" / "Vinculadas"), cada una con "Elegir animal o lote" / "Corregir"
 * y "Ver detalle"; el activo se elige en un Combobox (ARIA 1.2) con los candidatos de la
 * infraestructura (M3-03) y el modelo de manejo llega fijo de la vinculación.
 *
 * Precondiciones (hoja "CASOS DE PRUEBA UI/UX"):
 *   - Rol: Ingeniero de Campo (o Veterinario/Administrador). Se usa Administrador: los datos
 *     semilla de RF-61 (2026-10-22) se cargaron para esa cuenta.
 *   - Al menos una lectura AMBIGUA (estructura con >1 animal activo en modelo INDIVIDUAL) y una
 *     SIN_VINCULAR. Datos REALES del ambiente.
 *
 * Criterios de aceptación: 0 violaciones axe A/AA en
 *   1.3.1 — labels de sensor_id / estructura / lista de activos candidatos / motivo_correccion;
 *   4.1.2 — lista de activos candidatos con name/role/value;
 *   3.3.1 — error de permisos o de coherencia temporal anunciado;
 *   2.4.6 — encabezados descriptivos que diferencien AMBIGUA de SIN_VINCULAR.
 * Nota del caso: motivo_correccion (obligatorio con mecanismo = CORRECCION) comunica su
 * obligatoriedad de forma accesible.
 * Herramientas: @axe-core/playwright + Lighthouse en modo snapshot sobre la misma sesión
 * (resultados/). Una auditoría fallida de Lighthouse es un defecto aunque tenga peso 0.
 *
 * PROTECCIÓN DE DATOS: ninguna escritura llega al backend. El PATCH de resolver y el POST de
 * corregir se abortan; para el error del paso e (3.3.1) el PATCH se responde con un 422 de
 * coherencia temporal construido en la prueba ("Datos simulados"). La corrección sin motivo la
 * frena la validación del cliente antes de enviar nada.
 *
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_154_VIEWPORTS=escritorio
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page, type Route, type TestInfo } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { auditarLighthouse, PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';

const TC_ID = 'TC-DIS-154';
const EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';
// Ambiente TEST desde 2026-10-20 (subrutas de Dokploy)
const APP = (process.env.APP_URL ?? 'https://api.inmero.co/sigab-test').replace(/\/$/, '');
const API = /\/api-sgpmp-test\//;

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_154_VIEWPORTS ?? 'movil,tablet,escritorio')
  .split(',')
  .map((v) => v.trim());

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

const ETIQUETA_ESTADO: Record<string, string> = {
  AMBIGUA: 'Ambigua',
  SIN_VINCULAR: 'Sin vincular',
  CONFIRMADA: 'Confirmada',
};

const ruta = (url: string) => new URL(url).pathname.replace(/^.*\/api-sgpmp-test/, '');

test.use({ launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

// ── Sesión y protección de escrituras ────────────────────────────────────────

// Un solo intento de login: si falla, la prueba se detiene (la cuenta se bloquea a los 5 intentos).
async function iniciarSesion(page: Page) {
  await page.goto(`${APP}/login`);
  await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill(EMAIL);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 });
}

/**
 * Lecturas pasan; toda escritura se aborta. Con `error422` el PATCH de resolver recibe un 422 de
 * coherencia temporal construido aquí (nunca llega al backend). Devuelve las escrituras vistas.
 */
async function interceptar(page: Page, opciones: { error422?: boolean } = {}) {
  const escrituras: string[] = [];
  await page.route((url) => API.test(url.href), async (route: Route) => {
    const req = route.request();
    const metodo = req.method();
    const p = ruta(req.url());
    if (metodo === 'GET' || metodo === 'OPTIONS' || /^\/sesiones\/?(refresh)?$/.test(p)) return route.fallback();
    escrituras.push(`${metodo} ${p}`);
    if (opciones.error422 && metodo === 'PATCH' && /\/iot\/vinculaciones\/\d+\/resolver$/.test(p)) {
      return route.fulfill({
        status: 422,
        contentType: 'application/json',
        json: {
          error_code: 'VINCULACION_FUERA_DE_VIGENCIA',
          message: 'El activo seleccionado no estaba activo en la estructura en la fecha de la lectura.',
        },
      });
    }
    return route.abort();
  });
  return escrituras;
}

async function irAVinculaciones(page: Page) {
  await page.goto(`${APP}/telemetria/vinculaciones`);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/vinculaci/i, { timeout: 60_000 });
  await expect(tarjetas(page).first()).toBeVisible({ timeout: 60_000 });
}

/** Tarjetas de vinculación de la bandeja, en orden. */
function tarjetas(page: Page) {
  return page.locator('main article');
}

/** Estado de cada tarjeta (pastilla de estado, la primera de la tarjeta). */
async function estadosEnPantalla(page: Page) {
  return tarjetas(page).evaluateAll((as) => as.map((a) => (a.firstElementChild?.querySelector('span')?.textContent ?? '').trim()));
}

/** Filtra por estado con los controles de la vista y espera a que la bandeja lo refleje. */
async function filtrarPorEstado(page: Page, estado: string) {
  await page.getByLabel('Estado', { exact: true }).selectOption(estado);
  await page.getByRole('button', { name: /aplicar filtros/i }).click();
  const etiqueta = ETIQUETA_ESTADO[estado];
  await expect.poll(async () => {
    const estados = await estadosEnPantalla(page);
    return estados.length > 0 && estados.every((e) => e === etiqueta);
  }, { timeout: 30_000, message: `BLOQUEO: no hay vinculaciones en estado ${estado} en el ambiente` }).toBe(true);
}

/** Abre por teclado ("Ver detalle" de la primera tarjeta + Enter) y devuelve el diálogo de detalle. */
async function abrirPrimera(page: Page): Promise<Locator> {
  const ver = tarjetas(page).first().getByRole('button', { name: 'Ver detalle' });
  await page.keyboard.press('Shift');
  await ver.focus();
  await page.keyboard.press('Enter');
  const dialogo = page.getByRole('dialog');
  await expect(dialogo).toBeVisible({ timeout: 15_000 });
  return dialogo;
}

async function abrirResolver(page: Page, estado: 'AMBIGUA' | 'SIN_VINCULAR') {
  await filtrarPorEstado(page, estado);
  const detalle = await abrirPrimera(page);
  const tituloDetalle = await detalle.getByRole('heading').first().innerText();
  await detalle.getByRole('button', { name: 'Resolver', exact: true }).click();
  const dialogo = page.getByRole('dialog');
  await expect(dialogo.getByRole('heading', { name: /resolver vinculaci/i })).toBeVisible({ timeout: 15_000 });
  return { dialogo, tituloDetalle, tituloResolver: await dialogo.getByRole('heading').first().innerText() };
}

/**
 * Abre "Elegir animal o lote" en las tarjetas AMBIGUA hasta dar con una cuya infraestructura tenga
 * activos candidatos (la ayuda del combobox dice "N activos en esta infraestructura"). Varias
 * AMBIGUA de TEST están en áreas sin animales listables.
 */
async function abrirResolverConCandidatos(page: Page, testInfo: TestInfo) {
  await filtrarPorEstado(page, 'AMBIGUA');
  const total = Math.min(await tarjetas(page).count(), 15);
  const probadas: string[] = [];
  for (let i = 0; i < total; i++) {
    // Los candidatos llegan de GET /activos-biologicos?id_infraestructura=… después de abrir el diálogo
    const candidatos = page.waitForResponse((r) => /\/activos-biologicos\?.*id_infraestructura=/.test(r.url()), { timeout: 20_000 }).catch(() => null);
    await tarjetas(page).nth(i).getByRole('button', { name: /elegir animal o lote/i }).click();
    const dialogo = page.getByRole('dialog');
    await expect(dialogo.getByRole('heading', { name: /resolver vinculaci/i })).toBeVisible({ timeout: 15_000 });
    await candidatos;
    await page.waitForTimeout(500);
    const combo = dialogo.getByRole('combobox', { name: /activo biol[oó]gico/i });
    const ayuda = await combo.evaluate((el) => (el.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean).map((id) => document.getElementById(id)?.textContent ?? '').join(' '));
    const titulo = await dialogo.getByRole('heading').first().innerText();
    probadas.push(`${titulo}: ${ayuda}`);
    if (/\d+ activos? en esta infraestructura/i.test(ayuda)) {
      testInfo.annotations.push({ type: 'Vinculación AMBIGUA con candidatos', description: probadas.join(' ‖ ') });
      return { dialogo, combo, titulo };
    }
    await dialogo.getByRole('button', { name: 'Cancelar' }).click();
    await expect(dialogo).toBeHidden({ timeout: 10_000 });
  }
  testInfo.annotations.push({ type: 'Vinculaciones AMBIGUA probadas', description: probadas.join(' ‖ ') });
  throw new Error(`BLOQUEO: ninguna de las ${total} vinculaciones AMBIGUA revisadas tiene activos candidatos en su infraestructura`);
}

/** Opciones de la lista del combobox (no las de otros <select> de la página). */
function opcionesDe(page: Page, idLista: string | null) {
  return page.locator(`[id="${idLista ?? ''}"] [role="option"]`);
}

/** Controles que podrían ser la lista de activos candidatos (listbox, radios, select, combobox). */
async function listaCandidatos(dialogo: Locator) {
  return dialogo.locator('[role="listbox"], [role="radiogroup"], select, [role="combobox"], input[type="radio"]').count();
}

// ── Escaneo ──────────────────────────────────────────────────────────────────

function resumenViolaciones(violaciones: { id: string; impact?: string | null; nodes: { target: unknown }[] }[]) {
  return violaciones.map((v) => `  - ${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => JSON.stringify(n.target)).join(', ')}`).join('\n');
}

async function escanear(page: Page, estado: string, testInfo: TestInfo) {
  const paso = `${estado}-${testInfo.project.name}`;
  await page.evaluate(() => document.fonts.ready);
  const axe = await new AxeBuilder({ page }).withTags(ETIQUETAS_WCAG).analyze();
  guardarResultadoAxe(TC_ID, __dirname, paso, axe);
  const lh = await auditarLighthouse(page, TC_ID, __dirname, paso);
  testInfo.annotations.push({
    type: `Lighthouse ${paso}`,
    description:
      `Puntaje accesibilidad: ${lh.puntaje === null ? 'N/A' : Math.round(lh.puntaje * 100)}` +
      (lh.auditoriasFallidas.length ? ` · Fallidas: ${lh.auditoriasFallidas.map((a) => a.id).join(', ')}` : ' · 0 auditorías fallidas'),
  });
  await testInfo.attach(`lighthouse-${paso}.html`, { path: lh.archivoHtml, contentType: 'text/html' });
  expect.soft(axe.violations, `Violaciones axe A/AA en "${paso}":\n${resumenViolaciones(axe.violations)}`).toEqual([]);
  expect.soft(lh.auditoriasFallidas.map((a) => a.id), `DEFECTO: auditorías de accesibilidad fallidas en Lighthouse ("${paso}")`).toEqual([]);
}

// ── Pruebas ──────────────────────────────────────────────────────────────────

test.describe('TC-DIS-154 — Resolución manual de vinculaciones (AMBIGUA / SIN_VINCULAR)', () => {
  // Cada test inicia sesión por su cuenta: un defecto en uno no debe saltar los demás.
  // El timeout global (30 s) no alcanza para login + axe + Lighthouse.
  test.describe.configure({ mode: 'default', timeout: 300_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!VIEWPORTS_HABILITADOS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_154_VIEWPORTS.`);
    await iniciarSesion(page);
  });

  test('a. Listado de lecturas pendientes de vinculación; precondición AMBIGUA y SIN_VINCULAR', async ({ page }, testInfo) => {
    await interceptar(page);
    await irAVinculaciones(page);
    await escanear(page, 'listado', testInfo);

    // Bandeja: secciones con encabezado ("Por revisar" / "Vinculadas")
    const secciones = await page.locator('main section[aria-labelledby] h2').allInnerTexts();
    testInfo.annotations.push({ type: 'Secciones de la bandeja', description: secciones.join(' · ') });
    expect.soft(secciones.some((s) => /por revisar/i.test(s)), 'La bandeja separa "Por revisar" con su encabezado').toBe(true);

    for (const estado of ['AMBIGUA', 'SIN_VINCULAR']) {
      await filtrarPorEstado(page, estado);
      const n = await tarjetas(page).count();
      testInfo.annotations.push({ type: `Vinculaciones ${estado}`, description: String(n) });
    }
    // Los botones de cada tarjeta dicen a qué lectura se aplican
    const botones = await tarjetas(page).first().getByRole('button').evaluateAll((bs) => bs.map((b) => ({ texto: (b.textContent ?? '').trim(), describedby: b.getAttribute('aria-describedby'), label: b.getAttribute('aria-label') })));
    testInfo.annotations.push({ type: 'Botones de la tarjeta', description: JSON.stringify(botones) });
  });

  test('b. [1.3.1 / 4.1.2 / 2.4.6] Formulario de resolución de una lectura AMBIGUA', async ({ page }, testInfo) => {
    const escrituras = await interceptar(page);
    await irAVinculaciones(page);
    const { dialogo, tituloDetalle, tituloResolver } = await abrirResolver(page, 'AMBIGUA');
    // Texto del formulario sin la ayuda del combobox ("… activos en esta infraestructura"), que no
    // es el rótulo de la estructura de la lectura
    const texto = (await dialogo.evaluate((d) => {
      const c = d.cloneNode(true) as HTMLElement;
      c.querySelectorAll('[id$="-hint"]').forEach((h) => h.remove());
      return c.textContent ?? '';
    })).replace(/\s+/g, ' ');
    testInfo.annotations.push({ type: 'Encabezados', description: `detalle="${tituloDetalle}" · resolver="${tituloResolver}"` });
    testInfo.annotations.push({ type: 'Contenido del formulario', description: texto.slice(0, 400) });

    // 1.3.1: rótulos de sensor_id y estructura en el formulario
    expect.soft(/sensor/i.test(texto), 'DEFECTO 1.3.1: el formulario de resolución no muestra el sensor_id de la lectura con su rótulo').toBe(true);
    expect.soft(/estructura|infraestructura|[áa]rea|galp[oó]n|estanque|corral/i.test(texto), 'DEFECTO 1.3.1: el formulario de resolución no muestra la estructura (área) de la lectura con su rótulo').toBe(true);

    // 1.3.1 / 4.1.2: lista de activos candidatos (los >1 animales activos de la estructura)
    const candidatos = await listaCandidatos(dialogo);
    const campoId = await dialogo.locator('input[type="number"]').count();
    testInfo.annotations.push({ type: 'Selección del activo', description: `lista de candidatos: ${candidatos} · campo numérico de ID: ${campoId}` });
    expect.soft(candidatos, 'DEFECTO 1.3.1 / 4.1.2: no hay lista de activos candidatos; el activo se escribe como un ID numérico libre').toBeGreaterThan(0);

    // 2.4.6: el encabezado dice que la lectura es AMBIGUA
    expect.soft(`${tituloDetalle} ${tituloResolver}`, 'DEFECTO 2.4.6: ni el encabezado del detalle ni el del formulario dicen que la lectura es AMBIGUA').toMatch(/ambigua/i);

    // Activo: combobox con rótulo, obligatoriedad y ayuda asociada (la ayuda cambia al llegar los candidatos)
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    const activo = dialogo.getByRole('combobox', { name: /activo biol[oó]gico/i });
    await expect.soft(activo, '1.3.1 / 4.1.2: el activo es un combobox con rótulo').toHaveCount(1);
    if (await activo.count()) {
      await expect.soft(activo, 'aria-required en el activo').toHaveAttribute('aria-required', 'true');
      const ayuda = await activo.evaluate((el) => (el.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean).map((id) => document.getElementById(id)?.textContent ?? '').join(' '));
      testInfo.annotations.push({ type: 'Ayuda del combobox', description: ayuda || '(ninguna)' });
    }
    // Modelo de manejo: fijo (texto) o lista cerrada
    const modelo = dialogo.locator('#rv-modelo');
    const tipoModelo = await modelo.evaluate((el) => `${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim()}"`);
    testInfo.annotations.push({ type: 'Modelo de manejo', description: tipoModelo });
    await escanear(page, 'resolver-ambigua', testInfo);
    expect(escrituras, 'Ninguna escritura enviada al abrir el formulario').toEqual([]);
  });

  test('c. [2.4.6] Formulario de resolución de una lectura SIN_VINCULAR; se distingue de AMBIGUA', async ({ page }, testInfo) => {
    await interceptar(page);
    await irAVinculaciones(page);
    const { tituloDetalle, tituloResolver } = await abrirResolver(page, 'SIN_VINCULAR');
    testInfo.annotations.push({ type: 'Encabezados', description: `detalle="${tituloDetalle}" · resolver="${tituloResolver}"` });
    expect.soft(`${tituloDetalle} ${tituloResolver}`, 'DEFECTO 2.4.6: ni el encabezado del detalle ni el del formulario dicen que la lectura está SIN VINCULAR').toMatch(/sin vincular/i);
    await escanear(page, 'resolver-sin-vincular', testInfo);
  });

  test('d. [1.3.1 / 3.3.1] Corrección sin motivo_correccion: error anunciado y obligatoriedad accesible', async ({ page }, testInfo) => {
    const escrituras = await interceptar(page);
    await irAVinculaciones(page);
    // La corrección (mecanismo CORRECCION) aplica a vinculaciones CONFIRMADA
    await filtrarPorEstado(page, 'CONFIRMADA');
    const detalle = await abrirPrimera(page);
    await detalle.getByRole('button', { name: 'Corregir', exact: true }).click();
    const dialogo = page.getByRole('dialog');
    await expect(dialogo.getByRole('heading', { name: /corregir vinculaci/i })).toBeVisible({ timeout: 15_000 });

    const motivo = dialogo.getByLabel(/motivo de la correcci[oó]n/i);
    await expect(motivo, '1.3.1: motivo_correccion con rótulo').toHaveCount(1);
    await expect.soft(motivo, 'Obligatoriedad expuesta (aria-required)').toHaveAttribute('aria-required', 'true');
    const rotulo = await dialogo.locator('label[for="cv-motivo"]').innerText();
    testInfo.annotations.push({ type: 'Rótulo del motivo', description: rotulo });
    expect.soft(rotulo, 'La obligatoriedad también es visible (asterisco)').toMatch(/\*/);

    await dialogo.getByRole('button', { name: /confirmar correcci/i }).click();
    const error = dialogo.getByRole('alert').filter({ hasText: /\S/ });
    await expect(error.first(), '3.3.1: el error del motivo se anuncia (role="alert")').toBeVisible({ timeout: 10_000 });
    await expect.soft(motivo, 'aria-invalid en el motivo tras el error').toHaveAttribute('aria-invalid', 'true');
    const asociado = await motivo.evaluate((el) => {
      const ids = (el.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
      return ids.map((id) => document.getElementById(id)?.textContent ?? '').join(' ');
    });
    testInfo.annotations.push({ type: 'Error del motivo', description: `texto="${(await error.allInnerTexts()).join(' | ')}" · aria-describedby="${asociado}"` });
    await escanear(page, 'corregir-sin-motivo', testInfo);
    expect(escrituras, 'La validación del cliente frena el envío: ninguna escritura').toEqual([]);
  });

  test('e. [3.3.1] Error de coherencia temporal al resolver: anunciado (Datos simulados)', async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'Datos simulados', description: 'PATCH /iot/vinculaciones/{id}/resolver respondido con 422 VINCULACION_FUERA_DE_VIGENCIA construido en la prueba; no llega al backend.' });
    const escrituras = await interceptar(page, { error422: true });
    await irAVinculaciones(page);
    const { dialogo } = await abrirResolver(page, 'AMBIGUA');
    await dialogo.getByRole('combobox', { name: /activo biol[oó]gico/i }).fill('1');
    // Tab cierra la lista del combobox, que en móvil y tablet tapa el botón de confirmar
    await page.keyboard.press('Tab');
    const modelo = dialogo.locator('#rv-modelo');
    if ((await modelo.evaluate((el) => el.tagName)) === 'SELECT' && !(await modelo.inputValue())) await modelo.selectOption('INDIVIDUAL');
    await dialogo.getByRole('button', { name: /confirmar vinculaci/i }).click();

    const alerta = dialogo.getByRole('alert').filter({ hasText: /\S/ });
    await expect(alerta.first(), '3.3.1: el error del backend se anuncia con role="alert"').toBeVisible({ timeout: 15_000 });
    const texto = (await alerta.allInnerTexts()).join(' | ').replace(/\s+/g, ' ');
    testInfo.annotations.push({ type: 'Error anunciado', description: texto });
    expect.soft(texto, '3.3.1: el mensaje describe el problema (no solo un código)').toMatch(/no estaba activo|vigencia|fecha/i);
    expect(escrituras.every((e) => /^PATCH \/iot\/vinculaciones\/\d+\/resolver$/.test(e)), `Solo el PATCH interceptado: ${escrituras.join(', ')}`).toBe(true);
    await escanear(page, 'error-coherencia', testInfo);
  });

  test('f. [2.1.1 / 4.1.2] Teclado: lista de candidatos operable con Tab/flechas y Enter', async ({ page }, testInfo) => {
    await interceptar(page);
    await irAVinculaciones(page);
    const { dialogo } = await abrirResolverConCandidatos(page, testInfo);
    // Recorrido con Tab dentro del diálogo: qué controles alcanza el teclado
    const recorrido: string[] = [];
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
      recorrido.push(await page.evaluate(() => {
        const a = document.activeElement as HTMLElement | null;
        if (!a) return '(nada)';
        const label = a.id ? document.querySelector(`label[for="${a.id}"]`)?.textContent : '';
        return `${a.tagName.toLowerCase()}${a.getAttribute('role') ? `[${a.getAttribute('role')}]` : ''} "${(label || a.getAttribute('aria-label') || a.textContent || '').trim().slice(0, 40)}"`;
      }));
    }
    testInfo.annotations.push({ type: 'Recorrido con Tab', description: recorrido.join(' → ') });
    const dentro = await dialogo.evaluate((d) => d.contains(document.activeElement));
    expect.soft(dentro, 'El foco queda atrapado dentro del diálogo').toBe(true);
    expect(await listaCandidatos(dialogo), 'DEFECTO 2.1.1 / 4.1.2: no hay lista de candidatos que recorrer con flechas y seleccionar con Enter').toBeGreaterThan(0);

    // Combobox de candidatos: flecha abajo abre la lista y mueve la opción activa; Enter la elige
    const combo = dialogo.getByRole('combobox', { name: /activo biol[oó]gico/i });
    await combo.focus();
    await page.keyboard.press('ArrowDown');
    await expect.soft(combo, '4.1.2: al abrir la lista el combobox expone aria-expanded="true"').toHaveAttribute('aria-expanded', 'true');
    const opciones = opcionesDe(page, await combo.getAttribute('aria-controls'));
    const n = await opciones.count();
    const activa = await combo.getAttribute('aria-activedescendant');
    const textoActiva = activa ? await page.locator(`[id="${activa}"]`).innerText().catch(() => '') : '';
    testInfo.annotations.push({ type: 'Candidatos', description: `${n} opciones · activa: ${activa ?? '(ninguna)'} "${textoActiva.replace(/\s+/g, ' ')}"` });
    expect.soft(n, 'BLOQUEO: el combobox no lista candidatos para esta infraestructura').toBeGreaterThan(0);
    expect.soft(activa, '4.1.2: la opción activa se comunica con aria-activedescendant').toBeTruthy();
    if (n > 0) {
      await page.keyboard.press('Enter');
      const valor = await combo.inputValue();
      testInfo.annotations.push({ type: 'Elegido con Enter', description: valor });
      expect.soft(valor, '2.1.1: Enter elige el candidato activo').toMatch(/\(#\d+\)$/);
      await expect.soft(combo, 'Tras elegir, la lista se cierra').toHaveAttribute('aria-expanded', 'false');
    }
    await escanear(page, 'candidatos-teclado', testInfo);
  });
});
