/**
 * TC-DIS-114 — Accesibilidad WCAG 2.1 AA del Registro de Eventos Productivos
 * RF-43 · Registrar evento productivo · Rol: Administrador
 * Activos biológicos → ficha del activo → pestaña "Eventos" → "Productivo" (modal)
 *
 * Criterio (hoja M02): 0 violaciones axe A/AA y verificación de 1.3.1 (labels; tipo de producto,
 * cantidad y unidad estructurados), 4.1.2 (selector de tipo de producto y unidad con name/role/value;
 * el campo numérico de cantidad anuncia su unidad), 3.3.1 (404, 409 activo no ACTIVO / fase no
 * productiva, 400 cantidad/fecha inválida anunciados por campo), 1.4.3. Notas: solo tipos de producto
 * válidos para la fase y bloqueo por fase no activa comunicado con claridad. Nada es BLOQUEANTE.
 *
 * Herramientas: @axe-core/playwright (resultados/axe-TC-DIS-114.html/json), en todos los estados y
 * los 3 viewports, + Lighthouse en modo snapshot solo en escritorio y en 3 estados (modal con datos,
 * validación al enviar vacío y 409 por fase no productiva). Lighthouse: alcance limitado.
 *
 * Datos (TEST, 30/09/2026): INDIVIDUAL #627, ACTIVO, fase activa, especie #4.
 *
 * Escrituras: TODAS SIMULADAS. El POST /activos-biologicos/627/eventos/productivo se responde con
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

const TC_ID = 'TC-DIS-114';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

const ID_INDIVIDUAL = 627;
const DIALOGO = 'Registrar evento productivo';
const UNIDAD = 'kg';

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const HAR_ASSETS = path.join(__dirname, '../../../../../.har-cache/assets.har');
const PASOS_LIGHTHOUSE = ['modal-completo', 'validacion-vacio', 'error-409-fase'];

/** POST de evento productivo (API). */
const URL_PRODUCTIVO = (url: URL) => url.pathname.endsWith(`/back-sigab-test/activos-biologicos/${ID_INDIVIDUAL}/eventos/productivo`);

// Respuestas SIMULADAS con el formato estándar del backend ({ error_code, message, fields })
const ERRORES = [
  { paso: 'error-404', status: 404, campo: null, body: { error_code: 'ACTIVO_NO_ENCONTRADO', message: `El activo biológico con ID ${ID_INDIVIDUAL} no existe.`, fields: [] } },
  { paso: 'error-409-estado', status: 409, campo: null, body: { error_code: 'ESTADO_NO_PERMITE_EVENTOS', message: 'El activo no está en estado ACTIVO; no se pueden registrar eventos productivos.', fields: [] } },
  { paso: 'error-409-fase', status: 409, campo: null, body: { error_code: 'FASE_NO_PRODUCTIVA', message: 'La fase actual del activo no es productiva para este tipo de producto; no se permite el registro.', fields: [] } },
  { paso: 'error-400-cantidad', status: 400, campo: { rol: 'spinbutton', nombre: /^Cantidad producida/ }, body: { error_code: 'CANTIDAD_INVALIDA', message: 'La cantidad producida debe ser mayor a 0.', fields: [{ field: 'cantidad_producida', message: 'La cantidad producida debe ser mayor a 0.' }] } },
  { paso: 'error-400-fecha', status: 400, campo: { rol: 'textbox', nombre: /^Fecha del evento/ }, body: { error_code: 'FECHA_INVALIDA', message: 'La fecha del evento no puede ser anterior al inicio de la fase productiva.', fields: [{ field: 'fecha_evento', message: 'La fecha del evento no puede ser anterior al inicio de la fase productiva.' }] } },
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

/** goto al activo → pestaña "Eventos" → modal "Productivo" (abierto con teclado). */
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
  const boton = main(page).getByRole('button', { name: 'Productivo', exact: true });
  await expect(boton).toBeEnabled();
  await boton.focus();
  await page.keyboard.press('Enter');
  const dialogo = page.getByRole('dialog', { name: DIALOGO });
  await expect(dialogo).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  return { dialogo, c: campos(dialogo) };
}

function campos(dialogo: Locator) {
  return {
    tipo: dialogo.getByRole('textbox', { name: /^Tipo de producto/ }).or(dialogo.getByRole('combobox', { name: /^Tipo de producto/ })),
    cantidad: dialogo.getByRole('spinbutton', { name: /^Cantidad producida/ }),
    unidad: dialogo.getByRole('textbox', { name: /^Unidad de medida/ }).or(dialogo.getByRole('combobox', { name: /^Unidad de medida/ })),
    fecha: dialogo.getByRole('textbox', { name: /^Fecha del evento/ }),
    registrar: dialogo.getByRole('button', { name: 'Registrar', exact: true }),
    cancelar: dialogo.getByRole('button', { name: 'Cancelar', exact: true }),
  };
}

async function llenarValido(c: ReturnType<typeof campos>) {
  await c.tipo.fill('Carne (QA simulado)');
  await c.cantidad.fill('3.5');
  await c.unidad.fill(UNIDAD);
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

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Evento productivo (RF-43)`, () => {
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

  test('1. Modal productivo - tipo de producto y unidad como selectores (4.1.2) y unidad expuesta en la cantidad (1.3.1 / 4.1.2); 0 violaciones axe A/AA', async ({}, testInfo) => {
    const { dialogo, c } = await abrirModal(page);
    await escanear(page, 'modal-inicial', testInfo);

    const rolTipo = await c.tipo.evaluate((e) => (e.tagName === 'SELECT' ? 'combobox (select)' : `textbox (${e.tagName.toLowerCase()} texto libre)`));
    const rolUnidad = await c.unidad.evaluate((e) => (e.tagName === 'SELECT' ? 'combobox (select)' : `textbox (${e.tagName.toLowerCase()} texto libre)`));
    testInfo.annotations.push({ type: 'Controles', description: `Tipo de producto: ${rolTipo} · Unidad de medida: ${rolUnidad}` });
    expect.soft(rolTipo, 'Desviación de la especificación (4.1.2): "Tipo de producto" es texto libre; no hay selector con solo los tipos habilitados para la fase productiva').toMatch(/combobox/);
    expect.soft(rolUnidad, 'Desviación de la especificación (4.1.2): "Unidad de medida" es texto libre, no un selector').toMatch(/combobox/);

    await llenarValido(c);
    const nombreCantidad = await c.cantidad.evaluate((e) => (e as HTMLInputElement).labels?.[0]?.textContent?.replace('*', '').trim() ?? e.getAttribute('aria-label') ?? '');
    const { descripcion } = await estadoCampo(c.cantidad);
    testInfo.annotations.push({ type: 'Campo Cantidad producida', description: `nombre accesible: "${nombreCantidad}" · descripción: "${descripcion}" · unidad escrita: "${UNIDAD}"` });
    expect.soft(`${nombreCantidad} ${descripcion}`, `1.3.1/4.1.2: el campo numérico "Cantidad producida" no expone su unidad ("${UNIDAD}"); solo está en el campo de al lado`).toContain(UNIDAD);

    await escanear(page, 'modal-completo', testInfo);
    await c.cancelar.click();
    await expect(dialogo).toBeHidden();
  });

  test('2. Enviar vacío y cantidad 0 - errores por campo anunciados y asociados (3.3.1)', async ({}, testInfo) => {
    const { dialogo, c } = await abrirModal(page);
    let envios = 0;
    await page.route(URL_PRODUCTIVO, (r: Route) => (r.request().method() === 'POST' ? (envios++, r.abort()) : r.fallback()));
    try {
      await c.registrar.click();
      await page.waitForTimeout(800);
      expect(envios, 'Con campos obligatorios vacíos no se debe enviar nada').toBe(0);
      const resumen: string[] = [];
      for (const [nombre, control] of [['Tipo de producto', c.tipo], ['Cantidad producida', c.cantidad], ['Unidad de medida', c.unidad]] as const) {
        const { invalido, descripcion } = await estadoCampo(control);
        resumen.push(`${nombre}: aria-invalid=${invalido}, descripción="${descripcion}"`);
        expect(invalido, `3.3.1: "${nombre}" vacío debe quedar aria-invalid`).toBe(true);
        expect(descripcion, `3.3.1: el error de "${nombre}" debe estar asociado al campo`).not.toBe('');
      }
      testInfo.annotations.push({ type: 'Envío vacío', description: resumen.join(' · ') });
      await escanear(page, 'validacion-vacio', testInfo);

      await c.cantidad.fill('0');
      await c.cantidad.blur();
      const cero = await estadoCampo(c.cantidad);
      testInfo.annotations.push({ type: 'Cantidad 0', description: `aria-invalid=${cero.invalido} · descripción="${cero.descripcion}"` });
      expect(cero.invalido, '3.3.1: cantidad 0 debe marcar el campo como inválido').toBe(true);
      expect(cero.descripcion, '3.3.1/3.3.3: el error debe indicar la corrección').toMatch(/mayor a 0/i);
      await c.cancelar.click();
    } finally {
      await page.unroute(URL_PRODUCTIVO);
    }
  });

  test('3. Errores del servidor (404 / 409 estado / 409 fase / 400 cantidad / 400 fecha simulados) - anunciados, claros y asociados al campo (3.3.1)', async ({}, testInfo) => {
    const { dialogo, c } = await abrirModal(page);
    await llenarValido(c);
    let actual: (typeof ERRORES)[number] = ERRORES[0];
    let envios = 0;
    await page.route(URL_PRODUCTIVO, (r: Route) => {
      if (r.request().method() !== 'POST') return r.fallback();
      envios++;
      return r.fulfill({ status: actual.status, contentType: 'application/json', body: JSON.stringify(actual.body) });
    });
    testInfo.annotations.push({ type: 'Datos simulados', description: 'POST /eventos/productivo respondido con 404, 409 (estado), 409 (fase no productiva), 400 (cantidad) y 400 (fecha); nada llega al backend.' });
    try {
      const resumen: string[] = [];
      for (const err of ERRORES) {
        actual = err;
        await c.registrar.click();
        await expect.poll(() => envios, { message: `El envío (${err.paso}) debe llegar al POST simulado` }).toBe(ERRORES.indexOf(err) + 1);
        const alerta = dialogo.getByRole('alert').filter({ hasText: 'No se pudo registrar' });
        await expect(alerta, `3.3.1: el ${err.status} (${err.paso}) debe anunciarse con role="alert" dentro del diálogo`).toBeVisible();
        const texto = (await alerta.innerText()).replace(/\s+/g, ' ').trim();
        expect.soft(texto, `3.3.1: el ${err.status} (${err.paso}) debe explicar el problema con claridad`).toContain(err.body.message);
        let enCampo = 'n/a';
        if (err.campo) {
          const { invalido, descripcion } = await estadoCampo(dialogo.getByRole(err.campo.rol, { name: err.campo.nombre }));
          enCampo = `aria-invalid=${invalido}, descripción="${descripcion}"`;
          expect.soft(invalido && descripcion.includes(err.body.message), `3.3.1: el 400 (${err.paso}) se muestra solo en la alerta global, no en el campo`).toBe(true);
        }
        resumen.push(`${err.paso}: "${texto}" · ${enCampo}`);
        if (err.paso === 'error-409-fase') await escanear(page, 'error-409-fase', testInfo);
      }
      testInfo.annotations.push({ type: 'Errores', description: resumen.join(' || ') });
      await c.cancelar.click();
    } finally {
      await page.unroute(URL_PRODUCTIVO);
    }
  });

  test('4. Registro exitoso (201 simulado) - confirmación anunciada (4.1.3) y 0 violaciones axe A/AA', async ({}, testInfo) => {
    const { dialogo, c } = await abrirModal(page);
    await llenarValido(c);
    let envios = 0;
    await page.route(URL_PRODUCTIVO, (r: Route) => {
      if (r.request().method() !== 'POST') return r.fallback();
      envios++;
      return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id_eventos: 999001, id_activo_biologico: ID_INDIVIDUAL, fecha: '2026-09-29T00:00:00Z' }) });
    });
    testInfo.annotations.push({ type: 'Datos simulados', description: 'POST /eventos/productivo respondido con 201; no se registra nada.' });
    try {
      await c.registrar.click();
      await expect.poll(() => envios, { message: 'El envío debe llegar al POST simulado' }).toBe(1);
      await expect(dialogo).toBeHidden();
      const aviso = main(page).getByRole('alert').filter({ hasText: /registrad/i });
      await expect(aviso, '4.1.3: el registro exitoso debe anunciarse').toBeVisible();
      testInfo.annotations.push({ type: 'Aviso', description: (await aviso.innerText()).replace(/\s+/g, ' ') });
      await escanear(page, 'tras-registro', testInfo);
    } finally {
      await page.unroute(URL_PRODUCTIVO);
    }
  });
});
