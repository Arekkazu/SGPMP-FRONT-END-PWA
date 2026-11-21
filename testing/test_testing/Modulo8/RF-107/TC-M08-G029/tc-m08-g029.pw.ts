// | Fecha      | Nombre                   | Que se hizo |
// |------------|--------------------------|-------------|
// | 2026-11-21 | Juan Sebastian Gutierrez | TC-M08-G029 (RF-107, TC-M08-070): baja de activo con confirmación, cancelación, éxito, datos de contexto y 409 repetido dentro del sandbox |
// | 2026-11-21 | Juan Sebastian Gutierrez | v1.1 (Claude): about:blank en las dos paginas antes del DELETE del sandbox |
// | 2026-11-21 | Juan Sebastian Gutierrez | v1.6 (Claude): sin sandbox ni rollback (autorizado por Sebastian); el activo A de QA queda en TEST en BAJA |
// | 2026-11-21 | Juan Sebastian Gutierrez | v1.5 (Claude): preparacion de la ficha con hasta 3 recargas si faltan permisos; CP-06 solo tras la baja 201 de CP-03; respuestas 5xx en observaciones |
// | 2026-11-21 | Juan Sebastian Gutierrez | v1.4 (Claude): sin segunda pestana; CP-06 con vista desactualizada simulada en la misma pagina (GET de A y su ficha con el estado previo), POST real |
// | 2026-11-21 | Juan Sebastian Gutierrez | v1.3 (Claude): identificador de 17 caracteres y message/field del alta fallida en la precondicion |
// | 2026-11-21 | Juan Sebastian Gutierrez | v1.2 (Claude): ultimo token (rotacion por refresco), networkidle tras login y recarga, 401 de sesion reintentados fuera del conteo de CP-03/CP-06, guardia de bajas 4 |
//
// QA SGPMP - Evaluacion (Fase 2). Navegador real (Chromium) contra el frontend desplegado en TEST (o build local en prueba de herramienta).
// Cuenta Veterinario, activo plantilla 885 para clonar un activo de QA A (v1.6: fuera del sandbox).
// v1.6: sin sandbox ni rollback (autorizado por Sebastian); el activo A de QA queda en TEST en BAJA.
//
// Reporte: JSON final propio en STAGING_DIR (resultado_TC-M08-G029[_reintentoN].json). Cada checkpoint arranca en FALLA "No alcanzado".
import { test, expect, type Page, type BrowserContext, type Route, type Request, type Response } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const TC = 'TC-M08-G029';
const ACTIVO_PLANTILLA = 885;
const PROHIBIDOS = [930, 900, 901, 825];
const BASE = (process.env.QA_FRONT_URL ?? 'https://api.inmero.co/sigab-test/').replace(/\/?$/, '/');
const STAGING = process.env.STAGING_DIR ?? '';
const RUN_ID = process.env.RUN_ID ?? '';
const REINTENTO = Number(process.env.REINTENTO ?? '0');

type Estado = 'OK' | 'FALLA';
interface Checkpoint {
  paso: string;
  esperado: string;
  fuente: string;
  obtenido: string;
  estado: Estado;
}

const CPS: Checkpoint[] = [
  {
    paso: 'CP-01',
    esperado: 'Heading «Confirma la baja» visible dentro del diálogo, botones «Volver» y «Confirmar baja» visibles, y 0 POST .../eventos/baja hasta ese momento',
    fuente: 'TC-M08-070 a; RF-107 CA-03 y 8.5 paso 2',
  },
  {
    paso: 'CP-02',
    esperado: 'Tras «Volver» y luego «Cancelar»: 0 diálogos abiertos; 0 POST .../eventos/baja en total; GET {api}/activos-biologicos/{A} con nombre_estado ACTIVO; 0 .ds-alert--success nuevas; 0 avisos nuevos en .ds-toasts',
    fuente: 'TC-M08-070 a; FA-1 nombrado en la 8.5; Postcondiciones 3 y 5',
  },
  {
    paso: 'CP-03',
    esperado: 'Tras confirmar la baja: exactamente 1 POST nuevo .../eventos/baja con status 201, y luego GET {api}/activos-biologicos/{A} con nombre_estado BAJA',
    fuente: 'TC-M08-070 b; Postcondición 3; 8.5',
  },
  {
    paso: 'CP-04',
    esperado: 'Tras el 201: al menos 1 .ds-alert--success visible, 0 .ds-alert--error/--warning de «No se pudo registrar la baja» y 0 avisos de error en .ds-toasts',
    fuente: 'TC-M08-070 b; CA-10',
  },
  {
    paso: 'CP-05',
    esperado: 'El texto completo (título + descripción, normalizado) del .ds-alert--success de la sección Eventos contiene el identificador exacto de A',
    fuente: 'TC-M08-070 b; CA-09 (valores reales de datos_contexto, no genéricos)',
  },
  {
    paso: 'CP-06',
    esperado: 'Con la vista desactualizada (GET del activo y de su ficha con el estado previo a la baja, simulado con page.route; el POST es real), al confirmar la baja repetida: POST responde 409 con error_code ACTIVO_YA_EN_BAJA; el texto de error visible en el diálogo tiene >= 5 palabras, sin códigos HTTP ni códigos internos (SNAKE_CASE); y 0 .ds-alert--success nuevas',
    fuente: 'TC-M08-070 c; Restricción 1; CA-02; CA-10',
  },
].map((c) => ({ ...c, obtenido: 'No alcanzado', estado: 'FALLA' as Estado }));

const RETIRADOS: Array<{ paso: string; motivo: string }> = [];
const precondiciones: Array<{ nombre: string; ok: boolean; detalle: string }> = [];
const observaciones: string[] = [];
const escrituras: Array<{ metodo: string; ruta: string; status: number | null; error_code: string | null; resultado: string }> = [];
const redApi: Array<{ metodo: string; ruta: string; status: number; error_code: string | null }> = [];
const violaciones: string[] = [];
const respuestas428: string[] = [];

interface BajaPostInfo {
  status: number;
  error_code: string | null;
  baja_tipo: string | null;
  message: string | null;
}
const bajasPost: BajaPostInfo[] = [];

// v1.6: SIN sandbox (autorizado por Sebastian, 2026-11-21 11:36): el sandbox de TEST comparte una sola conexion
// de BD entre peticiones paralelas y responde 500 al cargar la app. El activo A de QA queda en TEST (en BAJA).
const sandbox: { run_id: string; modo: string; rollback_http: number | null; rollback_ok: boolean } = {
  run_id: RUN_ID,
  modo: 'SIN_SANDBOX',
  rollback_http: null,
  rollback_ok: false,
};

const norm = (s: string | null | undefined): string =>
  (s ?? '').replace(/[\u00A0\u202F]/g, ' ').replace(/\s+/g, ' ').trim();

function fechaBogota(): { ymd: string; stamp: string } {
  const ahora = new Date();
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(ahora);
  const get = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? '00';
  const y = get('year');
  const m = get('month');
  const d = get('day');
  const hh = get('hour') === '24' ? '00' : get('hour');
  const mm = get('minute');
  const ss = get('second');
  return { ymd: `${y}-${m}-${d}`, stamp: `${y}${m}${d}${hh}${mm}${ss}` };
}

function anotar(paso: string, ok: boolean, obtenido: string): void {
  const cp = CPS.find((c) => c.paso === paso)!;
  cp.obtenido = obtenido;
  cp.estado = ok ? 'OK' : 'FALLA';
}

function precondicion(nombre: string, ok: boolean, detalle: string): void {
  precondiciones.push({ nombre, ok, detalle });
  if (!ok) {
    for (const c of CPS) {
      c.obtenido = `Precondición no cumplida (${nombre}): ${detalle}`;
      c.estado = 'FALLA';
    }
    throw new Error(`Precondicion falsa: ${nombre} (${detalle})`);
  }
}

async function captura(page: Page, nombre: string): Promise<void> {
  if (!STAGING) return;
  await page.screenshot({
    path: join(STAGING, `captura_${TC}_${nombre}.png`),
    mask: [page.locator('.ds-appbar__right'), page.locator('.ds-sidebar__footer')],
  }).catch(() => undefined);
}

// Estado en memoria del sandbox y auth (nunca se escribe a disco ni consola)
let apiBase = '';
let authToken = '';
let activoId: number | null = null;
let logins = 0;
let bajasPermitidas = 0;
let postActivosUi = 0;

function headersSandbox(secreto: string, conAuth = true): Record<string, string> {
  const h: Record<string, string> = {
    'X-Zona-Horaria': 'America/Bogota',
  };
  if (conAuth && authToken) h.Authorization = `Bearer ${authToken}`;
  return h;
}

async function registrarRutas(ctx: BrowserContext, secreto: string): Promise<void> {
  await ctx.route('**/*', async (route: Route, req: Request) => {
    const metodo = req.method();
    const url = new URL(req.url());
    const ruta = url.pathname;

    if (/googleapis\.com|gstatic\.com|firebaseio\.com|firebase\.com/.test(url.hostname)) {
      escrituras.push({ metodo, ruta: `${url.hostname}${ruta}`, status: null, error_code: null, resultado: 'abortada (host externo)' });
      return route.abort();
    }
    if (metodo === 'POST' && /\/usuarios\/me\/fcm-token\/?$/.test(ruta)) {
      escrituras.push({ metodo, ruta, status: null, error_code: null, resultado: 'abortada (registro de push)' });
      return route.abort();
    }

    const tipo = req.resourceType();
    const esApi = tipo === 'fetch' || tipo === 'xhr';
    if (!esApi) return route.continue();

    const origHeaders = req.headers();
    // v1.2: siempre el ultimo token que envia la app (cada refresco revoca el anterior: TOKEN_REVOCADO)
    if (origHeaders.authorization && /^Bearer\s+/i.test(origHeaders.authorization)) {
      authToken = origHeaders.authorization.replace(/^Bearer\s+/i, '').trim();
    }

    const nextHeaders: Record<string, string> = {
      ...origHeaders,
    };
    if (!nextHeaders['x-zona-horaria']) {
      nextHeaders['x-zona-horaria'] = 'America/Bogota';
    }

    if (metodo === 'GET' || metodo === 'HEAD' || metodo === 'OPTIONS') {
      return route.continue({ headers: nextHeaders });
    }

    if (metodo === 'POST' && /\/sesiones\/?$/.test(ruta)) {
      logins += 1;
      if (!apiBase) apiBase = req.url().replace(/\/sesiones\/?$/, '');
      if (logins > 1) {
        escrituras.push({ metodo, ruta, status: null, error_code: null, resultado: 'ABORTADA (segundo login)' });
        violaciones.push(`segundo login (${ruta})`);
        return route.abort();
      }
      escrituras.push({ metodo, ruta, status: null, error_code: null, resultado: `al servidor (login ${logins})` });
      return route.continue({ headers: nextHeaders });
    }

    if ((metodo === 'POST' && /\/sesiones\/refresh\/?$/.test(ruta)) || (metodo === 'DELETE' && /\/sesiones\/?$/.test(ruta))) {
      escrituras.push({ metodo, ruta, status: null, error_code: null, resultado: 'al servidor (sesion)' });
      return route.continue({ headers: nextHeaders });
    }

    if (metodo === 'POST' && /\/activos-biologicos\/?$/.test(ruta)) {
      postActivosUi += 1;
      escrituras.push({ metodo, ruta, status: null, error_code: null, resultado: `ABORTADA (creacion no permitida desde UI #${postActivosUi})` });
      violaciones.push(`POST ${ruta} desde UI`);
      return route.abort();
    }

    if (activoId !== null && metodo === 'POST' && new RegExp(`/activos-biologicos/${activoId}/eventos/baja/?$`).test(ruta)) {
      bajasPermitidas += 1;
      if (bajasPermitidas > 4) {
        escrituras.push({ metodo, ruta, status: null, error_code: null, resultado: `ABORTADA (baja #${bajasPermitidas} > 4)` });
        violaciones.push(`POST ${ruta} excedio limite de 4`);
        return route.abort();
      }
      escrituras.push({ metodo, ruta, status: null, error_code: null, resultado: `al servidor (baja #${bajasPermitidas})` });
      return route.continue({ headers: nextHeaders });
    }

    escrituras.push({ metodo, ruta, status: null, error_code: null, resultado: 'ABORTADA (no permitida)' });
    violaciones.push(`${metodo} ${ruta}`);
    return route.abort();
  });
}

function enlazarRed(page: Page, scripts?: Array<{ nombre: string }>): void {
  page.on('response', async (resp: Response) => {
    const req = resp.request();
    const tipo = req.resourceType();
    if (scripts && tipo === 'script') {
      try {
        scripts.push({ nombre: new URL(resp.url()).pathname.split('/').pop() ?? '' });
      } catch { /* ignorar */ }
      return;
    }
    if (tipo !== 'fetch' && tipo !== 'xhr') return;
    const metodo = req.method();
    const ruta = new URL(resp.url()).pathname;
    const status = resp.status();
    let errorCode: string | null = null;
    let bajaTipo: string | null = null;
    let message: string | null = null;
    try {
      const ct = resp.headers()['content-type'] ?? '';
      if (ct.includes('application/json')) {
        const body = (await resp.json()) as Record<string, unknown>;
        if (typeof body?.error_code === 'string') errorCode = body.error_code;
        if (typeof body?.message === 'string') message = body.message;
        const bajaObj = body?.baja as Record<string, unknown> | undefined;
        if (bajaObj && typeof bajaObj.tipo === 'string') bajaTipo = bajaObj.tipo;
      }
    } catch { /* cuerpo vacio o no JSON */ }

    redApi.push({ metodo, ruta, status, error_code: errorCode });
    if (status >= 500) observaciones.push(`Respuesta ${status} de la API: ${metodo} ${ruta} (${errorCode ?? 'sin error_code'}).`);
    if (status === 428) respuestas428.push(`${metodo} ${ruta} -> 428 (${errorCode ?? 'sin error_code'})`);

    if (metodo !== 'GET' && metodo !== 'HEAD' && metodo !== 'OPTIONS') {
      for (let i = escrituras.length - 1; i >= 0; i -= 1) {
        if (escrituras[i].metodo === metodo && escrituras[i].ruta === ruta && escrituras[i].status === null) {
          escrituras[i].status = status;
          escrituras[i].error_code = errorCode;
          break;
        }
      }
    }

    if (activoId !== null && metodo === 'POST' && new RegExp(`/activos-biologicos/${activoId}/eventos/baja/?$`).test(ruta)) {
      bajasPost.push({ status, error_code: errorCode, baja_tipo: bajaTipo, message });
    }
  });
}

async function leerToasts(page: Page): Promise<Array<{ variant: string; texto: string }>> {
  return page.evaluate(() => {
    const n = (s: string | null | undefined) => (s ?? '').replace(/[\u00A0\u202F]/g, ' ').replace(/\s+/g, ' ').trim();
    const cont = document.querySelector('.ds-toasts');
    if (!cont) return [];
    return Array.from(cont.querySelectorAll('.ds-alert')).map((el) => {
      const cls = el.className;
      const variant = cls.includes('ds-alert--error')
        ? 'error'
        : cls.includes('ds-alert--warning')
          ? 'warning'
          : cls.includes('ds-alert--success')
            ? 'success'
            : 'info';
      return { variant, texto: n(el.textContent) };
    });
  }).catch(() => []);
}

// v1.5: en TEST, tras una recarga la app a veces queda sin permisos (menu sin «Activos biologicos», sin botones
// de eventos). Preparacion de la herramienta, no checkpoint: hasta 3 intentos con recarga, todos anotados.
async function esperarFichaLista(page: Page, etiqueta: string, recargarPrimero: boolean): Promise<{ ok: boolean; detalle: string }> {
  let detalle = '';
  for (let intento = 1; intento <= 3; intento += 1) {
    if (intento > 1 || recargarPrimero) await page.reload().catch(() => undefined);
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);
    const menuOk = await page.locator('.ds-sidebar').getByText('Activos biológicos', { exact: true }).first().isVisible().catch(() => false);
    const tab = page.getByRole('button', { name: 'Eventos', exact: true });
    await tab.waitFor({ state: 'visible', timeout: 20_000 }).catch(() => undefined);
    if (await tab.isVisible().catch(() => false)) await tab.click();
    const baja = page.getByRole('button', { name: 'Baja', exact: true });
    await baja.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => undefined);
    const bajaVis = await baja.isVisible().catch(() => false);
    detalle = `intento ${intento}: menu_activos=${menuOk}, boton_baja=${bajaVis}`;
    observaciones.push(`Preparación ${etiqueta}: ${detalle}${bajaVis ? '' : ' (se recarga; no es checkpoint)'}.`);
    if (bajaVis) return { ok: true, detalle };
  }
  return { ok: false, detalle };
}

async function abrirYLlenarBaja(page: Page): Promise<{ ok: boolean; detalle: string }> {
  try {
    const btnBaja = page.getByRole('button', { name: 'Baja', exact: true });
    const visible = await btnBaja.isVisible().catch(() => false);
    if (!visible) return { ok: false, detalle: 'botón «Baja» no visible' };
    const habilitado = await btnBaja.isEnabled().catch(() => false);
    if (!habilitado) return { ok: false, detalle: 'botón «Baja» deshabilitado' };
    await btnBaja.click();

    const dialogo = page.locator('[role="dialog"]').first();
    const dlgOk = await dialogo.waitFor({ state: 'visible', timeout: 8_000 }).then(() => true).catch(() => false);
    if (!dlgOk) return { ok: false, detalle: 'el diálogo de baja no se abrió' };

    const sel = dialogo.locator('select').first();
    await sel.selectOption('perdida');
    const txt = dialogo.locator('textarea').first();
    await txt.fill('QA TC-M08-G029 baja de prueba RF-107');

    const btnRegistrar = dialogo.getByRole('button', { name: 'Registrar baja', exact: true });
    const regOk = await btnRegistrar.isVisible().catch(() => false);
    if (!regOk) return { ok: false, detalle: 'botón «Registrar baja» no visible' };
    await btnRegistrar.click();

    await page.waitForTimeout(300);
    return { ok: true, detalle: 'ok' };
  } catch (e) {
    return { ok: false, detalle: `excepción: ${(e as Error).message}` };
  }
}

async function consultarEstadoActivo(
  page: Page,
  secreto: string,
  id: number,
): Promise<{ status: number; nombre_estado: string | null; error_code: string | null }> {
  const resp = await page.request.get(`${apiBase}/activos-biologicos/${id}`, {
    headers: headersSandbox(secreto, true),
  });
  const status = resp.status();
  let nombreEstado: string | null = null;
  let errorCode: string | null = null;
  try {
    const body = (await resp.json()) as Record<string, unknown>;
    if (typeof body?.nombre_estado === 'string') nombreEstado = body.nombre_estado;
    if (typeof body?.error_code === 'string') errorCode = body.error_code;
  } catch { /* ignorar */ }
  redApi.push({ metodo: 'GET', ruta: new URL(`${apiBase}/activos-biologicos/${id}`).pathname, status, error_code: errorCode });
  if (status === 428) respuestas428.push(`GET /activos-biologicos/${id} -> 428 (${errorCode ?? 'sin error_code'})`);
  return { status, nombre_estado: nombreEstado, error_code: errorCode };
}

test.afterAll(() => {
  if (violaciones.length) {
    precondiciones.push({ nombre: '0 violaciones de escritura y 0 respuestas 428', ok: false, detalle: `violaciones=[${violaciones.join('; ')}], 428=[${respuestas428.join('; ')}]` });
  } else if (respuestas428.length) {
    precondiciones.push({ nombre: '0 violaciones de escritura y 0 respuestas 428', ok: false, detalle: `violaciones=0, 428=[${respuestas428.join('; ')}]` });
  } else {
    precondiciones.push({ nombre: '0 violaciones de escritura y 0 respuestas 428', ok: true, detalle: `${escrituras.length} escrituras permitidas, 0 violaciones, 0 respuestas 428` });
  }

  if (precondiciones.some((p) => !p.ok)) {
    const nombres = precondiciones.filter((p) => !p.ok).map((p) => p.nombre).join('; ');
    for (const c of CPS) {
      if (!c.obtenido.startsWith('Precondición no cumplida')) {
        c.obtenido = `Precondición no cumplida (${nombres}); medido: ${c.obtenido}`;
        c.estado = 'FALLA';
      }
    }
  }

  const ok = CPS.filter((c) => c.estado === 'OK').length;
  const reporte = {
    tc: TC,
    reintento: REINTENTO,
    run_id: RUN_ID,
    fecha: new Date().toISOString(),
    ambiente: BASE,
    summary: {
      total: CPS.length,
      ok,
      falla: CPS.length - ok,
      veredicto: ok === CPS.length ? 'Aprobado' : 'Rechazado',
    },
    checkpoints: CPS,
    observaciones,
    retirados: RETIRADOS,
    precondiciones,
    sandbox,
    escrituras,
  };
  if (!STAGING) return;
  mkdirSync(STAGING, { recursive: true });
  writeFileSync(
    join(STAGING, `resultado_${TC}${REINTENTO > 0 ? `_reintento${REINTENTO}` : ''}.json`),
    `${JSON.stringify(reporte, null, 2)}\n`,
    'utf8',
  );
});

test('TC-M08-G029 baja de activo con confirmación (CP-01 a CP-06)', async ({ page, context }) => {
  test.setTimeout(300_000);

  const correo = process.env.QA_VET_EMAIL ?? '';
  const clave = process.env.QA_VET_PASSWORD ?? '';
  const secreto = process.env.QA_SANDBOX_SECRET ?? '';
  const scripts: Array<{ nombre: string }> = [];
  let page2: Page | null = null;
  const toastsVistos = new Set<string>();

  const registrarToasts = async (p: Page, etiqueta: string) => {
    const lista = await leerToasts(p);
    for (const item of lista) toastsVistos.add(`${etiqueta}[${item.variant}]: ${item.texto}`);
  };

  try {
    // -- Precondicion 1: credenciales y secreto presentes
    precondicion(
      'Credenciales del Veterinario, RUN_ID y secreto de sandbox en memoria',
      correo.length > 3 && clave.length > 3 && secreto.length > 3 && RUN_ID.length > 0,
      'QA_VET_EMAIL, QA_VET_PASSWORD, QA_SANDBOX_SECRET y RUN_ID presentes',
    );

    await registrarRutas(context, secreto);
    enlazarRed(page, scripts);

    // -- Precondicion 2: login unico del Veterinario
    await page.goto(`${BASE}login`);
    await page.locator('input[autocomplete="email"]').fill(correo);
    await page.locator('input[autocomplete="current-password"]').fill(clave);
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 30_000 }).catch(() => undefined);
    // v1.2: esperar a que termine el refresco de sesion posterior al login antes de usar el token
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);
    // Esperar brevemente para que GET /usuarios/me y /sesiones/me/permisos capturen Authorization
    const limiteAuth = Date.now() + 10_000;
    while ((!authToken || !apiBase) && Date.now() < limiteAuth) {
      await page.waitForTimeout(200);
    }
    precondicion(
      'Login único del Veterinario',
      !page.url().endsWith('/login') && apiBase.length > 0 && authToken.length > 0,
      `URL tras el login: ${new URL(page.url()).pathname}; apiBase=${apiBase ? 'detectada' : 'ausente'}; token=${authToken ? 'presente' : 'ausente'}`,
    );

    // -- Precondicion 3: GET /activos-biologicos/885
    const url885 = `${apiBase}/activos-biologicos/${ACTIVO_PLANTILLA}`;
    const resp885 = await page.request.get(url885, { headers: headersSandbox(secreto, true) });
    const status885 = resp885.status();
    let body885: Record<string, unknown> | null = null;
    try { body885 = (await resp885.json()) as Record<string, unknown>; } catch { body885 = null; }
    const err885 = typeof body885?.error_code === 'string' ? body885.error_code : null;
    redApi.push({ metodo: 'GET', ruta: new URL(url885).pathname, status: status885, error_code: err885 });
    if (status885 === 428) respuestas428.push(`GET ${new URL(url885).pathname} -> 428 (${err885 ?? 'sin error_code'})`);
    const det885 = body885?.detalle_individual as Record<string, unknown> | null | undefined;
    const ok885 = status885 === 200
      && String(body885?.tipo ?? '').toUpperCase() === 'INDIVIDUAL'
      && typeof det885?.raza === 'string' && det885.raza.length > 0
      && typeof det885?.sexo === 'string' && det885.sexo.length > 0;
    precondicion(
      `GET /activos-biologicos/${ACTIVO_PLANTILLA} responde 200 INDIVIDUAL con raza y sexo`,
      ok885,
      `HTTP ${status885}, error_code=${err885 ?? 'ninguno'}, tipo=${String(body885?.tipo ?? 'N/A')}, raza=${String(det885?.raza ?? 'N/A')}, sexo=${String(det885?.sexo ?? 'N/A')}`,
    );

    // -- Precondicion 4: POST /activos-biologicos para crear activo efimero A
    const { ymd, stamp } = fechaBogota();
    // v1.3: identificador corto (17 caracteres; los QA existentes tienen 15 a 18). El de 26 dio 400 VALOR_FUERA_DE_RANGO en TEST
    const identificadorA = `QA29-${stamp.slice(2)}`;
    const payloadCrear = {
      tipo_activo: 'INDIVIDUAL',
      id_especie: body885!.id_especie,
      id_infraestructura: body885!.id_infraestructura,
      atributos_dinamicos: (body885!.atributos_dinamicos ?? {}) as Record<string, unknown>,
      raza: det885!.raza,
      sexo: det885!.sexo,
      origen_financiero: 'nacimiento',
      fecha_inicio_ciclo: ymd,
      identificador: identificadorA,
    };
    const urlCrear = `${apiBase}/activos-biologicos`;
    const respCrear = await page.request.post(urlCrear, {
      headers: { ...headersSandbox(secreto, true), 'Content-Type': 'application/json' },
      data: payloadCrear,
    });
    const statusCrear = respCrear.status();
    let bodyCrear: Record<string, unknown> | null = null;
    try { bodyCrear = (await respCrear.json()) as Record<string, unknown>; } catch { bodyCrear = null; }
    const errCrear = typeof bodyCrear?.error_code === 'string' ? bodyCrear.error_code : null;
    const msgCrear = typeof bodyCrear?.message === 'string' ? bodyCrear.message : '';
    const campoCrear = typeof bodyCrear?.field === 'string' ? bodyCrear.field : '';
    const rutaCrear = new URL(urlCrear).pathname;
    redApi.push({ metodo: 'POST', ruta: rutaCrear, status: statusCrear, error_code: errCrear });
    escrituras.push({ metodo: 'POST', ruta: rutaCrear, status: statusCrear, error_code: errCrear, resultado: 'al servidor (spec crear activo A)' });
    if (statusCrear === 428) respuestas428.push(`POST ${rutaCrear} -> 428 (${errCrear ?? 'sin error_code'})`);

    const idCreado = typeof bodyCrear?.id_activo_biologico === 'number' ? bodyCrear.id_activo_biologico : null;
    const estadoCreado = typeof bodyCrear?.nombre_estado === 'string' ? bodyCrear.nombre_estado : '';
    const okCrear = statusCrear === 201
      && idCreado !== null
      && idCreado !== ACTIVO_PLANTILLA
      && !PROHIBIDOS.includes(idCreado)
      && estadoCreado.toUpperCase() === 'ACTIVO';
    precondicion(
      'POST /activos-biologicos crea activo efímero A (201, ACTIVO, id válido)',
      okCrear,
      statusCrear === 201
        ? `HTTP 201, id=${idCreado}, estado=${estadoCreado}, identificador=${identificadorA}`
        : `HTTP ${statusCrear}, error_code=${errCrear ?? 'ninguno'}, field=${campoCrear || 'N/A'}, message="${msgCrear}", identificador=${identificadorA} (${identificadorA.length} car.)`,
    );
    activoId = idCreado!;
    observaciones.push(`Activo de QA creado FUERA del sandbox (autorizado por Sebastian): id=${activoId}, identificador=${identificadorA}, finca del 885; queda en TEST.`);

    // -- Precondicion 5 (verificacion temprana; tambien se revalida en afterAll)
    precondicion(
      '0 violaciones de escritura y 0 respuestas 428 tras creación de A',
      violaciones.length === 0 && respuestas428.length === 0,
      `violaciones=${violaciones.length}, 428=${respuestas428.length}`,
    );

    // v1.4: sin segunda pestana. Se guarda el estado que la app recibe ANTES de la baja (ficha y activo de A)
    // para simular en CP-06 una vista desactualizada en la misma pagina.
    let fichaEstadoPrevio: unknown = undefined;
    let activoEstadoPrevio: unknown = undefined;
    let capturarPrevio = true;
    page.on('response', async (r) => {
      if (!capturarPrevio || r.request().method() !== 'GET' || activoId === null) return;
      const ruta = new URL(r.url()).pathname;
      try {
        if (new RegExp(`/activos-biologicos/${activoId}/ficha-integral/?$`).test(ruta)) {
          const b = (await r.json()) as Record<string, unknown>;
          if (b && 'estado_actual' in b) fichaEstadoPrevio = b.estado_actual;
        } else if (new RegExp(`/activos-biologicos/${activoId}/?$`).test(ruta)) {
          const b = (await r.json()) as Record<string, unknown>;
          if (b && 'nombre_estado' in b) activoEstadoPrevio = b.nombre_estado;
        }
      } catch { /* cuerpo no JSON */ }
    });

    // -- Navegar pagina 1 a /activos-biologicos/{A}, pestana Eventos
    await page.goto(`${BASE}activos-biologicos/${activoId}`);
    const prep1 = await esperarFichaLista(page, 'ficha de A', false);
    precondicion('Ficha de A lista: permisos cargados y botón «Baja» visible (hasta 3 intentos)', prep1.ok, prep1.detalle);

    // -- OBS-ESC (observacion, no checkpoint; enlazado a INC-M08-NN-G025)
    {
      const rEsc = await abrirYLlenarBaja(page);
      const headingConf = page.locator('[role="dialog"]').getByRole('heading', { name: 'Confirma la baja' });
      const confVis = await headingConf.isVisible().catch(() => false);
      const postsAntesEsc = bajasPost.length;
      if (rEsc.ok && confVis) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
        const sigueAbierto = (await page.locator('[role="dialog"]').count()) > 0;
        const postsTrasEsc = bajasPost.length;
        observaciones.push(
          `OBS-ESC (INC-M08-NN-G025): con «Confirma la baja» visible se pulsó Escape y esperó 500 ms -> dialogo_sigue_abierto=${sigueAbierto}, post_baja_antes=${postsAntesEsc}, post_baja_despues=${postsTrasEsc}.`,
        );
        if (sigueAbierto) {
          const btnV = page.locator('[role="dialog"]').getByRole('button', { name: 'Volver', exact: true });
          if (await btnV.isVisible().catch(() => false)) await btnV.click();
          await page.waitForTimeout(200);
          const btnC = page.locator('[role="dialog"]').getByRole('button', { name: 'Cancelar', exact: true });
          if (await btnC.isVisible().catch(() => false)) await btnC.click();
          await page.waitForTimeout(200);
        }
      } else {
        observaciones.push(`OBS-ESC (INC-M08-NN-G025): no se alcanzó «Confirma la baja» (${rEsc.detalle}, heading=${confVis}).`);
      }
      await registrarToasts(page, 'OBS-ESC');
    }

    // -- CP-01 (070 a; RF-107 CA-03 y 8.5 paso 2)
    let cp01Abierto = false;
    {
      const r01 = await abrirYLlenarBaja(page);
      const dlg = page.locator('[role="dialog"]').first();
      const heading = dlg.getByRole('heading', { name: 'Confirma la baja' });
      const btnVolver = dlg.getByRole('button', { name: 'Volver', exact: true });
      const btnConfirmar = dlg.getByRole('button', { name: 'Confirmar baja', exact: true });

      const hVis = await heading.isVisible().catch(() => false);
      const vVis = await btnVolver.isVisible().catch(() => false);
      const cVis = await btnConfirmar.isVisible().catch(() => false);
      const hTxt = hVis ? norm(await heading.textContent()) : '(no visible)';
      const vTxt = vVis ? norm(await btnVolver.textContent()) : '(no visible)';
      const cTxt = cVis ? norm(await btnConfirmar.textContent()) : '(no visible)';
      const posts01 = bajasPost.length;

      cp01Abierto = (await page.locator('[role="dialog"]').count()) > 0;
      await captura(page, 'CP-01_confirma');

      const ok01 = r01.ok && hVis && vVis && cVis && posts01 === 0;
      anotar(
        'CP-01',
        ok01,
        `paso_abrir=${r01.detalle}; heading="${hTxt}"; botones=["${vTxt}", "${cTxt}"]; post_baja=${posts01}`,
      );
      await registrarToasts(page, 'CP-01');
    }

    // -- CP-02 (070 a; FA-1; Postcondiciones 3 y 5)
    {
      const successAntes = await page.locator('.ds-alert--success').count();
      const toastsAntes = (await leerToasts(page)).length;
      let trasVolverAbierto: boolean | null = null;
      let textoCancelar = '(no visible)';

      if (cp01Abierto) {
        const dlg = page.locator('[role="dialog"]').first();
        const btnVolver = dlg.getByRole('button', { name: 'Volver', exact: true });
        if (await btnVolver.isVisible().catch(() => false)) {
          await btnVolver.click();
          await page.waitForTimeout(250);
          trasVolverAbierto = (await page.locator('[role="dialog"]').count()) > 0;
        }
        const btnCancelar = page.locator('[role="dialog"]').getByRole('button', { name: 'Cancelar', exact: true });
        if (await btnCancelar.isVisible().catch(() => false)) {
          textoCancelar = norm(await btnCancelar.textContent());
          await btnCancelar.click();
          await page.waitForTimeout(600);
        }
      }

      const dialogosTrasCancelar = await page.locator('[role="dialog"]').count();
      const posts02 = bajasPost.length;
      const get02 = await consultarEstadoActivo(page, secreto, activoId);
      const successDespues = await page.locator('.ds-alert--success').count();
      const toastsDespues = await leerToasts(page);
      const nuevasSuccess = Math.max(0, successDespues - successAntes);
      const nuevosToasts = Math.max(0, toastsDespues.length - toastsAntes);

      observaciones.push(
        `OBS-5 (G028): tras pulsar «Volver», el diálogo seguía abierto=${String(trasVolverAbierto)} (cancelar exige dos pasos: «Volver» y luego «${textoCancelar}»).`,
      );
      observaciones.push(
        `OBS-3 (G028): textos de botones en el flujo de baja = ["Volver", "Confirmar baja", "${textoCancelar}"].`,
      );
      await registrarToasts(page, 'CP-02');

      const ok02 = dialogosTrasCancelar === 0
        && posts02 === 0
        && get02.status === 200
        && String(get02.nombre_estado ?? '').toUpperCase() === 'ACTIVO'
        && nuevasSuccess === 0
        && nuevosToasts === 0;
      anotar(
        'CP-02',
        ok02,
        `dialogos=${dialogosTrasCancelar}; post_baja_total=${posts02}; get_estado=${get02.status}/${get02.nombre_estado ?? 'N/A'}; nuevas_alert_success=${nuevasSuccess}; nuevos_toasts=${nuevosToasts}`,
      );
    }

    // -- CP-03, CP-04, CP-05 (070 b)
    {
      const postsAntes03 = bajasPost.length;
      const r03 = await abrirYLlenarBaja(page);
      let postRespCapturado = false;

      if (r03.ok) {
        const btnConfirmar = page.locator('[role="dialog"]').getByRole('button', { name: 'Confirmar baja', exact: true });
        if (await btnConfirmar.isVisible().catch(() => false)) {
          const promPost = page.waitForResponse(
            (r) => r.request().method() === 'POST' && new RegExp(`/activos-biologicos/${activoId}/eventos/baja/?$`).test(new URL(r.url()).pathname),
            { timeout: 15_000 },
          ).catch(() => null);
          capturarPrevio = false; // v1.4: lo leido hasta aqui es el estado previo a la baja
          await btnConfirmar.click();
          const resp = await promPost;
          postRespCapturado = resp !== null;
          // Breve espera para que React pinte el aviso de exito o error (sin exceder los 5 s de auto-dismiss)
          await page.waitForTimeout(500);
        }
      }

      // Capturar inmediatamente alertas en pagina 1 antes de los 5 s de auto-dismiss
      const alertasSuccess = await page.locator('.ds-alert--success').allTextContents().then((a) => a.map(norm));
      const alertasErrWarn = await page.locator('.ds-alert--error, .ds-alert--warning').allTextContents().then((a) => a.map(norm));
      const erroresBaja = alertasErrWarn.filter((txt) => txt.includes('No se pudo registrar la baja'));
      const toasts04 = await leerToasts(page);
      const toastsError04 = toasts04.filter((x) => x.variant === 'error' || x.variant === 'warning');
      await registrarToasts(page, 'CP-04');

      // Captura de exito (o estado tras confirmar) mientras el aviso sigue visible
      await captura(page, 'CP-05_exito');

      // Verificar si el exito esta dentro de la seccion Eventos y no en .ds-toasts
      const exitoEnToasts = toasts04.some((x) => x.variant === 'success');
      observaciones.push(
        `OBS-1 (G025 / INC-M08-NN-G026): alerta de éxito visible en sección Eventos=${alertasSuccess.length > 0}, en banner global (.ds-toasts)=${exitoEnToasts}.`,
      );

      // Si quedo un dialogo abierto por error (ej. baja_500), cerrarlo para dejar limpia pagina 1
      if ((await page.locator('[role="dialog"]').count()) > 0) {
        const btnC = page.locator('[role="dialog"]').getByRole('button', { name: 'Cancelar', exact: true });
        if (await btnC.isVisible().catch(() => false)) await btnC.click();
        await page.waitForTimeout(200);
      }

      // v1.2: un 401 de sesion que el interceptor reintenta solo no es un intento de baja; se anota aparte
      const todos03 = bajasPost.slice(postsAntes03);
      const reintentos03 = todos03.filter((x) => x.status === 401);
      const postsNuevos03 = todos03.filter((x) => x.status !== 401);
      const ultimoPost03 = postsNuevos03[postsNuevos03.length - 1] ?? null;
      const get03 = await consultarEstadoActivo(page, secreto, activoId);

      // CP-03
      const ok03 = postsNuevos03.length === 1
        && ultimoPost03?.status === 201
        && get03.status === 200
        && String(get03.nombre_estado ?? '').toUpperCase() === 'BAJA';
      anotar(
        'CP-03',
        ok03,
        `paso_abrir=${r03.detalle}; post_nuevos=${postsNuevos03.length} (esperado_resp=${postRespCapturado}); reintentos_401=${reintentos03.length}${reintentos03.length ? ` [${reintentos03.map((x) => x.error_code ?? 'sin error_code').join(', ')}]` : ''}; status=${ultimoPost03?.status ?? 'ninguno'}; baja.tipo=${ultimoPost03?.baja_tipo ?? 'N/A'}; error_code=${ultimoPost03?.error_code ?? 'ninguno'}; get_estado=${get03.status}/${get03.nombre_estado ?? 'N/A'}`,
      );

      // CP-04
      const ok04 = alertasSuccess.length >= 1 && erroresBaja.length === 0 && toastsError04.length === 0;
      anotar(
        'CP-04',
        ok04,
        `alert_success=${alertasSuccess.length} [${alertasSuccess.map((s) => `"${s}"`).join(', ')}]; alert_error_baja=${erroresBaja.length} [${erroresBaja.map((s) => `"${s}"`).join(', ')}]; toasts_error=${toastsError04.length}`,
      );

      // CP-05
      const textoSuccess = alertasSuccess[0] ?? '';
      const ok05 = textoSuccess.length > 0 && textoSuccess.includes(identificadorA);
      anotar(
        'CP-05',
        ok05,
        textoSuccess.length > 0
          ? `texto="${textoSuccess}"; contiene_identificador("${identificadorA}")=${textoSuccess.includes(identificadorA)}`
          : `(sin .ds-alert--success visible); identificador="${identificadorA}"`,
      );

      // Observacion: estado del boton Baja en pagina 1 tras la baja
      await page.waitForTimeout(300);
      const btnBaja1 = page.getByRole('button', { name: 'Baja', exact: true });
      const b1Vis = await btnBaja1.isVisible().catch(() => false);
      const b1Hab = b1Vis ? await btnBaja1.isEnabled().catch(() => false) : false;
      observaciones.push(`Estado del botón «Baja» en página 1 después de la baja: visible=${b1Vis}, habilitado=${b1Hab}.`);
    }

    // -- CP-06 (070 c; Restriccion 1; CA-02; CA-10). v1.4: vista desactualizada SIMULADA en la misma pagina:
    // solo los GET del activo A y de su ficha se responden con el estado previo a la baja; el POST repetido es real.
    {
      const p2 = page;
      let vistaSimulada = 0;
      const reEstado = new RegExp(`/activos-biologicos/${activoId}(/ficha-integral)?/?$`);
      await page.route((u) => reEstado.test(u.pathname), async (route, req) => {
        if (req.method() !== 'GET') return route.fallback();
        const h = req.headers();
        const resp = await route.fetch({
          headers: { ...h, 'x-zona-horaria': h['x-zona-horaria'] ?? 'America/Bogota' },
        });
        let body: Record<string, unknown> | null = null;
        try { body = (await resp.json()) as Record<string, unknown>; } catch { body = null; }
        if (!body || resp.status() !== 200) return route.fulfill({ response: resp });
        if (/\/ficha-integral\/?$/.test(new URL(req.url()).pathname)) {
          if (fichaEstadoPrevio !== undefined) { body.estado_actual = fichaEstadoPrevio; vistaSimulada += 1; }
        } else if (activoEstadoPrevio !== undefined) {
          body.nombre_estado = activoEstadoPrevio; vistaSimulada += 1;
        }
        return route.fulfill({ response: resp, json: body });
      });
      // v1.5: CP-06 solo si la baja de CP-03 ocurrio (201); si no, el intento seria la primera baja.
      const bajaHecha = bajasPost.some((x) => x.status === 201);
      const prep6 = bajaHecha ? await esperarFichaLista(page, 'CP-06 (vista desactualizada)', true) : { ok: false, detalle: 'no hubo baja 201 en CP-03' };
      const btnBaja6 = page.getByRole('button', { name: 'Baja', exact: true });
      const hab6 = prep6.ok && (await btnBaja6.isEnabled().catch(() => false));
      const okVista = bajaHecha && hab6 && vistaSimulada > 0;
      // Falla de la herramienta (no del producto): se registra como precondicion falsa sin borrar lo medido en CP-01 a CP-05.
      precondiciones.push({
        nombre: 'Vista desactualizada simulada (CP-06): estado previo aplicado y botón «Baja» habilitado',
        ok: okVista,
        detalle: `baja_cp03=${bajaHecha}; ${prep6.detalle}; respuestas_simuladas=${vistaSimulada}, estado_ficha_previo=${String(fichaEstadoPrevio)}, estado_activo_previo=${String(activoEstadoPrevio)}, boton_habilitado=${hab6}`,
      });
      const successAntesP2 = await p2.locator('.ds-alert--success').count();
      const postsAntes06 = bajasPost.length;
      const r06 = okVista ? await abrirYLlenarBaja(p2) : { ok: false, detalle: 'vista desactualizada no aplicada' };

      if (r06.ok) {
        const btnConfirmar2 = p2.locator('[role="dialog"]').getByRole('button', { name: 'Confirmar baja', exact: true });
        if (await btnConfirmar2.isVisible().catch(() => false)) {
          const promPost2 = p2.waitForResponse(
            (r) => r.request().method() === 'POST' && new RegExp(`/activos-biologicos/${activoId}/eventos/baja/?$`).test(new URL(r.url()).pathname),
            { timeout: 15_000 },
          ).catch(() => null);
          await btnConfirmar2.click();
          await promPost2;
          await p2.waitForTimeout(500);
        }
      }

      await captura(p2, 'CP-06_409');
      await page.unrouteAll({ behavior: 'ignoreErrors' });

      // Leer alerta de error en el dialogo (excluyendo el aviso estatico "Registro de baja")
      const textoErrorDlg = await p2.evaluate(() => {
        const n = (s: string | null | undefined) => (s ?? '').replace(/[\u00A0\u202F]/g, ' ').replace(/\s+/g, ' ').trim();
        const dlg = document.querySelector('[role="dialog"]');
        if (!dlg) return '';
        const alertas = Array.from(dlg.querySelectorAll('.ds-alert--error, .ds-alert--warning'));
        const deError = alertas.filter((el) => {
          const titulo = n(el.querySelector('.ds-alert__title')?.textContent);
          return titulo !== 'Registro de baja';
        });
        return deError.map((el) => n(el.textContent)).join(' | ');
      }).catch(() => '');

      const successDespuesP2 = await p2.locator('.ds-alert--success').count();
      const nuevasSuccessP2 = Math.max(0, successDespuesP2 - successAntesP2);
      await registrarToasts(p2, 'CP-06');

      const todos06 = bajasPost.slice(postsAntes06);
      const reintentos06 = todos06.filter((x) => x.status === 401);
      const postsNuevos06 = todos06.filter((x) => x.status !== 401);
      const ultimoPost06 = postsNuevos06[postsNuevos06.length - 1] ?? null;

      const palabras = textoErrorDlg.split(/\s+/).filter(Boolean).length;
      const tieneHttp = /\b(HTTP|Error)\s*\d{3}\b/i.test(textoErrorDlg);
      const tieneCodigoNum = /\b(400|401|403|404|409|422|500)\b/.test(textoErrorDlg);
      const tieneSnake = /\b[A-Z][A-Z0-9]*_[A-Z0-9_]+\b/.test(textoErrorDlg);

      observaciones.push(`Mensaje literal del 409 en respuesta API: "${ultimoPost06?.message ?? '(ninguno)'}"; en diálogo: "${textoErrorDlg || '(sin alerta de error en diálogo)'}".`);

      const ok06 = postsNuevos06.length === 1
        && ultimoPost06?.status === 409
        && ultimoPost06?.error_code === 'ACTIVO_YA_EN_BAJA'
        && textoErrorDlg.length > 0
        && palabras >= 5
        && !tieneHttp
        && !tieneCodigoNum
        && !tieneSnake
        && nuevasSuccessP2 === 0;

      anotar(
        'CP-06',
        ok06,
        `post_nuevos=${postsNuevos06.length}; reintentos_401=${reintentos06.length}${reintentos06.length ? ` [${reintentos06.map((x) => x.error_code ?? 'sin error_code').join(', ')}]` : ''}; status=${ultimoPost06?.status ?? 'ninguno'}; error_code=${ultimoPost06?.error_code ?? 'ninguno'}; palabras=${palabras}; patrones_tecnicos={http=${tieneHttp}, num=${tieneCodigoNum}, snake=${tieneSnake}}; nuevas_alert_success_p2=${nuevasSuccessP2}; texto="${textoErrorDlg || '(sin alerta de error)'}"`,
      );
    }

    // -- Observaciones finales: bundle index-*.js y toasts vistos
    const index = [...new Set(scripts.map((s) => s.nombre).filter((n) => /^index-.*\.js$/.test(n)))];
    observaciones.push(`Despliegue: bundle ${index.join(', ') || '(no identificado)'} en ${BASE}.`);
    observaciones.push(`Avisos observados en .ds-toasts durante todo el caso: ${toastsVistos.size === 0 ? 'ninguno (0)' : [...toastsVistos].join(' | ')}.`);
  } finally {
    // -- D. Cierre, siempre: about:blank en ambas paginas ANTES del rollback (v1.1: que la app no envie peticiones
    // con el run_id despues del rollback) y luego DELETE del sandbox
    if (page2) await page2.goto('about:blank').catch(() => undefined);
    await page.goto('about:blank').catch(() => undefined);
    // v1.6: sin sandbox no hay rollback; el activo A queda en TEST.
  }

  expect(violaciones, violaciones.join('; ')).toEqual([]);
  expect(respuestas428, respuestas428.join('; ')).toEqual([]);
  expect(CPS.every((c) => c.estado === 'OK'), CPS.filter((c) => c.estado === 'FALLA').map((c) => c.paso).join(', ')).toBe(true);
});
