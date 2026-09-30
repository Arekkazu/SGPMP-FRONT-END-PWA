/**
 * TC-DIS-96 — Accesibilidad WCAG 2.1 AA de la Gestión de Fases del Ciclo Productivo
 * RF-37 · Cambiar fase del ciclo productivo · Rol: Administrador
 * Activos biológicos → ficha del activo → pestaña "Fases" → "Cambiar fase" (modal)
 *
 * Criterio (hoja M02): 0 violaciones axe A/AA y verificación de 1.3.1 (labels asociados),
 * 4.1.2 (selector de fase destino con name/role/value, solo fases válidas para la especie),
 * 3.3.4 (confirmación explícita antes de persistir), 3.3.1 (errores 404 activo inexistente,
 * 409 activo inactivo, 400 fase destino inválida anunciados de forma comprensible), 1.4.3.
 * Ninguna verificación manual está marcada como BLOQUEANTE.
 *
 * Herramientas: @axe-core/playwright (resultados/axe-TC-DIS-96.html/json), en todos los estados y
 * los 3 viewports, + Lighthouse en modo snapshot solo en escritorio y en 3 estados (pestaña Fases,
 * modal "Cambiar fase" y error 409). Lighthouse: alcance limitado.
 *
 * Datos (TEST, 30/09/2026): INDIVIDUAL #627, ACTIVO, especie #4, fase activa "Ciclo completo
 * cachama 2025-A" / "Fase juvenil cachama" (id 10). La especie ofrece 3 ciclos (40, 11, 10).
 *
 * Escrituras: TODAS SIMULADAS. El POST /activos-biologicos/627/fases se responde con route.fulfill
 * (201, 404, 409, 400) y nunca llega al backend; cualquier otro POST/PUT/PATCH/DELETE se aborta
 * (salvo /sesiones/). Tras el 201 simulado, el GET de fases se responde una vez con la fase
 * anterior finalizada y la nueva activa (derivado del GET real) para ver cómo se comunica el
 * historial (paso 4 del caso).
 *
 * Navegación: page.goto directo a /activos-biologicos/627, verificando después de cada goto que la
 * sesión sigue viva ("BLOQUEO DE AMBIENTE: sesión perdida tras goto").
 *
 * Un login por viewport (página compartida en beforeAll). No se usa modo serial: un hallazgo no
 * debe saltarse los pasos siguientes; si un test falla, Playwright reinicia el worker y el
 * beforeAll vuelve a iniciar sesión.
 */
import fs from 'fs';
import path from 'path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type BrowserContext, type Page, type Route, type TestInfo } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { auditarLighthouse, PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';

const TC_ID = 'TC-DIS-96';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

const ID_INDIVIDUAL = 627;

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const HAR_ASSETS = path.join(__dirname, '../../../../../.har-cache/assets.har');
const PASOS_LIGHTHOUSE = ['pestana-fases', 'modal-fase', 'error-409'];

/** Endpoint de fases del activo (API): GET historial y POST cambio. */
const URL_FASES = (url: URL) => url.pathname.endsWith(`/back-sigab-test/activos-biologicos/${ID_INDIVIDUAL}/fases`);

// Respuestas SIMULADAS con el formato estándar del backend ({ error_code, message, fields })
const ERRORES = [
  { paso: 'error-404', status: 404, body: { error_code: 'ACTIVO_NO_ENCONTRADO', message: `El activo biológico con ID ${ID_INDIVIDUAL} no fue encontrado en el sistema.`, fields: [] } },
  { paso: 'error-409', status: 409, body: { error_code: 'ACTIVO_INACTIVO', message: 'No se puede cambiar la fase de un activo que no está en estado ACTIVO.', fields: [] } },
  { paso: 'error-400', status: 400, body: { error_code: 'FASE_DESTINO_INVALIDA', message: 'La fase destino no es válida para la especie y el propósito del activo.', fields: [{ field: 'id_ciclo_productiva', message: 'La fase destino no es válida para la especie y el propósito del activo.' }] } },
] as const;

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

/** goto al activo → pestaña "Fases". Devuelve el cuerpo real del GET de fases. */
async function abrirFases(page: Page): Promise<{ fases: Record<string, unknown>[] }> {
  await page.goto(`/activos-biologicos/${ID_INDIVIDUAL}`, { waitUntil: 'commit', timeout: 120_000 });
  const login = page.getByRole('textbox', { name: 'Correo electrónico', exact: true });
  await expect(secciones(page).or(login)).toBeVisible({ timeout: 120_000 });
  if (new URL(page.url()).pathname.includes('/login') || (await login.isVisible())) {
    throw new Error(`BLOQUEO DE AMBIENTE: sesión perdida tras goto (/activos-biologicos/${ID_INDIVIDUAL} → ${page.url()})`);
  }
  await expect(main(page).getByRole('heading', { name: 'Datos del activo', exact: true })).toBeVisible({ timeout: 60_000 });

  const respuesta = page.waitForResponse((r) => URL_FASES(new URL(r.url())) && r.request().method() === 'GET', { timeout: 60_000 });
  await secciones(page).getByRole('button', { name: 'Fases', exact: true }).click();
  const r = await respuesta;
  const cuerpo = (await r.json()) as { fases: Record<string, unknown>[] };
  const activa = cuerpo.fases?.find((f) => f.es_activa);
  if (!activa) throw new Error(`BLOQUEO DE AMBIENTE: el dato de prueba cambió (#${ID_INDIVIDUAL} sin fase activa). Verificar a mano antes de seguir.`);
  await expect(main(page).getByRole('heading', { name: 'Secuencia de fases', exact: true })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  return cuerpo;
}

async function abrirModal(page: Page) {
  const disparador = main(page).getByRole('button', { name: 'Cambiar fase', exact: true });
  await expect(disparador, 'El Administrador debe ver "Cambiar fase" (permiso E sobre activos)').toBeVisible();
  await disparador.focus();
  await page.keyboard.press('Enter');
  const dialogo = page.getByRole('dialog', { name: 'Cambiar / avanzar fase' });
  await expect(dialogo).toBeVisible();
  const selector = dialogo.getByRole('combobox');
  // Espera a que carguen los ciclos de la especie (la primera opción es el marcador)
  await expect(selector.locator('option').nth(1)).toBeAttached({ timeout: 60_000 });
  return { disparador, dialogo, selector };
}

function descripcionFoco(page: Page) {
  return page.evaluate(() => {
    const e = document.activeElement as HTMLElement | null;
    if (!e) return 'ninguno';
    const enDialogo = e.closest('[role="dialog"]') ? 'dialog' : 'fuera';
    return `${enDialogo}:${e.tagName}:${(e.getAttribute('aria-label') ?? e.textContent ?? '').trim().slice(0, 30)}`;
  });
}

// ── Escaneo axe + Lighthouse ─────────────────────────────────────────────────

function resumenViolaciones(violaciones: { id: string; impact?: string | null; help: string; nodes: unknown[] }[]) {
  return violaciones.map((v) => `${v.id} (${v.impact}): ${v.help} [${v.nodes.length} nodo(s)]`).join('\n');
}

async function escanear(page: Page, paso: string, testInfo: TestInfo) {
  const pasoVp = `${paso}-${testInfo.project.name}`;
  await page.evaluate(() => document.fonts.ready);

  const axe = await new AxeBuilder({ page }).withTags(ETIQUETAS_WCAG).analyze();
  guardarResultadoAxe(TC_ID, __dirname, pasoVp, axe);

  // Lighthouse: máximo 3 estados por caso y solo en escritorio (el peso del reporte HTML)
  if (PASOS_LIGHTHOUSE.includes(paso) && testInfo.project.name === 'escritorio') {
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

// ── Casos ────────────────────────────────────────────────────────────────────

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Cambio de fase del ciclo productivo (RF-37)`, () => {
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

  test('1. Pestaña Fases - 0 violaciones axe A/AA y estado de cada fase comunicado con texto (1.3.1 / 1.4.1)', async ({}, testInfo) => {
    await abrirFases(page);
    await escanear(page, 'pestana-fases', testInfo);

    const items = await main(page).getByRole('list').last().getByRole('listitem').allInnerTexts();
    testInfo.annotations.push({ type: 'Fases listadas', description: items.map((t) => t.replace(/\s+/g, ' ')).join(' || ') });
    const activa = items.find((t) => /activa/i.test(t));
    expect(activa, 'La fase activa se identifica con el texto "ACTIVA", no solo con el icono').toBeTruthy();
  });

  test('2. Modal "Cambiar fase" - 0 violaciones axe A/AA, selector con name/role/value (4.1.2 / 3.3.2) y foco del diálogo', async ({}, testInfo) => {
    const { fases } = await abrirFases(page);
    const actual = fases.find((f) => f.es_activa)!;
    const { disparador, dialogo, selector } = await abrirModal(page);

    const focoInicial = await descripcionFoco(page);
    testInfo.annotations.push({ type: 'Foco al abrir el modal', description: focoInicial });
    expect.soft(focoInicial.startsWith('dialog:'), '2.4.3: al abrir el modal el foco se queda fuera del diálogo (defecto transversal de ModalShell)').toBe(true);

    await escanear(page, 'modal-fase', testInfo);

    // 4.1.2: nombre accesible y opciones del selector
    const nombre = await selector.evaluate((s) => s.getAttribute('aria-label') ?? '');
    const opciones = await selector.locator('option').evaluateAll((os) => os.map((o) => ({ valor: (o as HTMLOptionElement).value, texto: (o.textContent ?? '').trim() })));
    testInfo.annotations.push({ type: 'Selector de fase', description: `nombre: "${nombre}" · opciones: ${opciones.map((o) => `${o.valor || '∅'}=${o.texto}`).join(' | ')}` });
    await expect(selector, '4.1.2: el selector debe tener nombre accesible').toHaveAccessibleName(/.+/);

    // 3.3.2 / 1.3.1: label visible asociado (no solo aria-label)
    const labelVisible = await selector.evaluate((s) => {
      const id = s.id;
      const lbl = (id && document.querySelector(`label[for="${id}"]`)) || s.closest('label');
      return !!lbl && (lbl as HTMLElement).offsetParent !== null;
    });
    expect.soft(labelVisible, '3.3.2: el selector de fase no tiene label visible; su nombre ("ID del ciclo productivo") solo existe en aria-label').toBe(true);

    // 4.1.2 / RF-16: solo fases válidas; la fase actual no debería ofrecerse como destino
    const idActual = String(actual.id_ciclos_productivo_biologico ?? '');
    const ofreceActual = opciones.some((o) => o.valor === idActual);
    testInfo.annotations.push({ type: 'Fase actual', description: `"${String(actual.nombre_fase_actual)}" (id ${idActual}) · ofrecida como destino: ${ofreceActual ? 'sí' : 'no'}` });
    expect.soft(ofreceActual, `4.1.2/RF-16: el selector ofrece la fase actual ("${String(actual.nombre_fase_actual)}") como fase destino`).toBe(false);

    // Trampa de foco y Escape (defecto transversal de ModalShell)
    await dialogo.getByRole('button', { name: 'Cambiar fase', exact: true }).focus();
    await page.keyboard.press('Tab');
    expect.soft((await descripcionFoco(page)).startsWith('dialog:'), '2.4.3: el foco sale del diálogo modal (sin trampa de foco)').toBe(true);
    await selector.focus();
    await page.keyboard.press('Escape');
    const cerradoConEscape = !(await dialogo.isVisible());
    expect.soft(cerradoConEscape, '2.1.2: Escape no cierra el diálogo modal').toBe(true);
    if (!cerradoConEscape) await dialogo.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(dialogo).toBeHidden();
    expect.soft(await disparador.evaluate((e) => e === document.activeElement), '2.4.3: al cerrar, el foco no vuelve a "Cambiar fase"').toBe(true);
  });

  test('3. Enviar sin fase destino - error anunciado y asociado al selector (3.3.1)', async ({}, testInfo) => {
    await abrirFases(page);
    const { dialogo, selector } = await abrirModal(page);
    const posts: unknown[] = [];
    await page.route(URL_FASES, (r: Route) => (r.request().method() === 'POST' ? (posts.push(1), r.abort()) : r.fallback()));
    try {
      await dialogo.getByRole('button', { name: 'Cambiar fase', exact: true }).click();
      await page.waitForTimeout(1_000);
      expect(posts.length, 'Sin fase destino no se debe enviar nada').toBe(0);

      const invalido = (await selector.getAttribute('aria-invalid')) === 'true';
      const mensaje = await dialogo.getByRole('alert').allInnerTexts();
      const focoEnSelector = await selector.evaluate((e) => e === document.activeElement);
      testInfo.annotations.push({ type: 'Envío sin fase', description: `aria-invalid=${invalido} · alertas: ${mensaje.join(' | ') || 'ninguna'} · foco en selector: ${focoEnSelector}` });
      expect.soft(mensaje.join(' '), '3.3.1: al enviar sin fase destino no se muestra ni anuncia ningún mensaje de error ("El ciclo productivo es obligatorio" no se renderiza)').toMatch(/obligatori/i);
      expect.soft(invalido, '3.3.1: el selector sin valor no queda marcado como inválido').toBe(true);
      await escanear(page, 'envio-vacio', testInfo);
      await dialogo.getByRole('button', { name: 'Cancelar', exact: true }).click();
    } finally {
      await page.unroute(URL_FASES);
    }
  });

  test('4. Confirmar cambio (201 simulado) - confirmación explícita previa (3.3.4), resultado anunciado (4.1.3) e historial', async ({}, testInfo) => {
    const { fases } = await abrirFases(page);
    const anterior = fases.find((f) => f.es_activa)!;
    const { dialogo, selector } = await abrirModal(page);
    const destino = await selector.locator('option').evaluateAll((os, idActual) => {
      const o = os.find((x) => (x as HTMLOptionElement).value && (x as HTMLOptionElement).value !== idActual) as HTMLOptionElement | undefined;
      return o ? { valor: o.value, texto: (o.textContent ?? '').trim() } : null;
    }, String(anterior.id_ciclos_productivo_biologico ?? ''));
    expect(destino, 'Debe haber al menos una fase destino distinta de la actual').not.toBeNull();

    const hoy = new Date().toISOString();
    const nueva = { ...anterior, id_gestion_fases: 999001, id_ciclo_productiva: Number(destino!.valor), nombre_ciclo: destino!.texto, nombre_fase_actual: destino!.texto, paso_actual: 1, fecha_inicio: hoy, fecha_finalizacion: null, es_activa: true, motivo_cambio: 'QA TC-DIS-96 (simulado)' };
    const cerrada = { ...anterior, fecha_finalizacion: hoy, es_activa: false };
    const posts: unknown[] = [];
    let historialSimulado = false;
    await page.route(URL_FASES, (r: Route) => {
      if (r.request().method() === 'POST') {
        posts.push(r.request().postDataJSON());
        historialSimulado = true;
        return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(nueva) });
      }
      if (r.request().method() === 'GET' && historialSimulado) {
        return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id_activo_biologico: ID_INDIVIDUAL, fases: [nueva, cerrada] }) });
      }
      return r.fallback();
    });
    testInfo.annotations.push({ type: 'Datos simulados', description: `POST /fases respondido con 201 (destino "${destino!.texto}") y GET /fases posterior con la fase anterior finalizada; nada llega al backend.` });
    try {
      await selector.selectOption(destino!.valor);
      await expect(selector, '4.1.2: el value del selector refleja la fase elegida').toHaveValue(destino!.valor);
      await dialogo.getByRole('textbox', { name: 'Motivo del cambio', exact: true }).fill('QA TC-DIS-96 (simulado)');
      await dialogo.getByRole('button', { name: 'Cambiar fase', exact: true }).click();

      // 3.3.4: debe haber un paso de confirmación explícito ANTES de enviar
      await page.waitForTimeout(1_500);
      const confirmacion = page.getByRole('dialog').or(page.getByRole('alertdialog')).filter({ hasText: /confirm|¿|seguro/i });
      const huboConfirmacion = posts.length === 0 && (await confirmacion.count()) > 0;
      testInfo.annotations.push({ type: 'Confirmación previa (3.3.4)', description: huboConfirmacion ? 'sí' : `no: el POST se envió al primer clic (${posts.length} envío/s)` });
      expect.soft(huboConfirmacion, '3.3.4: "Cambiar fase" persiste al primer clic, sin paso de confirmación explícita').toBe(true);
      if (posts.length === 0 && huboConfirmacion) await confirmacion.getByRole('button', { name: /confirmar|sí|aceptar/i }).click();
      await expect.poll(() => posts.length, { message: 'El cambio debe llegar al POST simulado' }).toBe(1);
      await expect(dialogo).toBeHidden();

      // 4.1.3: resultado anunciado
      const anuncio = page.locator('[role="status"], [role="alert"], [aria-live]:not([aria-live="off"])').filter({ hasText: /fase|cambi|éxito|exito/i });
      const hayAnuncio = await anuncio.first().isVisible({ timeout: 5_000 }).catch(() => false);
      testInfo.annotations.push({ type: 'Confirmación tras cambiar', description: hayAnuncio ? await anuncio.first().innerText() : 'ninguna visible ni anunciada' });
      expect.soft(hayAnuncio, '4.1.3: el cambio de fase no muestra ni anuncia confirmación').toBe(true);

      // Paso 4: la fase anterior queda marcada como finalizada, con texto (no solo icono/color)
      const items = main(page).getByRole('listitem');
      await expect(items, 'El historial debe mostrar la fase nueva y la anterior').toHaveCount(2, { timeout: 30_000 });
      const textoAnterior = (await items.filter({ hasText: String(anterior.nombre_ciclo) }).first().innerText()).replace(/\s+/g, ' ');
      testInfo.annotations.push({ type: 'Fase anterior en el historial', description: textoAnterior });
      // Se descartan los nombres de ciclo/fase y el motivo: "Ciclo completo…" no cuenta como estado
      const estadoAnterior = [anterior.nombre_ciclo, anterior.nombre_fase_actual, anterior.motivo_cambio]
        .filter(Boolean)
        .reduce<string>((t, quitar) => t.split(String(quitar)).join(' '), textoAnterior);
      expect.soft(estadoAnterior, '1.3.1/1.4.1: la fase anterior finalizada solo se distingue por un icono decorativo y la fecha; no dice "finalizada"').toMatch(/finalizad|cerrad|terminad/i);
      await escanear(page, 'tras-cambio', testInfo);
    } finally {
      await page.unroute(URL_FASES);
    }
  });

  test('5. Errores (404 / 409 / 400 simulados) - anunciados dentro del diálogo de forma comprensible (3.3.1)', async ({}, testInfo) => {
    await abrirFases(page);
    const { dialogo, selector } = await abrirModal(page);
    let actual: (typeof ERRORES)[number] = ERRORES[0];
    let envios = 0;
    await page.route(URL_FASES, (r: Route) => {
      if (r.request().method() !== 'POST') return r.fallback();
      envios++;
      return r.fulfill({ status: actual.status, contentType: 'application/json', body: JSON.stringify(actual.body) });
    });
    testInfo.annotations.push({ type: 'Datos simulados', description: 'POST /fases respondido con 404, 409 (activo inactivo) y 400 (fase destino inválida); nada llega al backend.' });
    try {
      const primeraValida = await selector.locator('option').nth(1).getAttribute('value');
      await selector.selectOption(primeraValida!);
      const resumen: string[] = [];
      for (const err of ERRORES) {
        actual = err;
        await dialogo.getByRole('button', { name: 'Cambiar fase', exact: true }).click();
        await expect.poll(() => envios, { message: `El envío (${err.paso}) debe llegar al POST simulado` }).toBe(ERRORES.indexOf(err) + 1);
        const alerta = dialogo.getByRole('alert').filter({ hasText: 'No se pudo cambiar la fase' });
        await expect(alerta, `3.3.1: el ${err.status} (${err.paso}) debe anunciarse con role="alert" dentro del diálogo`).toBeVisible();
        const texto = (await alerta.innerText()).replace(/\s+/g, ' ').trim();
        resumen.push(`${err.paso}: "${texto}"`);
        expect.soft(texto, `3.3.1: el ${err.status} debe explicar el problema (mensaje del backend), no un texto genérico`).toContain(err.body.message);
        if (err.paso === 'error-400') {
          const invalido = (await selector.getAttribute('aria-invalid')) === 'true';
          expect.soft(invalido, '3.3.1: el 400 de fase destino inválida no marca el selector como inválido (solo alerta global)').toBe(true);
        }
        if (err.paso === 'error-409') await escanear(page, 'error-409', testInfo);
      }
      testInfo.annotations.push({ type: 'Errores', description: resumen.join(' || ') });
      await dialogo.getByRole('button', { name: 'Cancelar', exact: true }).click();
    } finally {
      await page.unroute(URL_FASES);
    }
  });
});
