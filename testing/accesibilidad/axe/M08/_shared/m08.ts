// | Fecha      | Nombre      | Que se hizo                                                                    |
// |------------|-------------|--------------------------------------------------------------------------------|
// | 2026-11-17 | Laura032005 | TC-DIS-282..294 RF-105/106/107: utilidades de las pruebas de accesibilidad de M08 |
// | 2026-11-19 | Laura032005 | TC-DIS-286..290 RF-104/105: bandeja con nivel y ocurrencias, búsqueda de activo y reportes |
// | 2026-11-20 | SaraSofGonzalez | TC-DIS-277..285 RF-103/106: título del historial sin distinguir mayúsculas; 277–281 ya tienen spec |
// | 2026-11-23 | SaraSofGonzalez | TC-DIS-282..285 RF-106: «Consultar» que no pide el historial se registra como defecto de la app (1.5.1-rc.1) |
/**
 * Utilidades de los specs de accesibilidad de M08 que sí tienen pantalla:
 *   - RF-106 (282–285): el historial de Predicción (/prediccion/historial, HistorialView).
 *   - RF-105 (289): la bandeja de notificaciones (campana de la barra superior, NotificationTray).
 *   - RF-107 (292–294): avisos, modales de acción crítica y progreso, sobre pantallas ya existentes.
 * RF-103 (277–281), el dashboard operativo, tiene sus utilidades en dashboard.ts.
 * Los demás casos de M08 (286–288, 290, 291) están Bloqueados: su pantalla no existe.
 *
 * Reutiliza la evidencia genérica de M06 (diálogos, regiones vivas, textos crudos, tema, simulación)
 * y los datos simulados de clientes de M07 (revocación, RF-107).
 *
 * PROTECCIÓN DE DATOS: igual que en M06 y M07, el contexto aborta toda escritura (POST/PUT/PATCH/
 * DELETE) salvo el login. Cerrar un período, dar de baja un activo, revertir un reconocimiento,
 * revocar un sistema o marcar notificaciones como leídas no llegan al backend; sus respuestas se
 * simulan y la prueba lo anota como "Datos simulados".
 *
 * Datos reales: Datos_Semilla_M07_M08.md §7 (BOV-M08-001 «Lucero» y los otros tres activos) y §9
 * (60 notificaciones del Veterinario). Los datos simulados repiten esa misma forma para controlar
 * lo que el ambiente no garantiza (eventos sanitarios y retroalimentaciones en la línea de tiempo,
 * paginación, rechazos).
 */
import fs from 'fs';
import path from 'path';
import { expect, type Browser, type BrowserContext, type Locator, type Page, type TestInfo } from '@playwright/test';
import { iniciarSesion } from '../../_shared/sigabA11y';
import { concederPermisos, prevalidacionLimpia, simularGet } from '../../M06/_shared/finanzas';

export {
  NIT, PERIODOS, abrirYAuditarDialogo, anunciosDurante, badges, cerrarConEscape, concederPermisos, describirFocoDialogo, errorApi,
  focoVisible, guardarDescarga, irFinanzas, periodo, revisarExcel, revisarPdf, quitarSimulaciones, simularEscritura, simularGet, temaOscuro, textosCrudos,
} from '../../M06/_shared/finanzas';
export { alertas, dialogo, simularClientes } from '../../M07/_shared/integracion';

const HAR_ASSETS = path.join(__dirname, '../../../../.har-cache/assets.har');

// ── Sesión ───────────────────────────────────────────────────────────────────

export type RolM08 = 'veterinario' | 'productor' | 'admin' | 'contador';

const PREFIJO: Record<RolM08, string> = {
  veterinario: 'TEST_VETERINARIO', productor: 'TEST_PRODUCTOR', admin: 'TEST_ADMIN', contador: 'TEST_CONTADOR',
};

/** Contexto del viewport del proyecto, caché de assets y ninguna escritura hacia el backend. */
export async function abrirSesionM08(browser: Browser, testInfo: TestInfo, rol: RolM08): Promise<{ contexto: BrowserContext; page: Page }> {
  const pref = PREFIJO[rol];
  const email = process.env[`${pref}_EMAIL`] ?? '';
  const password = process.env[`${pref}_PASSWORD`] ?? '';
  expect(email, `Faltan ${pref}_EMAIL / ${pref}_PASSWORD en testing/.env.test`).not.toBe('');
  const use = testInfo.project.use;
  const contexto = await browser.newContext({
    baseURL: use.baseURL, viewport: use.viewport, deviceScaleFactor: use.deviceScaleFactor, userAgent: use.userAgent, locale: 'es-CO',
    acceptDownloads: true,
  });
  if (fs.existsSync(HAR_ASSETS)) await contexto.routeFromHAR(HAR_ASSETS, { url: '**/assets/**', notFound: 'fallback' });
  await contexto.route('**/*', (r) => {
    const req = r.request();
    if (!['xhr', 'fetch'].includes(req.resourceType()) || ['GET', 'HEAD', 'OPTIONS'].includes(req.method())) return r.fallback();
    if (/\/sesiones\/(refresh\/?)?$/.test(new URL(req.url()).pathname)) return r.fallback();
    return r.abort();
  });
  const page = await contexto.newPage();
  await iniciarSesion(page, email, password);
  return { contexto, page };
}

/** goto a `ruta` y espera el h1; si vuelve al login, BLOQUEO DE AMBIENTE. */
export async function irA(page: Page, ruta: string, titulo: RegExp = /./) {
  await page.goto(ruta, { waitUntil: 'commit', timeout: 120_000 });
  const h1 = page.getByRole('heading', { level: 1, name: titulo });
  const denegado = page.getByText(/No tienes acceso|Sin acceso/).first();
  const login = page.getByRole('textbox', { name: 'Correo electrónico', exact: true });
  await expect(h1.or(denegado).or(login).first()).toBeVisible({ timeout: 120_000 });
  if (await login.isVisible()) throw new Error(`BLOQUEO DE AMBIENTE: sesión perdida tras goto (${ruta})`);
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(500);
  await page.evaluate(() => document.fonts.ready);
}

// ── RF-106: historial de Predicción ─────────────────────────────────────────

export const LUCERO = 'BOV-M08-001';
export const CANELA = 'BOV-M08-002';
export const TORMENTA = 'BOV-M08-003';
export const BRISA = 'BOV-M08-004';
/** Rango que cubre toda la línea de tiempo de Lucero (Datos_Semilla §7.1). */
export const RANGO_LUCERO = { desde: '2026-06-01', hasta: '2026-11-17' };
/** Los cuatro rótulos de nivel que usa el historial (los de M04, decisión del 2026-11-17). */
export const NIVELES = ['Normal', 'Riesgo bajo', 'Riesgo alto', 'Crítico'];

export const irHistorial = (page: Page) => irA(page, 'prediccion/historial', /Historial diagn/i);

/**
 * Elige el activo escribiéndolo en "Activo o lote" (Combobox: Enter resuelve el texto), fija el rango
 * y pulsa Consultar. Devuelve false si el activo no resolvió (Consultar sigue deshabilitado).
 */
export async function consultarHistorial(page: Page, activo: string, desde: string, hasta: string) {
  const campo = page.locator('#hist-activo');
  await campo.waitFor({ timeout: 60_000 });
  await campo.fill(activo);
  await campo.press('Enter');
  await campo.blur();
  await page.locator('#hist-desde').fill(desde);
  await page.locator('#hist-hasta').fill(hasta);
  const consultar = page.getByRole('button', { name: /^Consultar/ });
  if (await consultar.isDisabled()) return false;
  const pedido = (ms: number) => page.waitForRequest((r) => /\/prediccion\/historial\/\d+/.test(new URL(r.url()).pathname), { timeout: ms }).then(() => true).catch(() => false);
  const llega = pedido(5_000);
  await consultar.click();
  if (!(await llega)) {
    // Defecto funcional en 1.5.1-rc.1: el botón hace onClick={onConsultar} y la vista recibe el evento del clic como
    // filtros, así que «Consultar» no pide el historial. Se registra como defecto de la app.
    consultarNoResponde = true;
    expect.soft(false, 'DEFECTO de la app: «Consultar» no pide el historial (el botón pasa el evento del clic como filtros y la consulta se descarta)').toBe(true);
    return false;
  }
  await expect(page.getByText('Consultando historial…')).toBeHidden({ timeout: 60_000 });
  await page.waitForTimeout(400);
  return true;
}

/** true si en esta corrida «Consultar» no pidió el historial (defecto registrado). */
export let consultarNoResponde = false;

/** Abre la pestaña "Tendencia de riesgo" y devuelve su panel. */
export async function abrirTendencia(page: Page) {
  await page.getByRole('tab', { name: /Tendencia de riesgo/ }).click();
  const panel = page.locator('#hist-panel-tendencia');
  await expect(panel).toBeVisible({ timeout: 15_000 });
  return panel;
}

/** Tarjetas de la línea de tiempo (una por evento) en el panel visible. */
export function tarjetasLineaTiempo(page: Page): Locator {
  return page.locator('#hist-panel-timeline [aria-label^="Resultados"] > div > div');
}

// Datos simulados con la forma de EventoHistorialResponse (src/prediction/types.ts). El backend aún
// no documenta cómo llegan eventos sanitarios y retroalimentaciones al historial (RF-106): se usan
// tipos explícitos para que la prueba muestre qué hace la vista con ellos.
const IDS: Record<string, number> = { [LUCERO]: 98001, [CANELA]: 98002, [TORMENTA]: 98003, [BRISA]: 98004 };

export const ACTIVOS_M08 = Object.entries({ [LUCERO]: 'Lucero', [CANELA]: 'Canela', [TORMENTA]: 'Tormenta', [BRISA]: 'Brisa' })
  .map(([identificador]) => ({ id_activo_biologico: IDS[identificador], identificador, tipo: 'INDIVIDUAL', nombre_especie: 'Bovino', id_especie: 1 }));

type Evento = { id_evento: string; tipo_evento: string; id_activo_biologico: number; fecha_evento: string; id_resultado_inferencia: string | null; payload: Record<string, unknown> | null };

const PATOLOGIA = ['Sin patología', 'Mastitis subclínica', 'Mastitis clínica', 'Mastitis clínica'];

function inferencia(activo: string, n: number, fecha: string, nivel: number, retro?: string | string[]): Evento {
  return {
    id_evento: `inf-${IDS[activo]}-${n}`, tipo_evento: 'INFERENCIA', id_activo_biologico: IDS[activo], fecha_evento: fecha,
    id_resultado_inferencia: `res-${IDS[activo]}-${n}`,
    payload: { nivel_riesgo: nivel, nombre_patologia: PATOLOGIA[nivel], confianza_global: 0.82, ...(retro ? { retroalimentacion: retro } : {}) },
  };
}

function sanitario(activo: string, n: number, fecha: string, descripcion: string): Evento {
  return { id_evento: `san-${IDS[activo]}-${n}`, tipo_evento: 'EVENTO_SANITARIO', id_activo_biologico: IDS[activo], fecha_evento: fecha, id_resultado_inferencia: null, payload: { descripcion } };
}

/** Línea de tiempo de Lucero (Datos_Semilla §7.1), con hora de Colombia. */
export const EVENTOS_LUCERO: Evento[] = [
  inferencia(LUCERO, 1, '2026-06-05T08:00:00-05:00', 0, 'CORRECTO'),
  inferencia(LUCERO, 2, '2026-07-10T08:00:00-05:00', 1, 'CORRECTO'),
  inferencia(LUCERO, 3, '2026-08-14T08:00:00-05:00', 2, 'CORRECTO'),
  sanitario(LUCERO, 1, '2026-08-14T18:00:00-05:00', 'Mastitis clínica'),
  inferencia(LUCERO, 4, '2026-09-02T08:00:00-05:00', 3, 'PARCIAL'),
  sanitario(LUCERO, 2, '2026-09-02T08:40:00-05:00', 'Fiebre 40,1 °C'),
  inferencia(LUCERO, 5, '2026-09-20T08:00:00-05:00', 2, 'INCORRECTO'),
  inferencia(LUCERO, 6, '2026-10-05T08:00:00-05:00', 1, 'SIN_EVENTO'),
  inferencia(LUCERO, 7, '2026-10-18T08:00:00-05:00', 3, ['CORRECTO', 'INCORRECTO']),
  inferencia(LUCERO, 8, '2026-11-01T08:00:00-05:00', 0),
  inferencia(LUCERO, 9, '2026-11-12T08:00:00-05:00', 1),
];

/** 25 inferencias sin retroalimentación, una por día del 2026-10-01 al 2026-10-25 (§7.2). */
export const EVENTOS_CANELA: Evento[] = Array.from({ length: 25 }, (_, i) =>
  inferencia(CANELA, i + 1, `2026-10-${String(i + 1).padStart(2, '0')}T08:00:00-05:00`, i % 4));

export const EVENTOS_BRISA: Evento[] = [3, 9, 15, 21].map((d, i) => inferencia(BRISA, i + 1, `2026-10-${String(d).padStart(2, '0')}T08:00:00-05:00`, i % 4));

const EVENTOS_POR_ACTIVO: Record<number, Evento[]> = {
  [IDS[LUCERO]]: EVENTOS_LUCERO, [IDS[CANELA]]: EVENTOS_CANELA, [IDS[TORMENTA]]: [], [IDS[BRISA]]: EVENTOS_BRISA,
};

/**
 * Simula el selector de activos y GET /prediccion/historial/{id}: filtra por rango y nivel, ordena del
 * más reciente al más antiguo y pagina de 10 en 10 con cursor (como el backend).
 */
export async function simularHistorial(page: Page) {
  await simularGet(page, /^\/activos-biologicos$/, { registros: ACTIVOS_M08, total: ACTIVOS_M08.length, total_paginas: 1 });
  await simularGet(page, /^\/prediccion\/historial\/\d+$/, (u: URL) => {
    const id = Number(u.pathname.match(/historial\/(\d+)/)![1]);
    const desde = u.searchParams.get('fecha_inicio') ?? '0000';
    const hasta = `${u.searchParams.get('fecha_fin') ?? '9999'}T23:59:59`;
    const nivel = u.searchParams.get('nivel_riesgo');
    const todos = (EVENTOS_POR_ACTIVO[id] ?? [])
      .filter((e) => e.fecha_evento.slice(0, 19) >= desde && e.fecha_evento.slice(0, 19) <= hasta)
      .filter((e) => nivel == null || (e.payload?.nivel_riesgo === Number(nivel)))
      .sort((a, b) => b.fecha_evento.localeCompare(a.fecha_evento));
    const inicio = Number(u.searchParams.get('cursor_paginacion') ?? 0);
    const eventos = todos.slice(inicio, inicio + 10);
    return { eventos, cursor_siguiente: inicio + 10 < todos.length ? String(inicio + 10) : null, total_pagina: eventos.length };
  });
}

// ── RF-105: bandeja de notificaciones ───────────────────────────────────────

export function botonCampana(page: Page) {
  return page.getByRole('banner').getByRole('button', { name: /^Notificaciones/ });
}

export function bandeja(page: Page) {
  return page.getByRole('dialog', { name: 'Notificaciones' });
}

/** Abre la bandeja con el teclado desde la campana. */
export async function abrirBandeja(page: Page) {
  const campana = botonCampana(page);
  await campana.focus();
  await page.keyboard.press('Enter');
  await expect(bandeja(page)).toBeVisible({ timeout: 15_000 });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(400);
  return bandeja(page);
}

type Nivel = 'CRITICA' | 'ADVERTENCIA' | 'INFORMATIVA';
// tipo_evento numérico de modulo1.tipos_eventos; las de M08 se nombran por su módulo (RF-105).
const TIPO: Record<Nivel, number> = { CRITICA: 90, ADVERTENCIA: 91, INFORMATIVA: 92 };

/** Forma de NotificacionInternaResponse con los campos de RF-105 (src/notificaciones/types.ts). */
export function notificacion(id: number, nivel: Nivel, leida: boolean, mensaje: string, fecha: string, modulo: string, ocurrencias = 1) {
  return {
    id_notificacion: id, id_evento: 70_000 + id, tipo_evento: TIPO[nivel], mensaje, fecha_envio: fecha, es_leido: leida,
    nivel, estado: leida ? 'LEIDA' : 'NUEVA', modulo, url: null, ocurrencias, fecha_ultima_ocurrencia: fecha,
    fecha_lectura: leida ? fecha : null, fecha_atencion: null, accion_documentada: null as string | null,
    puede_descartarse: nivel !== 'CRITICA', puede_atenderse: true,
  };
}
export type NotificacionSimulada = ReturnType<typeof notificacion>;

/**
 * Las notificaciones del Veterinario de Datos_Semilla §9.1, sin las 5 de más de 90 días. Las 5 de "Humedad alta"
 * del mismo activo llegan agrupadas en una sola con 5 ocurrencias, como las agrupa el backend (RF-105).
 */
export const NOTIFICACIONES_VET: NotificacionSimulada[] = (() => {
  const l: NotificacionSimulada[] = [];
  let id = 1;
  const add = (nivel: Nivel, leida: boolean, mensaje: string, fecha: string, modulo: string, ocurrencias = 1) =>
    l.push(notificacion(id++, nivel, leida, mensaje, fecha, modulo, ocurrencias));
  add('CRITICA', false, 'Alerta crítica | Patología con riesgo alto | BOV-M08-001 Lucero, Corral de Ordeño | Revise al animal y registre la atención', '2026-11-16T07:30:00-05:00', 'prediccion');
  add('CRITICA', false, 'Alerta crítica | Temperatura fuera de rango | Corral de Ordeño, 35 °C | Verifique la ventilación del corral', '2026-11-16T09:00:00-05:00', 'telemetria');
  add('CRITICA', true, 'Alerta crítica | Patología con riesgo alto | BOV-M08-022 | Revise al animal y registre la atención', '2026-11-14T10:00:00-05:00', 'prediccion');
  for (let i = 0; i < 12; i++) add('ADVERTENCIA', i >= 6, 'Advertencia | Precio de mercado próximo a vencer | Bovino de levante | Actualice el precio', `2026-11-${String(15 - i).padStart(2, '0')}T11:00:00-05:00`, 'finanzas');
  add('ADVERTENCIA', false, 'Advertencia | Humedad alta | Potrero Sur, BOV-M08-010 | Revise el área', '2026-11-16T12:00:00-05:00', 'telemetria', 5);
  for (let i = 0; i < 35; i++) add('INFORMATIVA', i >= 15, 'Información | Reporte listo para descargar | Reporte de telemetría | Descárguelo antes de 48 horas', new Date(Date.UTC(2026, 10, 15, 15) - i * 2.3 * 86_400_000).toISOString(), 'reportes');
  return l.sort((a, b) => b.fecha_envio.localeCompare(a.fecha_envio));
})();

/** GET /notificaciones paginado (pagina, tamano) con total, no_leidas y criticas_pendientes; filtra por nivel y estado. */
export async function simularNotificaciones(page: Page, lista: NotificacionSimulada[] = NOTIFICACIONES_VET) {
  await simularGet(page, /^\/notificaciones\/?$/, (u: URL) => {
    const pagina = Number(u.searchParams.get('pagina') ?? 1);
    const tamano = Number(u.searchParams.get('tamano') ?? 50);
    const nivel = u.searchParams.get('nivel');
    const estado = u.searchParams.get('estado');
    const filtradas = lista
      .filter((n) => !nivel || n.nivel === nivel)
      .filter((n) => (estado ? n.estado === estado : ['NUEVA', 'LEIDA'].includes(n.estado)));
    return {
      total: filtradas.length, no_leidas: lista.filter((n) => n.estado === 'NUEVA').length, pagina, tamano,
      criticas_pendientes: lista.filter((n) => n.nivel === 'CRITICA' && ['NUEVA', 'LEIDA'].includes(n.estado)).length,
      items: filtradas.slice((pagina - 1) * tamano, pagina * tamano),
    };
  });
}

// ── RF-107: cierre de período simulado (misma forma que M06 TC-DIS-243) ──────

export const EXITO_CIERRE = {
  id_cierre: 1, periodo: 'Noviembre de 2026', estado: 'COMPLETADO', activos_procesados: 40, activos_excluidos: [], lineas_excluidas: [],
  comprobantes: [{ codigo: 'NIC41-2026-11-001', hash: 'a'.repeat(64), valor_total: '1250000.00' }], hash_cierre: 'b'.repeat(64),
  reportes: { estado_resultados: { id_estado: 1, resultado_neto: '1250000.00' } }, id_periodo_siguiente: 9104,
};

/** Permiso cierre_periodo·E, períodos, prevalidación lista y sin comprobantes ni propuestas. */
export async function prepararCierre(page: Page, periodos: unknown[] | ((u: URL) => unknown)) {
  await concederPermisos(page, [['cierre_periodo', 5]]);
  await simularGet(page, /^\/finanzas\/periodos\/?$/, periodos);
  await simularGet(page, /^\/finanzas\/periodos\/\d+\/prevalidacion$/, prevalidacionLimpia);
  await simularGet(page, /^\/finanzas\/periodos\/\d+\/comprobantes$/, []);
  await simularGet(page, /^\/finanzas\/reconocimientos\/propuestas$/, []);
}

export function botonCerrarPeriodo(page: Page) {
  return page.getByRole('button', { name: 'Cerrar período', exact: true }).first();
}

/** Confirma el cierre con el teclado desde el diálogo. */
export async function confirmarCierre(page: Page) {
  await botonCerrarPeriodo(page).focus();
  await page.keyboard.press('Enter');
  const confirmar = page.getByRole('dialog').getByRole('button', { name: 'Cerrar período', exact: true });
  await confirmar.focus();
  await page.keyboard.press('Enter');
}

/** Si el diálogo se cerró con Escape o con clic fuera, lo vuelve a abrir desde `disparador`. */
export async function reabrir(page: Page, disparador: Locator) {
  if (await page.locator('[role="dialog"], [role="alertdialog"]').last().isVisible()) return;
  await disparador.focus();
  await page.keyboard.press('Enter');
  await page.locator('[role="dialog"], [role="alertdialog"]').last().waitFor({ state: 'visible', timeout: 10_000 });
}

/** Clic en la esquina del overlay (fuera del panel) y dice si el diálogo sigue abierto. */
export async function clicFuera(page: Page) {
  await page.mouse.click(4, 4);
  await page.waitForTimeout(400);
  return page.locator('[role="dialog"], [role="alertdialog"]').last().isVisible();
}

/**
 * Busca el id de un activo por su identificador de negocio (p. ej. BOV-ESP-001) recorriendo con la sesión real
 * las páginas de GET /activos-biologicos (solo lecturas: reutiliza la petición que hace la propia lista).
 */
export async function buscarIdActivo(page: Page, identificador: string): Promise<number | null> {
  let id: number | null = null;
  const patron = (u: URL) => /\/activos-biologicos$/.test(u.pathname) && u.searchParams.has('pagina');
  await page.route(patron, async (route) => {
    for (let p = 1; p <= 30 && id === null; p++) {
      const u = new URL(route.request().url());
      u.searchParams.set('pagina', String(p));
      u.searchParams.set('page_size', '100');
      const r = await route.fetch({ url: u.toString() }).catch(() => null);
      const j = (await r?.json().catch(() => null)) as { registros?: Array<{ identificador?: string; id_activo_biologico?: number }>; total_paginas?: number } | null;
      const a = j?.registros?.find((x) => x.identificador === identificador);
      if (a?.id_activo_biologico) id = a.id_activo_biologico;
      if (!j || p >= (j.total_paginas ?? 1)) break;
    }
    await route.fallback();
  });
  await page.goto('activos-biologicos');
  await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
  await page.unroute(patron);
  return id;
}

/** Palabras en mayúsculas que la vista muestra tal cual (tipos de evento y valores de enum sin traducir). */
export async function enumsCrudos(alcance: Locator, palabras: string[]): Promise<string[]> {
  const texto = await alcance.innerText().catch(() => '');
  return palabras.filter((p) => new RegExp(`\\b${p}\\b`).test(texto));
}

// ── RF-104: reportes ────────────────────────────────────────────────────────

export const irReportes = (page: Page) => irA(page, 'reportes', /^Reportes$/);

/**
 * La vista previa (POST /reportes/vista-previa) solo lee, y generar (POST /reportes) crea un archivo temporal
 * de "Mis reportes" (48 h) sin tocar datos de negocio: se dejan pasar al backend, saltando el bloqueo de
 * escrituras del contexto. Cancelar sigue bloqueado.
 */
export async function permitirReportes(page: Page) {
  await page.route((u) => /\/reportes(\/vista-previa)?$/.test(u.pathname), (route) =>
    (route.request().method() === 'POST' ? route.continue() : route.fallback()));
}

/** Tipos de reporte que ofrece el selector "Reporte" (valor y rótulo), sin la opción vacía. */
export function tiposReporte(page: Page): Promise<{ valor: string; rotulo: string; grupo: string }[]> {
  return page.locator('#tipo-reporte option').evaluateAll((os) => os
    .filter((o) => (o as HTMLOptionElement).value)
    .map((o) => ({ valor: (o as HTMLOptionElement).value, rotulo: (o.textContent ?? '').trim(), grupo: (o.parentElement as HTMLOptGroupElement | null)?.label ?? '' })));
}

/** Elige el tipo de reporte con el teclado (foco en el select y selección por valor). */
export async function elegirReporte(page: Page, tipo: string) {
  const sel = page.locator('#tipo-reporte');
  await expect(sel).toBeEnabled({ timeout: 30_000 });
  await sel.focus();
  await sel.selectOption(tipo);
  await page.waitForTimeout(500);
}

/** Selecciona la primera opción real de cada filtro de referencia obligatorio vacío y fija fechas si faltan. */
export async function llenarFiltrosObligatorios(page: Page, desde = '2026-10-01', hasta = '2026-11-15') {
  const campos = page.locator('[id^="filtro-"][aria-required="true"], [id^="filtro-"][required]');
  for (let i = 0; i < await campos.count(); i++) {
    const c = campos.nth(i);
    const tag = await c.evaluate((e) => e.tagName);
    if (tag === 'SELECT') {
      const opciones = await c.locator('option').evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value).filter(Boolean));
      if (opciones.length && !(await c.inputValue())) await c.selectOption(opciones[0]);
    } else if ((await c.getAttribute('type')) === 'date' && !(await c.inputValue())) {
      const id = (await c.getAttribute('id')) ?? '';
      await c.fill(/fin|hasta/.test(id) ? hasta : desde);
    }
  }
}
