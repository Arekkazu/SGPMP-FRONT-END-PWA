/**
 * TC-DIS-111 — Accesibilidad WCAG 2.1 AA del Registro de Eventos Reproductivos
 * RF-42 · Registrar evento reproductivo · Rol: Administrador
 * Activos biológicos → ficha del activo → pestaña "Eventos" → "Reproductivo" (modal)
 *
 * Criterio (hoja M02): 0 violaciones axe A/AA y verificación del formulario dinámico con énfasis
 * BLOQUEANTE en 4.1.3 y 4.1.2: los campos cambian según tipo_activo (LOTE solo NACIMIENTO; INDIVIDUAL
 * todos) y según tipo_evento; el cambio se anuncia y el foco se gestiona. Además 1.3.1 (agrupación y
 * labels de las relaciones madre/padre/cría), 2.1.1 (relaciones operables por teclado), 3.3.1 (404,
 * 409 activo no ACTIVO, validación de fase productiva y fechas incoherentes por campo) y 1.4.3.
 *
 * Herramientas: @axe-core/playwright (resultados/axe-TC-DIS-111.html/json), en todos los estados y
 * los 3 viewports, + Lighthouse en modo snapshot solo en escritorio y en 3 estados (modal INDIVIDUAL,
 * modal LOTE y error 409). Lighthouse: alcance limitado.
 *
 * Datos (TEST, 30/09/2026): INDIVIDUAL #627 (ACTIVO; su ficha ya tiene eventos reproductivos reales
 * del 26/09, así que su fase los admite) y LOTE #353 (ACTIVO). Si alguno cambia, el spec corta con
 * "BLOQUEO DE AMBIENTE". La compatibilidad de fase la valida el backend; aquí se simula su 422.
 * Re-test 07/10/2026 (cuenta Administrador de otra finca, tema oscuro guardado): INDIVIDUAL #745
 * "QAG53R2-63077805" (Cachama Blanca, ACTIVO, fase "Ciclo completo cachama 2025-A"), equivalente al #627, y
 * LOTE #749 sin fase activa (en TEST no hay LOTE activo con fase en esta finca); no afecta lo verificado porque
 * la apertura del modal y las categorías dependen solo del tipo y el estado, y la fase la valida el backend
 * (simulada con 422).
 *
 * Escrituras: TODAS SIMULADAS. El POST /activos-biologicos/<id>/eventos/reproductivo se responde con
 * route.fulfill (201, 404, 409, 422, 400) y nunca llega al backend; cualquier otro POST/PUT/PATCH/DELETE
 * se aborta (salvo /sesiones/).
 *
 * Navegación: page.goto directo a /activos-biologicos/<id>, verificando después de cada goto que la
 * sesión sigue viva ("BLOQUEO DE AMBIENTE: sesión perdida tras goto").
 *
 * Un login por viewport (página compartida en beforeAll). No se usa modo serial: un hallazgo no debe
 * saltarse los pasos siguientes; si un test falla, Playwright reinicia el worker y el beforeAll vuelve
 * a iniciar sesión.
 */
import fs from 'fs';
import path from 'path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type BrowserContext, type Page, type Route, type TestInfo } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { auditarLighthouse, PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';

const TC_ID = 'TC-DIS-111';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

const ID_INDIVIDUAL = 745;
const ID_LOTE = 749;
const DIALOGO = 'Registrar evento reproductivo';

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const HAR_ASSETS = path.join(__dirname, '../../../../../.har-cache/assets.har');
const PASOS_LIGHTHOUSE = ['modal-individual', 'modal-lote', 'error-409'];

/** POST de evento reproductivo (API). */
const URL_REPRODUCTIVO = (id: number) => (url: URL) => url.pathname.endsWith(`/back-sigab-test/activos-biologicos/${id}/eventos/reproductivo`);

// Respuestas SIMULADAS con el formato estándar del backend ({ error_code, message, fields })
const ERRORES = [
  { paso: 'error-404', status: 404, campo: null, body: { error_code: 'ACTIVO_NO_ENCONTRADO', message: `El activo biológico con ID ${ID_INDIVIDUAL} no existe.`, fields: [] } },
  { paso: 'error-409', status: 409, campo: null, body: { error_code: 'ESTADO_NO_PERMITE_EVENTOS', message: 'El activo no está en estado ACTIVO; no se pueden registrar eventos reproductivos.', fields: [] } },
  { paso: 'error-422-fase', status: 422, campo: null, body: { error_code: 'FASE_NO_COMPATIBLE', message: 'La fase productiva actual del activo no es compatible con eventos reproductivos.', fields: [] } },
  { paso: 'error-400-fecha', status: 400, campo: 'Fecha', body: { error_code: 'FECHAS_INCOHERENTES', message: 'La fecha del evento es anterior al nacimiento del activo.', fields: [{ field: 'fecha', message: 'La fecha del evento es anterior al nacimiento del activo.' }] } },
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

/** goto al activo → pestaña "Eventos" → modal "Reproductivo" (abierto con teclado). */
async function abrirModal(page: Page, id: number, tipoEsperado: 'INDIVIDUAL' | 'POBLACIONAL') {
  const respuesta = page
    .waitForResponse((r) => new URL(r.url()).pathname.endsWith(`/back-sigab-test/activos-biologicos/${id}`) && r.request().method() === 'GET', { timeout: 120_000 })
    .catch(() => null);
  await page.goto(`/activos-biologicos/${id}`, { waitUntil: 'commit', timeout: 120_000 });
  const login = page.getByRole('textbox', { name: 'Correo electrónico', exact: true });
  await expect(secciones(page).or(login)).toBeVisible({ timeout: 120_000 });
  if (new URL(page.url()).pathname.includes('/login') || (await login.isVisible())) {
    throw new Error(`BLOQUEO DE AMBIENTE: sesión perdida tras goto (/activos-biologicos/${id} → ${page.url()})`);
  }
  const r = await respuesta;
  const activo = r && r.ok() ? ((await r.json()) as Record<string, unknown>) : null;
  if (!activo || activo.nombre_estado !== 'ACTIVO' || String(activo.tipo).toUpperCase() !== tipoEsperado) {
    throw new Error(`BLOQUEO DE AMBIENTE: el dato de prueba cambió (#${id} ${activo ? `${String(activo.tipo)} ${String(activo.nombre_estado)}` : 'sin respuesta'}). Verificar a mano antes de seguir.`);
  }
  await expect(main(page).getByRole('heading', { name: 'Datos del activo', exact: true })).toBeVisible({ timeout: 60_000 });
  await secciones(page).getByRole('button', { name: 'Eventos', exact: true }).click();
  const boton = main(page).getByRole('button', { name: 'Reproductivo', exact: true });
  await expect(boton, 'El botón "Reproductivo" debe estar habilitado para un activo ACTIVO').toBeEnabled();
  await boton.focus();
  await page.keyboard.press('Enter');
  const dialogo = page.getByRole('dialog', { name: DIALOGO });
  await expect(dialogo).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  return { boton, dialogo, categoria: dialogo.getByRole('combobox', { name: 'Categoría', exact: true }) };
}

/** Campos visibles del diálogo, foco y regiones vivas con texto. */
function evidencia(page: Page) {
  return page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    const campos = d
      ? [...d.querySelectorAll('input, select, textarea')]
          .filter((e) => (e as HTMLElement).offsetParent !== null)
          .map((e) => ((e as HTMLInputElement).labels?.[0]?.textContent ?? e.getAttribute('aria-label') ?? '').replace('*', '').trim())
      : [];
    const a = document.activeElement as HTMLInputElement | null;
    const foco = a ? `${a.closest('[role="dialog"]') ? 'dentro' : 'fuera'}: ${a.tagName} "${(a.labels?.[0]?.textContent ?? a.getAttribute('aria-label') ?? a.textContent ?? '').replace('*', '').trim().slice(0, 30)}"` : 'ninguno';
    const vivas = [...document.querySelectorAll('[aria-live]:not([aria-live="off"]), [role="status"], [role="alert"], [role="log"]')]
      .map((e) => `${e.tagName.toLowerCase()}[${e.getAttribute('role') ?? ''}${e.getAttribute('aria-live') ? ` aria-live=${e.getAttribute('aria-live')}` : ''}] "${(e.textContent ?? '').trim().slice(0, 40)}"`)
      .filter((v) => !v.endsWith('""'));
    return { campos, foco, focoDentro: !!a?.closest('[role="dialog"]'), vivas };
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

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Evento reproductivo (RF-42)`, () => {
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

  test('1. BLOQUEANTE - INDIVIDUAL: gestión del foco al abrir y cerrar el formulario (2.4.3 / 4.1.2); 0 violaciones axe A/AA', async ({}, testInfo) => {
    const { boton, dialogo, categoria } = await abrirModal(page, ID_INDIVIDUAL, 'INDIVIDUAL');
    const alAbrir = await evidencia(page);
    const opciones = await categoria.locator('option').allInnerTexts();
    testInfo.annotations.push({ type: 'INDIVIDUAL · al abrir', description: `foco ${alAbrir.foco} · categorías: ${opciones.join(' | ')} · campos: ${alAbrir.campos.join(' | ')}` });
    expect(opciones.length, 'INDIVIDUAL debe ofrecer todas las categorías de evento reproductivo').toBeGreaterThan(1);
    await escanear(page, 'modal-individual', testInfo);

    await dialogo.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(dialogo).toBeHidden();
    const alCerrar = await evidencia(page);
    const volvio = await boton.evaluate((e) => e === document.activeElement);
    testInfo.annotations.push({ type: 'INDIVIDUAL · al cerrar', description: `foco ${alCerrar.foco}` });
    expect.soft(alAbrir.focoDentro, 'BLOQUEANTE 2.4.3/4.1.2: al abrir el formulario reproductivo el foco se queda fuera del diálogo; el lector no anuncia el formulario ni sus campos').toBe(true);
    expect.soft(volvio, `BLOQUEANTE 2.4.3: al cerrar, el foco no vuelve al botón "Reproductivo" (queda en ${alCerrar.foco})`).toBe(true);
  });

  test('2. Cambiar la categoría (tipo_evento) en INDIVIDUAL - campos y anuncio frente al criterio (4.1.3 / 4.1.2)', async ({}, testInfo) => {
    const { dialogo, categoria } = await abrirModal(page, ID_INDIVIDUAL, 'INDIVIDUAL');
    await categoria.focus();
    const inicial = await evidencia(page);
    const total = await categoria.locator('option').count();
    const conCambios: string[] = [];
    const resumen: string[] = [`${await categoria.inputValue()} (inicial): ${inicial.campos.join(' | ')}`];
    await categoria.selectOption({ index: 0 });
    for (let i = 1; i < total; i++) {
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(300);
      const ev = await evidencia(page);
      const valor = await categoria.inputValue();
      const cambian = ev.campos.join('|') !== inicial.campos.join('|');
      if (cambian) conCambios.push(valor);
      resumen.push(`${valor}: campos ${cambian ? 'CAMBIAN' : 'iguales'} · foco ${ev.foco} · vivas: ${ev.vivas.join(' ; ') || 'ninguna'}`);
      expect(await categoria.evaluate((e) => e === document.activeElement), `El foco debe quedarse en "Categoría" al cambiar a ${valor}`).toBe(true);
    }
    testInfo.annotations.push({ type: 'Cambio de categoría', description: resumen.join(' || ') });
    expect.soft(conCambios.length, 'Desviación de la especificación: los campos no cambian según la categoría (tipo_evento); el formulario muestra siempre los mismos campos, así que no hay cambio que anunciar').toBeGreaterThan(0);
    await dialogo.getByRole('button', { name: 'Cancelar', exact: true }).click();
  });

  test('3. LOTE - solo NACIMIENTO (criterio) y 0 violaciones axe A/AA', async ({}, testInfo) => {
    const { dialogo, categoria } = await abrirModal(page, ID_LOTE, 'POBLACIONAL');
    const opciones = await categoria.locator('option').allInnerTexts();
    const deshabilitado = await categoria.isDisabled();
    const ev = await evidencia(page);
    testInfo.annotations.push({ type: 'LOTE', description: `categorías: ${opciones.join(' | ')} · select deshabilitado: ${deshabilitado} · campos: ${ev.campos.join(' | ')} · foco ${ev.foco}` });
    expect(opciones.map((o) => o.trim().toLowerCase()), 'LOTE debe ofrecer solo NACIMIENTO').toEqual(['nacimiento']);
    await expect(categoria, '4.1.2: el valor expuesto debe ser "nacimiento"').toHaveValue('nacimiento');
    await escanear(page, 'modal-lote', testInfo);
    await dialogo.getByRole('button', { name: 'Cancelar', exact: true }).click();
  });

  test('4. Relaciones genealógicas madre/padre/cría - teclado (2.1.1) y agrupación con labels (1.3.1)', async ({}, testInfo) => {
    const { dialogo } = await abrirModal(page, ID_INDIVIDUAL, 'INDIVIDUAL');
    const padre = dialogo.getByRole('spinbutton', { name: 'ID padre', exact: true });
    const madre = dialogo.getByRole('spinbutton', { name: 'ID madre', exact: true });
    const crias = dialogo.getByRole('spinbutton', { name: 'Número de crías', exact: true });

    // 2.1.1: solo teclado desde "ID padre" (Tab dentro del input de fecha recorre día/mes/año en Chromium)
    await padre.focus();
    await page.keyboard.type('12');
    await page.keyboard.press('Tab');
    await page.keyboard.type('34');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Control+A');
    await page.keyboard.type('2');
    await expect(padre, '2.1.1: "ID padre" operable con teclado').toHaveValue('12');
    await expect(madre, '2.1.1: "ID madre" operable con teclado').toHaveValue('34');
    await expect(crias, '2.1.1: "Número de crías" operable con teclado').toHaveValue('2');

    // 1.3.1: las relaciones agrupadas con un rótulo común (fieldset/legend o role=group)
    const grupo = await padre.evaluate((e) => {
      const g = e.closest('fieldset, [role="group"]');
      return g ? (g.querySelector('legend')?.textContent ?? g.getAttribute('aria-label') ?? '(sin nombre)') : null;
    });
    const tipoControl = await padre.evaluate((e) => `${e.tagName}[${e.getAttribute('type')}]`);
    testInfo.annotations.push({ type: 'Relaciones genealógicas', description: `grupo: ${grupo ?? 'ninguno'} · controles: ${tipoControl} para padre y madre (ID numérico en texto libre), "Número de crías" como cantidad (no hay selección de crías)` });
    expect.soft(grupo, '1.3.1: "ID padre", "ID madre" y "Número de crías" no están agrupados como relaciones genealógicas (sin fieldset/legend ni role=group)').not.toBeNull();
    await escanear(page, 'genealogia', testInfo);
    await dialogo.getByRole('button', { name: 'Cancelar', exact: true }).click();
  });

  test('5. Errores (404 / 409 / 422 fase / 400 fechas simulados) - anunciados y asociados al campo (3.3.1)', async ({}, testInfo) => {
    const { dialogo } = await abrirModal(page, ID_INDIVIDUAL, 'INDIVIDUAL');
    await dialogo.getByRole('textbox', { name: 'Fecha', exact: true }).fill('2026-09-29');
    let actual: (typeof ERRORES)[number] = ERRORES[0];
    let envios = 0;
    const url = URL_REPRODUCTIVO(ID_INDIVIDUAL);
    await page.route(url, (r: Route) => {
      if (r.request().method() !== 'POST') return r.fallback();
      envios++;
      return r.fulfill({ status: actual.status, contentType: 'application/json', body: JSON.stringify(actual.body) });
    });
    testInfo.annotations.push({ type: 'Datos simulados', description: 'POST /eventos/reproductivo respondido con 404, 409, 422 (fase) y 400 (fechas); nada llega al backend.' });
    try {
      const resumen: string[] = [];
      for (const err of ERRORES) {
        actual = err;
        await dialogo.getByRole('button', { name: 'Registrar', exact: true }).click();
        await expect.poll(() => envios, { message: `El envío (${err.paso}) debe llegar al POST simulado` }).toBe(ERRORES.indexOf(err) + 1);
        const alerta = dialogo.getByRole('alert').filter({ hasText: 'No se pudo registrar' });
        await expect(alerta, `3.3.1: el ${err.status} (${err.paso}) debe anunciarse con role="alert" dentro del diálogo`).toBeVisible();
        const texto = (await alerta.innerText()).replace(/\s+/g, ' ').trim();
        expect.soft(texto, `3.3.1: el ${err.status} debe explicar el problema`).toContain(err.body.message);
        let enCampo = 'n/a';
        if (err.campo) {
          const invalido = (await dialogo.getByRole('textbox', { name: err.campo, exact: true }).getAttribute('aria-invalid', { timeout: 10_000 })) === 'true';
          enCampo = `aria-invalid=${invalido}`;
          expect.soft(invalido, `3.3.1: el 400 de "${err.campo}" se muestra solo en la alerta global, no en el campo`).toBe(true);
        }
        resumen.push(`${err.paso}: "${texto}" · ${enCampo}`);
        if (err.paso === 'error-409') await escanear(page, 'error-409', testInfo);
      }
      testInfo.annotations.push({ type: 'Errores', description: resumen.join(' || ') });
      await dialogo.getByRole('button', { name: 'Cancelar', exact: true }).click();
    } finally {
      await page.unroute(url);
    }
  });

  test('6. Registro exitoso (201 simulado) - confirmación anunciada (4.1.3) y 0 violaciones axe A/AA', async ({}, testInfo) => {
    const { dialogo } = await abrirModal(page, ID_INDIVIDUAL, 'INDIVIDUAL');
    await dialogo.getByRole('textbox', { name: 'Fecha', exact: true }).fill('2026-09-29');
    let envios = 0;
    const url = URL_REPRODUCTIVO(ID_INDIVIDUAL);
    await page.route(url, (r: Route) => {
      if (r.request().method() !== 'POST') return r.fallback();
      envios++;
      return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id_eventos: 999001, id_activo_biologico: ID_INDIVIDUAL, fecha: '2026-09-29T00:00:00Z' }) });
    });
    testInfo.annotations.push({ type: 'Datos simulados', description: 'POST /eventos/reproductivo respondido con 201; no se registra nada.' });
    try {
      await dialogo.getByRole('button', { name: 'Registrar', exact: true }).click();
      await expect.poll(() => envios, { message: 'El envío debe llegar al POST simulado' }).toBe(1);
      await expect(dialogo).toBeHidden();
      const aviso = main(page).getByRole('alert').filter({ hasText: /registrad/i });
      await expect(aviso, '4.1.3: el registro exitoso debe anunciarse').toBeVisible();
      testInfo.annotations.push({ type: 'Aviso', description: (await aviso.innerText()).replace(/\s+/g, ' ') });
      await escanear(page, 'tras-registro', testInfo);
    } finally {
      await page.unroute(url);
    }
  });
});
