/**
 * TC-DIS-105 — Accesibilidad WCAG 2.1 AA del Registro de Eventos de Crecimiento
 * RF-40 · Registrar evento de crecimiento · Rol: Administrador
 * Activos biológicos → ficha del activo → pestaña "Eventos" → "Crecimiento" (modal)
 *
 * Criterio (hoja M02): 0 violaciones axe A/AA y verificación de 1.3.1 (campos de medición con label
 * y unidad expuesta al lector de pantalla), 4.1.2 (tipo_medicion y unidad como selects con
 * name/role/value; el campo numérico de valor anuncia su unidad), 3.3.1 (404, 409 activo no ACTIVO,
 * 400 fecha/valor inválido anunciados por campo), 1.4.3. Ninguna verificación manual es BLOQUEANTE.
 *
 * Herramientas: @axe-core/playwright (resultados/axe-TC-DIS-105.html/json), en todos los estados y los
 * 3 viewports, + Lighthouse en modo snapshot solo en escritorio y en 3 estados (modal con tipo y
 * unidad elegidos, validación al enviar vacío y error 409). Lighthouse: alcance limitado.
 *
 * Datos (TEST, 30/09/2026): INDIVIDUAL #627, ACTIVO, fase activa, especie #4 con métricas de
 * crecimiento. La pantalla es la misma que exploró TC-DIS-102 (modal de crecimiento).
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
import { expect, test, type BrowserContext, type Locator, type Page, type Route, type TestInfo } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { auditarLighthouse, PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';

const TC_ID = 'TC-DIS-105';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

const ID_INDIVIDUAL = 627;
const DIALOGO = 'Registrar evento de crecimiento';

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const HAR_ASSETS = path.join(__dirname, '../../../../../.har-cache/assets.har');
const PASOS_LIGHTHOUSE = ['modal-completo', 'validacion-vacio', 'error-409'];

/** POST de evento de crecimiento (API). */
const URL_CRECIMIENTO = (url: URL) => url.pathname.endsWith(`/back-sigab-test/activos-biologicos/${ID_INDIVIDUAL}/eventos/crecimiento`);

// Respuestas SIMULADAS con el formato estándar del backend ({ error_code, message, fields })
const ERRORES = [
  { paso: 'error-404', status: 404, campo: null, body: { error_code: 'ACTIVO_NO_ENCONTRADO', message: `El activo biológico con ID ${ID_INDIVIDUAL} no existe.`, fields: [] } },
  { paso: 'error-409', status: 409, campo: null, body: { error_code: 'ESTADO_NO_PERMITE_EVENTOS', message: 'El activo no está en estado ACTIVO; no se pueden registrar eventos de crecimiento.', fields: [] } },
  { paso: 'error-400-fecha', status: 400, campo: { rol: 'textbox', nombre: 'Fecha' }, body: { error_code: 'FECHA_INVALIDA', message: 'La fecha del evento no puede ser futura.', fields: [{ field: 'fecha', message: 'La fecha del evento no puede ser futura.' }] } },
  { paso: 'error-400-valor', status: 400, campo: { rol: 'spinbutton', nombre: 'Valor' }, body: { error_code: 'VALOR_INVALIDO', message: 'El valor de la medición está fuera del rango permitido para la especie.', fields: [{ field: 'valor_medicion', message: 'El valor de la medición está fuera del rango permitido para la especie.' }] } },
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

/** goto al activo → pestaña "Eventos" → modal "Crecimiento" (abierto con teclado). */
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
  const boton = main(page).getByRole('button', { name: 'Crecimiento', exact: true });
  await expect(boton).toBeEnabled();
  await boton.focus();
  await page.keyboard.press('Enter');
  const dialogo = page.getByRole('dialog', { name: DIALOGO });
  await expect(dialogo).toBeVisible();
  const c = campos(dialogo);
  await expect(c.tipo.locator('option').nth(1), 'La especie del activo debe tener métricas de crecimiento configuradas').toBeAttached({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  return { dialogo, c };
}

function campos(dialogo: Locator) {
  return {
    tipo: dialogo.getByRole('combobox', { name: 'Tipo de medición', exact: true }),
    valor: dialogo.getByRole('spinbutton', { name: /^Valor/ }),
    unidad: dialogo.getByRole('combobox', { name: 'Unidad de medida', exact: true }),
    fecha: dialogo.getByRole('textbox', { name: 'Fecha', exact: true }),
    registrar: dialogo.getByRole('button', { name: 'Registrar', exact: true }),
    cancelar: dialogo.getByRole('button', { name: 'Cancelar', exact: true }),
  };
}

async function llenarValido(c: ReturnType<typeof campos>) {
  await c.tipo.selectOption({ index: 1 });
  await c.valor.fill('1.5');
  await expect(c.unidad.locator('option').nth(1)).toBeAttached();
  await c.unidad.selectOption({ index: 1 });
  await c.fecha.fill('2026-09-29');
}

/** aria-invalid y texto de la descripción accesible (aria-describedby) de un control. */
async function estadoCampo(control: Locator) {
  const invalido = (await control.getAttribute('aria-invalid', { timeout: 10_000 })) === 'true';
  const descripcion = await control.evaluate((e) =>
    (e.getAttribute('aria-describedby') ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .map((id) => document.getElementById(id)?.textContent ?? '')
      .join(' ')
      .trim(),
  );
  return { invalido, descripcion };
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

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Evento de crecimiento (RF-40)`, () => {
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

  test('1. Modal de crecimiento - selects con name/role/value (4.1.2) y unidad expuesta en el valor (1.3.1 / 4.1.2); 0 violaciones axe A/AA', async ({}, testInfo) => {
    const { dialogo, c } = await abrirModal(page);
    await escanear(page, 'modal-inicial', testInfo);

    // 4.1.2: tipo de medición como select con nombre y opciones
    const opcionesTipo = await c.tipo.locator('option').allInnerTexts();
    const opcionesUnidadAntes = await c.unidad.locator('option').allInnerTexts();
    await c.tipo.selectOption({ index: 1 });
    const tipoElegido = await c.tipo.evaluate((s: HTMLSelectElement) => s.selectedOptions[0]?.textContent?.trim() ?? '');
    await expect(c.unidad.locator('option').nth(1), 'Al elegir el tipo se habilitan sus unidades').toBeAttached();
    const opcionesUnidad = await c.unidad.locator('option').allInnerTexts();
    await c.unidad.selectOption({ index: 1 });
    const unidadElegida = await c.unidad.inputValue();
    await expect(c.tipo, '4.1.2: el value del tipo refleja la opción elegida').not.toHaveValue('');
    await expect(c.unidad, '4.1.2: el value de la unidad refleja la opción elegida').toHaveValue(unidadElegida);
    testInfo.annotations.push({
      type: 'Selects',
      description: `Tipo de medición: ${opcionesTipo.join(' | ')} · elegido "${tipoElegido}" · Unidad antes: ${opcionesUnidadAntes.join(' | ')} · después: ${opcionesUnidad.join(' | ')} · elegida "${unidadElegida}"`,
    });

    // 1.3.1 / 4.1.2: el campo numérico "Valor" expone su unidad (nombre o descripción accesible)
    await c.valor.fill('1.5');
    const nombreValor = await c.valor.evaluate((e) => (e as HTMLInputElement).labels?.[0]?.textContent?.replace('*', '').trim() ?? e.getAttribute('aria-label') ?? '');
    const { descripcion } = await estadoCampo(c.valor);
    testInfo.annotations.push({ type: 'Campo Valor', description: `nombre accesible: "${nombreValor}" · descripción: "${descripcion}" · unidad elegida: "${unidadElegida}"` });
    expect.soft(`${nombreValor} ${descripcion}`, `1.3.1/4.1.2: el campo numérico "Valor" no expone su unidad ("${unidadElegida}") al lector de pantalla; solo está en el select de al lado`).toContain(unidadElegida);

    await c.fecha.fill('2026-09-29');
    await escanear(page, 'modal-completo', testInfo);
    await c.cancelar.click();
    await expect(dialogo).toBeHidden();
  });

  test('2. Enviar vacío y valor 0 - errores por campo anunciados y asociados (3.3.1)', async ({}, testInfo) => {
    const { dialogo, c } = await abrirModal(page);
    let envios = 0;
    await page.route(URL_CRECIMIENTO, (r: Route) => (r.request().method() === 'POST' ? (envios++, r.abort()) : r.fallback()));
    try {
      await c.registrar.click();
      await page.waitForTimeout(800);
      expect(envios, 'Con el formulario vacío no se debe enviar nada').toBe(0);

      const resumen: string[] = [];
      const noAsociados: string[] = [];
      for (const [nombre, control] of [['Tipo de medición', c.tipo], ['Valor', c.valor], ['Unidad de medida', c.unidad]] as const) {
        const { invalido, descripcion } = await estadoCampo(control);
        resumen.push(`${nombre}: aria-invalid=${invalido}, descripción="${descripcion}"`);
        expect(invalido, `3.3.1: "${nombre}" vacío debe quedar aria-invalid`).toBe(true);
        if (!descripcion) noAsociados.push(nombre);
      }
      const alertas = await dialogo.getByRole('alert').allInnerTexts();
      testInfo.annotations.push({ type: 'Envío vacío', description: `${resumen.join(' · ')} · alertas: ${alertas.join(' | ')}` });
      expect(alertas.length, '3.3.1: los errores se anuncian con role="alert"').toBeGreaterThan(0);
      expect.soft(noAsociados, '3.3.1: el mensaje de error de estos selects no está asociado al control (sin aria-describedby); solo hay un <p role="alert"> suelto').toEqual([]);
      await escanear(page, 'validacion-vacio', testInfo);

      // Valor 0
      await c.valor.fill('0');
      await c.valor.blur();
      const cero = await estadoCampo(c.valor);
      testInfo.annotations.push({ type: 'Valor 0', description: `aria-invalid=${cero.invalido} · descripción="${cero.descripcion}"` });
      expect(cero.invalido, '3.3.1: valor 0 debe marcar el campo como inválido').toBe(true);
      expect(cero.descripcion, '3.3.1/3.3.3: el error del valor debe indicar la corrección').toMatch(/mayor a 0/i);
      await c.cancelar.click();
    } finally {
      await page.unroute(URL_CRECIMIENTO);
    }
  });

  test('3. Errores del servidor (404 / 409 / 400 fecha / 400 valor simulados) - anunciados y asociados al campo (3.3.1)', async ({}, testInfo) => {
    const { dialogo, c } = await abrirModal(page);
    await llenarValido(c);
    let actual: (typeof ERRORES)[number] = ERRORES[0];
    let envios = 0;
    await page.route(URL_CRECIMIENTO, (r: Route) => {
      if (r.request().method() !== 'POST') return r.fallback();
      envios++;
      return r.fulfill({ status: actual.status, contentType: 'application/json', body: JSON.stringify(actual.body) });
    });
    testInfo.annotations.push({ type: 'Datos simulados', description: 'POST /eventos/crecimiento respondido con 404, 409, 400 (fecha) y 400 (valor); nada llega al backend.' });
    try {
      const resumen: string[] = [];
      for (const err of ERRORES) {
        actual = err;
        await c.registrar.click();
        await expect.poll(() => envios, { message: `El envío (${err.paso}) debe llegar al POST simulado` }).toBe(ERRORES.indexOf(err) + 1);
        const alerta = dialogo.getByRole('alert').filter({ hasText: 'No se pudo registrar' });
        await expect(alerta, `3.3.1: el ${err.status} (${err.paso}) debe anunciarse con role="alert" dentro del diálogo`).toBeVisible();
        const texto = (await alerta.innerText()).replace(/\s+/g, ' ').trim();
        expect.soft(texto, `3.3.1: el ${err.status} debe explicar el problema`).toContain(err.body.message);
        let enCampo = 'n/a';
        if (err.campo) {
          const control = dialogo.getByRole(err.campo.rol, { name: err.campo.rol === 'spinbutton' ? /^Valor/ : err.campo.nombre, exact: err.campo.rol !== 'spinbutton' });
          const { invalido, descripcion } = await estadoCampo(control);
          enCampo = `aria-invalid=${invalido}, descripción="${descripcion}"`;
          expect.soft(invalido && descripcion !== '', `3.3.1: el 400 de "${err.campo.nombre}" se muestra solo en la alerta global, no en el campo`).toBe(true);
        }
        resumen.push(`${err.paso}: "${texto}" · ${enCampo}`);
        if (err.paso === 'error-409') await escanear(page, 'error-409', testInfo);
      }
      testInfo.annotations.push({ type: 'Errores', description: resumen.join(' || ') });
      await c.cancelar.click();
    } finally {
      await page.unroute(URL_CRECIMIENTO);
    }
  });

  test('4. Registro exitoso (201 simulado) - confirmación anunciada (4.1.3) y 0 violaciones axe A/AA', async ({}, testInfo) => {
    const { dialogo, c } = await abrirModal(page);
    await llenarValido(c);
    let cuerpo: Record<string, unknown> | null = null;
    await page.route(URL_CRECIMIENTO, (r: Route) => {
      if (r.request().method() !== 'POST') return r.fallback();
      cuerpo = r.request().postDataJSON();
      return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id_eventos: 999001, id_activo_biologico: ID_INDIVIDUAL, fecha: '2026-09-29T00:00:00Z', fase_avanzada: false }) });
    });
    testInfo.annotations.push({ type: 'Datos simulados', description: 'POST /eventos/crecimiento respondido con 201; no se registra nada.' });
    try {
      await c.registrar.click();
      await expect.poll(() => cuerpo, { message: 'El envío debe llegar al POST simulado' }).not.toBeNull();
      testInfo.annotations.push({ type: 'Cuerpo enviado', description: JSON.stringify(cuerpo) });
      await expect(dialogo).toBeHidden();
      const aviso = main(page).getByRole('alert').filter({ hasText: 'Evento registrado' });
      await expect(aviso, '4.1.3: el registro exitoso debe anunciarse').toBeVisible();
      testInfo.annotations.push({ type: 'Aviso', description: (await aviso.innerText()).replace(/\s+/g, ' ') });
      await escanear(page, 'tras-registro', testInfo);
    } finally {
      await page.unroute(URL_CRECIMIENTO);
    }
  });
});
