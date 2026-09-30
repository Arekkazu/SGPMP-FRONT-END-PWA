/**
 * TC-DIS-102 — Accesibilidad WCAG 2.1 AA del Registro de Eventos Biológicos (formulario dinámico)
 * RF-39 · Registrar evento biológico · Rol: Administrador
 * Activos biológicos → ficha del activo → pestaña "Eventos" → Crecimiento / Sanitario /
 * Reproductivo / Productivo (un modal por tipo de evento)
 *
 * Criterio (hoja M02): 0 violaciones axe A/AA y verificación del formulario dinámico con énfasis
 * BLOQUEANTE en 4.1.3 y 4.1.2: al cambiar tipo_evento los campos que aparecen/desaparecen se anuncian
 * y el foco se gestiona sin perder contexto. Con un modal por tipo, el anuncio depende del foco:
 * un diálogo con role=dialog y nombre se anuncia cuando el foco entra en él. Además 1.3.1 (labels y orden de los campos
 * revelados), 3.3.1 (404 activo inexistente, 409 estado no permite eventos, 400 fecha inválida
 * anunciados por campo) y 1.4.3.
 *
 * Implementación real: no hay un selector de tipo_evento. Cada tipo es un botón que abre su propio
 * modal (ModalShell). "Cambiar de tipo" = cerrar un modal y abrir el de otro tipo; eso es lo que se
 * verifica (anuncio + foco al abrir cada tipo y al volver).
 *
 * Herramientas: @axe-core/playwright (resultados/axe-TC-DIS-102.html/json), en todos los estados y los
 * 3 viewports, + Lighthouse en modo snapshot solo en escritorio y en 3 estados (pestaña Eventos, modal de
 * crecimiento y error 409). Lighthouse: alcance limitado.
 *
 * Datos (TEST, 30/09/2026): INDIVIDUAL #627, ACTIVO, especie #4 con métricas de crecimiento.
 *
 * Escrituras: TODAS SIMULADAS. El POST /activos-biologicos/627/eventos/crecimiento se responde con
 * route.fulfill (201, 404, 409, 400) y nunca llega al backend; cualquier otro POST/PUT/PATCH/DELETE
 * se aborta (salvo /sesiones/).
 *
 * Navegación: page.goto directo a /activos-biologicos/627, verificando después de cada goto que la
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

const TC_ID = 'TC-DIS-102';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

const ID_INDIVIDUAL = 627;

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const HAR_ASSETS = path.join(__dirname, '../../../../../.har-cache/assets.har');
const PASOS_LIGHTHOUSE = ['pestana-eventos', 'modal-crecimiento', 'error-409'];

const TIPOS = [
  { boton: 'Crecimiento', dialogo: 'Registrar evento de crecimiento' },
  { boton: 'Sanitario', dialogo: 'Registrar evento sanitario' },
  { boton: 'Reproductivo', dialogo: 'Registrar evento reproductivo' },
  { boton: 'Productivo', dialogo: 'Registrar evento productivo' },
] as const;

/** POST de evento de crecimiento (API). */
const URL_CRECIMIENTO = (url: URL) => url.pathname.endsWith(`/back-sigab-test/activos-biologicos/${ID_INDIVIDUAL}/eventos/crecimiento`);

// Respuestas SIMULADAS con el formato estándar del backend ({ error_code, message, fields })
const ERRORES = [
  { paso: 'error-404', status: 404, campo: null, body: { error_code: 'ACTIVO_NO_ENCONTRADO', message: `El activo biológico con ID ${ID_INDIVIDUAL} no existe.`, fields: [] } },
  { paso: 'error-409', status: 409, campo: null, body: { error_code: 'ESTADO_NO_PERMITE_EVENTOS', message: 'El activo en estado INACTIVO no permite registrar eventos.', fields: [] } },
  { paso: 'error-400-fecha', status: 400, campo: 'Fecha', body: { error_code: 'FECHA_INVALIDA', message: 'La fecha del evento no puede ser futura ni anterior al registro del activo.', fields: [{ field: 'fecha', message: 'La fecha del evento no puede ser futura ni anterior al registro del activo.' }] } },
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

/** goto al activo → pestaña "Eventos". */
async function abrirEventos(page: Page) {
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
  const activo = r && r.ok() ? ((await r.json()) as Record<string, unknown>) : null;
  if (!activo || activo.nombre_estado !== 'ACTIVO') {
    throw new Error(`BLOQUEO DE AMBIENTE: el dato de prueba cambió (#${ID_INDIVIDUAL} ${activo ? `en ${String(activo.nombre_estado)}` : 'sin respuesta'}). Verificar a mano antes de seguir.`);
  }
  await expect(main(page).getByRole('heading', { name: 'Datos del activo', exact: true })).toBeVisible({ timeout: 60_000 });
  await secciones(page).getByRole('button', { name: 'Eventos', exact: true }).click();
  await expect(main(page).getByRole('heading', { name: 'Registrar evento', exact: true })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

/** Abre el modal de un tipo con teclado (foco en el botón + Enter). */
async function abrirTipo(page: Page, tipo: (typeof TIPOS)[number]) {
  const boton = main(page).getByRole('button', { name: tipo.boton, exact: true });
  await expect(boton, `El Administrador debe ver el botón "${tipo.boton}"`).toBeEnabled();
  await boton.focus();
  await page.keyboard.press('Enter');
  const dialogo = page.getByRole('dialog', { name: tipo.dialogo });
  await expect(dialogo).toBeVisible();
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  return { boton, dialogo };
}

/** Dónde está el foco y qué regiones vivas existen en la página (evidencia del criterio bloqueante). */
function evidencia(page: Page) {
  return page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null;
    const foco = a
      ? `${a.closest('[role="dialog"]') ? 'dentro del diálogo' : 'fuera del diálogo'}: ${a.tagName} "${(a.getAttribute('aria-label') ?? a.textContent ?? '').trim().slice(0, 30)}"`
      : 'ninguno';
    const vivas = [...document.querySelectorAll('[aria-live]:not([aria-live="off"]), [role="status"], [role="alert"], [role="log"]')].map(
      (e) => `${e.tagName.toLowerCase()}[${e.getAttribute('role') ?? ''}${e.getAttribute('aria-live') ? ` aria-live=${e.getAttribute('aria-live')}` : ''}] "${(e.textContent ?? '').trim().slice(0, 40)}"`,
    );
    return { focoDentro: !!a?.closest('[role="dialog"]'), foco, vivas };
  });
}

async function llenarCrecimiento(page: Page) {
  const dialogo = page.getByRole('dialog', { name: 'Registrar evento de crecimiento' });
  const tipo = dialogo.getByRole('combobox', { name: 'Tipo de medición', exact: true });
  await expect(tipo.locator('option').nth(1), 'La especie del activo debe tener métricas de crecimiento configuradas').toBeAttached({ timeout: 30_000 });
  await tipo.selectOption({ index: 1 });
  await dialogo.getByRole('spinbutton', { name: 'Valor', exact: true }).fill('1.5');
  const unidad = dialogo.getByRole('combobox', { name: 'Unidad de medida', exact: true });
  await expect(unidad.locator('option').nth(1)).toBeAttached();
  await unidad.selectOption({ index: 1 });
  await dialogo.getByRole('textbox', { name: 'Fecha', exact: true }).fill('2026-09-29');
  return dialogo;
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

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Registro de evento biológico (RF-39)`, () => {
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

  test('1. Pestaña Eventos - 0 violaciones axe A/AA', async ({}, testInfo) => {
    await abrirEventos(page);
    await escanear(page, 'pestana-eventos', testInfo);
    for (const t of TIPOS) await expect(main(page).getByRole('button', { name: t.boton, exact: true })).toBeVisible();
  });

  test('2. BLOQUEANTE - cambiar de tipo de evento: gestión del foco al abrir y cerrar cada formulario (2.4.3 / 4.1.2); labels de los campos revelados (1.3.1)', async ({}, testInfo) => {
    await abrirEventos(page);
    const sinAnuncio: string[] = [];
    const focoFuera: string[] = [];
    const focoPerdido: string[] = [];
    const sinNombre: string[] = [];

    for (const tipo of TIPOS) {
      const { boton, dialogo } = await abrirTipo(page, tipo);
      const alAbrir = await evidencia(page);
      testInfo.annotations.push({
        type: `${tipo.boton} · al abrir`,
        description: `diálogo "${tipo.dialogo}" · foco ${alAbrir.foco} · regiones vivas: ${alAbrir.vivas.join(' ; ') || 'ninguna'}`,
      });
      // Un diálogo se anuncia por foco + role=dialog con nombre (no por región viva): sin foco dentro, el lector no lo anuncia
      if (!alAbrir.focoDentro && !alAbrir.vivas.some((v) => !v.endsWith('""'))) sinAnuncio.push(tipo.boton);
      if (!alAbrir.focoDentro) focoFuera.push(tipo.boton);

      // 1.3.1: cada control revelado por el tipo tiene nombre accesible
      const controles = await dialogo.locator('input, select, textarea').evaluateAll((els) =>
        els
          .filter((e) => (e as HTMLElement).offsetParent !== null)
          .map((e) => {
            const el = e as HTMLInputElement;
            const nombre = (el.labels?.[0]?.textContent ?? el.getAttribute('aria-label') ?? '').replace('*', '').trim();
            return { tag: el.tagName, nombre };
          }),
      );
      testInfo.annotations.push({ type: `${tipo.boton} · campos`, description: controles.map((c) => c.nombre || `(${c.tag} sin nombre)`).join(' | ') });
      sinNombre.push(...controles.filter((c) => !c.nombre).map((c) => `${tipo.boton}: ${c.tag}`));

      await escanear(page, `modal-${tipo.boton.toLowerCase()}`, testInfo);

      // Volver: Cancelar y ver dónde queda el foco (debe volver al botón del tipo, no perderse)
      await dialogo.getByRole('button', { name: 'Cancelar', exact: true }).click();
      await expect(dialogo).toBeHidden();
      const alCerrar = await evidencia(page);
      const volvio = await boton.evaluate((e) => e === document.activeElement);
      testInfo.annotations.push({ type: `${tipo.boton} · al cerrar`, description: `foco ${alCerrar.foco}` });
      if (!volvio) focoPerdido.push(`${tipo.boton} → ${alCerrar.foco}`);
    }

    expect.soft(sinAnuncio, 'BLOQUEANTE 2.4.3/4.1.2: al cambiar de tipo de evento el lector de pantalla no anuncia el formulario ni sus campos porque el foco no entra al diálogo').toEqual([]);
    expect.soft(focoFuera, 'BLOQUEANTE 4.1.2/2.4.3: al abrir el formulario del tipo el foco se queda fuera del diálogo').toEqual([]);
    expect.soft(focoPerdido, 'BLOQUEANTE 2.4.3: al cerrar el formulario el foco no vuelve al botón del tipo y se pierde el contexto').toEqual([]);
    expect(sinNombre, '1.3.1: todos los campos revelados deben tener label asociado').toEqual([]);
  });

  test('3. Campos dependientes dentro del formulario - "Unidad de medida" cambia según "Tipo de medición" (4.1.3)', async ({}, testInfo) => {
    await abrirEventos(page);
    const { dialogo } = await abrirTipo(page, TIPOS[0]);
    const unidad = dialogo.getByRole('combobox', { name: 'Unidad de medida', exact: true });
    const antes = await unidad.locator('option').count();
    const tipo = dialogo.getByRole('combobox', { name: 'Tipo de medición', exact: true });
    await expect(tipo.locator('option').nth(1)).toBeAttached({ timeout: 30_000 });
    await tipo.focus();
    await tipo.selectOption({ index: 1 });
    const despues = await unidad.locator('option').count();
    const ev = await evidencia(page);
    testInfo.annotations.push({ type: 'Unidad tras elegir tipo', description: `opciones antes: ${antes} · después: ${despues} · foco ${ev.foco} · regiones vivas: ${ev.vivas.join(' ; ') || 'ninguna'}` });
    expect(despues, 'Al elegir el tipo de medición se habilitan sus unidades').toBeGreaterThan(antes);
    expect.soft(ev.vivas.some((v) => /unidad/i.test(v)), '4.1.3: el cambio de opciones de "Unidad de medida" no se anuncia').toBe(true);
    await dialogo.getByRole('button', { name: 'Cancelar', exact: true }).click();
  });

  test('4. Errores (404 / 409 / 400 fecha simulados) - anunciados y asociados al campo (3.3.1)', async ({}, testInfo) => {
    await abrirEventos(page);
    await abrirTipo(page, TIPOS[0]);
    const dialogo = await llenarCrecimiento(page);
    let actual: (typeof ERRORES)[number] = ERRORES[0];
    let envios = 0;
    await page.route(URL_CRECIMIENTO, (r: Route) => {
      if (r.request().method() !== 'POST') return r.fallback();
      envios++;
      return r.fulfill({ status: actual.status, contentType: 'application/json', body: JSON.stringify(actual.body) });
    });
    testInfo.annotations.push({ type: 'Datos simulados', description: 'POST /eventos/crecimiento respondido con 404, 409 y 400 (fecha); nada llega al backend.' });
    try {
      const resumen: string[] = [];
      for (const err of ERRORES) {
        actual = err;
        await dialogo.getByRole('button', { name: 'Registrar', exact: true }).click();
        await expect.poll(() => envios, { message: `El envío (${err.paso}) debe llegar al POST simulado` }).toBe(ERRORES.indexOf(err) + 1);
        const alerta = dialogo.getByRole('alert').filter({ hasText: 'No se pudo registrar' });
        await expect(alerta, `3.3.1: el ${err.status} (${err.paso}) debe anunciarse con role="alert" dentro del diálogo`).toBeVisible();
        const texto = (await alerta.innerText()).replace(/\s+/g, ' ').trim();
        let enCampo = 'n/a';
        if (err.campo) {
          const campo = dialogo.getByRole('textbox', { name: err.campo, exact: true });
          const invalido = (await campo.getAttribute('aria-invalid', { timeout: 10_000 })) === 'true';
          enCampo = `aria-invalid=${invalido}`;
          expect.soft(invalido, `3.3.1: el 400 de "${err.campo}" se muestra solo en la alerta global, no en el campo`).toBe(true);
        }
        resumen.push(`${err.paso}: "${texto}" · ${enCampo}`);
        expect.soft(texto, `3.3.1: el ${err.status} debe explicar el problema`).toContain(err.body.message);
        if (err.paso === 'error-409') await escanear(page, 'error-409', testInfo);
      }
      testInfo.annotations.push({ type: 'Errores', description: resumen.join(' || ') });
      await dialogo.getByRole('button', { name: 'Cancelar', exact: true }).click();
    } finally {
      await page.unroute(URL_CRECIMIENTO);
    }
  });

  test('5. Registro exitoso (201 simulado) - confirmación anunciada (4.1.3) y 0 violaciones axe A/AA', async ({}, testInfo) => {
    await abrirEventos(page);
    await abrirTipo(page, TIPOS[0]);
    const dialogo = await llenarCrecimiento(page);
    let envios = 0;
    await page.route(URL_CRECIMIENTO, (r: Route) => {
      if (r.request().method() !== 'POST') return r.fallback();
      envios++;
      return r.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id_eventos: 999001, id_activo_biologico: ID_INDIVIDUAL, fecha: '2026-09-29T00:00:00Z', fase_avanzada: false }),
      });
    });
    testInfo.annotations.push({ type: 'Datos simulados', description: 'POST /eventos/crecimiento respondido con 201; no se registra nada.' });
    try {
      await dialogo.getByRole('button', { name: 'Registrar', exact: true }).click();
      await expect.poll(() => envios, { message: 'El envío debe llegar al POST simulado' }).toBe(1);
      await expect(dialogo).toBeHidden();
      const aviso = main(page).getByRole('alert').filter({ hasText: 'Evento registrado' });
      await expect(aviso, '4.1.3: el registro exitoso debe anunciarse (role="alert"/status)').toBeVisible();
      const ev = await evidencia(page);
      testInfo.annotations.push({ type: 'Tras registrar', description: `aviso: "${(await aviso.innerText()).replace(/\s+/g, ' ')}" · foco ${ev.foco}` });
      await escanear(page, 'tras-registro', testInfo);
    } finally {
      await page.unroute(URL_CRECIMIENTO);
    }
  });
});
