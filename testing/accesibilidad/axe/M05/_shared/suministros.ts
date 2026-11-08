// | Fecha      | Nombre          | Que se hizo                                                        |
// |------------|-----------------|--------------------------------------------------------------------|
// | 2026-11-08 | SaraSofGonzalez | TC-DIS-197..208 RF-74/77/79/80: utilidades de las pruebas de M05   |
/**
 * Utilidades de los casos TC-DIS-197…208 de M05 (Suministros, /suministros/*). Complementa
 * `_shared/sigabA11y.ts`: sesión compartida por describe, simulación de lecturas y escrituras y datos
 * con la forma de src/supplies/types.ts.
 *
 * PROTECCIÓN DE DATOS: abrirSesion aborta toda escritura salvo el login. Calcular el ICA, generar o
 * exportar un reporte y consolidar un ciclo dejan registros que no se pueden borrar: solo se
 * responden en la prueba con page.route y quedan anotados como "Datos simulados".
 */
import { test, type BrowserContext, type Locator, type Page, type Route } from '@playwright/test';
import { abrirSesion, credencialesPorRol, PREFIJO_API } from '../../_shared/sigabA11y';

/** Sesión del rol para todo el describe, en el viewport del proyecto. Llamar dentro de test.describe. */
export function sesionDelCaso(tcId: string, rol: 'ADMIN' | 'PRODUCTOR' | 'VETERINARIO') {
  test.describe.configure({ mode: 'default', timeout: 300_000 });
  const clave = `${tcId.replace(/-/g, '_')}_VIEWPORTS`;
  const viewports = (process.env[clave] ?? 'movil,tablet,escritorio').split(',').map((v) => v.trim());
  const s = {} as { page: Page; contexto: BrowserContext };
  test.beforeAll(async ({ browser }, testInfo) => {
    if (!viewports.includes(testInfo.project.name)) return;
    Object.assign(s, await abrirSesion(browser, testInfo, credencialesPorRol(rol)));
  });
  test.afterAll(async () => { await s.contexto?.close(); });
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!viewports.includes(testInfo.project.name), `Viewport "${testInfo.project.name}" deshabilitado por ${clave}.`);
  });
  test.afterEach(async () => {
    if (!s.page) return;
    await temaOscuro(s.page, false).catch(() => {});
    await s.page.unrouteAll({ behavior: 'ignoreErrors' });
  });
  return s;
}

// ── Simulación ───────────────────────────────────────────────────────────────

const coincide = (patron: RegExp) => (u: URL) => u.pathname.startsWith(PREFIJO_API) && patron.test(u.pathname.replace(PREFIJO_API, ''));

export async function simularGet(page: Page, patron: RegExp, cuerpo: unknown | ((u: URL) => unknown), status = 200) {
  await page.route(coincide(patron), (route: Route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    const json = typeof cuerpo === 'function' ? (cuerpo as (u: URL) => unknown)(new URL(route.request().url())) : cuerpo;
    return route.fulfill({ status, contentType: 'application/json', json });
  });
}

/** Responde las escrituras que cumplan `patron`; devuelve la lista de las recibidas. */
export async function simularEscritura(page: Page, patron: RegExp, respuesta: () => { status: number; json: unknown }, demoraMs = 0) {
  const recibidas: unknown[] = [];
  await page.route(coincide(patron), async (route: Route) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(route.request().method())) return route.fallback();
    recibidas.push(route.request().postDataJSON?.() ?? null);
    if (demoraMs) await new Promise((r) => setTimeout(r, demoraMs));
    const { status, json } = respuesta();
    return route.fulfill({ status, contentType: 'application/json', json }).catch(() => {});
  });
  return recibidas;
}

export const errorApi = (error_code: string, message: string) => ({ error_code, message, fields: [] });

export async function simularActivos(page: Page) {
  await simularGet(page, /^\/activos-biologicos\/?$/, {
    total_paginas: 1,
    registros: [
      { id_activo_biologico: 7001, tipo: 'INDIVIDUAL', identificador: 'BOV-101', nombre_especie: 'Bovino', nombre_infraestructura: 'Corral 1', nombre_estado: 'Activo' },
      { id_activo_biologico: 7003, tipo: 'POBLACIONAL', identificador: 'LOTE-TIL-07', nombre_especie: 'Tilapia', nombre_infraestructura: 'Estanque 2', nombre_estado: 'Activo' },
    ],
  });
}

// ── ICA (RF-74) ──────────────────────────────────────────────────────────────

export function resultadoIca(extra: Record<string, unknown>) {
  return {
    id_resultado_ica: 500, id_activo_biologico: 7001, periodo_evaluacion: 'MENSUAL', fecha_inicio_periodo: '2026-09-01', fecha_fin_periodo: '2026-09-30',
    estado_resultado: 'CALCULADO', es_vigente: true, intento: 1, alimento_consumido_total_kg: '120.00', ganancia_peso_kg: '60.00', ca_calculado: '2.00',
    clasificacion_ca: 'EXCELENTE', data_quality_score: 100, causa_no_calculo: null, mensaje: null, tipo_calculo: 'AUTOMATICO', fecha_calculo: '2026-10-01T02:00:00', ...extra,
  };
}

export const CLASIFICACIONES: [string, string, string][] = [
  ['EXCELENTE', 'Excelente', '2.00'], ['ACEPTABLE', 'Aceptable', '3.10'], ['BAJA', 'Baja', '4.40'], ['CRITICA', 'Crítica', '5.60'],
];

/** Vigente e historial simulados; `vigente` se evalúa en cada consulta. */
export async function simularIca(page: Page, vigente: () => Record<string, unknown> | null, historial: unknown[]) {
  await simularGet(page, /\/eficiencia-alimenticia\/activos\/\d+\/vigente$/, () => {
    const r = vigente();
    return { id_activo_biologico: 7001, periodo_evaluacion: 'MENSUAL', tiene_resultado: !!r, mensaje: null, resultado: r };
  });
  await simularGet(page, /\/eficiencia-alimenticia\/activos\/\d+\/historial$/, { total: historial.length, items: historial });
}

/** Escribe el ID en el selector de activo y consulta con teclado; espera la respuesta del vigente. */
export async function consultarIca(page: Page, id: number) {
  const campo = page.locator('#ica-activo');
  await campo.fill(String(id));
  await campo.press('Escape');
  const r = page.waitForResponse((x) => /\/vigente(\?|$)/.test(x.url()), { timeout: 60_000 });
  await page.getByRole('main').getByRole('button', { name: 'Consultar', exact: true }).focus();
  await page.keyboard.press('Enter');
  const resp = await r;
  await page.locator('section[aria-labelledby="ica-vigente"]').waitFor({ timeout: 15_000 });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(300);
  return resp;
}

// ── Reporte de gastos (RF-77) ────────────────────────────────────────────────

export function reporteGasto(extra: Record<string, unknown> = {}) {
  return {
    id_reporte_gasto_acumulado: 3001, id_activo_biologico: null, id_infraestructura: null, id_especie: null, fecha_inicio: '2026-10-01', fecha_fin: '2026-10-31',
    tipo_periodo: 'CICLO_COMPLETO', gasto_total_acumulado: '1000000.00', gasto_promedio_individuo: '50000.00', causa_no_calculable_promedio: null, sin_datos: false,
    estado: 'GENERADO', mensaje: null, nota_bajas: null, advertencia: null,
    desglose_categorias: [
      { categoria: 'ALIMENTACION', subtotal: '750000.00', num_registros: 12, porcentaje: '75.00' },
      { categoria: 'MEDICACION', subtotal: '250000.00', num_registros: 3, porcentaje: '25.00' },
    ],
    desglose_temporal: [{ etiqueta: 'Ciclo completo', fecha_inicio: '2026-10-01', fecha_fin: '2026-10-31', monto: '1000000.00' }],
    registros_sin_costo: [], tendencia: null, fecha_generacion: '2026-11-01T09:00:00', ...extra,
  };
}

/** POST /reportes-gastos simulado e historial vacío. `reporte` se evalúa en cada envío. */
export async function simularGeneracion(page: Page, reporte: () => unknown) {
  await simularGet(page, /\/reportes-gastos\/historial$/, { total: 0, items: [] });
  return simularEscritura(page, /\/suministros\/reportes-gastos\/?$/, () => ({ status: 200, json: reporte() }));
}

export async function generarReporte(page: Page) {
  const r = page.waitForResponse((x) => /\/reportes-gastos\/?(\?|$)/.test(x.url()) && x.request().method() === 'POST', { timeout: 60_000 });
  await page.getByRole('main').getByRole('button', { name: 'Generar reporte', exact: true }).focus();
  await page.keyboard.press('Enter');
  await r;
  await page.waitForTimeout(400);
}

// ── Provisión NIC-41 (RF-79) ─────────────────────────────────────────────────

export function provision(id: number, version: number, extra: Record<string, unknown> = {}) {
  return {
    id_provision: id, id_activo_biologico: 7001, id_ciclo_productivo: 40, id_gestion_fases: 901, modalidad: 'CONSOLIDADO', monto_provision: '1000000.00',
    desglose_categoria: { ALIMENTO: '750000.00', MEDICAMENTO: '250000.00' },
    lista_registros: [{ id_registro_suministro: 'r-1', tipo_suministro: 'ALIMENTO', tipo_operacion: 'REGISTRO', cantidad: '100', unidad_medida: 'kg', precio_unitario_resuelto: '7500', costo_registro: '750000.00', origen_precio: 'CATALOGO', fecha_aplicacion: '2026-10-05', motivo_correccion: null }],
    total_registros: 1, version_reporte: version, id_reporte_anterior: null, motivo_correccion: null, es_reporte_potencialmente_incompleto: false, estado: 'CONSOLIDADO',
    hash_integridad: 'a1b2c3d4'.repeat(8), fecha_generacion: '2026-11-01T09:00:00', fecha_entrega_m06: null, ...extra,
  };
}

/** Activo 7001 con un ciclo cerrado (#901) y las versiones indicadas; abre la consulta en Costos. */
export async function abrirProvision(page: Page, versiones: Array<ReturnType<typeof provision>>) {
  await simularActivos(page);
  await simularGet(page, /\/acumulado\/activo\/\d+$/, errorApi('SIN_CICLO_ACTIVO', 'El activo no tiene un ciclo vigente.'), 404);
  await simularGet(page, /^\/activos-biologicos\/\d+\/fases$/, { fases: [{ id_gestion_fases: 901, id_ciclo_productivo: 40, nombre_ciclo: 'Ciclo de levante', fecha_inicio: '2026-06-01', fecha_fin: '2026-10-31', es_activa: false }] });
  await simularGet(page, /\/ciclo\/\d+\/versiones$/, { total: versiones.length, versiones });
  await simularGet(page, /nic-?41[^/]*\/\d+$/i, (u: URL) => versiones.find((v) => v.id_provision === Number(u.pathname.split('/').pop())) ?? versiones[0]);
  await page.goto('suministros/costos', { waitUntil: 'commit' });
  const campo = page.locator('#costeo-activo');
  await campo.waitFor({ timeout: 120_000 });
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  await campo.fill('7001');
  await campo.press('Escape');
  await page.getByRole('main').getByRole('button', { name: 'Consultar', exact: true }).click();
  await page.locator('section[aria-labelledby="nic41-titulo"] table').waitFor({ timeout: 20_000 });
  await page.waitForTimeout(300);
}

// ── Evidencia ────────────────────────────────────────────────────────────────

/** null/undefined/NaN y enums crudos en pantalla (regla de textos visibles, CLAUDE.md). */
export async function textosCrudos(alcance: Locator): Promise<string[]> {
  const texto = await alcance.evaluate((e) => {
    const partes = [(e as HTMLElement).innerText];
    e.querySelectorAll('option').forEach((o) => partes.push(o.textContent ?? ''));
    return partes.join('\n');
  });
  const hallazgos = new Set<string>();
  for (const linea of texto.split('\n')) {
    const l = linea.trim();
    if (/\b(null|undefined|NaN)\b/.test(l) || /\b[A-Z]{3,}(?:_[A-Z0-9]+)+\b/.test(l)) hallazgos.add(l.slice(0, 90));
  }
  return [...hallazgos];
}

/** Badges dentro de `alcance`: texto, ícono y si el ícono está oculto a la tecnología de asistencia. */
export function badges(alcance: Locator): Promise<{ texto: string; icono: boolean; iconoOculto: boolean }[]> {
  return alcance.evaluate((raiz) => [...raiz.querySelectorAll('.ds-badge')].map((b) => {
    const svg = b.querySelector('svg');
    return { texto: (b.textContent ?? '').trim(), icono: !!svg, iconoOculto: !svg || svg.getAttribute('aria-hidden') === 'true' };
  }));
}

export async function temaOscuro(page: Page, activo: boolean) {
  await page.evaluate((a) => (a ? document.documentElement.setAttribute('data-theme', 'dark') : document.documentElement.removeAttribute('data-theme')), activo);
  await page.waitForTimeout(250);
}

/** Outline o box-shadow en el elemento enfocado. En un <input type="date"> el foco va a un segmento interno y el host no lo refleja. */
export function focoVisible(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null;
    if (!a || a === document.body) return false;
    if ((a as HTMLInputElement).type === 'date') return true;
    const s = getComputedStyle(a);
    return (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || (s.boxShadow !== 'none' && s.boxShadow !== '');
  });
}

/** Textos de regiones vivas vistos durante `ms`, con su rol (sondeo cada 100 ms). */
export async function anunciosDurante(page: Page, ms: number): Promise<string[]> {
  const vistos = new Set<string>();
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    const actuales = await page.evaluate(() =>
      [...document.querySelectorAll('[aria-live]:not([aria-live="off"]), [role="status"], [role="alert"], [role="log"]')]
        .map((e) => `${e.getAttribute('role') ?? 'live'}${e.getAttribute('aria-live') ? `/${e.getAttribute('aria-live')}` : ''}: ${(e.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 140)}`)
        .filter((t) => !/: $/.test(t)),
    ).catch(() => [] as string[]);
    actuales.forEach((a) => vistos.add(a));
    await page.waitForTimeout(100);
  }
  return [...vistos];
}
