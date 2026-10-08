/**
 * TC-DIS-117 — Accesibilidad WCAG 2.1 AA de la Ficha Integral del activo biológico
 * RF-47 · CU-XX Consultar ficha integral del activo · Rol: Administrador
 * Activos biológicos → ficha del activo → pestaña "Ficha integral" (vista por defecto, solo lectura)
 *
 * Criterio (hoja M02): 0 violaciones axe A/AA y verificación manual, con énfasis en
 * 1.3.1/2.4.6 (8 secciones con encabezados jerárquicos descriptivos), 2.4.1 (mecanismo
 * para saltar entre secciones), estados múltiples (completa, "Sin información registrada",
 * sección 7 solo LOTE, errores 404/403) y 1.4.3.
 *
 * Herramientas: @axe-core/playwright (resultados/axe-TC-DIS-117.html/json) + Lighthouse
 * en modo snapshot sobre la misma sesión (resultados/lighthouse-TC-DIS-117-<paso>-escritorio.html/json),
 * solo en 3 estados (ficha INDIVIDUAL, ficha LOTE y 404) y solo en escritorio. Axe corre en
 * todos los estados y los 3 viewports. Lighthouse audita un solo estado, sin teclado: alcance limitado.
 *
 * Datos (verificados en TEST el 30/09/2026, cuenta Administrador):
 *   - INDIVIDUAL #627 "QAG53R2-21297514", ACTIVO, fase "Ciclo completo cachama 2025-A",
 *     infraestructura "Piscina-Cam-01". Tiene eventos reproductivos y el resto de
 *     secciones vacías: sirve a la vez para "sección con datos" y "sección sin datos".
 *   - LOTE #353, ACTIVO, fase e infraestructura (el mismo que usa TC-DIS-122).
 *   Si alguno cambia de estado, el spec corta con "BLOQUEO DE AMBIENTE" en vez de auditar
 *   otra cosa.
 * Re-test 07/10/2026 (cuenta Administrador de otra finca, tema oscuro guardado): INDIVIDUAL #745
 * "QAG53R2-63077805" (Cachama Blanca, ACTIVO, fase "Ciclo completo cachama 2025-A", Piscina-Cam-01), equivalente
 * al #627, y LOTE #749 sin fase activa (en TEST no hay LOTE activo con fase en esta finca); no afecta lo verificado
 * porque la sección del lote depende solo del tipo POBLACIONAL y el spec solo le exige tipo y estado.
 *
 * Errores:
 *   - 404 REAL: activo inexistente (#999999). Solo lectura.
 *   - 403 SIMULADO: la cuenta Administrador tiene permiso, así que el 403 (E-02) se inyecta
 *     con route.fulfill sobre los GET del activo, con el mensaje del RF.
 *
 * Seguridad: la ficha es de solo lectura, pero todo POST/PUT/PATCH/DELETE a la API se
 * aborta (salvo /sesiones/, que es el login). Ningún test escribe en el ambiente.
 *
 * Navegación: page.goto directo a /activos-biologicos/<id>. En M02 la sesión sobrevive a
 * la recarga (comprobado en la exploración); aun así, cada goto verifica que no se volvió
 * a /login y falla con "BLOQUEO DE AMBIENTE: sesión perdida tras goto".
 *
 * Un login por viewport (página compartida en beforeAll). No se usa modo serial: un
 * hallazgo no debe saltarse los pasos siguientes; si un test falla, Playwright reinicia
 * el worker y el beforeAll vuelve a iniciar sesión.
 */
import fs from 'fs';
import path from 'path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type BrowserContext, type Page, type TestInfo } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { auditarLighthouse, PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';

const TC_ID = 'TC-DIS-117';
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';

const ID_INDIVIDUAL = 745;
const ID_LOTE = 749;
const ID_INEXISTENTE = 999999;

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const HAR_ASSETS = path.join(__dirname, '../../../../../.har-cache/assets.har');
const PASOS_LIGHTHOUSE = ['ficha-individual', 'ficha-lote', 'error-404'];

// Las 8 secciones funcionales del RF-47 y cómo se reconocería su encabezado.
// Sección 4 en LOTE: el RF la reemplaza por la biomasa agregada, que la UI muestra en "Datos del lote".
const SECCIONES = [
  { n: 1, nombre: 'Identificación', re: /identificaci|datos del activo/i },
  { n: 2, nombre: 'Estado y fase actual', re: /estado|fase/i },
  { n: 3, nombre: 'Ubicación', re: /ubicaci|infraestructura/i },
  { n: 4, nombre: 'Datos biológicos', re: /biol[oó]gic|datos del lote/i },
  { n: 5, nombre: 'Eventos recientes', re: /evento/i },
  { n: 6, nombre: 'Indicadores zootécnicos', re: /indicador/i },
  { n: 7, nombre: 'Datos del lote (solo LOTE)', re: /lote/i, soloLote: true },
  { n: 8, nombre: 'Accesos directos', re: /acceso|acciones/i },
];

// 403 SIMULADO (E-02 del RF-47) con el formato estándar del backend
const ERROR_403 = {
  error_code: 'ACCESO_DENEGADO',
  message: 'No tiene permisos para visualizar la ficha de este activo.',
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

/** goto a la ficha del activo; falla como BLOQUEO si la sesión no sobrevivió. Devuelve el cuerpo de la ficha. */
async function abrirFicha(page: Page, id: number): Promise<Record<string, unknown> | null> {
  const respuestaFicha = page
    .waitForResponse((r) => r.url().includes(`/activos-biologicos/${id}/ficha-integral`), { timeout: 120_000 })
    .catch(() => null);
  await page.goto(`/activos-biologicos/${id}`, { waitUntil: 'commit', timeout: 120_000 });

  const login = page.getByRole('textbox', { name: 'Correo electrónico', exact: true });
  await expect(secciones(page).or(login)).toBeVisible({ timeout: 120_000 });
  if (new URL(page.url()).pathname.includes('/login') || (await login.isVisible())) {
    throw new Error(`BLOQUEO DE AMBIENTE: sesión perdida tras goto (/activos-biologicos/${id} → ${page.url()})`);
  }

  const r = await respuestaFicha;
  // La ficha termina de cargar cuando aparece su primera tarjeta o la alerta de error
  await expect(
    main(page).getByRole('heading', { name: 'Datos del activo', exact: true }).or(main(page).getByRole('alert').first()),
  ).toBeVisible({ timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready);
  if (!r || !r.ok()) return null;
  return (await r.json()) as Record<string, unknown>;
}

function exigirDato(cond: boolean, detalle: string) {
  if (!cond) throw new Error(`BLOQUEO DE AMBIENTE: el dato de prueba cambió (${detalle}). Verificar a mano antes de seguir.`);
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

/** Encabezados del documento completo, en orden, con su nivel. */
function encabezados(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('h1,h2,h3,h4,h5,h6,[role="heading"]')]
      .filter((h) => (h as HTMLElement).offsetParent !== null)
      .map((h) => ({
        nivel: Number(h.getAttribute('aria-level') ?? h.tagName.slice(1)),
        texto: (h.textContent ?? '').trim(),
        enMain: !!h.closest('main'),
      })),
  );
}

// ── Casos ────────────────────────────────────────────────────────────────────

test.describe(`${TC_ID} - Accesibilidad WCAG 2.1 AA - Ficha integral del activo (RF-47)`, () => {
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
    // Ninguna escritura llega al backend (salvo el login)
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

  test('1. Ficha INDIVIDUAL con datos - 0 violaciones axe A/AA, solo lectura y sin sección 7', async ({}, testInfo) => {
    const ficha = await abrirFicha(page, ID_INDIVIDUAL);
    exigirDato(!!ficha, `GET ficha-integral de #${ID_INDIVIDUAL} no respondió 200`);
    exigirDato(String(ficha!.tipo).toUpperCase() === 'INDIVIDUAL', `#${ID_INDIVIDUAL} ya no es INDIVIDUAL`);
    exigirDato(ficha!.estado_actual === 'ACTIVO', `#${ID_INDIVIDUAL} está en ${String(ficha!.estado_actual)}`);
    exigirDato(!!ficha!.fase_productiva_activa && !!ficha!.infraestructura_asociada, `#${ID_INDIVIDUAL} sin fase o sin infraestructura`);

    await escanear(page, 'ficha-individual', testInfo);

    // Sección 7 (datos de lote) omitida para INDIVIDUAL
    await expect(main(page).getByRole('heading', { name: /lote/i }), 'Sección 7 (datos del lote) no debe mostrarse en un INDIVIDUAL').toHaveCount(0);

    // Solo lectura: ningún control editable dentro del contenido de la ficha
    const editables = main(page).locator('input, textarea, select, [contenteditable="true"]');
    await expect(editables, 'La ficha es de solo lectura: no debe exponer controles editables').toHaveCount(0);
  });

  test('2. Ficha LOTE con datos - 0 violaciones axe A/AA y sección 7 presente', async ({}, testInfo) => {
    const ficha = await abrirFicha(page, ID_LOTE);
    exigirDato(!!ficha, `GET ficha-integral de #${ID_LOTE} no respondió 200`);
    exigirDato(String(ficha!.tipo).toUpperCase() === 'POBLACIONAL', `#${ID_LOTE} ya no es LOTE`);
    exigirDato(ficha!.estado_actual === 'ACTIVO', `#${ID_LOTE} está en ${String(ficha!.estado_actual)}`);

    await escanear(page, 'ficha-lote', testInfo);

    await expect(main(page).getByRole('heading', { name: /lote/i }), 'Sección 7 (datos del lote) debe mostrarse en un LOTE').toHaveCount(1);
  });

  test('3. Encabezados (1.3.1 / 2.4.6) - h1 de página, jerarquía y las 8 secciones con encabezado propio', async ({}, testInfo) => {
    for (const [id, esLote] of [[ID_INDIVIDUAL, false], [ID_LOTE, true]] as const) {
      await abrirFicha(page, id);
      const hs = await encabezados(page);
      testInfo.annotations.push({ type: `Encabezados #${id}`, description: hs.map((h) => `h${h.nivel} ${h.texto}`).join(' · ') });

      // Un h1 que nombre la pantalla
      expect.soft(hs.filter((h) => h.nivel === 1).length, `#${id}: la página no tiene ningún h1 (el título del activo es h2)`).toBeGreaterThan(0);

      // Jerarquía sin saltos (h2 → h4, etc.)
      const saltos = hs.slice(1).filter((h, i) => h.nivel - hs[i].nivel > 1).map((h) => `h${h.nivel} "${h.texto}"`);
      expect.soft(saltos, `#${id}: saltos de nivel de encabezado`).toEqual([]);

      // Las secciones funcionales del RF-47, cada una con encabezado propio
      const textos = hs.filter((h) => h.enMain).map((h) => h.texto);
      const aplican = SECCIONES.filter((s) => esLote || !s.soloLote);
      const faltan = aplican.filter((s) => !textos.some((t) => s.re.test(t))).map((s) => `${s.n}. ${s.nombre}`);
      testInfo.annotations.push({ type: `Secciones sin encabezado #${id}`, description: faltan.join(' · ') || 'ninguna' });
      expect.soft(faltan, `#${id}: secciones del RF-47 sin encabezado propio`).toEqual([]);

      // 1.3.1: cada etiqueta asociada a su valor (p. ej. <dl>/<dt>/<dd>), no dos <div> sueltos
      const listasDescriptivas = await main(page).locator('dl').count();
      expect.soft(listasDescriptivas, `#${id}: etiqueta y valor de cada dato son dos <div> sin relación semántica (no hay <dl>/<dt>/<dd>)`).toBeGreaterThan(0);
    }
  });

  test('4. Saltar entre secciones (2.4.1) - enlace de salto y recorrido de teclado hasta el contenido', async ({}, testInfo) => {
    await abrirFicha(page, ID_INDIVIDUAL);

    const enlaceSalto = page.getByRole('link', { name: /saltar|ir al contenido|skip/i });
    expect.soft(await enlaceSalto.count(), '2.4.1: no hay enlace "Saltar al contenido" para evitar el menú lateral').toBeGreaterThan(0);

    // Cuántos Tab hacen falta desde el inicio del documento para llegar al contenido principal
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.locator('body').focus();
    let pasos = 0;
    let enMain = false;
    for (; pasos < 80 && !enMain; ) {
      await page.keyboard.press('Tab');
      pasos++;
      enMain = await page.evaluate(() => !!document.activeElement?.closest('main'));
    }
    const primerFoco = await page.evaluate(() => {
      const e = document.activeElement as HTMLElement | null;
      return e ? `${e.tagName} "${(e.getAttribute('aria-label') ?? e.textContent ?? '').trim().slice(0, 40)}"` : 'ninguno';
    });
    testInfo.annotations.push({ type: 'Tabs hasta el contenido', description: `${pasos} pulsaciones · primer foco en main: ${primerFoco}` });
    expect(enMain, 'El contenido principal debe ser alcanzable con Tab').toBe(true);

    // Las secciones de la ficha no tienen elementos enfocables: con teclado (sin lector de pantalla)
    // no hay forma de saltar a una sección concreta. Se deja constancia del mecanismo que sí existe.
    const regiones = await main(page).locator('section[aria-label], section[aria-labelledby], [role="region"]').count();
    testInfo.annotations.push({ type: 'Mecanismos para saltar entre secciones', description: `encabezados en main: ${(await encabezados(page)).filter((h) => h.enMain).length} · regiones con nombre: ${regiones} · enlaces internos: ${await main(page).locator('a[href^="#"]').count()}` });
  });

  test('5. Secciones sin datos - "Sin información registrada" expuesto como texto', async ({}, testInfo) => {
    const ficha = await abrirFicha(page, ID_INDIVIDUAL);
    const vacias = (['eventos_sanitarios', 'eventos_crecimiento', 'eventos_productivos', 'indicadores'] as const).filter(
      (k) => Array.isArray(ficha?.[k]) && (ficha![k] as unknown[]).length === 0,
    );
    exigirDato(vacias.length > 0, `#${ID_INDIVIDUAL} ya no tiene secciones vacías`);

    // Cada sección vacía debe mostrar un mensaje de texto (no un hueco ni solo un icono)
    const titulos: Record<string, string> = {
      eventos_sanitarios: 'Eventos sanitarios',
      eventos_crecimiento: 'Eventos de crecimiento',
      eventos_productivos: 'Eventos productivos',
      indicadores: 'Indicadores',
    };
    const mensajes: string[] = [];
    for (const k of vacias) {
      const tarjeta = main(page).getByRole('heading', { name: titulos[k], exact: true }).locator('xpath=..');
      const texto = (await tarjeta.innerText()).replace(titulos[k], '').trim();
      mensajes.push(`${titulos[k]}: "${texto}"`);
      expect(texto, `"${titulos[k]}" vacía debe mostrar un mensaje de texto`).not.toBe('');
    }
    testInfo.annotations.push({ type: 'Mensajes de sección vacía', description: mensajes.join(' · ') });

    // Campos sin valor: la UI muestra "—" en vez de "Sin información registrada"
    const guiones = await main(page).getByText('—', { exact: true }).count();
    testInfo.annotations.push({ type: 'Campos sin valor mostrados como "—"', description: String(guiones) });

    await escanear(page, 'secciones-vacias', testInfo);
  });

  test('6. Errores - 404 real y 403 simulado anunciados (3.3.1 / 4.1.3) - 0 violaciones axe A/AA', async ({}, testInfo) => {
    // 404 real (activo inexistente)
    await abrirFicha(page, ID_INEXISTENTE);
    const alerta404 = main(page).getByRole('alert').filter({ hasText: 'No se pudo cargar el activo' });
    await expect(alerta404, 'El 404 debe anunciarse con role="alert"').toBeVisible();
    await expect(alerta404).toContainText('El activo no existe o fue eliminado.');
    await escanear(page, 'error-404', testInfo);

    // 403 simulado sobre los GET del activo (el Administrador sí tiene permiso)
    testInfo.annotations.push({ type: 'Datos simulados', description: '403 ACCESO_DENEGADO inyectado con route.fulfill sobre GET /activos-biologicos/745 y /ficha-integral.' });
    const api403 = (url: URL) => url.pathname.includes(`/back-sigab-test/activos-biologicos/${ID_INDIVIDUAL}`);
    await page.route(api403, (r) => r.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify(ERROR_403) }));
    try {
      await abrirFicha(page, ID_INDIVIDUAL);
      // Anuncio (3.3.1/4.1.3): obligatorio. Texto E-02 del RF: se verifica aparte, sin cortar el escaneo
      await expect(main(page).getByRole('alert').first(), 'El 403 debe anunciarse con role="alert"').toBeVisible();
      const alertas = await main(page).getByRole('alert').allInnerTexts();
      testInfo.annotations.push({ type: 'Alertas 403', description: alertas.map((a) => a.replace(/\s+/g, ' ').trim()).join(' · ') });
      expect.soft(alertas.join(' '), 'El 403 debe mostrar el mensaje E-02 del RF-47').toContain(ERROR_403.message);
      // E-02: sin exponer ningún dato del activo
      await expect(main(page).getByText('QAG53R2-63077805'), 'Con 403 no se debe exponer el identificador del activo').toHaveCount(0);
      await escanear(page, 'error-403', testInfo);
    } finally {
      await page.unroute(api403);
    }
  });
});
