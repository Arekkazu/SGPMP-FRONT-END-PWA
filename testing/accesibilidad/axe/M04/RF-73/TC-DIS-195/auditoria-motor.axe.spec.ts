/**
 * TC-DIS-195 — Verificar accesibilidad WCAG 2.1 AA de la bitácora de Auditoría y Trazabilidad
 * del Motor de Predicción
 * RF-73 · CU-09 - Auditar y Trazar Eventos del Motor · Rol: Administrador · Prioridad: Alta
 * Ruta: /prediccion/auditoria — AuditoriaView + AuditoriaFiltros + AuditoriaTable + EventoAuditoriaModal
 *
 * Primera ejecución sobre el ambiente TEST nuevo (app en /sigab-test, API en /api-sgpmp-test).
 *
 * Precondiciones (hoja "CASOS DE PRUEBA UI/UX"):
 *   - Rol: Administrador o Auditor. Se usa Administrador: los datos semilla de RF-73 (2026-10-22)
 *     se cargaron para esa cuenta.
 *   - Bitácora con eventos en los 4 niveles de severidad y eventos de un modelo POBLACIONAL y de
 *     uno INDIVIDUAL con métricas en el payload. Datos REALES: los 6 eventos semilla (WARNING,
 *     ERROR, CRITICAL × INDIVIDUAL / POBLACIONAL) se ubican por las métricas de su payload.
 *
 * Criterios de aceptación: 0 violaciones axe A/AA en
 *   1.3.1 — tabla con encabezados id_evento, tipo_evento, severidad_evento, timestamp_evento y
 *           actor asociados a sus celdas;
 *   1.4.1 — la severidad INFO / WARNING / ERROR / CRITICAL no depende solo del color;
 *   2.1.1 / 2.4.7 — filtros por tipo de evento, actor y rango de fechas operables por teclado;
 *   1.3.1 (detalle) — métricas del payload con su etiqueta según el paradigma (INDIVIDUAL:
 *           f1_score_global, recall_clase_riesgo_alto; POBLACIONAL: calibración, tasa de falsos
 *           positivos en rutina, tasa de detección en eventos clínicos), nunca 'F1: —' ni vacías;
 *   4.1.2 — el filtro tipo_modelo expone los 6 valores con name/role/value.
 * Herramientas: @axe-core/playwright + Lighthouse en modo snapshot sobre la misma sesión
 * (resultados/). Una auditoría fallida de Lighthouse es un defecto aunque tenga peso 0.
 * PROTECCIÓN DE DATOS: vista de solo lectura; toda escritura al backend se aborta.
 *
 * Navegación directa por URL (page.goto), sin sidebar.
 * Viewports: movil / tablet / escritorio. Para restringir: TC_DIS_195_VIEWPORTS=escritorio
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route, type TestInfo } from '@playwright/test';
import { guardarResultadoAxe } from '../../../_shared/axeReport';
import { auditarLighthouse, PUERTO_LIGHTHOUSE } from '../../../_shared/lighthouse';

const TC_ID = 'TC-DIS-195';
const EMAIL = process.env.TEST_ADMIN_EMAIL ?? '';
const PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? '';
// Ambiente TEST desde 2026-10-20 (subrutas de Dokploy)
const APP = (process.env.APP_URL ?? 'https://api.inmero.co/sigab-test').replace(/\/$/, '');
const API = /\/api-sgpmp-test\//;

const VIEWPORTS_HABILITADOS = (process.env.TC_DIS_195_VIEWPORTS ?? 'movil,tablet,escritorio')
  .split(',')
  .map((v) => v.trim());

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

const ENCABEZADOS: [string, RegExp][] = [
  ['id_evento', /^id|id de evento|id evento/i],
  ['tipo_evento', /tipo de evento|tipo_evento/i],
  ['severidad_evento', /severidad/i],
  ['timestamp_evento', /timestamp|fecha/i],
  ['actor', /actor/i],
];

const TIPOS_MODELO = ['MODELO_AVES', 'MODELO_PORCINOS', 'MODELO_ACUICULTURA', 'MODELO_ESPECIES_MEDIANAS', 'MODELO_ESPECIES_GRANDES', 'MODELO_RIESGO_CONTAGIO'];

const METRICAS = {
  INDIVIDUAL: [['f1_score_global', /f1/i], ['recall_clase_riesgo_alto', /recall/i]] as [string, RegExp][],
  POBLACIONAL: [['calibración', /calibraci/i], ['tasa de falsos positivos', /falsos positivos/i], ['tasa de detección', /detecci/i]] as [string, RegExp][],
};

interface EventoApi {
  id_evento: string;
  tipo_evento: string;
  severidad_evento: string;
  payload_evento?: Record<string, unknown> | null;
}

test.use({ launchOptions: { args: [`--remote-debugging-port=${PUERTO_LIGHTHOUSE}`] } });

// ── Sesión y datos reales ────────────────────────────────────────────────────

// Un solo intento de login: si falla, la prueba se detiene (la cuenta se bloquea a los 5 intentos).
async function iniciarSesion(page: Page) {
  await page.goto(`${APP}/login`);
  await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill(EMAIL);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60_000 });
}

/** Solo lecturas; guarda la página de eventos que recibe la tabla. */
async function interceptar(page: Page) {
  const estado = { eventos: [] as EventoApi[], total: 0, ultimaConsulta: '' };
  await page.route((url) => API.test(url.href), async (route: Route) => {
    const req = route.request();
    const metodo = req.method();
    const p = new URL(req.url()).pathname;
    if (metodo === 'OPTIONS' || /\/sesiones\/?(refresh)?$/.test(p)) return route.fallback();
    if (metodo !== 'GET') return route.abort();
    // El resumen de la vista consulta la misma ruta con por_pagina=1 (un conteo por severidad): no es la tabla
    if (/\/prediccion\/auditoria\/?$/.test(p) && new URL(req.url()).searchParams.get('por_pagina') !== '1') {
      const res = await route.fetch();
      const json = await res.json();
      estado.eventos = json.items ?? json.eventos ?? json.registros ?? [];
      estado.total = json.total ?? json.total_registros ?? estado.eventos.length;
      estado.ultimaConsulta = new URL(req.url()).search;
      return route.fulfill({ response: res, json });
    }
    return route.fallback();
  });
  return estado;
}

async function irAAuditoria(page: Page) {
  await page.goto(`${APP}/prediccion/auditoria`);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/auditor/i, { timeout: 60_000 });
  await expect(page.locator('main tbody tr').first()).toBeVisible({ timeout: 60_000 });
}

/**
 * Filtra la tabla por severidad y espera la respuesta. La primera página sin filtro se llena de
 * eventos INFO (los propios inicios de sesión de las pruebas los generan); los eventos semilla con
 * métricas quedan más atrás y se alcanzan filtrando.
 */
/** Columna (1-based) de la severidad, ubicada por su encabezado (1.4.0 agregó "ID de evento" y "RF origen"). */
async function colSeveridad(page: Page) {
  const encabezados = (await page.locator('main thead th').allInnerTexts()).map((h) => h.trim());
  return encabezados.findIndex((h) => /severidad/i.test(h)) + 1;
}

const ETIQUETA_SEVERIDAD: Record<string, string> = { INFO: 'Info', WARNING: 'Warning', ERROR: 'Error', CRITICAL: 'Crítico' };

async function filtrarSeveridad(page: Page, estado: { eventos: EventoApi[]; ultimaConsulta: string }, severidad: string) {
  await page.locator('#aud-sev').selectOption(severidad);
  await page.locator('main').getByRole('button', { name: /aplicar/i }).click();
  // Listo cuando la última respuesta es la de esta severidad y la tabla pinta exactamente esas filas
  await expect.poll(async () => {
    if (!estado.ultimaConsulta.includes(`severidad_evento=${severidad}`)) return false;
    const celdas = await page.locator(`main tbody tr td:nth-child(${await colSeveridad(page)})`).allInnerTexts();
    return celdas.length === estado.eventos.length && celdas.every((c) => c.trim() === ETIQUETA_SEVERIDAD[severidad]);
  }, { timeout: 30_000, message: `La tabla refleja el filtro de severidad ${severidad}` }).toBe(true);
}

/** Paradigma de un evento según su payload (tipo_modelo o métricas que trae). */
function paradigma(e: EventoApi): 'INDIVIDUAL' | 'POBLACIONAL' | null {
  const p = JSON.stringify(e.payload_evento ?? {}).toLowerCase();
  if (/poblacional|riesgo_contagio|calibraci|falsos_positivos|tasa_deteccion/.test(p)) return 'POBLACIONAL';
  if (/individual|f1_score|recall/.test(p)) return 'INDIVIDUAL';
  return null;
}

/** Elemento enfocado y si muestra un indicador de foco. */
async function enfocado(page: Page) {
  return page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null;
    if (!a || a === document.body) return { descripcion: '(body)', focoVisible: false };
    const cs = getComputedStyle(a);
    const label = a.id ? document.querySelector(`label[for="${a.id}"]`)?.textContent : '';
    return {
      descripcion: `${a.tagName.toLowerCase()}${a.getAttribute('type') ? `[${a.getAttribute('type')}]` : ''} "${(label || a.getAttribute('aria-label') || a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30)}"`,
      focoVisible: (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== 'none',
    };
  });
}

// ── Escaneo ──────────────────────────────────────────────────────────────────

function resumenViolaciones(violaciones: { id: string; impact?: string | null; nodes: { target: unknown }[] }[]) {
  return violaciones.map((v) => `  - ${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => JSON.stringify(n.target)).join(', ')}`).join('\n');
}

async function escanear(page: Page, estado: string, testInfo: TestInfo) {
  const paso = `${estado}-${testInfo.project.name}`;
  // Sin hover accidental (el modal móvil sube bajo el puntero)
  await page.mouse.move(1, 1);
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

// ── Pruebas ──────────────────────────────────────────────────────────────────

test.describe('TC-DIS-195 — Bitácora de Auditoría y Trazabilidad del Motor', () => {
  // Cada test inicia sesión por su cuenta: un defecto en uno no debe saltar los demás
  test.describe.configure({ mode: 'default', timeout: 300_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!VIEWPORTS_HABILITADOS.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por TC_DIS_195_VIEWPORTS.`);
    await iniciarSesion(page);
  });

  test('a. [1.3.1 / 1.4.1] Tabla de eventos: escaneo, encabezados y severidad con texto e ícono', async ({ page }, testInfo) => {
    const estado = await interceptar(page);
    await irAAuditoria(page);
    testInfo.annotations.push({ type: 'Datos', description: `${estado.eventos.length} eventos en la primera página (total ${estado.total})` });

    // 1.3.1: encabezados del caso
    const encabezados = (await page.locator('main thead th').allInnerTexts()).map((t) => t.trim());
    testInfo.annotations.push({ type: 'Encabezados', description: encabezados.join(' | ') });
    const faltan = ENCABEZADOS.filter(([, re]) => !encabezados.some((h) => re.test(h))).map(([n]) => n);
    expect.soft(faltan, 'DEFECTO 1.3.1: encabezados del caso que la tabla no tiene').toEqual([]);

    // 1.4.1: cada severidad con texto e ícono propio
    const iSev = encabezados.findIndex((h) => /severidad/i.test(h));
    const badges = await page.locator(`main tbody tr td:nth-child(${iSev + 1})`).evaluateAll((tds) => tds.map((td) => ({
      texto: (td.textContent ?? '').trim(),
      icono: td.querySelector('svg')?.getAttribute('class')?.match(/lucide-[\w-]+/g)?.find((c) => c !== 'lucide') ?? null,
    })));
    const iconoPor = new Map<string, Set<string | null>>();
    for (const b of badges) iconoPor.set(b.texto, (iconoPor.get(b.texto) ?? new Set()).add(b.icono));
    testInfo.annotations.push({ type: 'Severidad: texto → ícono', description: JSON.stringify([...iconoPor].map(([k, v]) => [k, [...v]])) });
    expect.soft(badges.filter((b) => !b.texto || !b.icono).length, '1.4.1: cada severidad lleva texto e ícono').toBe(0);

    // Los botones "Ver" de cada fila
    const nombres = await page.locator('main tbody tr').getByRole('button').evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-label') ?? b.textContent ?? ''));
    testInfo.annotations.push({ type: 'Nombre de los botones de detalle', description: `${nombres.length} botones · nombres distintos: ${JSON.stringify([...new Set(nombres)])}` });
    await escanear(page, 'tabla-eventos', testInfo);

    // Precondición y 1.4.1 por nivel: cada severidad existe y se muestra con su texto e ícono
    const porNivel: string[] = [];
    for (const sev of ['INFO', 'WARNING', 'ERROR', 'CRITICAL']) {
      await filtrarSeveridad(page, estado, sev);
      const celdas = await page.locator(`main tbody tr td:nth-child(${iSev + 1})`).evaluateAll((tds) => tds.map((td) => `${(td.textContent ?? '').trim()}|${td.querySelector('svg')?.getAttribute('class')?.match(/lucide-[\w-]+/g)?.find((c) => c !== 'lucide') ?? 'sin-ícono'}`));
      porNivel.push(`${sev}: ${estado.eventos.length} eventos · ${[...new Set(celdas)].join(', ') || '(ninguno)'}`);
      expect.soft(estado.eventos.length, `Precondición: eventos con severidad ${sev}`).toBeGreaterThan(0);
    }
    testInfo.annotations.push({ type: 'Por severidad (filtro)', description: porNivel.join(' ‖ ') });
  });

  test('b. [2.1.1 / 2.4.7 / 4.1.2] Filtros por tipo de evento, actor, tipo_modelo y fechas con teclado', async ({ page }, testInfo) => {
    await interceptar(page);
    await irAAuditoria(page);
    const controles = await page.locator('main').locator('select, input').evaluateAll((els) => els.map((e) => {
      const lab = e.id ? document.querySelector(`label[for="${e.id}"]`)?.textContent : '';
      return (lab || e.getAttribute('aria-label') || e.getAttribute('placeholder') || e.tagName).trim();
    }));
    testInfo.annotations.push({ type: 'Filtros de la vista', description: controles.join(' | ') });
    expect.soft(controles.some((c) => /actor|usuario/i.test(c)), 'DEFECTO 2.1.1: no hay filtro por actor').toBe(true);
    const filtroModelo = page.locator('main').getByLabel(/tipo de modelo|tipo_modelo|modelo/i);
    const opcionesModelo = (await filtroModelo.count()) ? await filtroModelo.first().locator('option').evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value)) : [];
    testInfo.annotations.push({ type: 'Filtro tipo_modelo', description: opcionesModelo.length ? opcionesModelo.join(', ') : '(no existe)' });
    expect.soft(TIPOS_MODELO.filter((m) => !opcionesModelo.includes(m)), 'DEFECTO 4.1.2: el filtro tipo_modelo no existe o no expone los 6 valores del RFC-009').toEqual([]);

    // Recorrido con teclado del panel de filtros
    await page.locator('#aud-tipo').focus();
    const recorrido = [await enfocado(page)];
    for (let i = 0; i < 14 && !/Aplicar/i.test(recorrido[recorrido.length - 1].descripcion); i++) {
      await page.keyboard.press('Tab');
      recorrido.push(await enfocado(page));
    }
    testInfo.annotations.push({ type: 'Recorrido con Tab', description: recorrido.map((p) => `${p.descripcion}${p.focoVisible ? '' : ' [sin indicador medido]'}`).join(' → ') });
    for (const [nombre, re] of [['tipo de evento', /Tipo de evento/i], ['desde', /Desde/i], ['hasta', /Hasta/i]] as const) {
      expect.soft(recorrido.some((p) => re.test(p.descripcion)), `2.1.1: el filtro "${nombre}" se alcanza con Tab`).toBe(true);
    }
    const porControl = new Map<string, boolean>();
    for (const p of recorrido) if (p.descripcion !== '(body)') porControl.set(p.descripcion, (porControl.get(p.descripcion) ?? false) || p.focoVisible);
    expect.soft([...porControl].filter(([, v]) => !v).map(([k]) => k), 'DEFECTO 2.4.7: controles de filtro sin indicador de foco visible').toEqual([]);

    // Aplicar un filtro de severidad con teclado
    await page.locator('#aud-sev').focus();
    await page.locator('#aud-sev').selectOption('CRITICAL');
    const aplicar = page.locator('main').getByRole('button', { name: /aplicar/i });
    await aplicar.focus();
    await page.keyboard.press('Enter');
    await expect.poll(async () => {
      const t = await page.locator(`main tbody tr td:nth-child(${await colSeveridad(page)})`).allInnerTexts();
      return t.length > 0 && t.every((x) => /cr[ií]tico/i.test(x));
    }, { timeout: 30_000, message: '2.1.1: el filtro aplicado con teclado deja solo eventos CRITICAL' }).toBe(true);
  });

  for (const tipo of ['INDIVIDUAL', 'POBLACIONAL'] as const) {
    test(`c. [1.3.1] Detalle por teclado de un evento ${tipo}: métricas con su etiqueta`, async ({ page }, testInfo) => {
      const estado = await interceptar(page);
      await irAAuditoria(page);
      // Los eventos semilla con métricas son WARNING / ERROR / CRITICAL
      let indice = -1;
      for (const sev of ['CRITICAL', 'ERROR', 'WARNING']) {
        await filtrarSeveridad(page, estado, sev);
        indice = estado.eventos.findIndex((e) => paradigma(e) === tipo);
        if (indice >= 0) break;
      }
      expect(indice, `BLOQUEO: la bitácora no tiene eventos ${tipo} con métricas en WARNING / ERROR / CRITICAL`).toBeGreaterThanOrEqual(0);
      const evento = estado.eventos[indice];
      testInfo.annotations.push({ type: `Evento ${tipo} (real)`, description: `${evento.tipo_evento} · ${evento.severidad_evento} · payload: ${JSON.stringify(evento.payload_evento).slice(0, 300)}` });

      // Abrir por teclado desde su botón "Ver"
      const ver = page.locator('main tbody tr').nth(indice).getByRole('button');
      await page.keyboard.press('Shift');
      await ver.focus();
      await page.keyboard.press('Enter');
      const dialogo = page.getByRole('dialog');
      await expect(dialogo, '2.1.1: Enter sobre "Ver" abre el detalle').toBeVisible({ timeout: 15_000 });
      await expect(dialogo.locator('pre')).toBeVisible({ timeout: 15_000 });
      expect.soft(await dialogo.evaluate((d) => d.contains(document.activeElement)), 'El foco pasa al detalle').toBe(true);

      // Métricas: rótulo legible fuera del JSON crudo, sin vacíos ni "—"
      const textoSinPre = await dialogo.evaluate((d) => {
        const c = d.cloneNode(true) as HTMLElement;
        c.querySelectorAll('pre').forEach((p) => p.remove());
        return (c.textContent ?? '').replace(/\s+/g, ' ');
      });
      const faltan = METRICAS[tipo].filter(([, re]) => !re.test(textoSinPre)).map(([n]) => n);
      testInfo.annotations.push({ type: 'Métricas rotuladas fuera del JSON', description: faltan.length ? `faltan: ${faltan.join(', ')}` : 'todas' });
      expect.soft(faltan, `DEFECTO 1.3.1: las métricas ${tipo} solo aparecen dentro del JSON crudo del payload (<pre>), sin etiqueta propia`).toEqual([]);
      const vacias = (textoSinPre.match(/(F1|Recall|Calibraci[oó]n)[^:]*:\s*(—|-|$)/gi) ?? []);
      expect.soft(vacias, 'Métricas mostradas como "—" o vacías').toEqual([]);
      await escanear(page, `detalle-${tipo.toLowerCase()}`, testInfo);
    });
  }
});
