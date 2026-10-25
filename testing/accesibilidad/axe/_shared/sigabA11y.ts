/**
 * Utilidades comunes de los specs de accesibilidad de M03 (Telemetría IoT) y M04 (Predicción).
 *
 * Reúne lo que TC-DIS-108 y los demás specs de M02 repiten en cada archivo: sesión por viewport
 * con caché de assets, bloqueo de escrituras, navegación con verificación de sesión, escaneo
 * axe + Lighthouse y la evidencia que los criterios piden (tablas, regiones vivas, foco).
 *
 * Rutas relativas (sin "/" inicial): `use.baseURL` termina en /sigab-test/ y un goto('/login')
 * resolvería contra la raíz del dominio, fuera del prefijo.
 */
import fs from 'fs';
import path from 'path';
import AxeBuilder from '@axe-core/playwright';
import { expect, type Browser, type BrowserContext, type Locator, type Page, type Response, type TestInfo } from '@playwright/test';
import { guardarResultadoAxe } from './axeReport';
import { auditarLighthouse } from './lighthouse';

export const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
/**
 * Prefijo de la API del ambiente TEST (https://api.inmero.co/api-sgpmp-test/…, verificado el
 * 2026-10-20 registrando las peticiones reales). Los specs de M02 usan /back-sigab-test, que ya no
 * corresponde a este ambiente.
 */
export const PREFIJO_API = process.env.API_PREFIX ?? '/api-sgpmp-test';

const HAR_ASSETS = path.join(__dirname, '../../../.har-cache/assets.har');

// ── Sesión ───────────────────────────────────────────────────────────────────

export function credencialesAdmin() {
  const email = process.env.TEST_ADMIN_EMAIL ?? '';
  const password = process.env.TEST_ADMIN_PASSWORD ?? '';
  expect(email, 'Faltan TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD en testing/.env.test').not.toBe('');
  expect(password, 'Faltan TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD en testing/.env.test').not.toBe('');
  return { email, password };
}

export async function iniciarSesion(page: Page, email: string, password: string) {
  await page.goto('login', { waitUntil: 'commit', timeout: 300_000 });
  const correo = page.getByRole('textbox', { name: 'Correo electrónico', exact: true });
  await correo.waitFor({ state: 'visible', timeout: 300_000 });
  await correo.fill(email);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(password);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 120_000 }).catch(() => {
    throw new Error('LOGIN FALLIDO: la app sigue en /login tras "Ingresar". No reintentar (bloqueo tras 5 intentos).');
  });
  await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
}

/**
 * Contexto propio del viewport del proyecto, con caché de JS/CSS/fuentes (nunca la API) y
 * ninguna escritura hacia el backend salvo el login. Las simulaciones de cada spec van en
 * page.route, que tiene prioridad sobre contexto.route.
 */
export async function abrirSesion(browser: Browser, testInfo: TestInfo): Promise<{ contexto: BrowserContext; page: Page }> {
  const { email, password } = credencialesAdmin();
  const use = testInfo.project.use;
  const contexto = await browser.newContext({
    baseURL: use.baseURL,
    viewport: use.viewport,
    deviceScaleFactor: use.deviceScaleFactor,
    userAgent: use.userAgent,
    locale: 'es-CO',
  });
  await contexto.routeFromHAR(HAR_ASSETS, { url: '**/assets/**', update: !fs.existsSync(HAR_ASSETS), notFound: 'fallback' });
  // El bloqueo no depende del prefijo de la API: si el prefijo cambia, ninguna escritura se escapa.
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

export function main(page: Page) {
  return page.getByRole('main');
}

/** GET de la API cuyo pathname termina en `sufijo` (sin el prefijo /back-sigab-test). */
export function esGet(sufijo: string | RegExp) {
  return (r: Response) => {
    if (r.request().method() !== 'GET') return false;
    const ruta = new URL(r.url()).pathname.replace(PREFIJO_API, '');
    return typeof sufijo === 'string' ? ruta === sufijo : sufijo.test(ruta);
  };
}

/**
 * goto a la ruta (relativa) y espera el h1 de la vista. Si la app vuelve al login la sesión se
 * perdió: se aborta con "BLOQUEO DE AMBIENTE" en vez de auditar el login.
 * Con `esperar`, devuelve la respuesta GET que carga los datos de la vista.
 */
export async function irA(page: Page, ruta: string, titulo: string, esperar?: (r: Response) => boolean): Promise<Response | null> {
  const respuesta = esperar ? page.waitForResponse(esperar, { timeout: 120_000 }).catch(() => null) : Promise.resolve(null);
  await page.goto(ruta, { waitUntil: 'commit', timeout: 120_000 });
  const h1 = page.getByRole('heading', { level: 1, name: titulo, exact: true });
  const login = page.getByRole('textbox', { name: 'Correo electrónico', exact: true });
  await expect(h1.or(login)).toBeVisible({ timeout: 120_000 });
  if (await login.isVisible()) {
    throw new Error(`BLOQUEO DE AMBIENTE: sesión perdida tras goto (${ruta} → ${page.url()})`);
  }
  const r = await respuesta;
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  return r;
}

export async function json<T>(r: Response | null): Promise<T | null> {
  if (!r || !r.ok()) return null;
  return (await r.json().catch(() => null)) as T | null;
}

// ── Escaneo axe + Lighthouse ─────────────────────────────────────────────────

export function resumenViolaciones(violaciones: { id: string; impact?: string | null; help: string; nodes: unknown[] }[]) {
  return violaciones.map((v) => `${v.id} (${v.impact}): ${v.help} [${v.nodes.length} nodo(s)]`).join('\n');
}

/**
 * axe A/AA en todos los viewports; Lighthouse (snapshot) solo en escritorio y solo para los
 * pasos listados en `pasosLighthouse` (máximo 3 por caso: el reporte HTML pesa varios MB).
 */
export async function escanear(page: Page, tcId: string, dirSpec: string, paso: string, testInfo: TestInfo, pasosLighthouse: string[]) {
  const pasoVp = `${paso}-${testInfo.project.name}`;
  await page.evaluate(() => document.fonts.ready);

  const axe = await new AxeBuilder({ page }).withTags(ETIQUETAS_WCAG).analyze();
  guardarResultadoAxe(tcId, dirSpec, pasoVp, axe);

  if (pasosLighthouse.includes(paso) && testInfo.project.name === 'escritorio') {
    const lh = await auditarLighthouse(page, tcId, dirSpec, pasoVp);
    testInfo.annotations.push({
      type: `Lighthouse ${pasoVp}`,
      description:
        `Puntaje accesibilidad: ${lh.puntaje === null ? 'N/A' : Math.round(lh.puntaje * 100)} (snapshot, alcance limitado)` +
        (lh.auditoriasFallidas.length ? ` · Fallidas: ${lh.auditoriasFallidas.map((a) => a.id).join(', ')}` : ' · 0 auditorías fallidas'),
    });
  }

  expect.soft(axe.violations, `Violaciones axe A/AA en "${pasoVp}":\n${resumenViolaciones(axe.violations)}`).toEqual([]);
  return axe;
}

// ── Evidencia ────────────────────────────────────────────────────────────────

export function anotar(testInfo: TestInfo, tipo: string, descripcion: string) {
  testInfo.annotations.push({ type: tipo, description: descripcion });
}

/**
 * La UI no ofrece lo que pide el criterio (filtro, detalle, estado…). Falla en blando con un
 * mensaje que distingue "falta la funcionalidad" de "la funcionalidad no es accesible".
 */
export function desviacion(cumple: boolean, mensaje: string) {
  expect.soft(cumple, `Desviación de la especificación: ${mensaje}`).toBe(true);
}

/** Precondición de datos del caso que el ambiente no cumple. */
export function precondicion(cumple: boolean, mensaje: string) {
  expect.soft(cumple, `Precondición de datos no cumplida en el ambiente: ${mensaje}`).toBe(true);
}

/** Regiones vivas con texto (aria-live, status, alert, log). */
export function regionesVivas(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('[aria-live]:not([aria-live="off"]), [role="status"], [role="alert"], [role="log"]')]
      .map((e) => `${e.tagName.toLowerCase()}[${e.getAttribute('role') ?? ''}${e.getAttribute('aria-live') ? ` aria-live=${e.getAttribute('aria-live')}` : ''}] "${(e.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 60)}"`)
      .filter((v) => !v.endsWith('""')),
  );
}

/** true si el elemento está dentro de una región que el lector anuncia sin mover el foco. */
export function estaEnRegionViva(elemento: Locator) {
  return elemento.evaluate((e) => !!e.closest('[aria-live]:not([aria-live="off"]), [role="status"], [role="alert"], [role="log"]'));
}

export interface AuditoriaTabla {
  encabezados: string[];
  filas: number;
  /** Filas cuyo número de celdas no coincide con el de encabezados (rompe la asociación de 1.3.1). */
  filasDesalineadas: number[];
  /** Celdas sin texto ni nombre accesible: "fila N · columna". */
  celdasVacias: string[];
  /** Filas con tabindex (se abren con teclado). */
  filasEnfocables: number;
  thEnThead: boolean;
}

export function auditarTabla(tabla: Locator): Promise<AuditoriaTabla> {
  return tabla.evaluate((t) => {
    const ths = [...t.querySelectorAll('thead th')];
    const encabezados = ths.map((th) => (th.textContent ?? '').trim());
    const filas = [...t.querySelectorAll('tbody tr')];
    const filasDesalineadas: number[] = [];
    const celdasVacias: string[] = [];
    filas.forEach((tr, i) => {
      const tds = [...tr.querySelectorAll('td, th')];
      if (tds.length !== ths.length) filasDesalineadas.push(i + 1);
      tds.forEach((td, j) => {
        if (!encabezados[j]) return; // columna de acción sin encabezado (chevron)
        const texto = (td.textContent ?? '').trim();
        const nombre = [...td.querySelectorAll('[aria-label]')].map((e) => e.getAttribute('aria-label')).join('');
        if (!texto && !nombre) celdasVacias.push(`fila ${i + 1} · ${encabezados[j]}`);
      });
    });
    return {
      encabezados,
      filas: filas.length,
      filasDesalineadas,
      celdasVacias,
      filasEnfocables: filas.filter((tr) => tr.hasAttribute('tabindex')).length,
      thEnThead: ths.length > 0 && ths.length === t.querySelectorAll('th').length,
    };
  });
}

/** Texto de cada celda de la columna cuyo encabezado es exactamente `encabezado`. */
export function textosColumna(tabla: Locator, encabezado: string): Promise<string[]> {
  return tabla.evaluate((t, enc) => {
    const idx = [...t.querySelectorAll('thead th')].findIndex((th) => (th.textContent ?? '').trim() === enc);
    if (idx < 0) return [];
    return [...t.querySelectorAll('tbody tr')].map((tr) => ((tr.children[idx] as HTMLElement | undefined)?.innerText ?? '').replace(/\s+/g, ' ').trim());
  }, encabezado);
}

/** Controles visibles sin nombre accesible (label, aria-label, aria-labelledby, title). */
export function camposSinNombre(alcance: Locator): Promise<string[]> {
  return alcance.evaluate((raiz) =>
    [...raiz.querySelectorAll('input, select, textarea')]
      .filter((e) => (e as HTMLElement).offsetParent !== null && (e as HTMLInputElement).type !== 'hidden')
      .filter((e) => {
        const c = e as HTMLInputElement;
        return !(c.labels && c.labels.length) && !c.getAttribute('aria-label') && !c.getAttribute('aria-labelledby') && !c.getAttribute('title');
      })
      .map((e) => `${e.tagName.toLowerCase()}[type=${(e as HTMLInputElement).type ?? ''}]${e.id ? `#${e.id}` : ''} valor="${(e as HTMLInputElement).value}"`),
  );
}

export function describirFoco(page: Page): Promise<string> {
  return page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null;
    if (!a || a === document.body) return 'body';
    const label = (a as HTMLInputElement).labels?.[0]?.textContent ?? a.getAttribute('aria-label') ?? a.textContent ?? '';
    const rol = a.getAttribute('role') ?? ((a as HTMLInputElement).type === 'date' ? 'date' : '');
    const dentro = a.closest('[role="dialog"]') ? ' (diálogo)' : '';
    return `${a.tagName.toLowerCase()}${rol ? `[${rol}]` : ''} "${label.replace(/\s+/g, ' ').trim().slice(0, 40)}"${dentro}`;
  });
}

/**
 * Pulsa Tab `pasos` veces desde el foco actual y devuelve lo que recibió el foco en cada
 * pulsación. Una trampa de foco se ve como el mismo elemento repetido.
 */
export async function recorrerConTab(page: Page, pasos: number): Promise<string[]> {
  const recorrido: string[] = [];
  for (let i = 0; i < pasos; i++) {
    await page.keyboard.press('Tab');
    recorrido.push(await describirFoco(page));
  }
  return recorrido;
}

/**
 * Hay trampa si el foco se queda en el mismo elemento 3 pulsaciones seguidas. Un
 * <input type="date"> recibe un Tab por segmento (día, mes, año y calendario) sin cambiar de elemento:
 * se toleran hasta 4 repeticiones en ese caso (Chrome añade el botón del calendario).
 */
export function hayTrampaDeFoco(recorrido: string[]) {
  return recorrido.some((f, i) => {
    if (f === 'body') return false;
    const n = f.startsWith('input[date]') ? 5 : 3;
    return i >= n - 1 && recorrido.slice(i - n + 1, i + 1).every((x) => x === f);
  });
}

/** Fecha local yyyy-mm-dd desplazada `dias` hacia atrás (para <input type="date">). */
export function fechaHaceDias(dias: number) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
