/**
 * TC-DIS-93 — Accesibilidad WCAG 2.1 AA de la vista de Gestión Individual de Activos Biológicos
 * RF-35 · Gestionar activo individual · Rol: Administrador
 * Activos biológicos → ficha del activo INDIVIDUAL → pestañas de gestión + "Datos" → "Editar"
 *
 * Criterio (hoja M02): 0 violaciones axe A/AA y verificación de 1.3.1 (datos del individuo
 * con estructura semántica por sección), 2.4.4 (acciones con propósito claro por su texto),
 * 2.4.6 (encabezados y etiquetas por sección), 4.1.2 (controles de edición con
 * name/role/value), 1.4.3. Notas: navegación por teclado entre secciones del individuo.
 *
 * Herramientas: @axe-core/playwright (resultados/axe-TC-DIS-93.html/json) + Lighthouse en
 * modo snapshot (resultados/lighthouse-TC-DIS-93-<paso>-<viewport>.html/json). Axe recorre
 * las 10 pestañas; Lighthouse solo los estados centrales del caso (Datos, modal Editar y tras
 * guardar) para no inflar la evidencia. Lighthouse: alcance limitado.
 *
 * Datos (TEST, 30/09/2026): INDIVIDUAL #627 "QAG53R2-21297514", ACTIVO, fase e infraestructura
 * (el mismo de TC-DIS-117). Si cambia, el spec corta con "BLOQUEO DE AMBIENTE".
 *
 * Operación probada: "Editar" (PATCH /activos-biologicos/627). SIMULADA: el PATCH se responde
 * con route.fulfill (200 con el mismo activo que devolvió el GET, o 412 de concurrencia) y
 * nunca llega al backend. Cualquier otro POST/PUT/PATCH/DELETE se aborta (salvo /sesiones/).
 * Registrar evento y transferir tienen sus propios casos (TC-DIS-102…114, TC-DIS-134).
 *
 * Navegación: page.goto directo a /activos-biologicos/627, verificando después de cada goto que
 * la sesión sigue viva ("BLOQUEO DE AMBIENTE: sesión perdida tras goto").
 *
 * Un login por viewport (página compartida en beforeAll). No se usa modo serial: un hallazgo
 * no debe saltarse los pasos siguientes; si un test falla, Playwright reinicia el worker y el
 * beforeAll vuelve a iniciar sesión.
 */
import fs from 'fs';
import path from 'path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type BrowserContext, type Page, type TestInfo } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { auditarLighthouse, PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';

const TC_ID = 'TC-DIS-93';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

const ID_INDIVIDUAL = 627;
const IDENTIFICADOR = 'QAG53R2-21297514';

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const HAR_ASSETS = path.join(__dirname, '../../../../../.har-cache/assets.har');

const PESTANAS = ['Ficha integral', 'Datos', 'Estado', 'Fases', 'Eventos', 'Historial', 'Infraestructura', 'Sensores', 'Indicadores', 'Análisis'];

/** PATCH de edición del activo (API, no la ruta del frontend). */
const URL_PATCH = (url: URL) => url.pathname.endsWith(`/back-sigab-test/activos-biologicos/${ID_INDIVIDUAL}`);

// 412 SIMULADO (conflicto de concurrencia) con el formato estándar del backend
const ERROR_412 = {
  error_code: 'CONFLICTO_CONCURRENCIA',
  message: 'El activo fue modificado por otro usuario. Recargue la información e intente nuevamente.',
  fields: [],
};

test.use({ locale: 'es-CO', launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

// ── Sesión y navegación ──────────────────────────────────────────────────────

async function iniciarSesion(page: Page) {
  await page.goto('/login', { waitUntil: 'commit', timeout: 300_000 });
  const correo = page.getByRole('textbox', { name: 'Correo electrónico', exact: true });
  await correo.waitFor({ state: 'visible', timeout: 300_000 });
  await correo.fill(ADMIN_EMAIL);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 120_000 }).catch(() => {
    throw new Error('LOGIN FALLIDO: la app sigue en /login tras "Ingresar". No reintentar (bloqueo tras 5 intentos).');
  });
  await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
}

function main(page: Page) {
  return page.getByRole('main');
}

function secciones(page: Page) {
  return main(page).getByRole('navigation', { name: 'Secciones del activo' });
}

/** goto al activo; falla como BLOQUEO si la sesión no sobrevivió. Devuelve el cuerpo del GET del activo. */
async function abrirActivo(page: Page): Promise<Record<string, unknown>> {
  const respuesta = page
    .waitForResponse((r) => new URL(r.url()).pathname.endsWith(`/back-sigab-test/activos-biologicos/${ID_INDIVIDUAL}`) && r.request().method() === 'GET', { timeout: 120_000 })
    .catch(() => null);
  await page.goto(`/activos-biologicos/${ID_INDIVIDUAL}`, { waitUntil: 'commit', timeout: 120_000 });

  const login = page.getByRole('textbox', { name: 'Correo electrónico', exact: true });
  await expect(secciones(page).or(login)).toBeVisible({ timeout: 120_000 });
  if (new URL(page.url()).pathname.includes('/login') || (await login.isVisible())) {
    throw new Error(`BLOQUEO DE AMBIENTE: sesión perdida tras goto (/activos-biologicos/${ID_INDIVIDUAL} → ${page.url()})`);
  }
  const r = await respuesta;
  if (!r || !r.ok()) throw new Error(`BLOQUEO DE AMBIENTE: GET /activos-biologicos/${ID_INDIVIDUAL} no respondió 200`);
  const activo = (await r.json()) as Record<string, unknown>;
  if (String(activo.tipo).toUpperCase() !== 'INDIVIDUAL' || activo.nombre_estado !== 'ACTIVO') {
    throw new Error(`BLOQUEO DE AMBIENTE: el dato de prueba cambió (#${ID_INDIVIDUAL} es ${String(activo.tipo)} ${String(activo.nombre_estado)}). Verificar a mano antes de seguir.`);
  }
  await expect(main(page).getByRole('heading', { name: 'Datos del activo', exact: true })).toBeVisible({ timeout: 60_000 });
  return activo;
}

async function irAPestana(page: Page, nombre: string) {
  await secciones(page).getByRole('button', { name: nombre, exact: true }).click();
  await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
}

async function abrirEditar(page: Page) {
  await irAPestana(page, 'Datos');
  const editar = main(page).getByRole('button', { name: 'Editar activo', exact: true });
  await expect(editar, 'El Administrador debe ver "Editar" en Datos (permiso U sobre activos)').toBeVisible({ timeout: 60_000 });
  // Se abre con teclado: foco + Enter
  await editar.focus();
  await page.keyboard.press('Enter');
  const dialogo = page.getByRole('dialog', { name: `Editar activo — ${IDENTIFICADOR}` });
  await expect(dialogo).toBeVisible();
  return { editar, dialogo };
}

// ── Escaneo axe + Lighthouse ─────────────────────────────────────────────────

function resumenViolaciones(violaciones: { id: string; impact?: string | null; help: string; nodes: unknown[] }[]) {
  return violaciones.map((v) => `${v.id} (${v.impact}): ${v.help} [${v.nodes.length} nodo(s)]`).join('\n');
}

async function escanear(page: Page, paso: string, testInfo: TestInfo, { lighthouse = true } = {}) {
  const pasoVp = `${paso}-${testInfo.project.name}`;
  await page.evaluate(() => document.fonts.ready);

  const axe = await new AxeBuilder({ page }).withTags(ETIQUETAS_WCAG).analyze();
  guardarResultadoAxe(TC_ID, __dirname, pasoVp, axe);

  if (lighthouse) {
    const lh = await auditarLighthouse(page, TC_ID, __dirname, pasoVp);
    testInfo.annotations.push({
      type: `Lighthouse ${pasoVp}`,
      description:
        `Puntaje accesibilidad: ${lh.puntaje === null ? 'N/A' : Math.round(lh.puntaje * 100)} (snapshot, alcance limitado)` +
        (lh.auditoriasFallidas.length ? ` · Fallidas: ${lh.auditoriasFallidas.map((a) => a.id).join(', ')}` : ' · 0 auditorías fallidas'),
    });
  }

  expect.soft(axe.violations, `Violaciones axe A/AA en "${pasoVp}":\n${resumenViolaciones(axe.violations)}`).toEqual([]);
}

function descripcionFoco(page: Page) {
  return page.evaluate(() => {
    const e = document.activeElement as HTMLElement | null;
    if (!e) return 'ninguno';
    const enDialogo = e.closest('[role="dialog"]') ? 'dialog' : 'fuera';
    return `${enDialogo}:${e.tagName}:${(e.getAttribute('aria-label') ?? e.textContent ?? '').trim().slice(0, 30)}`;
  });
}

// ── Casos ────────────────────────────────────────────────────────────────────

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Gestión de activo individual (RF-35)`, () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });

  let contexto: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    testInfo.setTimeout(420_000);
    expect(ADMIN_EMAIL, 'Faltan TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD en testing/.env.test').not.toBe('');
    expect(ADMIN_PASSWORD, 'Faltan TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD en testing/.env.test').not.toBe('');

    const use = testInfo.project.use;
    contexto = await browser.newContext({
      baseURL: use.baseURL,
      viewport: use.viewport,
      deviceScaleFactor: use.deviceScaleFactor,
      userAgent: use.userAgent,
      locale: 'es-CO',
    });
    // Caché de JS/CSS/fuentes para red lenta; nunca la API
    await contexto.routeFromHAR(HAR_ASSETS, { url: '**/assets/**', update: !fs.existsSync(HAR_ASSETS), notFound: 'fallback' });
    // Ninguna escritura llega al backend (salvo el login). Las simulaciones van en page.route, que tiene prioridad.
    await contexto.route('**/back-sigab-test/**', (r) => {
      const req = r.request();
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method()) || /\/back-sigab-test\/sesiones\//.test(req.url())) return r.continue();
      return r.abort();
    });
    page = await contexto.newPage();
    await iniciarSesion(page);
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test('1. Datos del individuo - 0 violaciones axe A/AA, encabezados (2.4.6) y datos con estructura (1.3.1)', async ({}, testInfo) => {
    await abrirActivo(page);
    await irAPestana(page, 'Datos');
    await expect(main(page).getByRole('heading', { name: 'Detalle individual', exact: true })).toBeVisible();

    await escanear(page, 'datos', testInfo);

    await expect(main(page).getByRole('heading', { name: 'Origen y procedencia', exact: true }), '2.4.6: cada bloque de datos con encabezado').toBeVisible();
    // 1.3.1: etiqueta y valor relacionados (p. ej. <dl>/<dt>/<dd>), no dos <div> sueltos
    expect.soft(await main(page).locator('dl').count(), '1.3.1: etiqueta y valor de cada dato son dos <div> sin relación semántica (no hay <dl>/<dt>/<dd>)').toBeGreaterThan(0);
  });

  test('2. Las 10 pestañas del individuo - 0 violaciones axe A/AA, encabezado por sección (2.4.6) y acciones con propósito claro (2.4.4)', async ({}, testInfo) => {
    await abrirActivo(page);
    const sinEncabezado: string[] = [];
    const acciones: string[] = [];
    for (const pestana of PESTANAS) {
      await irAPestana(page, pestana);
      await escanear(page, `pestana-${pestana.normalize('NFD').replace(/[^\w]/g, '').toLowerCase()}`, testInfo, { lighthouse: false });

      // Encabezados del contenido de la pestaña (todo lo que va después del nav de secciones)
      const encabezados = await secciones(page).evaluate((nav) => {
        const out: string[] = [];
        let n = nav.nextElementSibling;
        while (n) {
          n.querySelectorAll('h1,h2,h3,h4,h5,h6,[role="heading"]').forEach((h) => out.push((h.textContent ?? '').trim()));
          n = n.nextElementSibling;
        }
        return out;
      });
      if (encabezados.length === 0) sinEncabezado.push(pestana);

      const nombres = await secciones(page).evaluate((nav) => {
        const out: string[] = [];
        let n = nav.nextElementSibling;
        while (n) {
          n.querySelectorAll('button, a[href]').forEach((b) => out.push((b.getAttribute('aria-label') ?? b.textContent ?? '').trim()));
          n = n.nextElementSibling;
        }
        return out;
      });
      acciones.push(`${pestana}: ${nombres.join(' | ') || '—'}`);
    }
    testInfo.annotations.push({ type: 'Acciones por pestaña (2.4.4)', description: acciones.join(' · ') });
    testInfo.annotations.push({ type: 'Pestañas sin encabezado', description: sinEncabezado.join(', ') || 'ninguna' });
    expect.soft(sinEncabezado, '1.3.1/2.4.6: pestañas cuyo contenido no tiene ningún encabezado').toEqual([]);

    // 2.4.4: ninguna acción con nombre vacío o genérico
    const genericas = acciones.flatMap((a) => a.split(': ')[1].split(' | ')).filter((n) => /^(ver|más|aquí|click|ok|ir)$/i.test(n) || n === '');
    expect.soft(genericas, '2.4.4: acciones sin propósito claro por su texto').toEqual([]);
  });

  test('3. Teclado entre secciones - las 10 pestañas alcanzables con Tab y activables con Enter', async ({}, testInfo) => {
    await abrirActivo(page);
    await secciones(page).getByRole('button', { name: 'Ficha integral', exact: true }).focus();
    const recorrido: string[] = [];
    for (let i = 0; i < PESTANAS.length; i++) {
      if (i > 0) await page.keyboard.press('Tab');
      recorrido.push(await page.evaluate(() => (document.activeElement?.textContent ?? '').trim()));
    }
    testInfo.annotations.push({ type: 'Orden de Tab en el nav', description: recorrido.join(' → ') });
    expect(recorrido, 'Las pestañas deben recorrerse con Tab en orden visual').toEqual(PESTANAS);

    // Enter sobre "Datos" activa la sección y lo expone (aria-current)
    const datos = secciones(page).getByRole('button', { name: 'Datos', exact: true });
    await datos.focus();
    await page.keyboard.press('Enter');
    await expect(main(page).getByRole('heading', { name: 'Detalle individual', exact: true }), 'Enter debe activar la pestaña').toBeVisible();
    await expect(datos, '4.1.2: la pestaña activa debe exponer su estado').toHaveAttribute('aria-current', /.+/);
    // Patrón: botones con aria-current="page" dentro de <nav>, no role="tab"/aria-selected (se deja constancia)
    testInfo.annotations.push({
      type: 'Patrón de pestañas',
      description: `role=tab: ${await secciones(page).getByRole('tab').count()} · aria-current del activo: ${await datos.getAttribute('aria-current')}`,
    });
  });

  test('4. Modal "Editar activo" - 0 violaciones axe A/AA, controles con name/role/value (4.1.2) y foco del diálogo', async ({}, testInfo) => {
    const activo = await abrirActivo(page);
    const { editar, dialogo } = await abrirEditar(page);
    const det = (activo.detalle_individual ?? {}) as Record<string, unknown>;

    // Foco al abrir: debe entrar al diálogo
    const focoInicial = await descripcionFoco(page);
    testInfo.annotations.push({ type: 'Foco al abrir el modal', description: focoInicial });
    expect.soft(focoInicial.startsWith('dialog:'), '2.4.3: al abrir el modal el foco se queda fuera del diálogo').toBe(true);

    await escanear(page, 'modal-editar', testInfo);

    // 4.1.2: nombre, rol y valor de cada control, contra el valor real del activo
    const raza = dialogo.getByRole('textbox', { name: 'Raza', exact: true });
    const sexo = dialogo.getByRole('combobox', { name: 'Sexo', exact: true });
    const nacimiento = dialogo.getByRole('textbox', { name: 'Fecha de nacimiento', exact: true });
    const peso = dialogo.getByRole('spinbutton', { name: 'Peso inicial (kg)', exact: true });
    await expect(raza).toHaveValue(String(det.raza ?? ''));
    await expect(nacimiento).toHaveValue(String(det.fecha_nacimiento ?? '').slice(0, 10));
    await expect(peso).toBeVisible();
    const sexoOpcion = await sexo.evaluate((s: HTMLSelectElement) => s.selectedOptions[0]?.textContent?.trim() ?? '');
    testInfo.annotations.push({ type: 'Sexo', description: `activo: ${String(det.sexo)} · opción seleccionada en el modal: ${sexoOpcion}` });
    expect.soft(sexoOpcion.toLowerCase(), `4.1.2: el select "Sexo" no refleja el valor actual del activo (${String(det.sexo)})`).toBe(String(det.sexo ?? '').toLowerCase());
    for (const nombre of ['Cerrar', 'Cancelar', 'Guardar cambios']) {
      await expect(dialogo.getByRole('button', { name: nombre, exact: true }), `4.1.2: botón "${nombre}" con nombre accesible`).toBeVisible();
    }

    // Trampa de foco: Tab desde el último control no debe salir del diálogo
    await dialogo.getByRole('button', { name: 'Guardar cambios', exact: true }).focus();
    await page.keyboard.press('Tab');
    const focoTrasUltimo = await descripcionFoco(page);
    testInfo.annotations.push({ type: 'Foco tras Tab en el último control', description: focoTrasUltimo });
    expect.soft(focoTrasUltimo.startsWith('dialog:'), '2.4.3: el foco sale del diálogo modal (sin trampa de foco)').toBe(true);

    // Escape cierra el diálogo
    await dialogo.getByRole('textbox', { name: 'Raza', exact: true }).focus();
    await page.keyboard.press('Escape');
    const cerradoConEscape = !(await dialogo.isVisible());
    expect.soft(cerradoConEscape, '2.1.2: Escape no cierra el diálogo modal').toBe(true);

    // Cancelar cierra y el foco vuelve al disparador
    if (!cerradoConEscape) await dialogo.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(dialogo).toBeHidden();
    const focoAlCerrar = await descripcionFoco(page);
    testInfo.annotations.push({ type: 'Foco al cerrar el modal', description: focoAlCerrar });
    expect.soft(await editar.evaluate((e) => e === document.activeElement), '2.4.3: al cerrar, el foco no vuelve a "Editar"').toBe(true);
  });

  test('5. Guardar edición (PATCH simulado 200) - confirmación anunciada (4.1.3) y 0 violaciones axe A/AA', async ({}, testInfo) => {
    const activo = await abrirActivo(page);
    const cuerpos: unknown[] = [];
    await page.route(URL_PATCH, (r) => {
      if (r.request().method() !== 'PATCH') return r.fallback();
      cuerpos.push(r.request().postDataJSON());
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(activo) });
    });
    testInfo.annotations.push({ type: 'Datos simulados', description: 'PATCH /activos-biologicos/627 respondido con 200 y el mismo activo del GET; no llega al backend.' });
    try {
      const { dialogo } = await abrirEditar(page);
      await dialogo.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
      await expect.poll(() => cuerpos.length, { message: 'Guardar debe enviar el PATCH (simulado)' }).toBe(1);
      await expect(dialogo, 'Tras guardar con éxito el modal se cierra').toBeHidden();

      // 4.1.3: el resultado debe anunciarse sin mover el foco (role status/alert o aria-live)
      const anuncio = page.locator('[role="status"], [role="alert"], [aria-live]:not([aria-live="off"])').filter({ hasText: /guard|actualiz|éxito|exito/i });
      const hayAnuncio = await anuncio.first().isVisible({ timeout: 5_000 }).catch(() => false);
      testInfo.annotations.push({ type: 'Confirmación tras guardar', description: hayAnuncio ? (await anuncio.first().innerText()) : 'ninguna visible ni anunciada' });
      expect.soft(hayAnuncio, '4.1.3: guardar no muestra ni anuncia ninguna confirmación').toBe(true);

      await escanear(page, 'tras-guardar', testInfo);
    } finally {
      await page.unroute(URL_PATCH);
    }
  });

  test('6. Error al guardar (412 simulado) - anunciado dentro del diálogo (3.3.1 / 4.1.3) y 0 violaciones axe A/AA', async ({}, testInfo) => {
    await abrirActivo(page);
    await page.route(URL_PATCH, (r) =>
      r.request().method() === 'PATCH'
        ? r.fulfill({ status: 412, contentType: 'application/json', body: JSON.stringify(ERROR_412) })
        : r.fallback(),
    );
    testInfo.annotations.push({ type: 'Datos simulados', description: '412 CONFLICTO_CONCURRENCIA inyectado sobre el PATCH; no llega al backend.' });
    try {
      const { dialogo } = await abrirEditar(page);
      await dialogo.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
      const alerta = dialogo.getByRole('alert').filter({ hasText: 'No se pudo guardar' });
      await expect(alerta, 'El error al guardar debe anunciarse con role="alert" dentro del diálogo').toBeVisible();
      testInfo.annotations.push({ type: 'Mensaje 412', description: (await alerta.innerText()).replace(/\s+/g, ' ') });
      await escanear(page, 'error-412', testInfo, { lighthouse: false });
      await dialogo.getByRole('button', { name: 'Cancelar', exact: true }).click();
    } finally {
      await page.unroute(URL_PATCH);
    }
  });
});
