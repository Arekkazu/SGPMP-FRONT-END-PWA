/**
 * TC-DIS-99 — Accesibilidad WCAG 2.1 AA del Cierre del Ciclo Productivo (confirmación bloqueante)
 * RF-38 · Cerrar ciclo productivo · Rol: Administrador
 * Activos biológicos → ficha del activo → pestaña "Estado" → "Cerrar ciclo" (modal)
 *
 * Criterio (hoja M02): 0 violaciones axe A/AA y verificación de 1.3.1 (labels de motivo y fecha),
 * 3.3.4 (BLOQUEANTE: confirmación explícita e inequívoca antes de aplicar el cierre), 3.3.1 (404 y
 * 409 "activo ya CERRADO/BAJA" anunciados), 4.1.3 (resultado del cierre anunciado) y 1.4.3.
 *
 * Interpretación de 3.3.4 acordada con QA (30/09): se exige un mecanismo para revisar/confirmar antes
 * de finalizar, no un segundo paso separado. El modal lo es si: el botón de la pestaña solo abre el
 * diálogo (no envía nada), el diálogo advierte con role="alert", exige un motivo obligatorio y termina
 * en un botón de peligro explícito.
 *
 * *** NUNCA SE CONFIRMA UN CIERRE REAL. *** El cierre es irreversible en la práctica. Doble
 * protección: (1) todo POST/PUT/PATCH/DELETE a la API se aborta en el contexto (salvo /sesiones/);
 * (2) el POST /activos-biologicos/627/cierre se intercepta en la página y se responde con
 * route.fulfill (200 simulado, 404, 409). El test del cierre verifica además que el contexto no tuvo
 * que abortar ningún POST de cierre (todos los atendió la simulación).
 *
 * Herramientas: @axe-core/playwright (resultados/axe-TC-DIS-99.html/json), en todos los estados y
 * los 3 viewports, + Lighthouse en modo snapshot solo en escritorio y en 3 estados (pestaña Estado,
 * modal de cierre y error 409). Lighthouse: alcance limitado.
 *
 * Datos (TEST, 30/09/2026): INDIVIDUAL #627, ACTIVO, con fase productiva registrada.
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

const TC_ID = 'TC-DIS-99';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

const ID_INDIVIDUAL = 627;
const IDENTIFICADOR = 'QAG53R2-21297514';
const DIALOGO = `Cerrar ciclo — ${IDENTIFICADOR}`;

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const HAR_ASSETS = path.join(__dirname, '../../../../../.har-cache/assets.har');
const PASOS_LIGHTHOUSE = ['pestana-estado', 'modal-cierre', 'error-409'];

/** POST de cierre (API). */
const URL_CIERRE = (url: URL) => url.pathname.endsWith(`/back-sigab-test/activos-biologicos/${ID_INDIVIDUAL}/cierre`);

// Respuestas SIMULADAS con el formato estándar del backend ({ error_code, message, fields })
const ERRORES = [
  { paso: 'error-404', status: 404, body: { error_code: 'ACTIVO_NO_ENCONTRADO', message: `El activo biológico con ID ${ID_INDIVIDUAL} no existe.`, fields: [] } },
  { paso: 'error-409', status: 409, body: { error_code: 'OPERACION_REDUNDANTE', message: 'Operación redundante: el activo ya se encuentra en estado CERRADO.', fields: [] } },
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

/** goto al activo → pestaña "Estado". */
async function abrirEstado(page: Page) {
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
  await secciones(page).getByRole('button', { name: 'Estado', exact: true }).click();
  const disparador = main(page).getByRole('button', { name: 'Cerrar ciclo', exact: true });
  await expect(disparador, 'El Administrador debe ver "Cerrar ciclo" (permiso D sobre activos)').toBeVisible({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  return disparador;
}

/** Abre el modal de cierre con teclado. Solo abre: no confirma nada. */
async function abrirModal(page: Page) {
  const disparador = await abrirEstado(page);
  await disparador.focus();
  await page.keyboard.press('Enter');
  const dialogo = page.getByRole('dialog', { name: DIALOGO });
  await expect(dialogo).toBeVisible();
  return {
    disparador,
    dialogo,
    fecha: dialogo.getByRole('textbox', { name: /^Fecha de cierre/ }),
    motivo: dialogo.getByRole('textbox', { name: /^Motivo del cierre/ }),
    confirmar: dialogo.getByRole('button', { name: 'Cerrar ciclo', exact: true }),
    cancelar: dialogo.getByRole('button', { name: 'Cancelar', exact: true }),
  };
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

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Cierre del ciclo productivo (RF-38)`, () => {
  test.describe.configure({ mode: 'default', timeout: 300_000 });

  let contexto: BrowserContext;
  let page: Page;
  const abortadas: string[] = [];

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
    // Protección 1: ninguna escritura llega al backend (salvo el login). Las simulaciones van en page.route.
    await contexto.route('**/back-sigab-test/**', (r) => {
      const req = r.request();
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method()) || /\/back-sigab-test\/sesiones\//.test(req.url())) return r.continue();
      abortadas.push(`${req.method()} ${new URL(req.url()).pathname}`);
      return r.abort();
    });
    page = await contexto.newPage();
    await iniciarSesion(page);
  });

  test.afterAll(async () => {
    await contexto?.close();
  });

  test('1. Pestaña Estado - 0 violaciones axe A/AA', async ({}, testInfo) => {
    const disparador = await abrirEstado(page);
    await escanear(page, 'pestana-estado', testInfo);
    await expect(disparador, 'La acción se identifica por su texto').toHaveAccessibleName('Cerrar ciclo');
  });

  test('2. Modal de cierre - labels (1.3.1), advertencia anunciada y 0 violaciones axe A/AA', async ({}, testInfo) => {
    const { disparador, dialogo, fecha, motivo, cancelar } = await abrirModal(page);
    await expect(fecha, '1.3.1: "Fecha de cierre" con label asociado').toBeVisible();
    await expect(motivo, '1.3.1: "Motivo del cierre" con label asociado').toBeVisible();
    const motivoRequerido = await motivo.evaluate((e) => e.getAttribute('aria-required') === 'true' || (e as HTMLTextAreaElement).required);
    const advertencia = dialogo.getByRole('alert').first();
    const textoAdvertencia = (await advertencia.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
    const foco = await page.evaluate(() => (document.activeElement?.closest('[role="dialog"]') ? 'dentro' : 'fuera') + `: ${document.activeElement?.tagName} "${(document.activeElement?.textContent ?? '').trim().slice(0, 30)}"`);
    testInfo.annotations.push({ type: 'Modal de cierre', description: `advertencia (role=alert): "${textoAdvertencia}" · motivo aria-required=${motivoRequerido} · foco al abrir ${foco}` });
    expect(textoAdvertencia, 'El modal debe advertir que la acción es difícilmente reversible').toMatch(/reversible/i);
    expect.soft(motivoRequerido, '3.3.2: "Motivo del cierre" tiene * visual pero no se expone como obligatorio (textarea sin aria-required)').toBe(true);
    expect.soft(foco.startsWith('dentro'), '2.4.3: al abrir el modal el foco se queda fuera del diálogo (defecto transversal de ModalShell)').toBe(true);
    await escanear(page, 'modal-cierre', testInfo);

    await cancelar.click();
    await expect(dialogo).toBeHidden();
    expect.soft(await disparador.evaluate((e) => e === document.activeElement), '2.4.3: al cerrar, el foco no vuelve a "Cerrar ciclo"').toBe(true);
  });

  test('3. BLOQUEANTE 3.3.4 - el modal es un mecanismo explícito de revisión/confirmación antes de aplicar el cierre (POST simulado, nunca real)', async ({}, testInfo) => {
    const posts: unknown[] = [];
    // Protección 2: el cierre se intercepta y se responde en la página; nunca llega al backend
    await page.route(URL_CIERRE, (r: Route) => {
      if (r.request().method() !== 'POST') return r.fallback();
      posts.push(r.request().postDataJSON());
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id_activo_biologico: ID_INDIVIDUAL, estado_nuevo: 'CERRADO', fecha_cierre: '2026-09-30' }) });
    });
    testInfo.annotations.push({ type: 'Datos simulados', description: 'POST /activos-biologicos/627/cierre respondido con 200 en la página; el contexto además aborta toda escritura. No se cierra nada.' });
    try {
      // 3.3.4 (a): el botón de la pestaña solo abre el diálogo, no aplica nada
      const { dialogo, motivo, confirmar } = await abrirModal(page);
      await page.waitForTimeout(800);
      expect(posts.length, 'BLOQUEANTE 3.3.4: el botón "Cerrar ciclo" de la pestaña no debe aplicar el cierre; solo abrir el diálogo de confirmación').toBe(0);

      // 3.3.4 (b): el diálogo advierte con role="alert" y termina en un botón de peligro explícito
      const advertencia = (await dialogo.getByRole('alert').first().innerText()).replace(/\s+/g, ' ').trim();
      expect(advertencia, 'BLOQUEANTE 3.3.4: el diálogo debe advertir que la acción es difícilmente reversible (role="alert")').toMatch(/reversible/i);
      await expect(confirmar, 'BLOQUEANTE 3.3.4: la acción final es un botón explícito "Cerrar ciclo"').toHaveAccessibleName('Cerrar ciclo');
      const titulo = await dialogo.getAttribute('aria-label');
      testInfo.annotations.push({ type: 'Advertencia del diálogo', description: `título: "${titulo}" · advertencia: "${advertencia}"` });
      // Mejora (no incumplimiento): la advertencia debería nombrar el activo y decir que se detienen sus eventos
      expect.soft(advertencia, 'Observación de mejora 3.3.4/3.3.2: la advertencia no nombra el activo (solo el título del diálogo lo hace)').toContain(IDENTIFICADOR);
      expect.soft(advertencia, 'Observación de mejora 3.3.4/3.3.2: la advertencia no dice que se detienen los eventos del activo').toMatch(/evento/i);

      // 3.3.4 (c): el motivo obligatorio bloquea el envío
      await confirmar.click();
      await page.waitForTimeout(800);
      const errorMotivo = await dialogo.getByRole('alert').filter({ hasText: /motivo/i }).count();
      testInfo.annotations.push({ type: 'Envío sin motivo', description: `POST enviados: ${posts.length} · error de motivo visible: ${errorMotivo > 0}` });
      expect(posts.length, 'BLOQUEANTE 3.3.4: sin motivo no se debe enviar el cierre').toBe(0);
      expect(errorMotivo, '3.3.1: el motivo obligatorio vacío debe anunciarse').toBeGreaterThan(0);

      // Con motivo, el botón de peligro del diálogo aplica el cierre (simulado). No hay un segundo paso
      // separado; según el criterio acordado no se exige (el diálogo ya es el paso de confirmación).
      await motivo.fill('QA TC-DIS-99 (simulado, nunca real)');
      await confirmar.click();
      await expect.poll(() => posts.length, { message: 'El cierre (simulado) debe enviarse al confirmar en el diálogo' }).toBe(1);
      testInfo.annotations.push({
        type: 'Confirmación antes de aplicar (3.3.4)',
        description: 'Cumple: la pestaña solo abre el diálogo; el diálogo advierte (role=alert), exige motivo y aplica con un botón de peligro explícito. Sin segundo paso separado (no requerido).',
      });

      // 4.1.3: el resultado del cierre se anuncia
      if (posts.length === 1) {
        await expect(dialogo).toBeHidden({ timeout: 30_000 });
        const anuncio = page.locator('[role="status"], [role="alert"], [aria-live]:not([aria-live="off"])').filter({ hasText: /cerrad|cierre|éxito|exito/i });
        const hayAnuncio = await anuncio.first().isVisible({ timeout: 5_000 }).catch(() => false);
        testInfo.annotations.push({ type: 'Resultado del cierre', description: hayAnuncio ? await anuncio.first().innerText() : 'ningún mensaje visible ni anunciado; el modal solo se cierra' });
        expect.soft(hayAnuncio, '4.1.3: el resultado del cierre (simulado) no se muestra ni se anuncia').toBe(true);
        await escanear(page, 'tras-cierre', testInfo);
      }
    } finally {
      await page.unroute(URL_CIERRE);
    }
    // Seguridad: un POST de cierre no atendido por la simulación de la página lo aborta el contexto (nunca sale a la red)
    expect(abortadas.filter((a) => a.endsWith('/cierre')).length, 'SEGURIDAD: el cierre debe atenderlo la simulación de la página, no llegar a la red').toBe(0);
  });

  test('4. Errores (404 / 409 "activo ya CERRADO" simulados) - anunciados dentro del diálogo (3.3.1)', async ({}, testInfo) => {
    const { dialogo, motivo, confirmar, cancelar } = await abrirModal(page);
    await motivo.fill('QA TC-DIS-99 (simulado, nunca real)');
    let actual: (typeof ERRORES)[number] = ERRORES[0];
    let envios = 0;
    await page.route(URL_CIERRE, (r: Route) => {
      if (r.request().method() !== 'POST') return r.fallback();
      envios++;
      return r.fulfill({ status: actual.status, contentType: 'application/json', body: JSON.stringify(actual.body) });
    });
    testInfo.annotations.push({ type: 'Datos simulados', description: 'POST /cierre respondido con 404 y 409 (operación redundante); nada llega al backend.' });
    try {
      const resumen: string[] = [];
      for (const err of ERRORES) {
        actual = err;
        await confirmar.click();
        await expect.poll(() => envios, { message: `El envío (${err.paso}) debe llegar al POST simulado` }).toBe(ERRORES.indexOf(err) + 1);
        const alerta = dialogo.getByRole('alert').filter({ hasText: 'No se pudo cerrar el ciclo' });
        await expect(alerta, `3.3.1: el ${err.status} (${err.paso}) debe anunciarse con role="alert" dentro del diálogo`).toBeVisible();
        const texto = (await alerta.innerText()).replace(/\s+/g, ' ').trim();
        expect.soft(texto, `3.3.1: el ${err.status} debe explicar el problema`).toContain(err.body.message);
        resumen.push(`${err.paso}: "${texto}"`);
        if (err.paso === 'error-409') await escanear(page, 'error-409', testInfo);
      }
      testInfo.annotations.push({ type: 'Errores', description: resumen.join(' || ') });
      await cancelar.click();
    } finally {
      await page.unroute(URL_CIERRE);
    }
  });
});
