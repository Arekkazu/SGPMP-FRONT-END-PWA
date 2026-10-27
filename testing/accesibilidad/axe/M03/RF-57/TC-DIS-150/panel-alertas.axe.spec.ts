/**
 * TC-DIS-150 — [CRÍTICO] Accesibilidad WCAG 2.1 AA del Panel de Alertas en Tiempo Real
 * (aria-live obligatorio)
 * RF-57 v1.1 · CU-03 Generar y Gestionar Alertas de Monitoreo · Rol: Productor · Prioridad: Alta
 * Ruta: /telemetria/alertas — AlertasView + AlertaDetalleModal + CambiarEstadoAlertaModal,
 * y la bandeja de notificaciones de la barra superior (única superficie con refresco automático).
 *
 * Primera ejecución sobre el ambiente TEST nuevo (app en /sigab-test, API en /api-sgpmp-test).
 *
 * Criterios (hoja "CASOS DE PRUEBA UI/UX"): 0 violaciones axe A/AA, con énfasis CRÍTICO en
 *   4.1.3 — toda alerta nueva (sobre todo CRITICO) se anuncia por una región aria-live=assertive
 *           sin que el usuario tenga el foco en el panel;
 *   1.4.1 — la severidad LEVE/MODERADO/CRITICO se distingue también por texto/ícono;
 *   2.4.3 — orden de foco al aparecer una alerta nueva (no se roba el foco);
 *   3.3.1 — cada transición ACTIVA→EN_ATENCION→RESUELTA/DESCARTADA/VENCIDA se anuncia.
 * Herramientas: @axe-core/playwright + Lighthouse en modo snapshot sobre la misma sesión
 * (resultados/). Una auditoría fallida de Lighthouse es un defecto aunque tenga peso 0.
 * Lo que axe no ve (anuncios, foco, texto de severidad) se verifica con expect.soft.
 *
 * Datos: alertas REALES del Productor (finca "Finca Prueba Alfa"). Lo que exige un evento
 * nuevo o un cambio de estado es SIMULADO con page.route (marcado "Datos simulados"):
 *   - la alerta CRITICA nueva y su notificación se agregan a la respuesta real de
 *     GET /iot/alertas y GET /notificaciones;
 *   - las transiciones responden el PATCH /iot/alertas/{id}/estado con la alerta real
 *     modificada (nunca llega al backend).
 * PROTECCIÓN DE DATOS: toda escritura al backend se aborta por defecto; solo pasan GET y la
 * sesión. El reloj de la página se controla con page.clock para disparar el polling de 60 s
 * de la bandeja sin esperar.
 *
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_150_VIEWPORTS=escritorio
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route, type TestInfo } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { auditarLighthouse, PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';

const TC_ID = 'TC-DIS-150';
const EMAIL = process.env.TEST_PRODUCTOR_EMAIL ?? '';
const PASSWORD = process.env.TEST_PRODUCTOR_PASSWORD ?? '';
// Ambiente TEST desde 2026-10-20 (subrutas de Dokploy)
const APP = (process.env.APP_URL ?? 'https://api.inmero.co/sigab-test').replace(/\/$/, '');
const API = /\/api-sgpmp-test\//;

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_150_VIEWPORTS ?? 'movil,tablet,escritorio')
  .split(',')
  .map((v) => v.trim());

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const POLLING_NOTIFICACIONES_MS = 60_000;

const ruta = (url: URL | string) => new URL(url.toString()).pathname.replace(/^.*\/api-sgpmp-test/, '');

test.use({ launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

// ── Sesión y protección de escrituras ────────────────────────────────────────

// Un solo intento de login: si falla, la prueba se detiene (la cuenta se bloquea a los 5 intentos).
async function iniciarSesion(page: Page) {
  await page.goto(`${APP}/login`);
  await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill(EMAIL);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 });
}

interface Simulacion {
  /** Alerta agregada al principio del listado (Datos simulados). */
  alertaNueva: Record<string, unknown> | null;
  /** Notificación agregada al principio de la bandeja (Datos simulados). */
  notificacionNueva: Record<string, unknown> | null;
  /** Estado forzado por id de alerta en listado y detalle (Datos simulados). */
  estados: Map<number, string>;
  /** Último detalle real leído, base de las respuestas simuladas del PATCH. */
  detalles: Map<number, Record<string, unknown>>;
  patches: { id: number; cuerpo: Record<string, unknown> }[];
  /** Último listado sin filtros que recibió la tabla (en el mismo orden de las filas). */
  lista: Record<string, unknown>[];
}

async function interceptar(page: Page): Promise<Simulacion> {
  const sim: Simulacion = { alertaNueva: null, notificacionNueva: null, estados: new Map(), detalles: new Map(), patches: [], lista: [] };
  await page.route((url) => API.test(url.href), async (route: Route) => {
    const req = route.request();
    const metodo = req.method();
    const p = ruta(req.url());
    if (metodo === 'OPTIONS' || /^\/sesiones\/?(refresh)?$/.test(p)) return route.fallback();

    // PATCH de estado: SIMULADO con la alerta real modificada
    const patch = p.match(/^\/iot\/alertas\/(\d+)\/estado$/);
    if (patch && metodo === 'PATCH') {
      const id = Number(patch[1]);
      const cuerpo = req.postDataJSON() ?? {};
      sim.patches.push({ id, cuerpo });
      sim.estados.set(id, cuerpo.nuevo_estado);
      const base = sim.detalles.get(id) ?? { id_alerta: id };
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...base, estado_alerta: cuerpo.nuevo_estado }) });
    }
    if (metodo !== 'GET') return route.abort();

    if (p === '/iot/alertas') {
      const res = await route.fetch();
      const json = await res.json();
      const estado = new URL(req.url()).searchParams.get('estado');
      let items: Record<string, unknown>[] = (json.items ?? []).map((a: Record<string, unknown>) =>
        sim.estados.has(a.id_alerta as number) ? { ...a, estado_alerta: sim.estados.get(a.id_alerta as number) } : a);
      if (sim.alertaNueva && (!estado || estado === sim.alertaNueva.estado_alerta)) items = [sim.alertaNueva, ...items];
      if (estado) items = items.filter((a) => a.estado_alerta === estado);
      if (!estado && !new URL(req.url()).searchParams.get('severidad')) sim.lista = items;
      return route.fulfill({ response: res, json: { ...json, items, total: estado ? items.length : (json.total ?? 0) + (sim.alertaNueva ? 1 : 0) } });
    }
    const detalle = p.match(/^\/iot\/alertas\/(\d+)$/);
    if (detalle) {
      const id = Number(detalle[1]);
      if (sim.alertaNueva && id === sim.alertaNueva.id_alerta) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...sim.alertaNueva, historico_estados: [] }) });
      }
      const res = await route.fetch();
      const json = await res.json();
      sim.detalles.set(id, json);
      return route.fulfill({ response: res, json: sim.estados.has(id) ? { ...json, estado_alerta: sim.estados.get(id) } : json });
    }
    if (p === '/notificaciones' && sim.notificacionNueva) {
      const res = await route.fetch();
      const json = await res.json();
      return route.fulfill({ response: res, json: { ...json, total: (json.total ?? 0) + 1, no_leidas: (json.no_leidas ?? 0) + 1, items: [sim.notificacionNueva, ...(json.items ?? [])] } });
    }
    return route.fallback();
  });
  return sim;
}

async function irAAlertas(page: Page) {
  await page.goto(`${APP}/telemetria/alertas`);
  await expect(page.getByRole('heading', { level: 1, name: 'Alertas Ambientales y Sanitarias' })).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 60_000 });
}

/** Textos de todas las regiones que un lector de pantalla anuncia sin mover el foco. */
async function textoAnunciado(page: Page, soloAssertive = false) {
  const selector = soloAssertive
    ? '[aria-live="assertive"], [role="alert"]'
    : '[aria-live="assertive"], [aria-live="polite"], [role="alert"], [role="status"], [role="log"]';
  return (await page.locator(selector).allInnerTexts()).join(' | ').replace(/\s+/g, ' ');
}

// ── Escaneo ──────────────────────────────────────────────────────────────────

function resumenViolaciones(violaciones: { id: string; impact?: string | null; nodes: { target: unknown }[] }[]) {
  return violaciones.map((v) => `  - ${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => JSON.stringify(n.target)).join(', ')}`).join('\n');
}

async function escanear(page: Page, estado: string, testInfo: TestInfo) {
  const paso = `${estado}-${testInfo.project.name}`;
  await page.evaluate(() => document.fonts.ready);
  const axe = await new AxeBuilder({ page }).withTags(ETIQUETAS_WCAG).analyze();
  guardarResultadoAxe(TC_ID, __dirname, paso, axe);
  const lh = await auditarLighthouse(page, TC_ID, __dirname, paso);
  testInfo.annotations.push({
    type: `Lighthouse ${paso}`,
    description:
      `Puntaje accesibilidad: ${lh.puntaje === null ? 'N/A' : Math.round(lh.puntaje * 100)}` +
      (lh.auditoriasFallidas.length ? ` · Fallidas: ${lh.auditoriasFallidas.map((a) => a.id).join(', ')}` : ' · 0 auditorías fallidas'),
  });
  await testInfo.attach(`lighthouse-${paso}.html`, { path: lh.archivoHtml, contentType: 'text/html' });
  expect.soft(axe.violations, `Violaciones axe A/AA en "${paso}":\n${resumenViolaciones(axe.violations)}`).toEqual([]);
  expect.soft(lh.auditoriasFallidas.map((a) => a.id), `DEFECTO: auditorías de accesibilidad fallidas en Lighthouse ("${paso}")`).toEqual([]);
}

/** Abre por teclado la fila cuyo texto contiene `texto` y espera el detalle. */
async function abrirDetalle(page: Page, texto: string | RegExp) {
  const fila = page.locator('tbody tr').filter({ hasText: texto }).first();
  await fila.focus();
  await page.keyboard.press('Enter');
  const dialogo = page.getByRole('dialog').first();
  await expect(dialogo).toBeVisible({ timeout: 30_000 });
  await expect(dialogo.getByText('Histórico de estados')).toBeVisible({ timeout: 30_000 });
  return dialogo;
}

// ── Pruebas ──────────────────────────────────────────────────────────────────

test.describe('TC-DIS-150 — Panel de Alertas en Tiempo Real', () => {
  // Cada test inicia sesión por su cuenta: un defecto en uno no debe saltar los demás

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!VIEWPORTS_HABILITADOS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_150_VIEWPORTS.`);
    await iniciarSesion(page);
  });

  test('a. Panel en reposo: escaneo y severidad comunicada por texto e ícono (1.4.1)', async ({ page }, testInfo) => {
    await interceptar(page);
    await irAAlertas(page);

    // 1.4.1: cada celda de severidad y de estado tiene texto propio y un ícono, no solo color
    const celdas = await page.locator('tbody tr').evaluateAll((filas) => filas.map((f) => {
      const td = f.querySelectorAll('td');
      return { severidad: td[3]?.textContent?.trim() ?? '', iconoSev: !!td[3]?.querySelector('svg'), estado: td[6]?.textContent?.trim() ?? '', iconoEst: !!td[6]?.querySelector('svg') };
    }));
    testInfo.annotations.push({ type: 'Datos', description: `${celdas.length} alertas reales del Productor` });
    for (const c of celdas) {
      expect.soft(c.severidad, 'DEFECTO 1.4.1: severidad sin texto').toMatch(/^(Leve|Moderado|Crítico)$/);
      expect.soft(c.iconoSev, `DEFECTO 1.4.1: severidad "${c.severidad}" sin ícono`).toBe(true);
      expect.soft(c.estado, 'DEFECTO 1.4.1: estado sin texto').toMatch(/^(Activa|En atención|Resuelta|Descartada|Vencida)$/);
    }
    const severidades = new Set(celdas.map((c) => c.severidad));
    expect.soft([...severidades].sort(), 'Precondición: el listado muestra las 3 severidades').toEqual(['Crítico', 'Leve', 'Moderado']);

    await escanear(page, 'reposo', testInfo);
  });

  test('b. [CRÍTICO 4.1.3] Alerta CRITICA nueva se anuncia sin mover el foco (Datos simulados)', async ({ page }, testInfo) => {
    const sim = await interceptar(page);
    await page.clock.install();
    await irAAlertas(page);

    // Foco fuera del panel de alertas: en el filtro "Tipo de alerta"
    const campoFoco = page.getByLabel('Tipo de alerta');
    await campoFoco.focus();
    const anunciadoAntes = await textoAnunciado(page);

    // Llega una alerta CRITICA nueva (Datos simulados): misma forma que una alerta real
    const ahora = new Date().toISOString();
    sim.alertaNueva = {
      id_alerta: 990150, tipo_alerta: 'ESTRES_TERMICO', severidad: 'CRITICO', estado_alerta: 'ACTIVA', origen_evento: 'BACKEND',
      tipo_variable: 'temperatura_ambiental', valor: 41.5, unidad: '°C', fecha_evento: ahora, fecha_generacion: ahora, fecha_registro: ahora,
      fecha_notificacion: ahora, fecha_atencion: null, fecha_resolucion: null, fecha_vencimiento: null, ultima_ocurrencia: ahora,
      frecuencia_evento: 1, reglas_activas: [], contexto_activo_biologico: null, metadato_evento: null, accion_sugerida: 'Revisar ventilación del galpón',
      motivo_descarte: null, diagnostico: null, conflicto_resolucion: null, severidad_edge_original: null, severidad_ia: null,
      tiene_inferencia_no_disponible: false, tiene_contexto_incompleto: false, tiene_generada_por_reevaluacion: false, id_sensor: 80,
    };
    sim.notificacionNueva = {
      id_notificacion: 990150, id_evento: 990150, tipo_evento: 20, es_leido: false, fecha_envio: ahora,
      mensaje: 'ALERTA CRÍTICA: Estrés térmico en QA58-A1 Galpon Principal (41.5 °C). Revisar ventilación del galpón.',
    };

    // Pasa el intervalo de refresco automático (polling de la bandeja, 60 s) sin interacción
    await page.clock.runFor(POLLING_NOTIFICACIONES_MS + 2_000);
    await page.clock.resume();
    await page.waitForTimeout(3_000);

    const anunciadoAssertive = await textoAnunciado(page, true);
    const anunciado = await textoAnunciado(page);
    const campana = await page.locator('button[aria-label^="Notificaciones"]').getAttribute('aria-label');
    const enTabla = await page.locator('tbody tr').filter({ hasText: 'ESTRES_TERMICO' }).filter({ hasText: '41.5' }).count();
    testInfo.annotations.push({ type: 'Anuncio', description: `assertive/alert: "${anunciadoAssertive || '(vacío)'}" · todas las regiones live: "${anunciado || '(vacío)'}" · campana: "${campana}" · fila nueva en la tabla: ${enTabla}` });

    expect.soft(anunciadoAssertive, 'DEFECTO CRÍTICO 4.1.3: la alerta CRITICA nueva no se anuncia en una región aria-live="assertive" sin mover el foco').toMatch(/cr[ií]tic|estr[eé]s t[eé]rmico/i);
    expect.soft(anunciado === anunciadoAntes ? '' : anunciado, 'DEFECTO 4.1.3: ninguna región live cambió al llegar la alerta').not.toBe('');
    expect.soft(enTabla, 'DEFECTO: el panel no se actualiza solo al llegar la alerta (sin tiempo real)').toBeGreaterThan(0);
    // 2.4.3: la llegada de una alerta no debe robar el foco
    await expect.soft(campoFoco, 'DEFECTO 2.4.3: el foco se movió al llegar la alerta').toBeFocused();

    await escanear(page, 'alerta-critica-nueva', testInfo);
  });

  test('c. Transición ACTIVA → EN_ATENCION → RESUELTA anunciada (3.3.1 / 4.1.3) (Datos simulados)', async ({ page }, testInfo) => {
    const sim = await interceptar(page);
    await irAAlertas(page);

    // 2026-10-27: filtrar las filas por hasText: 'Activa' es substring e insensible a
    // mayúsculas — puede calzar con una fila que en realidad está DESCARTADA (o cualquier
    // otra) si "activa" aparece en otra celda. Se ubica la fila ACTIVA real por posición,
    // igual que ya hace el test 'd' con sim.lista.
    const idx = sim.lista.findIndex((a) => a.estado_alerta === 'ACTIVA');
    expect(idx, 'Precondición: al menos 1 alerta ACTIVA del Productor').toBeGreaterThanOrEqual(0);
    const fila = page.locator('tbody tr').nth(idx);
    const texto = (await fila.locator('td').first().innerText()).trim();
    const fecha = (await fila.locator('td').nth(7).innerText()).trim();
    const filaId = page.locator('tbody tr').filter({ hasText: texto }).filter({ hasText: fecha });

    // Detalle abierto por teclado
    let dialogo = await abrirDetalle(page, fecha);
    await escanear(page, 'detalle-activa', testInfo);
    const idAlerta = Number((await dialogo.getByRole('heading').first().innerText()).match(/#(\d+)/)?.[1]);

    // ACTIVA → EN_ATENCION
    await dialogo.getByRole('button', { name: 'Tomar en atención' }).click();
    const modal = page.getByRole('dialog', { name: 'Tomar alerta en atención' });
    await expect(modal).toBeVisible();
    await escanear(page, 'modal-en-atencion', testInfo);
    await modal.getByRole('button', { name: 'Tomar en atención' }).click();
    await expect(modal).toBeHidden({ timeout: 30_000 });
    await page.waitForTimeout(1_500);
    const anuncio1 = await textoAnunciado(page);
    testInfo.annotations.push({ type: 'Anuncio EN_ATENCION', description: anuncio1 || '(ninguno)' });
    expect.soft(anuncio1, 'DEFECTO 3.3.1/4.1.3: la transición ACTIVA→EN_ATENCION no se anuncia').toMatch(/atenci[oó]n/i);
    expect.soft(sim.patches.at(-1), 'PATCH simulado de EN_ATENCION').toMatchObject({ id: idAlerta, cuerpo: { nuevo_estado: 'EN_ATENCION' } });
    // 2.4.3: al cerrarse los diálogos el foco vuelve a la fila de la alerta (o a un punto lógico)
    const foco = await page.evaluate(() => document.activeElement?.tagName ?? 'BODY');
    testInfo.annotations.push({ type: 'Foco tras cerrar', description: foco });
    expect.soft(foco, 'DEFECTO 2.4.3: el foco se pierde (queda en <body>) al cerrar el diálogo').not.toBe('BODY');
    await expect(filaId.first()).toContainText('En atención', { timeout: 30_000 });

    // EN_ATENCION → RESUELTA, con el motivo obligatorio vacío primero (3.3.1)
    dialogo = await abrirDetalle(page, fecha);
    await dialogo.getByRole('button', { name: 'Resolver' }).click();
    const modalRes = page.getByRole('dialog', { name: 'Marcar alerta como resuelta' });
    await modalRes.getByRole('button', { name: 'Marcar resuelta' }).click();
    await expect(modalRes.getByRole('alert')).toContainText('obligatorio');
    await expect.soft(modalRes.getByLabel(/Acción tomada/), 'DEFECTO 3.3.1: campo con error sin aria-invalid').toHaveAttribute('aria-invalid', 'true');
    const describedby = await modalRes.getByLabel(/Acción tomada/).getAttribute('aria-describedby');
    expect.soft(describedby, 'DEFECTO 3.3.1: el error del motivo no está asociado al campo (aria-describedby)').toBeTruthy();
    await escanear(page, 'modal-resuelta-error', testInfo);
    await modalRes.getByLabel(/Acción tomada/).fill('Se ajustó la ventilación del galpón (prueba QA, simulada).');
    await modalRes.getByRole('button', { name: 'Marcar resuelta' }).click();
    await expect(modalRes).toBeHidden({ timeout: 30_000 });
    await page.waitForTimeout(1_500);
    const anuncio2 = await textoAnunciado(page);
    testInfo.annotations.push({ type: 'Anuncio RESUELTA', description: anuncio2 || '(ninguno)' });
    expect.soft(anuncio2, 'DEFECTO 3.3.1/4.1.3: la transición EN_ATENCION→RESUELTA no se anuncia').toMatch(/resuelt/i);
    await expect(filaId.first()).toContainText('Resuelta', { timeout: 30_000 });
  });

  test('d. Transición ACTIVA → DESCARTADA y ACTIVA → VENCIDA anunciadas (Datos simulados)', async ({ page }, testInfo) => {
    const sim = await interceptar(page);
    await page.clock.install();
    await irAAlertas(page);

    // Dos alertas ACTIVA distintas, ubicadas por id_alerta (la fila sigue el orden del listado;
    // varias alertas comparten la misma hora de generación)
    const activas = sim.lista.filter((a) => a.estado_alerta === 'ACTIVA').map((a) => a.id_alerta as number);
    expect(activas.length, 'Precondición: al menos 2 alertas ACTIVA del Productor').toBeGreaterThanOrEqual(2);
    const [idDesc, idVenc] = activas;
    const filaDe = (id: number) => page.locator('tbody tr').nth(sim.lista.findIndex((a) => a.id_alerta === id));
    testInfo.annotations.push({ type: 'Alertas usadas', description: `DESCARTADA #${idDesc} · VENCIDA #${idVenc}` });

    // ACTIVA → DESCARTADA (falso positivo, motivo obligatorio)
    await filaDe(idDesc).focus();
    await page.keyboard.press('Enter');
    const dialogo = page.getByRole('dialog', { name: new RegExp(`#${idDesc}\\b`) });
    await expect(dialogo).toBeVisible({ timeout: 30_000 });
    await dialogo.getByRole('button', { name: 'Falso positivo' }).click();
    const modal = page.getByRole('dialog', { name: 'Descartar alerta (falso positivo)' });
    await expect(modal).toBeVisible();
    await escanear(page, 'modal-descartada', testInfo);
    await modal.getByLabel(/Motivo del descarte/).fill('Sensor expuesto a sol directo (prueba QA, simulada).');
    await modal.getByRole('button', { name: 'Descartar' }).click();
    await expect(modal).toBeHidden({ timeout: 30_000 });
    await page.waitForTimeout(1_500);
    const anuncioDesc = await textoAnunciado(page);
    testInfo.annotations.push({ type: 'Anuncio DESCARTADA', description: anuncioDesc || '(ninguno)' });
    expect.soft(anuncioDesc, 'DEFECTO 3.3.1/4.1.3: la transición ACTIVA→DESCARTADA no se anuncia').toMatch(/descart/i);
    expect.soft(sim.patches.at(-1)?.cuerpo, 'PATCH simulado de DESCARTADA').toMatchObject({ nuevo_estado: 'DESCARTADA' });

    // ACTIVA → VENCIDA: la hace el sistema (vence el SLA); llega con el siguiente refresco
    const filaVenc = filaDe(idVenc);
    await page.getByLabel('Tipo de alerta').focus();
    sim.estados.set(idVenc, 'VENCIDA');
    await page.clock.runFor(POLLING_NOTIFICACIONES_MS + 2_000);
    await page.clock.resume();
    await page.waitForTimeout(3_000);
    const anuncioVenc = await textoAnunciado(page);
    const estadoFila = (await filaVenc.locator('td').nth(6).innerText()).trim();
    testInfo.annotations.push({ type: 'Anuncio VENCIDA', description: `${anuncioVenc || '(ninguno)'} · estado en la tabla: ${estadoFila}` });
    expect.soft(anuncioVenc, 'DEFECTO 3.3.1/4.1.3: el vencimiento de la alerta (ACTIVA→VENCIDA) no se anuncia').toMatch(/vencid/i);
    expect.soft(estadoFila, 'DEFECTO: el panel no refleja solo el vencimiento (sin tiempo real)').toBe('Vencida');
    await escanear(page, 'tras-vencimiento', testInfo);
  });

  test('e. Teclado: filtros, filas y detalle operables solo con teclado (2.1.1 / 2.4.7)', async ({ page }, testInfo) => {
    await interceptar(page);
    await irAAlertas(page);

    // Filtro de severidad CRITICO aplicado por teclado
    const severidad = page.getByLabel('Severidad');
    await severidad.focus();
    await severidad.selectOption('CRITICO');
    await page.getByRole('button', { name: /Aplicar/ }).focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2_000);
    const sevs = await page.locator('tbody tr td:nth-child(4)').allInnerTexts();
    expect.soft(sevs.length, 'El filtro CRITICO devuelve filas').toBeGreaterThan(0);
    expect.soft(sevs.every((s) => s.trim() === 'Crítico'), 'El filtro por teclado aplica severidad CRITICO').toBe(true);

    // Recorrido con Tab hasta la primera fila: el foco es visible en cada parada
    await page.locator('tbody tr').first().focus();
    const contorno = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      const cs = getComputedStyle(el);
      return { tag: el.tagName, outline: cs.outlineStyle !== 'none' && cs.outlineWidth !== '0px', sombra: cs.boxShadow !== 'none', fondo: cs.backgroundColor };
    });
    testInfo.annotations.push({ type: 'Foco en fila', description: JSON.stringify(contorno) });
    expect.soft(contorno.outline || contorno.sombra, 'DEFECTO 2.4.7: la fila enfocada no muestra foco visible').toBe(true);
    const rol = (await page.locator('tbody tr').first().getAttribute('role')) ?? '(sin role)';
    expect.soft(rol, 'DEFECTO 4.1.2: fila interactiva (tabIndex=0, abre el detalle) sin rol de botón/enlace').toMatch(/button|link/);

    // Escape cierra el detalle y el foco vuelve a la fila
    await page.keyboard.press('Enter');
    const dialogo = page.getByRole('dialog').first();
    await expect(dialogo).toBeVisible({ timeout: 30_000 });
    await page.keyboard.press('Escape');
    await expect(dialogo).toBeHidden();
    const vuelve = await page.evaluate(() => document.activeElement?.tagName);
    expect.soft(vuelve, 'DEFECTO 2.4.3: al cerrar el detalle el foco no vuelve a la fila').toBe('TR');
    await escanear(page, 'filtro-critico', testInfo);
  });
});
