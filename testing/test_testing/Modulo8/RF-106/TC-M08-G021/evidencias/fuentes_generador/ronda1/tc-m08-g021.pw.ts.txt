// | Fecha      | Nombre                  | Que se hizo |
// |------------|-------------------------|-------------|
// | 2026-11-20 | Juan Sebastian Gutierrez | TC-M08-G021 (TC-M08-052 y 053; RF-106): parte Playwright (CP-10 a CP-17), datos reales del 885 en TEST |
//
// QA SGPMP - Evaluacion (ronda 1). Navegador real (Chromium) contra el frontend desplegado en TEST, cuenta Veterinario 97,
// activo 885, con los tres escenarios de CA-7 sembrados por el DBA: d1f3cc43-2684 a 600 min, f056f99d-2685 a 30 min y
// 511a6d66-2686 a 1200 min. Los esperados se calculan con las reglas del RF a partir de las fechas de la propia
// respuesta; no se copian los campos "correspondencias" ni "grupos" del backend.
//
// SOLO LECTURA:
//   - Solo pasan al servidor los GET y la sesion (POST /sesiones/ una vez, POST /sesiones/refresh, DELETE /sesiones/).
//   - Cualquier otro metodo se aborta; si es de la API, la corrida es invalida (precondicion falsa en afterAll).
//   - POST /usuarios/me/fcm-token y hosts de Google/Firebase se abortan y se anotan.
//   - No se pulsa "Exportar", "Registrar retroalimentacion" ni nada de otro modulo. Cambiar a "Agrupada" solo hace otro GET.
// Credenciales solo en memoria (QA_VET_EMAIL / QA_VET_PASSWORD, las pone el runner). Sin traza ni video.
//
// Reporte: JSON parcial propio en STAGING_DIR (parcial_playwright_TC-M08-G021[_reintentoN].json); el runner lo une con el
// parcial de Vitest. Cada checkpoint arranca en FALLA "No alcanzado".
import { test, expect, type Page, type Route, type Request, type Response } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const TC = 'TC-M08-G021';
const ACTIVO = 885;
const BASE = (process.env.QA_FRONT_URL ?? 'https://api.inmero.co/sigab-test/').replace(/\/?$/, '/');
const STAGING = process.env.STAGING_DIR ?? '';
const REINTENTO = Number(process.env.REINTENTO ?? '0');
const VENTANA_H = 12; // RF-106 Restriccion 5b (valor por defecto; precondicion: el de TEST es 12)
const HORA_MS = 3_600_000;
const PRED_A = 'd1f3cc43'; const EVT_A = 2684; // CA-7 (A): 600 min
const PRED_C = 'f056f99d'; const EVT_C = 2685; // CA-7 (C): 30 min
const PRED_B = '511a6d66'; const EVT_B = 2686; // CA-7 (B): 1200 min

type Estado = 'OK' | 'FALLA';
interface Checkpoint { paso: string; caso: string; esperado: string; fuente: string; obtenido: string; estado: Estado }
const CPS: Checkpoint[] = [
  { paso: 'CP-10', caso: 'TC-M08-052 CA-7 (A), respuesta del backend (885)',
    esperado: `En "correspondencias" hay un elemento que une la predicción ${PRED_A} con el evento ${EVT_A}, con diferencia_minutos 600, diferencia "Diferencia: 10 h" y colision false`,
    fuente: 'RF-106 Restricción 5b; CA-7 (A)' },
  { paso: 'CP-11', caso: 'TC-M08-052 CA-7 (B), respuesta del backend (885)',
    esperado: `Ningún elemento de "correspondencias" une la predicción ${PRED_B} con el evento ${EVT_B} (1200 min, fuera de la ventana)`,
    fuente: 'RF-106 Restricción 5b (si supera la ventana: independientes); CA-7 (B)' },
  { paso: 'CP-12', caso: 'TC-M08-053 CA-7 (C), respuesta del backend (885)',
    esperado: `Existe un grupo que contiene la predicción ${PRED_C} y el evento ${EVT_C} (30 min), y en ese grupo el evento va antes que la predicción`,
    fuente: 'RF-106 Restricción 5c (colisión ≤ 1 h; prioridad: RF-72, RF-41, RF-67); CA-7 (C)' },
  { paso: 'CP-13', caso: 'TC-M08-052, respuesta del backend, todos los pares (885)',
    esperado: 'El conjunto de pares (predicción, evento) de "correspondencias" es exactamente el de los pares con |Δt| ≤ 12 h calculado con las fechas de "predicciones" y "eventos_sanitarios" de la respuesta, y cada diferencia_minutos = floor(|Δt| / 60 s)',
    fuente: 'RF-106 Restricción 5b; Proceso 2.1 (regla de correspondencia R5b)' },
  { paso: 'CP-14', caso: 'TC-M08-052 CA-7 (A), vista en TEST (885)',
    esperado: `En Lineal y en Agrupada: exactamente 1 conector punteado entre el punto de ${PRED_A} y el marcador de ${EVT_A}, y al pasar el ratón sobre el marcador de ${EVT_A} el texto que se muestra contiene "Diferencia: 10 h"`,
    fuente: 'RF-106 Restricción 5b; Proceso 2.1; CA-7 (A) (conector discontinuo; tooltip "Diferencia: 10 h")' },
  { paso: 'CP-15', caso: 'TC-M08-052 CA-7 (B), vista en TEST (885)',
    esperado: `En Lineal y en Agrupada: 0 conectores entre el punto de ${PRED_B} y el marcador de ${EVT_B}`,
    fuente: 'RF-106 Restricción 5b; CA-7 (B) (marcadores independientes sin conector)' },
  { paso: 'CP-16', caso: 'TC-M08-053 CA-7 (C), vista en TEST (885)',
    esperado: `En Lineal y en Agrupada: un marcador "N eventos" dentro de la gráfica (N = tamaño del grupo de CP-12) en la posición de ${PRED_C}/${EVT_C}`,
    fuente: 'RF-106 Restricción 5c; Proceso 2.1 (marcador agrupado "N eventos"); CA-7 (C)' },
  { paso: 'CP-17', caso: 'TC-M08-053 orden al expandir, vista en TEST (885)',
    esperado: 'En Agrupada, al expandir los grupos, el grupo de CP-12 lista sus elementos en el orden de la regla (retroalimentaciones, eventos sanitarios, predicciones; a igual tipo, por fecha), calculado con sus miembros; cada elemento se identifica por su fecha y hora',
    fuente: 'RF-106 Restricción 5c (prioridad visual al expandir)' },
].map((c) => ({ ...c, obtenido: 'No alcanzado', estado: 'FALLA' as Estado }));
const precondiciones: Array<{ nombre: string; ok: boolean; detalle: string }> = [];
const observaciones: string[] = [];
const escrituras: Array<{ metodo: string; ruta: string; resultado: string }> = [];
const violaciones: string[] = [];

function anotar(paso: string, ok: boolean, obtenido: string): void {
  const cp = CPS.find((c) => c.paso === paso)!;
  cp.obtenido = obtenido;
  cp.estado = ok ? 'OK' : 'FALLA';
}
function precondicion(nombre: string, ok: boolean, detalle: string): void {
  precondiciones.push({ nombre, ok, detalle });
  if (!ok) {
    for (const c of CPS) { c.obtenido = `Precondición no cumplida (${nombre}): ${detalle}`; c.estado = 'FALLA'; }
    throw new Error(`Precondicion falsa: ${nombre} (${detalle})`);
  }
}
function captura(page: Page, nombre: string): Promise<unknown> {
  if (!STAGING) return Promise.resolve();
  return page.screenshot({ path: join(STAGING, `captura_${TC}_${nombre}.png`),
    mask: [page.locator('.ds-appbar__right'), page.locator('.ds-sidebar__footer')] });
}

// ---------------------------------------------------------------------------------------------------------------
// Guardia de escrituras (sin ninguna accion simulada: esta parte no escribe nada)
// ---------------------------------------------------------------------------------------------------------------
let logins = 0;
async function guardia(route: Route, req: Request): Promise<void> {
  const metodo = req.method();
  if (metodo === 'GET' || metodo === 'HEAD' || metodo === 'OPTIONS') return route.continue();
  const url = new URL(req.url());
  const ruta = url.pathname;
  if (/googleapis\.com|gstatic\.com|firebaseio\.com|firebase\.com/.test(url.hostname)) {
    escrituras.push({ metodo, ruta: `${url.hostname}${ruta}`, resultado: 'abortada (host externo)' });
    return route.abort();
  }
  if (metodo === 'POST' && /\/sesiones\/?$/.test(ruta)) {
    logins += 1;
    escrituras.push({ metodo, ruta, resultado: `al servidor (login ${logins})` });
    if (logins > 1) { violaciones.push(`segundo login (${ruta})`); return route.abort(); }
    return route.continue();
  }
  if ((metodo === 'POST' && /\/sesiones\/refresh\/?$/.test(ruta)) || (metodo === 'DELETE' && /\/sesiones\/?$/.test(ruta))) {
    escrituras.push({ metodo, ruta, resultado: 'al servidor (sesion)' });
    return route.continue();
  }
  if (metodo === 'POST' && /\/usuarios\/me\/fcm-token\/?$/.test(ruta)) {
    escrituras.push({ metodo, ruta, resultado: 'abortada (registro de push)' });
    return route.abort();
  }
  escrituras.push({ metodo, ruta, resultado: 'ABORTADA (no permitida)' });
  violaciones.push(`${metodo} ${ruta}`);
  return route.abort();
}

// ---------------------------------------------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------------------------------------------
type Marcador = Record<string, unknown> & { fecha: string };
interface Historial {
  ventana_correspondencia_horas: number;
  predicciones: Marcador[]; eventos_sanitarios: Marcador[]; retroalimentaciones: Marcador[];
  grupos: Marcador[][];
  correspondencias: Array<{ id_resultado_inferencia: string; id_evento: number; diferencia_minutos: number; diferencia: string; colision: boolean }>;
}
const norm = (s: string | null | undefined) => (s ?? '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();
const ms = (s: string) => new Date(s).getTime();
const corto = (v: unknown) => String(v ?? '').slice(0, 8);
/** Clase del marcador por sus campos: el "tipo" de un evento llega con su tipo clinico (ver OBS-7 de la parte Vitest). */
function clase(m: Marcador): 'RETROALIMENTACION' | 'EVENTO_SANITARIO' | 'PREDICCION' {
  if ('id_evento' in m) return 'EVENTO_SANITARIO';
  if ('valoracion' in m) return 'RETROALIMENTACION';
  return 'PREDICCION';
}
const PRIORIDAD = { RETROALIMENTACION: 0, EVENTO_SANITARIO: 1, PREDICCION: 2 } as const;
const nombreMarcador = (m: Marcador) => (clase(m) === 'EVENTO_SANITARIO' ? `EVT:${m.id_evento}` : `${clase(m) === 'PREDICCION' ? 'PRED' : 'RETRO'}:${corto(m.id_resultado_inferencia)}`);
function fechaBogota(s: string): string {
  return norm(new Date(s).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Bogota' }));
}

interface Grafica {
  puntos: Array<{ x: number; y: number }>;
  eventos: Array<{ x: number; y: number; px: number; py: number }>;
  punteados: Array<{ a: { x: number; y: number }; b: { x: number; y: number } }>;
  grupos: Array<{ n: number; x: number; texto: string }>;
}
/** Lee la grafica en coordenadas del SVG (mismos criterios que la parte Vitest); px/py: centro del evento en la ventana. */
async function leerGrafica(page: Page): Promise<Grafica> {
  return page.evaluate(() => {
    const nums = (d: string) => (d.match(/[+-]?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi) ?? []).map(Number);
    const sup = document.querySelector('svg.recharts-surface');
    const puntos = Array.from(document.querySelectorAll('.recharts-line-dots circle')).map((el) => ({ x: Number(el.getAttribute('cx')), y: Number(el.getAttribute('cy')) }));
    const eventos = Array.from(document.querySelectorAll('.recharts-scatter-symbol path')).map((el) => {
      let x = Number.NaN; let y = Number.NaN;
      const tr = el.getAttribute('transform') ?? el.parentElement?.getAttribute('transform') ?? '';
      const t = tr.match(/translate\(\s*([+-]?[\d.e+-]+)\s*(?:,\s*|\s+)([+-]?[\d.e+-]+)\s*\)/i);
      if (t) { x = Number(t[1]); y = Number(t[2]); } else {
        const n = nums(el.getAttribute('d') ?? '');
        const xs = n.filter((_, i) => i % 2 === 0); const ys = n.filter((_, i) => i % 2 === 1);
        if (xs.length) { x = (Math.min(...xs) + Math.max(...xs)) / 2; y = (Math.min(...ys) + Math.max(...ys)) / 2; }
      }
      const r = el.getBoundingClientRect();
      return { x, y, px: r.left + r.width / 2, py: r.top + r.height / 2 };
    });
    const punteados = sup ? Array.from(sup.querySelectorAll('line, path')).filter((el) => {
      if (el.closest('.recharts-cartesian-grid')) return false;
      const d = (el.getAttribute('stroke-dasharray') ?? '').trim();
      return d !== '' && d !== '0' && d !== 'none';
    }).map((el) => {
      if (el.tagName.toLowerCase() === 'line') return { a: { x: Number(el.getAttribute('x1')), y: Number(el.getAttribute('y1')) }, b: { x: Number(el.getAttribute('x2')), y: Number(el.getAttribute('y2')) } };
      const n = nums(el.getAttribute('d') ?? '');
      return { a: { x: n[0], y: n[1] }, b: { x: n[n.length - 2], y: n[n.length - 1] } };
    }) : [];
    const grupos = sup ? Array.from(sup.querySelectorAll('text')).map((el) => ({ el, texto: (el.textContent ?? '').replace(/\s+/g, ' ').trim() }))
      .filter((t) => /^(\d+) eventos?$/.test(t.texto)).map((t) => ({ n: Number(t.texto.split(' ')[0]), x: Number(t.el.getAttribute('x')), texto: t.texto })) : [];
    return { puntos, eventos, punteados, grupos };
  });
}
const cerca = (p: { x: number; y: number }, q: { x: number; y: number }) => Math.abs(p.x - q.x) <= 3 && Math.abs(p.y - q.y) <= 3;
function conectores(g: Grafica, a: { x: number; y: number }, b: { x: number; y: number }): number {
  return g.punteados.filter((s) => (cerca(s.a, a) && cerca(s.b, b)) || (cerca(s.a, b) && cerca(s.b, a))).length;
}
function firma(g: Grafica): string {
  return [g.puntos.length, g.eventos.length, g.punteados.length, g.grupos.length, g.puntos.map((p) => p.x.toFixed(1)).join(',')].join('|');
}
async function esperarEstable(page: Page): Promise<Grafica> {
  await expect(page.getByText('Cargando historial...')).toHaveCount(0, { timeout: 30_000 });
  let anterior = '';
  let g = await leerGrafica(page);
  const limite = Date.now() + 10_000;
  while (Date.now() < limite) {
    await page.waitForTimeout(250);
    g = await leerGrafica(page);
    const f = firma(g);
    if (f === anterior) return g;
    anterior = f;
  }
  return g;
}
/** Texto que se muestra al pasar el raton sobre el marcador: tooltip de recharts, <title> del marcador y role="tooltip". */
async function tooltipEn(page: Page, j: number, px: number, py: number): Promise<string> {
  await page.mouse.move(px, py);
  await page.waitForTimeout(400);
  const texto = await page.evaluate((k) => {
    const n = (s: string | null | undefined) => (s ?? '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();
    const simbolo = document.querySelectorAll('.recharts-scatter-symbol path')[k]?.closest('.recharts-scatter-symbol');
    const tip = document.querySelector('.recharts-tooltip-wrapper') as HTMLElement | null;
    const visible = tip && getComputedStyle(tip).visibility !== 'hidden' ? n(tip.innerText) : '';
    const partes = [visible, ...Array.from(simbolo?.querySelectorAll('title') ?? []).map((t) => n(t.textContent)),
      ...Array.from(document.querySelectorAll('[role="tooltip"]')).map((t) => n(t.textContent))].filter((s) => s !== '');
    return partes.length ? partes.join(' | ') : '(sin tooltip)';
  }, j);
  await page.mouse.move(5, 5);
  await page.waitForTimeout(200);
  return texto;
}

test.afterAll(() => {
  if (violaciones.length) precondiciones.push({ nombre: 'Ninguna escritura no permitida hacia TEST', ok: false, detalle: violaciones.join('; ') });
  else precondiciones.push({ nombre: 'Ninguna escritura no permitida hacia TEST', ok: true, detalle: `${escrituras.length} peticiones distintas de GET, todas permitidas` });
  if (precondiciones.some((p) => !p.ok)) {
    const nombres = precondiciones.filter((p) => !p.ok).map((p) => p.nombre).join('; ');
    for (const c of CPS) if (!c.obtenido.startsWith('Precondición no cumplida')) { c.obtenido = `Precondición no cumplida (${nombres}); medido: ${c.obtenido}`; c.estado = 'FALLA'; }
  }
  const ok = CPS.filter((c) => c.estado === 'OK').length;
  const reporte = {
    tc: TC, parte: 'playwright', reintento: REINTENTO, run_id: process.env.RUN_ID ?? '', fecha: new Date().toISOString(),
    ambiente: BASE,
    summary: { total: CPS.length, ok, falla: CPS.length - ok, veredicto: ok === CPS.length ? 'Aprobado' : 'Rechazado' },
    precondiciones, checkpoints: CPS, observaciones, retirados: [] as Array<{ paso: string; motivo: string }>, escrituras,
  };
  if (!STAGING) return;
  mkdirSync(STAGING, { recursive: true });
  writeFileSync(join(STAGING, `parcial_playwright_${TC}${REINTENTO > 0 ? `_reintento${REINTENTO}` : ''}.json`), `${JSON.stringify(reporte, null, 2)}\n`, 'utf8');
});

// ---------------------------------------------------------------------------------------------------------------
// Recorrido unico (un solo login)
// ---------------------------------------------------------------------------------------------------------------
test('TC-M08-G021 parte navegador real (CP-10 a CP-17)', async ({ page }) => {
  test.setTimeout(300_000);
  const correo = process.env.QA_VET_EMAIL ?? '';
  const clave = process.env.QA_VET_PASSWORD ?? '';
  precondicion('Credenciales del Veterinario en memoria', correo.length > 3 && clave.length > 3, 'QA_VET_EMAIL / QA_VET_PASSWORD presentes');

  const scripts: Array<{ nombre: string; cuerpo: string }> = [];
  page.on('response', async (r) => {
    if (r.request().resourceType() !== 'script') return;
    try { scripts.push({ nombre: new URL(r.url()).pathname.split('/').pop() ?? '', cuerpo: await r.text() }); } catch { /* recurso sin cuerpo */ }
  });
  await page.route('**/*', guardia);

  // -- Login (una sola vez; un fallo no se reintenta)
  await page.goto(`${BASE}login`);
  await page.locator('input[autocomplete="email"]').fill(correo);
  await page.locator('input[autocomplete="current-password"]').fill(clave);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 30_000 }).catch(() => undefined);
  precondicion('Login del Veterinario 97 (una sola vez)', !page.url().endsWith('/login'), `URL tras el login: ${new URL(page.url()).pathname}`);

  // -- Historial predictivo del 885 en Lineal
  const respOpciones = page.waitForResponse((r) => /\/reportes\/opciones\/activo/.test(r.url()) && r.request().method() === 'GET', { timeout: 30_000 });
  await page.goto(`${BASE}prediccion/historial-predictivo`);
  const opciones = (await (await respOpciones).json()) as Array<{ valor: number; etiqueta: string }>;
  const opcion = opciones.find((o) => Number(o.valor) === ACTIVO);
  precondicion(`El activo ${ACTIVO} figura entre los animales o lotes del Veterinario`, !!opcion, `${opciones.length} opciones`);
  const esHistorial = (modo: string) => (r: Response) => new RegExp(`/historial-predictivo/${ACTIVO}\\?`).test(r.url()) && r.url().includes(`modo_visualizacion=${modo}`) && r.request().method() === 'GET';
  const respLineal = page.waitForResponse(esHistorial('LINEAL'), { timeout: 30_000 });
  const combo = page.getByRole('combobox', { name: 'Animal o lote' });
  await combo.fill(opcion!.etiqueta);
  const opcionLista = page.getByRole('option', { name: opcion!.etiqueta, exact: true });
  if (await opcionLista.count()) await opcionLista.first().click();
  const rLineal = await respLineal;
  precondicion(`GET /historial-predictivo/${ACTIVO} (Lineal) responde 200`, rLineal.status() === 200, `HTTP ${rLineal.status()}`);
  const h = (await rLineal.json()) as Historial;

  // -- Datos sembrados (precondicion): los tres pares de CA-7 con sus distancias, calculadas con la respuesta
  const iPredA = h.predicciones.findIndex((m) => String(m.id_resultado_inferencia).startsWith(PRED_A));
  const iPredB = h.predicciones.findIndex((m) => String(m.id_resultado_inferencia).startsWith(PRED_B));
  const iPredC = h.predicciones.findIndex((m) => String(m.id_resultado_inferencia).startsWith(PRED_C));
  const jA = h.eventos_sanitarios.findIndex((m) => Number(m.id_evento) === EVT_A);
  const jB = h.eventos_sanitarios.findIndex((m) => Number(m.id_evento) === EVT_B);
  const jC = h.eventos_sanitarios.findIndex((m) => Number(m.id_evento) === EVT_C);
  const minutos = (i: number, j: number) => (i < 0 || j < 0 ? Number.NaN
    : Math.floor(Math.abs(ms(h.eventos_sanitarios[j].fecha) - ms(h.predicciones[i].fecha)) / 60_000));
  const dist = { A: minutos(iPredA, jA), C: minutos(iPredC, jC), B: minutos(iPredB, jB) };
  precondicion('Ventana de correspondencia de TEST = 12 h', h.ventana_correspondencia_horas === VENTANA_H, `ventana_correspondencia_horas=${h.ventana_correspondencia_horas}`);
  precondicion(`Datos de CA-7 en el ${ACTIVO}: ${PRED_A}-${EVT_A} a 600 min, ${PRED_C}-${EVT_C} a 30 min y ${PRED_B}-${EVT_B} a 1200 min`,
    dist.A === 600 && dist.C === 30 && dist.B === 1200,
    `indices pred=${iPredA}/${iPredC}/${iPredB} eventos=${jA}/${jC}/${jB}; minutos A=${dist.A} C=${dist.C} B=${dist.B}; ${h.predicciones.length} predicciones, ${h.eventos_sanitarios.length} eventos`);

  // -- CP-10 a CP-13: respuesta del backend
  const corrA = h.correspondencias.find((c) => String(c.id_resultado_inferencia).startsWith(PRED_A) && Number(c.id_evento) === EVT_A);
  anotar('CP-10', !!corrA && corrA.diferencia_minutos === 600 && corrA.diferencia === 'Diferencia: 10 h' && corrA.colision === false,
    corrA ? `{pred=${corto(corrA.id_resultado_inferencia)}, evento=${corrA.id_evento}, diferencia_minutos=${corrA.diferencia_minutos}, diferencia="${corrA.diferencia}", colision=${corrA.colision}}` : '(ausente)');
  const corrB = h.correspondencias.filter((c) => String(c.id_resultado_inferencia).startsWith(PRED_B) && Number(c.id_evento) === EVT_B);
  anotar('CP-11', corrB.length === 0, `elementos ${PRED_B}-${EVT_B} en correspondencias: ${corrB.length}${corrB.length ? ` ${JSON.stringify(corrB)}` : ''}`);
  const kGrupo = h.grupos.findIndex((g) => g.some((m) => clase(m) === 'PREDICCION' && String(m.id_resultado_inferencia).startsWith(PRED_C))
    && g.some((m) => clase(m) === 'EVENTO_SANITARIO' && Number(m.id_evento) === EVT_C));
  const grupo = kGrupo >= 0 ? h.grupos[kGrupo] : null;
  const posE = grupo ? grupo.findIndex((m) => clase(m) === 'EVENTO_SANITARIO' && Number(m.id_evento) === EVT_C) : -1;
  const posP = grupo ? grupo.findIndex((m) => clase(m) === 'PREDICCION' && String(m.id_resultado_inferencia).startsWith(PRED_C)) : -1;
  anotar('CP-12', !!grupo && posE >= 0 && posP >= 0 && posE < posP,
    grupo ? `grupo ${kGrupo + 1} de ${h.grupos.length}: [${grupo.map((m) => `${nombreMarcador(m)}@${m.fecha}`).join(', ')}]` : `(sin grupo; ${h.grupos.length} grupos)`);
  const calculados = new Map<string, number>();
  for (const p of h.predicciones) for (const e of h.eventos_sanitarios) {
    const d = Math.abs(ms(e.fecha) - ms(p.fecha));
    if (d <= VENTANA_H * HORA_MS) calculados.set(`${corto(p.id_resultado_inferencia)}-${e.id_evento}`, Math.floor(d / 60_000));
  }
  const backend = new Map(h.correspondencias.map((c) => [`${corto(c.id_resultado_inferencia)}-${c.id_evento}`, c.diferencia_minutos] as const));
  const iguales = calculados.size === backend.size && [...calculados].every(([k, v]) => backend.get(k) === v);
  const lista = (m: Map<string, number>) => `[${[...m].map(([k, v]) => `${k}:${v}`).sort().join(', ')}]`;
  anotar('CP-13', iguales, `calculados=${lista(calculados)}; backend=${lista(backend)}`);
  observaciones.push(`Datos reales del ${ACTIVO}: ventana=${h.ventana_correspondencia_horas} h; ${h.predicciones.length} predicciones, ${h.eventos_sanitarios.length} eventos, ${h.retroalimentaciones.length} retroalimentaciones; correspondencias=[${h.correspondencias.map((c) => `${corto(c.id_resultado_inferencia)}-${c.id_evento} ${c.diferencia_minutos} min "${c.diferencia}" colision=${c.colision}`).join('; ')}]; grupos=[${h.grupos.map((g) => `(${g.map(nombreMarcador).join(', ')})`).join('; ')}]; "tipo" de los eventos en la respuesta: [${h.eventos_sanitarios.map((e) => `${e.id_evento}:${String(e.tipo)}`).join(', ')}]`);

  // -- Vista en Lineal
  await page.locator('.recharts-wrapper').first().scrollIntoViewIfNeeded();
  const gL = await esperarEstable(page);
  const conteoOk = (g: Grafica) => g.puntos.length === h.predicciones.length && g.eventos.length === h.eventos_sanitarios.length;
  const conteo = (g: Grafica) => `puntos=${g.puntos.length}/${h.predicciones.length}; eventos=${g.eventos.length}/${h.eventos_sanitarios.length}`;
  await captura(page, 'linea_tiempo');
  const medirModo = async (g: Grafica) => {
    if (!conteoOk(g)) return { ok14: false, ok15: false, ok16: false, d14: conteo(g), d15: conteo(g), d16: conteo(g), tooltips: [] as string[] };
    const ev = await page.evaluate(() => Array.from(document.querySelectorAll('.recharts-scatter-symbol path')).map((el) => {
      const r = el.getBoundingClientRect(); return { px: r.left + r.width / 2, py: r.top + r.height / 2 };
    }));
    const cA = conectores(g, g.puntos[iPredA], g.eventos[jA]);
    const tA = await tooltipEn(page, jA, ev[jA].px, ev[jA].py);
    const cB = conectores(g, g.puntos[iPredB], g.eventos[jB]);
    const tam = grupo?.length ?? 2;
    const xs = [g.puntos[iPredC].x, g.eventos[jC].x];
    const marc = g.grupos.filter((m) => m.n === tam && m.x >= Math.min(...xs) - 3 && m.x <= Math.max(...xs) + 3);
    const tooltips: string[] = [];
    for (let j = 0; j < h.eventos_sanitarios.length; j += 1) tooltips.push(`${h.eventos_sanitarios[j].id_evento}: "${await tooltipEn(page, j, ev[j].px, ev[j].py)}"`);
    return {
      ok14: cA === 1 && tA.includes('Diferencia: 10 h'), ok15: cB === 0, ok16: marc.length >= 1,
      d14: `conectores_${PRED_A}_${EVT_A}=${cA}; texto_al_pasar_el_raton="${tA}"`,
      d15: `conectores_${PRED_B}_${EVT_B}=${cB}`,
      d16: `marcadores "N eventos" en la gráfica=[${g.grupos.map((m) => `"${m.texto}"@x=${m.x.toFixed(1)}`).join(', ')}] (miembros x=${xs.map((v) => v.toFixed(1)).join('/')}, N=${tam})`,
      tooltips,
    };
  };
  const mL = await medirModo(gL);
  const puntosEnGrupo = conteoOk(gL) ? gL.puntos.filter((p) => Math.abs(p.x - gL.puntos[iPredC].x) <= 3).length : -1;
  const eventosEnGrupo = conteoOk(gL) ? gL.eventos.filter((e) => Math.abs(e.x - gL.eventos[jC].x) <= 3).length : -1;

  // -- Vista en Agrupada
  const respAgrupado = page.waitForResponse(esHistorial('AGRUPADO'), { timeout: 30_000 });
  await page.getByRole('radio', { name: 'Agrupada' }).check();
  const rAgr = await respAgrupado;
  precondicion(`GET /historial-predictivo/${ACTIVO} (Agrupada) responde 200`, rAgr.status() === 200, `HTTP ${rAgr.status()}`);
  const hA = (await rAgr.json()) as Historial;
  await page.locator('.recharts-wrapper').first().scrollIntoViewIfNeeded();
  const gA = await esperarEstable(page);
  const mA = await medirModo(gA);
  anotar('CP-14', mL.ok14 && mA.ok14, `LINEAL: ${conteo(gL)}; ${mL.d14} | AGRUPADO: ${conteo(gA)}; ${mA.d14}`);
  anotar('CP-15', conteoOk(gL) && conteoOk(gA) && mL.ok15 && mA.ok15, `LINEAL: ${mL.d15} | AGRUPADO: ${mA.d15}`);
  anotar('CP-16', mL.ok16 && mA.ok16, `LINEAL: ${mL.d16} | AGRUPADO: ${mA.d16}`);

  // -- CP-17: expandir los grupos en Agrupada
  const summary = page.locator('summary', { hasText: /grupos? de eventos cercanos/ });
  let abierto = '(sin lista de grupos)';
  let items: Array<{ etiqueta: string; fecha: string }> = [];
  let listaGrupos: string[] = [];
  const kA = hA.grupos.findIndex((g) => g.some((m) => clase(m) === 'EVENTO_SANITARIO' && Number(m.id_evento) === EVT_C));
  if (await summary.count()) {
    await summary.first().click();
    const det = page.locator('details', { has: summary.first() });
    abierto = String(await det.first().evaluate((d) => (d as HTMLDetailsElement).open));
    const lis = det.first().locator(':scope > ul > li');
    listaGrupos = (await lis.allTextContents()).map((t) => norm(t).slice(0, 80));
    if (kA >= 0 && kA < await lis.count()) {
      items = (await lis.nth(kA).locator(':scope > ul > li').allTextContents()).map((t) => {
        const s = norm(t); const k = s.indexOf(' · ');
        return { etiqueta: k >= 0 ? s.slice(0, k) : s, fecha: k >= 0 ? s.slice(k + 3) : '' };
      });
    }
  }
  const miembros = kA >= 0 ? hA.grupos[kA] : [];
  const esperado = [...miembros].sort((a, b) => (PRIORIDAD[clase(a)] - PRIORIDAD[clase(b)]) || (ms(a.fecha) - ms(b.fecha))).map(nombreMarcador);
  const porFecha = new Map(miembros.map((m) => [fechaBogota(m.fecha), nombreMarcador(m)] as const));
  const identificados = items.map((it) => porFecha.get(it.fecha) ?? `?(${it.fecha})`);
  anotar('CP-17', kA >= 0 && esperado.length > 1 && JSON.stringify(identificados) === JSON.stringify(esperado),
    `details_open=${abierto}; grupo ${kA + 1} de ${hA.grupos.length}: [${items.map((it) => `"${it.etiqueta} · ${it.fecha}"`).join(', ')}]; orden_identificado=[${identificados.join(', ')}]; orden_esperado=[${esperado.join(', ')}]`);

  observaciones.push(`OBS-8 (navegador real): texto al pasar el ratón sobre cada marcador de evento. LINEAL: [${mL.tooltips.join('; ')}]; AGRUPADO: [${mA.tooltips.join('; ')}]`);
  observaciones.push(`OBS-4 (navegador real, Lineal): en la posición del grupo ${PRED_C}/${EVT_C} siguen dibujados ${puntosEnGrupo} punto(s) de la línea y ${eventosEnGrupo} marcador(es) de evento por separado.`);
  observaciones.push(`OBS-7 (navegador real, Agrupada): grupos listados=[${listaGrupos.map((t) => `"${t}"`).join(', ')}]; etiquetas del grupo de CP-12=[${items.map((it) => `"${it.etiqueta}"`).join(', ')}]`);

  // -- Precondicion de despliegue (#693) con los scripts que cargo la app
  const todo = scripts.map((s) => s.cuerpo).join('\n');
  const index = [...new Set(scripts.map((s) => s.nombre).filter((n) => /^index-.*\.js$/.test(n)))];
  await page.goto('about:blank');
  observaciones.push(`Despliegue: bundle ${index.join(', ') || '(no identificado)'} en ${BASE}.`);
  precondicion('El frontend desplegado tiene la vista del historial predictivo de #693 ("Se relacionan predicción y evento", "grupos de eventos cercanos")',
    todo.includes('Se relacionan predicción y evento') && todo.includes('grupos de eventos cercanos'),
    `bundle: ${index.join(', ') || '(sin index-*.js)'}; ${scripts.length} scripts revisados`);

  expect(violaciones, violaciones.join('; ')).toEqual([]);
  expect(CPS.every((c) => c.estado === 'OK'), CPS.filter((c) => c.estado === 'FALLA').map((c) => c.paso).join(', ')).toBe(true);
});
