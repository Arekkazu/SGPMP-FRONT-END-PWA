/**
 * TC-DIS-143 — Accesibilidad WCAG 2.1 AA del listado de Bitácora de Auditoría
 * RF-52 · CU-13 Auditoría y Trazabilidad de Transformación Biológica · Rol: Administrador
 * Ruta: /activos-biologicos/auditoria ("Auditoría y trazabilidad")
 *
 * Reejecución sobre la release 1.0.0-rc.46 (2026-10-09).
 *
 * Herramientas: @axe-core/playwright (reporte axe-<TC>.html/json) + Lighthouse en
 * modo snapshot sobre la misma sesión (lighthouse-<TC>-<paso>-<viewport>.html/json),
 * ambos en ./resultados. Una auditoría fallida de Lighthouse es un defecto aunque tenga
 * peso 0 en el puntaje.
 *
 * Datos: bitácora real de M02 (≈7 000 registros, 20 por página). Cada consulta del sistema
 * genera registros nuevos, así que el contenido cambia entre corridas: los pasos se apoyan
 * en la estructura, no en filas concretas.
 * Errores: con filtros inválidos (fechas invertidas, RF inexistente) el backend responde 200
 * vacío; 403 (rol sin acceso a la bitácora) y 500 se SIMULAN con el formato estándar.
 * Solo lecturas.
 *
 * Tema: la preferencia es de la cuenta compartida; se fija Claro sirviendo
 * GET /configuracion/personalizacion/tema(/global) (cuerpo real de TEST).
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_143_VIEWPORTS=escritorio
 *
 * ── Reejecución 2026-10-10 (rc.48) ──────────────────────────────────────────
 * Se corrigen dos verificaciones desactualizadas que daban falsos positivos:
 *   - Filtro por usuario: la vista lo tiene desde rc.46 como campo numérico "ID usuario"
 *     (spinbutton); el test solo buscaba combobox o textbox.
 *   - Valores del evento: detalle_tecnico se muestra en un desplegable "Detalle técnico"
 *     (<details> con <dl>) dentro de la fila, no en una columna; ahora se exige un desplegable
 *     por cada registro de la página que trae detalle_tecnico.
 * Sin cambios en el resto del criterio.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { auditarLighthouse, PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';

const TC_ID = 'TC-DIS-143';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_143_VIEWPORTS ?? 'movil,tablet,escritorio')
  .split(',')
  .map((v) => v.trim());

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const URL_BITACORA = (url: URL) => url.pathname.endsWith('/activos-biologicos/auditoria');

// SIMULADOS con el formato estándar del backend
const ERROR_403 = { error_code: 'ACCESO_DENEGADO', message: 'Acceso denegado. Su rol no tiene permisos para realizar esta operación.', fields: [] };
const ERROR_500 = { error_code: 'ERROR_INTERNO', message: 'Ocurrió un error inesperado. Intenta nuevamente.', fields: [] };

const TEMA: Record<string, unknown> = {
  '/configuracion/personalizacion/tema': { theme_mode: 1, fuente: 'personal', id_tema_visual: 10 },
  '/configuracion/personalizacion/tema/global': { id_tema_visual: 1, id_usuario: 1, theme_mode: 1, es_global: true, fecha_actualizacion: '2026-09-29T22:56:03.004225Z' },
};

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

async function fijarTemaClaro(page: Page) {
  await page.route((url) => Object.keys(TEMA).some((k) => url.pathname.endsWith(k)), (r) => {
    const req = r.request();
    if (!['xhr', 'fetch'].includes(req.resourceType())) return r.continue();
    if (req.method() !== 'GET') return r.abort('blockedbyclient');
    const clave = Object.keys(TEMA).find((k) => new URL(req.url()).pathname.endsWith(k))!;
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(TEMA[clave]) });
  });
}

// ── Navegación ───────────────────────────────────────────────────────────────

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
  await expect(page.getByRole('heading', { name: 'Auditoría y trazabilidad', level: 1 })).toBeVisible({ timeout: 20_000 });
  const r = await respuesta;
  await page.evaluate(() => document.fonts.ready);
  return r;
}

function filtros(page: Page) {
  return {
    rf: page.getByRole('textbox', { name: /^rf origen$/i }),
    tipo: page.getByRole('textbox', { name: /^tipo de evento$/i }),
    activo: page.getByRole('spinbutton', { name: /^id activo$/i }),
    clasificacion: page.getByRole('textbox', { name: /^clasificación$/i }),
    resultado: page.getByRole('combobox', { name: /^resultado$/i }),
    severidad: page.getByRole('combobox', { name: /^severidad$/i }),
    desde: page.getByLabel(/^desde$/i),
    hasta: page.getByLabel(/^hasta$/i),
    aplicar: page.getByRole('button', { name: 'Aplicar filtros' }),
    limpiar: page.getByRole('button', { name: 'Limpiar', exact: true }),
  };
}

async function aplicar(page: Page) {
  const respuesta = esperarBitacora(page);
  await filtros(page).aplicar.click();
  return respuesta;
}

function tabla(page: Page): Locator {
  return page.getByRole('table');
}

const VACIO = 'Sin registros de auditoría para los filtros seleccionados.';

// ── Escaneo axe + Lighthouse ─────────────────────────────────────────────────

function resumenViolaciones(violaciones: { id: string; impact?: string | null; help: string; nodes: unknown[] }[]) {
  return violaciones.map((v) => `${v.id} (${v.impact}): ${v.help} [${v.nodes.length} nodo(s)]`).join('\n');
}

async function escanear(page: Page, pasoBase: string, testInfo: TestInfo) {
  const paso = `${pasoBase}-${testInfo.project.name}`;
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
  // Una auditoría fallida es un defecto aunque Lighthouse le asigne peso 0 en el puntaje
  expect.soft(lh.auditoriasFallidas.map((a) => a.id), `DEFECTO: auditorías de accesibilidad fallidas en Lighthouse ("${paso}")`).toEqual([]);
}

function enRegionViva(loc: Locator): Promise<boolean> {
  return loc.first().evaluate((e) => !!e.closest('[role="alert"],[role="status"],[aria-live]:not([aria-live="off"])'));
}

// ── Casos ────────────────────────────────────────────────────────────────────

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Bitácora de auditoría (RF-52)`, () => {
  // Modo por defecto (no serial): un paso con violaciones no debe impedir evaluar los demás.
  // workers: 1 en el config, así que los logins siguen siendo secuenciales.
  test.describe.configure({ timeout: 180_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!VIEWPORTS_HABILITADOS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_143_VIEWPORTS.`);
    expect(ADMIN_EMAIL, 'Falta TEST_ADMIN_EMAIL en testing/.env.test').not.toBe('');
    expect(ADMIN_PASSWORD, 'Falta TEST_ADMIN_PASSWORD en testing/.env.test').not.toBe('');
    await fijarTemaClaro(page);
    await iniciarSesionAdmin(page);
  });

  test('1-2. Listado con datos - 0 violaciones axe, tabla 1.3.1 y filtros 4.1.2', async ({ page }, testInfo) => {
    const r = await abrirBitacora(page);
    const cuerpo = await r.json();
    testInfo.annotations.push({ type: 'Datos', description: `${cuerpo.total_registros} registros · ${cuerpo.total_paginas} páginas` });
    expect(cuerpo.total_registros, 'Precondición: al menos 5 registros de auditoría').toBeGreaterThanOrEqual(5);
    await expect(tabla(page).getByRole('row')).toHaveCount(Math.min(20, cuerpo.total_registros) + 1);

    // 1.3.1: encabezados de la tabla
    const encabezados = (await tabla(page).getByRole('columnheader').allInnerTexts()).map((h) => h.trim().toLowerCase());
    testInfo.annotations.push({ type: 'Encabezados', description: encabezados.join(' · ') });
    for (const h of ['fecha', 'evento', 'resultado']) {
      expect(encabezados, `DEFECTO: 1.3.1: la tabla debe tener el encabezado "${h}" (timestamp / tipo_operacion / resultado)`).toContain(h);
    }
    expect.soft(encabezados.some((h) => /usuario|responsable/.test(h)), 'DEFECTO: 1.3.1: la tabla no tiene columna de usuario (la respuesta trae id_usuario_responsable)').toBe(true);
    // Valores del evento (detalle_tecnico): desde rc.46 van en un desplegable "Detalle técnico"
    // dentro de la fila (<details> con <dl>), no en una columna propia
    const conDetalle = (cuerpo.registros as { detalle_tecnico: Record<string, unknown> | null }[])
      .filter((ev) => ev.detalle_tecnico && Object.keys(ev.detalle_tecnico).length > 0).length;
    const desplegables = tabla(page).locator('details:has(> summary):has(dl dt)');
    testInfo.annotations.push({ type: 'Detalle técnico', description: `registros con detalle_tecnico en la página: ${conDetalle} · desplegables con <dl> en la tabla: ${await desplegables.count()}` });
    expect.soft(await desplegables.count(), 'DEFECTO: 1.3.1: la tabla no muestra los valores del evento (detalle_tecnico) de cada registro que los trae').toBe(conDetalle);
    const nombreTabla = await tabla(page).evaluate((t) => !!t.querySelector('caption') || t.hasAttribute('aria-label') || t.hasAttribute('aria-labelledby'));
    expect.soft(nombreTabla, 'DEFECTO: 1.3.1: la tabla no tiene nombre accesible (caption/aria-label)').toBe(true);

    // Resultado y severidad se comunican con texto, no solo color
    await expect(tabla(page).getByText(/^(EXITOSO|FALLIDO)$/).first(), 'DEFECTO: 1.4.1: el resultado debe mostrarse como texto').toBeVisible();

    // 4.1.2: filtros con name/role/value
    const f = filtros(page);
    for (const [campo, nombre] of [[f.rf, 'RF origen'], [f.tipo, 'Tipo de evento'], [f.activo, 'ID activo'], [f.clasificacion, 'Clasificación'], [f.resultado, 'Resultado'], [f.severidad, 'Severidad'], [f.desde, 'Desde'], [f.hasta, 'Hasta']] as const) {
      await expect(campo, `DEFECTO: 4.1.2: el filtro "${nombre}" debe tener nombre accesible`).toBeVisible();
    }
    await f.resultado.selectOption('FALLIDO');
    await expect(f.resultado, 'DEFECTO: 4.1.2: el value del select debe reflejar la opción').toHaveValue('FALLIDO');
    await f.resultado.selectOption('');
    // Filtro por usuario: desde rc.46 es un campo numérico "ID usuario" (spinbutton)
    const filtroUsuario = page.getByRole('spinbutton', { name: /usuario/i })
      .or(page.getByRole('combobox', { name: /usuario/i }))
      .or(page.getByRole('textbox', { name: /usuario/i }));
    expect.soft(await filtroUsuario.count(), 'DEFECTO: Filtro por usuario ausente: el caso pide filtrar por tipo de operación / usuario / fecha').toBeGreaterThan(0);

    await escanear(page, 'listado', testInfo);
  });

  test('3. Filtro por tipo de operación, resultado y fecha - 0 violaciones axe', async ({ page }, testInfo) => {
    await abrirBitacora(page);
    const f = filtros(page);
    await f.rf.fill('RF48');
    const base = await (await aplicar(page)).json();
    expect(base.total_registros, 'Precondición: hay eventos de transferencias (RF48)').toBeGreaterThan(0);
    const tipoEvento: string = base.registros[0].tipo_evento;

    await f.tipo.fill(tipoEvento);
    await f.resultado.selectOption('EXITOSO');
    await f.desde.fill('2026-01-01');
    await f.hasta.fill('2026-12-31');
    const r = await aplicar(page);
    const url = new URL(r.url());
    expect(url.searchParams.get('tipo_evento')).toBe(tipoEvento);
    expect(url.searchParams.get('resultado')).toBe('EXITOSO');
    expect(url.searchParams.get('fecha_inicio')).not.toBeNull();
    const cuerpo = await r.json();
    testInfo.annotations.push({ type: 'Filtro aplicado', description: `RF48 · ${tipoEvento} · EXITOSO · 2026 → ${cuerpo.total_registros} registros` });
    if (cuerpo.total_registros > 0) {
      for (const celda of await tabla(page).locator('tbody td:nth-child(3) > div:first-child').allInnerTexts()) expect(celda.trim()).toBe(tipoEvento);
    }
    expect.soft(await enRegionViva(page.getByText(/registro\(s\)/)), 'DEFECTO: 4.1.3: el conteo de resultados tras filtrar no está en región viva').toBe(true);

    await escanear(page, 'filtro-aplicado', testInfo);
  });

  test('4. Filtro sin resultados (estado vacío) y filtros inválidos - anunciados', async ({ page }, testInfo) => {
    await abrirBitacora(page);
    const f = filtros(page);
    await f.rf.fill('RF999');
    const r = await aplicar(page);
    expect((await r.json()).total_registros).toBe(0);
    const vacio = page.getByText(VACIO);
    await expect(vacio, 'El estado vacío debe mostrarse').toBeVisible();
    expect.soft(await enRegionViva(vacio), 'DEFECTO: 3.3.1/4.1.3: el estado sin resultados es un <p> sin role="status"/aria-live; no se anuncia').toBe(true);
    await escanear(page, 'estado-vacio', testInfo);

    // Rango de fechas invertido: debe informarse el error, no un "sin resultados"
    await f.limpiar.click();
    await f.desde.fill('2026-09-20');
    await f.hasta.fill('2026-01-01');
    const rInv = await aplicar(page);
    testInfo.annotations.push({ type: 'Rango invertido', description: `HTTP ${rInv.status()} · ${(await rInv.json()).total_registros ?? '—'} registros` });
    const hayError = await page.getByRole('alert').count();
    expect.soft(hayError, 'DEFECTO: 3.3.1: con "Desde" posterior a "Hasta" no se informa el error (el backend responde 200 y la vista muestra resultados como si el filtro fuera válido)').toBeGreaterThan(0);
  });

  test('3.3.1. Errores anunciados: 403 y 500 (simulados)', async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'Datos simulados', description: '403 (rol sin acceso a la bitácora) y 500 inyectados con el formato estándar del backend.' });
    // Solo la consulta (xhr/fetch): la página usa la misma ruta /activos-biologicos/auditoria
    await page.route(URL_BITACORA, (r) => (['xhr', 'fetch'].includes(r.request().resourceType())
      ? r.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify(ERROR_403) })
      : r.continue()));
    await abrirBitacora(page);
    await expect(page.getByRole('alert').filter({ hasText: 'Sin acceso a la auditoría' }), 'DEFECTO: 3.3.1: el 403 debe anunciarse').toContainText('Acceso denegado');
    expect.soft(await page.getByText(VACIO).count(), 'DEFECTO: Con el 403 también se muestra "Sin registros…", como si no hubiera datos').toBe(0);
    await escanear(page, 'error-403', testInfo);

    await page.unrouteAll({ behavior: 'ignoreErrors' });
    await fijarTemaClaro(page);
    await page.route(URL_BITACORA, (r) => (['xhr', 'fetch'].includes(r.request().resourceType())
      ? r.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify(ERROR_500) })
      : r.continue()));
    await abrirBitacora(page);
    await expect(page.getByRole('alert').filter({ hasText: 'Error al cargar la bitácora' }), 'DEFECTO: 3.3.1: el 500 debe anunciarse').toBeVisible();
  });

  test('5. Teclado - filtros, tabla y paginación operables (2.1.1)', async ({ page }, testInfo) => {
    await abrirBitacora(page);
    const f = filtros(page);

    // Filtros: se escriben y se aplican con teclado
    await f.rf.focus();
    await page.keyboard.type('RF48');
    const conEnter = page.waitForResponse((r) => URL_BITACORA(new URL(r.url())), { timeout: 3_000 }).then(() => true, () => false);
    await page.keyboard.press('Enter');
    const aplicaConEnter = await conEnter;
    let respuesta: ReturnType<typeof esperarBitacora>;
    testInfo.annotations.push({ type: 'Enter en un filtro de texto', description: aplicaConEnter ? 'aplica' : 'no aplica' });
    expect.soft(aplicaConEnter, 'DEFECTO: 2.1.1: Enter en un filtro no aplica la búsqueda (los filtros no son un <form>); hay que tabular hasta "Aplicar filtros"').toBe(true);

    // Tab hasta "Aplicar filtros" y Enter
    // Los campos de fecha consumen 3 Tabs cada uno (día / mes / año)
    for (let i = 0; i < 20 && !(await f.aplicar.evaluate((e) => e === document.activeElement)); i++) await page.keyboard.press('Tab');
    await expect(f.aplicar, 'DEFECTO: 2.1.1: "Aplicar filtros" debe alcanzarse con Tab').toBeFocused();
    respuesta = esperarBitacora(page);
    await page.keyboard.press('Enter');
    expect(new URL((await respuesta).url()).searchParams.get('rf_origen')).toBe('RF48');

    // Selects con flechas
    await f.resultado.focus();
    await page.keyboard.press('ArrowDown');
    await expect(f.resultado, 'DEFECTO: 2.1.1: "Resultado" debe operarse con flechas').not.toHaveValue('');

    // Tabla: si desborda horizontalmente, su contenedor debe poder desplazarse con teclado
    const contenedor = tabla(page).locator('xpath=..');
    const desborda = await contenedor.evaluate((e) => e.scrollWidth > e.clientWidth);
    const enfocable = await contenedor.evaluate((e) => e.tabIndex >= 0);
    testInfo.annotations.push({ type: 'Tabla', description: `desborda horizontalmente: ${desborda} · contenedor enfocable: ${enfocable}` });
    if (desborda) expect.soft(enfocable, 'DEFECTO: 2.1.1: la tabla desborda horizontalmente y su contenedor no es enfocable; las columnas ocultas no se pueden desplazar con teclado').toBe(true);

    // Paginación con teclado
    respuesta = esperarBitacora(page);
    await f.limpiar.click();
    await respuesta;
    await expect(page.getByText(/Página 1 de \d+/)).toBeVisible();
    const siguiente = page.getByRole('button', { name: 'Siguiente', exact: true });
    await siguiente.focus();
    respuesta = esperarBitacora(page);
    await page.keyboard.press('Enter');
    expect(new URL((await respuesta).url()).searchParams.get('pagina')).toBe('2');
    await expect(page.getByText(/Página 2 de \d+/), 'DEFECTO: 2.1.1: la paginación debe operarse con teclado').toBeVisible();
    expect.soft(await enRegionViva(page.getByText(/Página 2 de \d+/)), 'DEFECTO: 4.1.3: el cambio de página no se anuncia').toBe(true);
  });
});
