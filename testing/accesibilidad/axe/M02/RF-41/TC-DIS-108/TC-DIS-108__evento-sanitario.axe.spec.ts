/**
 * TC-DIS-108 — Accesibilidad WCAG 2.1 AA del Registro de Eventos Sanitarios (formulario dinámico)
 * RF-41 · Registrar evento sanitario · Rol: Administrador
 * Activos biológicos → ficha del activo → pestaña "Eventos" → "Sanitario" (modal)
 *
 * Criterio (hoja M02): 0 violaciones axe A/AA y verificación del formulario dinámico con énfasis
 * BLOQUEANTE en 4.1.3 y 4.1.2: al cambiar el tipo de evento sanitario los campos propios de cada tipo
 * se muestran/ocultan con anuncio por aria-live y gestión de foco. Además 1.3.1 (labels de los campos
 * de cada tipo), 3.3.1 (404, 409 activo no ACTIVO, 400 fecha inválida por campo), 4.1.3 (alerta de
 * período de retiro en TRATAMIENTO/CONTROL anunciada por aria-live, no solo por color) y 1.4.3.
 *
 * Aquí sí hay formulario dinámico dentro del diálogo: el select "Tipo" muestra u oculta campos sin
 * mover el foco, así que el anuncio del cambio depende de una región viva (4.1.3).
 *
 * Herramientas: @axe-core/playwright (resultados/axe-TC-DIS-108.html/json), en todos los estados y
 * los 3 viewports, + Lighthouse en modo snapshot solo en escritorio y en 3 estados (modal en
 * Diagnóstico, modal en Tratamiento y error 409). Lighthouse: alcance limitado.
 *
 * Datos (TEST, 30/09/2026): INDIVIDUAL #627, ACTIVO, fase activa, especie #4.
 *
 * Escrituras: TODAS SIMULADAS. El POST /activos-biologicos/627/eventos/sanitario se responde con
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
import { expect, test, type BrowserContext, type Locator, type Page, type Route, type TestInfo } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { auditarLighthouse, PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';

const TC_ID = 'TC-DIS-108';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

const ID_INDIVIDUAL = 627;
const DIALOGO = 'Registrar evento sanitario';

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const HAR_ASSETS = path.join(__dirname, '../../../../../.har-cache/assets.har');
const PASOS_LIGHTHOUSE = ['modal-diagnostico', 'modal-tratamiento', 'error-409'];

// Tipos que pide el criterio (vacunación / tratamiento / diagnóstico / control / enfermedad)
const TIPOS_CRITERIO = [/vacunaci/i, /tratamiento/i, /diagn/i, /control/i, /enfermedad/i];

/** POST de evento sanitario (API). */
const URL_SANITARIO = (url: URL) => url.pathname.endsWith(`/back-sigab-test/activos-biologicos/${ID_INDIVIDUAL}/eventos/sanitario`);

// Respuestas SIMULADAS con el formato estándar del backend ({ error_code, message, fields })
const ERRORES = [
  { paso: 'error-404', status: 404, campoFecha: false, body: { error_code: 'ACTIVO_NO_ENCONTRADO', message: `El activo biológico con ID ${ID_INDIVIDUAL} no existe.`, fields: [] } },
  { paso: 'error-409', status: 409, campoFecha: false, body: { error_code: 'ESTADO_NO_PERMITE_EVENTOS', message: 'El activo no está en estado ACTIVO; no se pueden registrar eventos sanitarios.', fields: [] } },
  { paso: 'error-400-fecha', status: 400, campoFecha: true, body: { error_code: 'FECHA_INVALIDA', message: 'La fecha del evento sanitario no puede ser futura.', fields: [{ field: 'fecha', message: 'La fecha del evento sanitario no puede ser futura.' }] } },
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

/** goto al activo → pestaña "Eventos" → modal "Sanitario" (abierto con teclado). */
async function abrirModal(page: Page) {
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
  const boton = main(page).getByRole('button', { name: 'Sanitario', exact: true });
  await expect(boton).toBeEnabled();
  await boton.focus();
  await page.keyboard.press('Enter');
  const dialogo = page.getByRole('dialog', { name: DIALOGO });
  await expect(dialogo).toBeVisible();
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  return { dialogo, tipo: dialogo.getByRole('combobox', { name: 'Tipo', exact: true }) };
}

/** Campos visibles del diálogo, foco y regiones vivas con texto (evidencia del criterio bloqueante). */
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
    return { campos, foco, vivas };
  });
}

async function llenarVacunacion(dialogo: Locator) {
  await dialogo.getByRole('combobox', { name: 'Tipo', exact: true }).selectOption('VACUNACION');
  await dialogo.getByRole('textbox', { name: 'Medicamento', exact: true }).fill('QA vacuna (simulado)');
  await dialogo.getByRole('spinbutton', { name: 'Dosis', exact: true }).fill('2');
  await dialogo.getByRole('textbox', { name: 'Fecha', exact: true }).fill('2026-09-29');
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

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Evento sanitario (RF-41)`, () => {
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

  test('1. Modal sanitario (Diagnóstico) - 0 violaciones axe A/AA y foco al abrir (2.4.3)', async ({}, testInfo) => {
    const { dialogo, tipo } = await abrirModal(page);
    const ev = await evidencia(page);
    testInfo.annotations.push({ type: 'Al abrir', description: `foco ${ev.foco} · campos: ${ev.campos.join(' | ')}` });
    expect.soft(ev.foco.startsWith('dentro'), '2.4.3: al abrir el modal el foco se queda fuera del diálogo (defecto transversal de ModalShell)').toBe(true);
    await expect(tipo).toHaveValue('DIAGNOSTICO');
    await escanear(page, 'modal-diagnostico', testInfo);
    await dialogo.getByRole('button', { name: 'Cancelar', exact: true }).click();
  });

  test('2. BLOQUEANTE - cambiar el tipo sanitario con teclado: campos revelados anunciados (4.1.3), foco gestionado (4.1.2) y labels (1.3.1)', async ({}, testInfo) => {
    const { dialogo, tipo } = await abrirModal(page);
    await tipo.focus();
    const inicial = await evidencia(page);
    testInfo.annotations.push({ type: 'Tipo DIAGNOSTICO (inicial)', description: `campos: ${inicial.campos.join(' | ')} · foco ${inicial.foco} · regiones vivas: ${inicial.vivas.join(' ; ') || 'ninguna'}` });

    const sinAnuncio: string[] = [];
    const focoPerdido: string[] = [];
    const sinLabel: string[] = [];
    let anteriores = inicial.campos;
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(500);
      const valor = await tipo.inputValue();
      const ev = await evidencia(page);
      const aparecen = ev.campos.filter((c) => !anteriores.includes(c));
      const desaparecen = anteriores.filter((c) => !ev.campos.includes(c));
      testInfo.annotations.push({
        type: `Tipo ${valor}`,
        description: `aparecen: ${aparecen.join(', ') || '—'} · desaparecen: ${desaparecen.join(', ') || '—'} · foco ${ev.foco} · regiones vivas: ${ev.vivas.join(' ; ') || 'ninguna'}`,
      });
      expect(aparecen.length + desaparecen.length, `Cambiar a ${valor} debe mostrar u ocultar campos`).toBeGreaterThan(0);
      if (ev.vivas.length === 0) sinAnuncio.push(`${valor} (+${aparecen.join(', ') || '—'} / −${desaparecen.join(', ') || '—'})`);
      if (!(await tipo.evaluate((e) => e === document.activeElement))) focoPerdido.push(`${valor} → ${ev.foco}`);
      sinLabel.push(...ev.campos.filter((c) => !c).map(() => valor));
      await escanear(page, `cambio-${valor.toLowerCase().replace('_', '-')}`, testInfo);
      anteriores = ev.campos;
    }

    expect.soft(sinAnuncio, 'Criterio BLOQUEANTE del caso (asociado a 4.1.3): al cambiar el tipo sanitario los campos que aparecen/desaparecen no se anuncian (no hay ninguna región aria-live/status)').toEqual([]);
    expect(focoPerdido, 'BLOQUEANTE 4.1.2/2.4.3: el foco debe quedarse en el selector de tipo al cambiarlo').toEqual([]);
    expect(sinLabel, '1.3.1: todos los campos revelados deben tener label asociado').toEqual([]);
    await dialogo.getByRole('button', { name: 'Cancelar', exact: true }).click();
  });

  test('3. Tipos y alerta de período de retiro (4.1.3) frente al criterio', async ({}, testInfo) => {
    const { dialogo, tipo } = await abrirModal(page);
    const opciones = await tipo.locator('option').allInnerTexts();
    const faltan = TIPOS_CRITERIO.filter((re) => !opciones.some((o) => re.test(o))).map((re) => re.source.replace(/\\/g, ''));
    testInfo.annotations.push({ type: 'Tipos sanitarios', description: `ofrecidos: ${opciones.join(' | ')} · faltan frente al criterio: ${faltan.join(', ') || 'ninguno'}` });
    expect.soft(faltan, 'Desviación de la especificación: faltan tipos sanitarios que pide el criterio').toEqual([]);

    // Período de retiro: debería aparecer (y anunciarse) al registrar TRATAMIENTO o CONTROL
    const avisos: string[] = [];
    for (const valor of ['TRATAMIENTO', 'CONTROL_PREVENTIVO']) {
      await tipo.selectOption(valor);
      if (valor === 'TRATAMIENTO') {
        await dialogo.getByRole('textbox', { name: 'Medicamento', exact: true }).fill('QA antibiótico (simulado)');
        await dialogo.getByRole('spinbutton', { name: 'Dosis', exact: true }).fill('2');
        await dialogo.getByRole('spinbutton', { name: 'Duración (días)', exact: true }).fill('5');
      }
      await page.waitForTimeout(500);
      const retiro = await dialogo.getByText(/retiro/i).count();
      const ev = await evidencia(page);
      avisos.push(`${valor}: texto "retiro" visible=${retiro > 0} · regiones vivas: ${ev.vivas.join(' ; ') || 'ninguna'}`);
      if (valor === 'TRATAMIENTO') await escanear(page, 'modal-tratamiento', testInfo);
    }
    testInfo.annotations.push({ type: 'Período de retiro', description: avisos.join(' || ') });
    expect.soft(avisos.some((a) => a.includes('visible=true')), 'Desviación de la especificación (4.1.3 no verificable): no existe ninguna alerta de período de retiro en TRATAMIENTO/CONTROL').toBe(true);
    await dialogo.getByRole('button', { name: 'Cancelar', exact: true }).click();
  });

  test('4. Errores (404 / 409 / 400 fecha simulados) - anunciados y asociados al campo (3.3.1)', async ({}, testInfo) => {
    const { dialogo } = await abrirModal(page);
    await llenarVacunacion(dialogo);
    let actual: (typeof ERRORES)[number] = ERRORES[0];
    let envios = 0;
    await page.route(URL_SANITARIO, (r: Route) => {
      if (r.request().method() !== 'POST') return r.fallback();
      envios++;
      return r.fulfill({ status: actual.status, contentType: 'application/json', body: JSON.stringify(actual.body) });
    });
    testInfo.annotations.push({ type: 'Datos simulados', description: 'POST /eventos/sanitario respondido con 404, 409 y 400 (fecha); nada llega al backend.' });
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
        if (err.campoFecha) {
          const fecha = dialogo.getByRole('textbox', { name: 'Fecha', exact: true });
          const invalido = (await fecha.getAttribute('aria-invalid', { timeout: 10_000 })) === 'true';
          enCampo = `aria-invalid=${invalido}`;
          expect.soft(invalido, '3.3.1: el 400 de "Fecha" se muestra solo en la alerta global, no en el campo').toBe(true);
        }
        resumen.push(`${err.paso}: "${texto}" · ${enCampo}`);
        if (err.paso === 'error-409') await escanear(page, 'error-409', testInfo);
      }
      testInfo.annotations.push({ type: 'Errores', description: resumen.join(' || ') });
      await dialogo.getByRole('button', { name: 'Cancelar', exact: true }).click();
    } finally {
      await page.unroute(URL_SANITARIO);
    }
  });

  test('5. Registro exitoso (201 simulado) - confirmación anunciada (4.1.3) y 0 violaciones axe A/AA', async ({}, testInfo) => {
    const { dialogo } = await abrirModal(page);
    await llenarVacunacion(dialogo);
    let envios = 0;
    await page.route(URL_SANITARIO, (r: Route) => {
      if (r.request().method() !== 'POST') return r.fallback();
      envios++;
      return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id_eventos: 999001, id_activo_biologico: ID_INDIVIDUAL, fecha: '2026-09-29T00:00:00Z', cambio_estado: false }) });
    });
    testInfo.annotations.push({ type: 'Datos simulados', description: 'POST /eventos/sanitario respondido con 201; no se registra nada.' });
    try {
      await dialogo.getByRole('button', { name: 'Registrar', exact: true }).click();
      await expect.poll(() => envios, { message: 'El envío debe llegar al POST simulado' }).toBe(1);
      await expect(dialogo).toBeHidden();
      const aviso = main(page).getByRole('alert').filter({ hasText: /registrad/i });
      await expect(aviso, '4.1.3: el registro exitoso debe anunciarse').toBeVisible();
      testInfo.annotations.push({ type: 'Aviso', description: (await aviso.innerText()).replace(/\s+/g, ' ') });
      await escanear(page, 'tras-registro', testInfo);
    } finally {
      await page.unroute(URL_SANITARIO);
    }
  });
});
