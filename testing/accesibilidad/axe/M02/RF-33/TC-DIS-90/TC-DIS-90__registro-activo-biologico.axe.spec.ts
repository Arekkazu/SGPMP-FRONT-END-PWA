/**
 * TC-DIS-90 — Accesibilidad WCAG 2.1 AA del formulario de Registro de Activos Biológicos
 * RF-33 · Registrar activo biológico · Rol: Administrador
 * Activos biológicos → "Registrar activo" → /activos-biologicos/nuevo
 *
 * Criterio (hoja M02): 0 violaciones axe A/AA y verificación de 1.3.1 (labels asociados y
 * agrupación por tipo de activo), 4.1.2 (selector INDIVIDUAL/POBLACIONAL con name/role/value;
 * campos condicionales anunciados por aria-live, 4.1.3), 3.3.1/3.3.3 (errores 409 identificador
 * ya registrado, 400 especie/infraestructura inválida y cantidad ≤ 0 anunciados por campo con
 * sugerencia), 3.3.2 (instrucciones de obligatorios y de origen financiero), 1.4.3.
 * Ninguna verificación manual está marcada como BLOQUEANTE.
 *
 * Herramientas: @axe-core/playwright (resultados/axe-TC-DIS-90.html/json), en todos los estados
 * y los 3 viewports, + Lighthouse en modo snapshot solo en escritorio y en 3 estados (formulario
 * INDIVIDUAL, validación al enviar vacío y error 409). Lighthouse: alcance limitado.
 *
 * Datos: el formulario pide especie e infraestructura como ID numérico (no hay listas). Se usan
 * especie #4 e infraestructura #6 ("Piscina-Cam-01"), los del INDIVIDUAL #627 de TC-DIS-93/117.
 *
 * Escrituras: TODAS SIMULADAS. El POST /activos-biologicos se responde con route.fulfill
 * (201 con el activo #627 como cuerpo, 409, 400, 422 y 401) y nunca llega al backend; cualquier
 * otro POST/PUT/PATCH/DELETE se aborta (salvo /sesiones/, login y refresh). El 401 va en el
 * último test: la app intenta un refresh real de la sesión y reintenta la petición.
 *
 * Navegación: page.goto('/activos-biologicos') y clic en "Registrar activo", verificando tras el
 * goto que la sesión sigue viva ("BLOQUEO DE AMBIENTE: sesión perdida tras goto").
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

const TC_ID = 'TC-DIS-90';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

const ID_ESPECIE = '4';
const ID_INFRAESTRUCTURA = '6';
const ID_ACTIVO_RESPUESTA = 627; // activo real al que redirige el 201 simulado (solo lectura)

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const HAR_ASSETS = path.join(__dirname, '../../../../../.har-cache/assets.har');
const PASOS_LIGHTHOUSE = ['form-individual', 'validacion-vacio', 'error-409'];

/** POST de registro (API, no la ruta del frontend). */
const URL_REGISTRO = (url: URL) => /\/back-sigab-test\/activos-biologicos\/?$/.test(url.pathname);

// Respuestas SIMULADAS con el formato estándar del backend ({ error_code, message, fields })
const ERRORES = [
  {
    paso: 'error-409', status: 409, campo: 'Identificador', field: 'identificador',
    body: { error_code: 'IDENTIFICADOR_DUPLICADO', message: 'El identificador QA-TC-DIS-90-SIMULADO ya está registrado para otro activo.', fields: [{ field: 'identificador', message: 'El identificador ya está registrado.' }] },
  },
  {
    paso: 'error-400-especie', status: 400, campo: 'ID de especie', field: 'id_especie',
    body: { error_code: 'ESPECIE_INVALIDA', message: 'La especie indicada no existe o está inactiva.', fields: [{ field: 'id_especie', message: 'La especie indicada no existe o está inactiva.' }] },
  },
  {
    paso: 'error-400-infraestructura', status: 400, campo: 'ID de infraestructura', field: 'id_infraestructura',
    body: { error_code: 'INFRAESTRUCTURA_INVALIDA', message: 'La infraestructura indicada no existe, está inactiva o no admite la especie.', fields: [{ field: 'id_infraestructura', message: 'La infraestructura indicada no existe, está inactiva o no admite la especie.' }] },
  },
  {
    paso: 'error-422-atributo-dinamico', status: 422, campo: null, field: 'atributos_dinamicos.color_pelaje',
    body: { error_code: 'ATRIBUTO_DINAMICO_REQUERIDO', message: 'Falta el atributo obligatorio "color_pelaje" configurado para la especie.', fields: [{ field: 'atributos_dinamicos.color_pelaje', message: 'Campo obligatorio.' }] },
  },
  {
    paso: 'error-400-sin-campo', status: 400, campo: null, field: null,
    body: { error_code: 'VALIDACION', message: 'Los datos enviados no son válidos.', fields: [] },
  },
] as const;

const ERROR_401 = { error_code: 'TOKEN_INVALIDO', message: 'La sesión no es válida o expiró.', fields: [] };

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

/** Listado (goto con verificación de sesión) → clic en "Registrar activo" → formulario vacío. */
async function abrirFormulario(page: Page) {
  await page.goto('/activos-biologicos', { waitUntil: 'commit', timeout: 120_000 });
  const login = page.getByRole('textbox', { name: 'Correo electrónico', exact: true });
  const registrar = main(page).getByRole('button', { name: 'Registrar activo', exact: true });
  await expect(registrar.or(login)).toBeVisible({ timeout: 120_000 });
  if (new URL(page.url()).pathname.includes('/login') || (await login.isVisible())) {
    throw new Error(`BLOQUEO DE AMBIENTE: sesión perdida tras goto (/activos-biologicos → ${page.url()})`);
  }
  await registrar.click();
  await expect(main(page).getByRole('heading', { name: 'Registrar activo biológico', level: 1 })).toBeVisible({ timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready);
}

function campos(page: Page) {
  const m = main(page);
  return {
    individual: m.getByRole('radio', { name: /^Individual/ }),
    poblacional: m.getByRole('radio', { name: /^Poblacional/ }),
    especie: m.getByRole('spinbutton', { name: 'ID de especie', exact: true }),
    infraestructura: m.getByRole('spinbutton', { name: 'ID de infraestructura', exact: true }),
    inicioCiclo: m.getByRole('textbox', { name: 'Fecha de inicio de ciclo', exact: true }),
    origen: m.getByRole('combobox', { name: 'Origen', exact: true }),
    identificador: m.getByRole('textbox', { name: 'Identificador', exact: true }),
    raza: m.getByRole('textbox', { name: 'Raza', exact: true }),
    sexo: m.getByRole('combobox', { name: 'Sexo', exact: true }),
    nacimiento: m.getByRole('textbox', { name: 'Fecha de nacimiento', exact: true }),
    cantidad: m.getByRole('spinbutton', { name: 'Cantidad inicial', exact: true }),
    enviar: m.getByRole('button', { name: 'Registrar activo', exact: true }),
  };
}

/** Formulario INDIVIDUAL válido (origen nacimiento: sin costo ni soporte). */
async function llenarIndividualValido(page: Page) {
  const c = campos(page);
  await c.especie.fill(ID_ESPECIE);
  await c.infraestructura.fill(ID_INFRAESTRUCTURA);
  await c.inicioCiclo.fill('2026-09-01');
  await c.origen.selectOption('nacimiento');
  await c.identificador.fill('QA-TC-DIS-90-SIMULADO');
  await c.raza.fill('QA');
  await c.sexo.selectOption('HEMBRA');
  await c.nacimiento.fill('2024-01-01');
}

/**
 * ¿El error del campo está asociado al control (aria-invalid + descripción con el mensaje)?
 * El control se busca por rol y nombre accesible: getByLabel incluye el " *" aria-hidden del
 * <label> y no encuentra el campo con exact.
 */
async function errorAsociadoAlCampo(page: Page, nombreCampo: string) {
  const m = main(page);
  const control = m
    .getByRole('spinbutton', { name: nombreCampo, exact: true })
    .or(m.getByRole('textbox', { name: nombreCampo, exact: true }))
    .or(m.getByRole('combobox', { name: nombreCampo, exact: true }));
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

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Registro de activo biológico (RF-33)`, () => {
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
    // Ninguna escritura llega al backend (salvo login/refresh). Las simulaciones van en page.route, que tiene prioridad.
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

  test('1. Formulario INDIVIDUAL - 0 violaciones axe A/AA, agrupación (1.3.1) e instrucciones de obligatorios (3.3.2)', async ({}, testInfo) => {
    await abrirFormulario(page);
    const c = campos(page);
    await expect(c.individual, 'INDIVIDUAL es el tipo por defecto').toBeChecked();

    await escanear(page, 'form-individual', testInfo);

    // 1.3.1: el selector de tipo agrupado con su rótulo (fieldset/legend o radiogroup con nombre)
    const grupoTipo = main(page).getByRole('radiogroup', { name: /tipo de activo/i }).or(main(page).getByRole('group', { name: /tipo de activo/i }));
    expect.soft(await grupoTipo.count(), '1.3.1: los radios INDIVIDUAL/POBLACIONAL no están agrupados con el rótulo "Tipo de activo" (sin fieldset/legend ni radiogroup)').toBeGreaterThan(0);

    // 1.3.1: los títulos visuales de sección deben ser encabezados (o grupos con nombre)
    const titulos = ['Tipo de activo', 'Datos generales', 'Origen financiero', 'Detalle individual'];
    const sinMarcado: string[] = [];
    for (const t of titulos) {
      const marcado = main(page).getByRole('heading', { name: t, exact: true }).or(main(page).getByRole('group', { name: t, exact: true }));
      if ((await marcado.count()) === 0) sinMarcado.push(t);
    }
    expect.soft(sinMarcado, '1.3.1: títulos visuales de sección sin marcado de encabezado ni de grupo').toEqual([]);

    // 3.3.2: todo campo con asterisco visual se expone como obligatorio
    const obligatorios = { 'ID de especie': c.especie, 'ID de infraestructura': c.infraestructura, 'Fecha de inicio de ciclo': c.inicioCiclo, Origen: c.origen, Identificador: c.identificador, Raza: c.raza, Sexo: c.sexo, 'Fecha de nacimiento': c.nacimiento };
    const noExpuestos: string[] = [];
    for (const [nombre, loc] of Object.entries(obligatorios)) {
      const req = await loc.evaluate((e) => e.getAttribute('aria-required') === 'true' || (e as HTMLInputElement).required);
      if (!req) noExpuestos.push(nombre);
    }
    expect.soft(noExpuestos, '3.3.2: campos marcados con * visual que no se exponen como obligatorios (aria-required)').toEqual([]);

    // 3.3.2: instrucciones para el origen financiero (qué exige cada opción)
    const descOrigen = await c.origen.evaluate((e) => e.getAttribute('aria-describedby') ?? '');
    expect.soft(descOrigen, '3.3.2: el select "Origen" no tiene instrucciones asociadas (qué exige compra/donación vs nacimiento)').not.toBe('');

    // 3.3.2 / usabilidad: especie e infraestructura se piden como ID numérico en texto libre
    const tipoEspecie = await c.especie.evaluate((e) => e.tagName + (e.getAttribute('type') ? `[${e.getAttribute('type')}]` : ''));
    testInfo.annotations.push({ type: 'Especie / infraestructura', description: `controles: ${tipoEspecie}; no hay lista de especies ni de infraestructuras disponibles (relacionado con #167)` });
    expect.soft(await main(page).getByRole('combobox', { name: /especie|infraestructura/i }).count(), '3.3.2: especie e infraestructura se piden como ID numérico en texto libre; el usuario no puede saber qué valores son válidos').toBeGreaterThan(0);
  });

  test('2. Cambio INDIVIDUAL → POBLACIONAL con teclado - campos condicionales y anuncio del cambio (4.1.2 / 4.1.3)', async ({}, testInfo) => {
    await abrirFormulario(page);
    const c = campos(page);

    // Operable con teclado: foco en el radio seleccionado y flecha para cambiar
    await c.individual.focus();
    await page.keyboard.press('ArrowRight');
    await expect(c.poblacional, '4.1.2: el radio POBLACIONAL debe quedar seleccionado con las flechas').toBeChecked();
    await expect(c.individual).not.toBeChecked();

    // Campos condicionales: identificador sale, cantidad inicial entra
    await expect(c.identificador, 'El identificador no aplica a POBLACIONAL').toHaveCount(0);
    await expect(c.cantidad, 'La cantidad inicial aparece para POBLACIONAL').toBeVisible();

    // 4.1.3: el cambio de campos se anuncia (región viva con texto)
    const vivas = await page.evaluate(() =>
      [...document.querySelectorAll('[aria-live]:not([aria-live="off"]), [role="status"]')]
        .map((e) => (e.textContent ?? '').trim())
        .filter(Boolean),
    );
    testInfo.annotations.push({ type: 'Regiones vivas tras cambiar el tipo', description: vivas.join(' · ') || 'ninguna' });
    expect.soft(vivas.length, '4.1.3: al cambiar de tipo los campos condicionales cambian sin ningún anuncio (no hay aria-live/role=status)').toBeGreaterThan(0);

    await escanear(page, 'form-poblacional', testInfo);

    // Cantidad ≤ 0: error del cliente en el propio campo (3.3.1)
    await c.cantidad.fill('0');
    await c.cantidad.blur();
    const { invalido, descripcion } = await errorAsociadoAlCampo(page, 'Cantidad inicial');
    testInfo.annotations.push({ type: 'Cantidad 0', description: `aria-invalid=${invalido} · descripción: ${descripcion}` });
    expect(invalido, '3.3.1: cantidad 0 debe marcar el campo como inválido').toBe(true);
    expect(descripcion, '3.3.1/3.3.3: el error de cantidad debe describir la corrección').toMatch(/mayor a 0/i);
    await escanear(page, 'cantidad-cero', testInfo);
  });

  test('3. Enviar vacío - errores por campo anunciados y asociados (3.3.1) y foco al primer error', async ({}, testInfo) => {
    await abrirFormulario(page);
    const c = campos(page);
    await c.enviar.click();

    const conError = ['ID de especie', 'ID de infraestructura', 'Fecha de inicio de ciclo', 'Identificador', 'Raza', 'Fecha de nacimiento'];
    for (const nombre of conError) {
      const { invalido, descripcion } = await errorAsociadoAlCampo(page, nombre);
      expect(invalido, `3.3.1: "${nombre}" vacío debe quedar aria-invalid`).toBe(true);
      expect(descripcion, `3.3.1: el error de "${nombre}" debe estar asociado al campo`).not.toBe('');
    }
    // Sexo (select crudo, no usa el Input del sistema de diseño)
    const sexo = await errorAsociadoAlCampo(page, 'Sexo');
    testInfo.annotations.push({ type: 'Sexo vacío', description: `aria-invalid=${sexo.invalido} · descripción: "${sexo.descripcion}"` });
    await expect(main(page).getByRole('alert').filter({ hasText: 'El sexo es obligatorio.' }), '3.3.1: el error de "Sexo" se muestra').toBeVisible();
    expect.soft(sexo.invalido && sexo.descripcion !== '', '3.3.1: el error de "Sexo" no está asociado al select (sin aria-invalid ni aria-describedby)').toBe(true);

    const foco = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.getAttribute('aria-label') ?? document.activeElement?.id ?? '');
    const focoEnEspecie = await c.especie.evaluate((e) => e === document.activeElement);
    testInfo.annotations.push({ type: 'Foco tras enviar vacío', description: focoEnEspecie ? 'ID de especie (primer campo inválido)' : foco });
    expect.soft(focoEnEspecie, 'El foco debe ir al primer campo inválido').toBe(true);

    const alertas = await main(page).getByRole('alert').count();
    testInfo.annotations.push({ type: 'Alertas simultáneas al enviar vacío', description: String(alertas) });

    await escanear(page, 'validacion-vacio', testInfo);
  });

  test('4. Errores del servidor (409 / 400 / 422 simulados) - anunciados y asociados al campo (3.3.1 / 3.3.3)', async ({}, testInfo) => {
    await abrirFormulario(page);
    await llenarIndividualValido(page);
    const c = campos(page);

    let actual: (typeof ERRORES)[number] = ERRORES[0];
    const enviados: unknown[] = [];
    await page.route(URL_REGISTRO, (r: Route) => {
      if (r.request().method() !== 'POST') return r.fallback();
      enviados.push(r.request().postDataJSON());
      return r.fulfill({ status: actual.status, contentType: 'application/json', body: JSON.stringify(actual.body) });
    });
    testInfo.annotations.push({ type: 'Datos simulados', description: 'POST /activos-biologicos respondido con 409, 400 (especie, infraestructura, sin campo) y 422 (atributo dinámico); no llega al backend.' });

    try {
      const resumen: string[] = [];
      for (const err of ERRORES) {
        actual = err;
        await c.enviar.click();
        await expect.poll(() => enviados.length, { message: `El envío (${err.paso}) debe llegar al POST simulado` }).toBe(ERRORES.indexOf(err) + 1);

        const alerta = main(page).getByRole('alert').filter({ hasText: 'No se pudo registrar el activo' });
        await expect(alerta, `3.3.1: el ${err.status} (${err.paso}) debe anunciarse con role="alert"`).toBeVisible();
        const texto = (await alerta.innerText()).replace(/\s+/g, ' ').trim();

        let enCampo = 'n/a';
        if (err.campo) {
          const { invalido, descripcion } = await errorAsociadoAlCampo(page, err.campo);
          enCampo = `aria-invalid=${invalido}, descripción="${descripcion}"`;
          expect.soft(invalido && descripcion !== '', `3.3.1: el ${err.status} de "${err.campo}" se muestra solo en una alerta global, no en el campo afectado`).toBe(true);
        } else if (err.field) {
          // 422 por atributo dinámico que el formulario no ofrece
          const hayCampo = await main(page).getByLabel(/color.?pelaje|atributo/i).count();
          enCampo = `campo "${err.field}" en el formulario: ${hayCampo > 0 ? 'sí' : 'no existe'}`;
          expect.soft(hayCampo, `3.3.3: el 422 pide el atributo dinámico "${err.field}" que el formulario no muestra; el usuario no puede corregirlo`).toBeGreaterThan(0);
        } else {
          // 400 sin campo: el mensaje debe al menos orientar la corrección
          expect.soft(texto, '3.3.3: el 400 sin campo no indica qué dato corregir').toMatch(/identificador|especie|infraestructura|fecha|cantidad|raza|sexo|origen/i);
        }
        resumen.push(`${err.paso}: "${texto}" · ${enCampo}`);
        if (err.paso === 'error-409') await escanear(page, 'error-409', testInfo);
      }
      testInfo.annotations.push({ type: 'Errores de servidor', description: resumen.join(' || ') });
    } finally {
      await page.unroute(URL_REGISTRO);
    }
  });

  test('5. Registro exitoso (201 simulado) - confirmación anunciada (4.1.3) y 0 violaciones axe A/AA', async ({}, testInfo) => {
    await abrirFormulario(page);
    await llenarIndividualValido(page);
    const enviados: unknown[] = [];
    await page.route(URL_REGISTRO, (r: Route) => {
      if (r.request().method() !== 'POST') return r.fallback();
      enviados.push(r.request().postDataJSON());
      return r.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id_activo_biologico: ID_ACTIVO_RESPUESTA, tipo: 'INDIVIDUAL', identificador: 'QA-TC-DIS-90-SIMULADO', id_especie: 4, id_infraestructura: 6, nombre_estado: 'ACTIVO' }),
      });
    });
    testInfo.annotations.push({ type: 'Datos simulados', description: `POST /activos-biologicos respondido con 201 (id ${ID_ACTIVO_RESPUESTA}, activo real existente); no se registra nada.` });
    try {
      await campos(page).enviar.click();
      await expect.poll(() => enviados.length, { message: 'El envío debe llegar al POST simulado' }).toBe(1);
      await page.waitForURL(new RegExp(`/activos-biologicos/${ID_ACTIVO_RESPUESTA}$`), { timeout: 60_000 });

      const anuncio = page.locator('[role="status"], [role="alert"], [aria-live]:not([aria-live="off"])').filter({ hasText: /registrad|cread|éxito|exito/i });
      const hayAnuncio = await anuncio.first().isVisible({ timeout: 5_000 }).catch(() => false);
      testInfo.annotations.push({ type: 'Confirmación tras registrar', description: hayAnuncio ? await anuncio.first().innerText() : `ninguna; la app solo redirige a ${new URL(page.url()).pathname}` });
      expect.soft(hayAnuncio, '4.1.3: registrar no muestra ni anuncia confirmación; solo redirige al detalle').toBe(true);

      await expect(main(page).getByRole('heading', { name: 'Datos del activo', exact: true })).toBeVisible({ timeout: 60_000 });
      await escanear(page, 'tras-registro', testInfo);
    } finally {
      await page.unroute(URL_REGISTRO);
    }
  });

  test('6. Error 401 al registrar (simulado) - mensaje comprensible (3.3.3)', async ({}, testInfo) => {
    await abrirFormulario(page);
    await llenarIndividualValido(page);
    let intentos = 0;
    await page.route(URL_REGISTRO, (r: Route) => {
      if (r.request().method() !== 'POST') return r.fallback();
      intentos++;
      return r.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify(ERROR_401) });
    });
    testInfo.annotations.push({ type: 'Datos simulados', description: 'POST /activos-biologicos respondido siempre con 401; la app hace su refresh real de sesión y reintenta.' });
    try {
      await campos(page).enviar.click();
      await expect.poll(() => intentos, { message: 'El envío debe llegar al POST simulado' }).toBeGreaterThan(0);
      const alerta = main(page).getByRole('alert').first();
      const login = page.getByRole('textbox', { name: 'Correo electrónico', exact: true });
      await expect(alerta.or(login)).toBeVisible({ timeout: 60_000 });
      const resultado = (await login.isVisible()) ? `redirige a /login (${page.url()})` : (await alerta.innerText()).replace(/\s+/g, ' ').trim();
      testInfo.annotations.push({ type: 'Resultado del 401', description: `${resultado} · intentos del POST: ${intentos}` });
      expect.soft(resultado, '3.3.3: el 401 se muestra como "error inesperado" en vez de indicar que la sesión expiró').not.toMatch(/inesperado/i);
      if (!(await login.isVisible())) await escanear(page, 'error-401', testInfo);
    } finally {
      await page.unroute(URL_REGISTRO);
    }
  });
});
